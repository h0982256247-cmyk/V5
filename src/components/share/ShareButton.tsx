import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { FlexMessage } from '@/types/schema';
import { useToast } from '@/hooks/use-toast';

interface ShareButtonProps {
  message: FlexMessage | null;
  buttonText?: string;
  liff: any; // LIFF SDK
  disabled?: boolean;
}

export function ShareButton({ 
  message, 
  buttonText = '選擇分享對象',
  liff,
  disabled 
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<'success' | 'cancelled' | 'error' | null>(null);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!message || !liff) return;

    // 檢查 shareTargetPicker 是否可用
    if (!liff.isApiAvailable('shareTargetPicker')) {
      toast({
        title: '無法分享',
        description: '請在 LINE 應用程式中開啟此頁面',
        variant: 'destructive'
      });
      return;
    }

    setIsSharing(true);
    setShareResult(null);

    try {
      const result = await liff.shareTargetPicker([message], {
        isMultiple: true
      });

      if (result) {
        // 分享成功
        setShareResult('success');
        toast({
          title: '分享成功！',
          description: '訊息已成功發送'
        });
      } else {
        // 使用者取消
        setShareResult('cancelled');
        toast({
          title: '已取消',
          description: '您取消了分享操作'
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      setShareResult('error');
      toast({
        title: '分享失敗',
        description: error instanceof Error ? error.message : '發生未知錯誤',
        variant: 'destructive'
      });
    } finally {
      setIsSharing(false);
      
      // 3 秒後重置結果
      setTimeout(() => setShareResult(null), 3000);
    }
  };

  const getButtonContent = () => {
    if (isSharing) {
      return (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>分享中...</span>
        </>
      );
    }

    if (shareResult === 'success') {
      return (
        <>
          <CheckCircle className="w-6 h-6" />
          <span>分享成功！</span>
        </>
      );
    }

    if (shareResult === 'error') {
      return (
        <>
          <XCircle className="w-6 h-6" />
          <span>分享失敗</span>
        </>
      );
    }

    return (
      <>
        <Send className="w-6 h-6" />
        <span>{buttonText}</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (shareResult === 'success') return 'default';
    if (shareResult === 'error') return 'destructive';
    return 'default';
  };

  return (
    <Button
      onClick={handleShare}
      disabled={disabled || isSharing || !message}
      variant={getButtonVariant() as any}
      className="w-full h-16 rounded-2xl text-lg font-semibold gap-3 shadow-button transition-all duration-200"
      style={{
        background: shareResult === 'success' 
          ? 'var(--gradient-primary)'
          : shareResult === 'error'
          ? undefined
          : 'var(--gradient-primary)'
      }}
    >
      {getButtonContent()}
    </Button>
  );
}
