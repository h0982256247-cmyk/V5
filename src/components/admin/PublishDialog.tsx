import { useState } from 'react';
import { ValidationError, FlexMessage } from '@/types/schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Loader2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ValidationError[];
  onPublish: () => Promise<{ success: boolean; shareUrl?: string; liffUrl?: string | null }>;
  isPublishing: boolean;
}

export function PublishDialog({
  open,
  onOpenChange,
  errors,
  onPublish,
  isPublishing
}: PublishDialogProps) {
  const [publishResult, setPublishResult] = useState<{ success: boolean; shareUrl?: string; liffUrl?: string | null } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const { toast } = useToast();

  const hasErrors = errors.length > 0;

  const handlePublish = async () => {
    const result = await onPublish();
    setPublishResult(result);
  };

  const handleCopy = async (kind: 'liff' | 'web') => {
    const url = kind === 'liff' ? publishResult?.liffUrl : publishResult?.shareUrl;
    if (url) {
      await navigator.clipboard.writeText(url);
      toast({
        title: '已複製連結',
        description: '分享連結已複製到剪貼簿',
      });
    }
  };

  const handleClose = () => {
    setPublishResult(null);
    setShowQR(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!publishResult ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {hasErrors ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    無法發布
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-primary" />
                    確認發布
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {hasErrors
                  ? '請修正以下錯誤後再發布'
                  : '確認發布此訊息？發布後將產生分享連結。'}
              </DialogDescription>
            </DialogHeader>

            {hasErrors && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                  >
                    <p className="text-sm font-medium text-destructive">
                      {error.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      路徑：{error.path}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                {hasErrors ? '返回編輯' : '取消'}
              </Button>
              {!hasErrors && (
                <Button onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  確認發布
                </Button>
              )}
            </DialogFooter>
          </>
        ) : publishResult.success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-5 h-5" />
                發布成功！
              </DialogTitle>
              <DialogDescription>
                您的訊息已發布，請使用以下連結分享。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Share URLs */}
              <div className="p-3 bg-muted rounded-xl space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">LINE LIFF 連結（建議）</p>
                  {publishResult.liffUrl ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-grow text-xs bg-background p-2 rounded overflow-x-auto">
                        {publishResult.liffUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy('liff')}
                        aria-label="Copy LIFF URL"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      尚未設定 VITE_LIFF_ID，無法產生 LIFF 連結（請到 Zeabur 環境變數新增 VITE_LIFF_ID 後重建）
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">一般分享連結</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-grow text-xs bg-background p-2 rounded overflow-x-auto">
                      {publishResult.shareUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy('web')}
                      aria-label="Copy Web URL"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCopy(publishResult.liffUrl ? 'liff' : 'web')}
                  className="h-12"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  複製{publishResult.liffUrl ? 'LIFF' : ''}連結
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="h-12"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {showQR ? '隱藏' : '顯示'} QR
                </Button>
              </div>

              {/* QR Code */}
              {showQR && (publishResult.liffUrl || publishResult.shareUrl) && (
                <div className="flex justify-center p-4 bg-white rounded-xl animate-scale-in">
                  <QRCodeSVG
                    value={publishResult.liffUrl ?? publishResult.shareUrl!}
                    size={200}
                    level="M"
                    includeMargin
                  />
                </div>
              )}

              {/* Open in New Tab */}
              <Button
                variant="default"
                className="w-full h-12"
                onClick={() => window.open(publishResult.liffUrl ?? publishResult.shareUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                在新分頁開啟（{publishResult.liffUrl ? 'LIFF' : 'Web'}）
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full">
                完成
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                發布失敗
              </DialogTitle>
              <DialogDescription>
                發布時發生錯誤，請稍後再試。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                關閉
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
