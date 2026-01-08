import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicStore } from '@/lib/supabase-store';
import { compileAndValidate } from '@/lib/compile';
import { validateFlexForShareTargetPicker } from '@/lib/validation';
import { FlexMessage } from '@/types/schema';
import { ShareHero } from '@/components/share/ShareHero';
import { SharePreviewAccordion } from '@/components/share/SharePreviewAccordion';
import { ShareButton } from '@/components/share/ShareButton';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// LIFF SDK types
declare global {
  interface Window {
    liff: any;
  }
}

type PageState = 'loading' | 'ready' | 'error' | 'not-found' | 'expired';

export default function Share() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // ✅ v4：若是在 LINE 內建瀏覽器打開「一般網域」的 /share?token=...，
  // 且有設定 VITE_LIFF_ID，則自動導轉到 LIFF URL，確保 shareTargetPicker 可用。
  useEffect(() => {
    if (!token) return;

    const liffId = import.meta.env.VITE_LIFF_ID as string | undefined;
    if (!liffId) return;

    // 已經在 LIFF 網域就不要再導轉，避免迴圈
    if (window.location.hostname === 'liff.line.me') return;

    // 只有在 LINE 內建瀏覽器才自動導轉（避免一般瀏覽器被強制跳走）
    const ua = navigator.userAgent.toLowerCase();
    const isLineInApp = ua.includes('line');
    if (!isLineInApp) return;

    // 保留 querystring（含 token）
    const qs = window.location.search || `?token=${encodeURIComponent(token)}`;
    const target = `https://liff.line.me/${liffId}${qs}`;
    window.location.replace(target);
  }, [token]);

  const [state, setState] = useState<PageState>('loading');
  const [liff, setLiff] = useState<any>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [message, setMessage] = useState<FlexMessage | null>(null);
  const [shareUi, setShareUi] = useState<{
    iconUrl?: string;
    primaryButtonText?: string;
    moreText?: string;
    title?: string;
    subtitle?: string;
  }>({});
  const [error, setError] = useState<string>('');

  // 載入 LIFF SDK
  useEffect(() => {
    const loadLiff = async () => {
      try {
        // 動態載入 LIFF SDK
        if (!window.liff) {
          const script = document.createElement('script');
          script.src = 'https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js';
          script.async = true;
          document.body.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load LIFF SDK'));
          });
        }

        const liffId = import.meta.env.VITE_LIFF_ID || 'dummy-liff-id';

        // 初始化 LIFF
        await window.liff.init({ liffId });
        setLiff(window.liff);

        // 檢查登入狀態
        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }

        setIsLiffReady(true);
      } catch (err) {
        console.error('LIFF init error:', err);
        // 在非 LINE 環境中繼續（用於測試）
        setIsLiffReady(true);
        setLiff({
          isApiAvailable: () => false,
          shareTargetPicker: () => Promise.resolve(null)
        });
      }
    };

    loadLiff();
  }, []);

  // 載入訊息資料
  const loadMessage = useCallback(async () => {
    if (!token) {
      setState('not-found');
      return;
    }

    try {
      // 取得資料
      const result = await publicStore.getDocByToken(token);
      if (!result) {
        setState('not-found');
        return;
      }

      const { doc, template } = result;

      // 記錄存取
      await publicStore.recordAccess(token);

      // 讀出後再 validate 一次（避免壞資料讓前端炸掉）
      let nextMessage: FlexMessage | null = (doc as any).previewJson || null;
      let validationErrors: any[] = [];

      if (nextMessage) {
        validationErrors = validateFlexForShareTargetPicker(nextMessage);
      }

      // If no cached preview (or invalid), compile on the fly as a fallback.
      if (!nextMessage || validationErrors.length > 0) {
        const compiled = compileAndValidate(template, doc.data as any);
        nextMessage = compiled.message;
        validationErrors = compiled.errors;
      }

      if (!nextMessage || validationErrors.length > 0) {
        setState('error');
        setError('訊息驗證/渲染失敗');
        return;
      }

      setMessage(nextMessage);

      // 設定 UI
      const data = doc.data as Record<string, any>;
      setShareUi({
        iconUrl: data.shareUi?.iconUrl || data.hero?.imageUrl,
        primaryButtonText: data.shareUi?.primaryButtonText || '選擇分享對象',
        moreText: data.shareUi?.moreText || '更多訊息',
        title: data.title || doc.title,
        subtitle: data.subtitle
      });

      setState('ready');
    } catch (err) {
      console.error('Load message error:', err);
      setState('error');
      setError('載入失敗，請稍後再試');
    }
  }, [token]);

  useEffect(() => {
    if (isLiffReady) {
      loadMessage();
    }
  }, [isLiffReady, loadMessage]);

  // Loading state
  if (state === 'loading' || !isLiffReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (state === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">找不到訊息</h1>
          <p className="text-muted-foreground mb-6">此連結可能已過期或不存在</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">發生錯誤</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadMessage} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            重試
          </Button>
        </div>
      </div>
    );
  }

  // Ready state
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--gradient-hero)' }}>
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Hero */}
          <ShareHero iconUrl={shareUi.iconUrl} title={shareUi.title || '分享訊息'} subtitle={shareUi.subtitle} />

          {/* Share Button */}
          <div className="mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <ShareButton message={message} buttonText={shareUi.primaryButtonText} liff={liff} disabled={!message} />
          </div>

          {/* Preview Accordion */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <SharePreviewAccordion message={message} moreText={shareUi.moreText} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground safe-bottom">Powered by LINE Flex Message CMS</footer>
    </div>
  );
}
