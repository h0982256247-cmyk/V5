import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight, Sparkles, Share2, Palette, Shield } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Palette,
      title: '模板系統',
      description: '內建多種精美模板，快速建立 Flex Message'
    },
    {
      icon: Share2,
      title: 'LIFF 分享',
      description: '一鍵產生分享連結，透過 LINE 直接發送'
    },
    {
      icon: Shield,
      title: '智能驗證',
      description: '自動檢查訊息格式，確保分享成功'
    }
  ];

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Hero Section */}
      <div className="container max-w-lg mx-auto px-4 pt-16 pb-8">
        <div className="text-center animate-fade-in">
          {/* Logo */}
          <div className="relative inline-block mb-8">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-button"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <MessageCircle className="w-12 h-12 text-primary-foreground" />
            </div>
            <div
              className="absolute -right-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'var(--gradient-secondary)' }}
            >
              <Sparkles className="w-4 h-4 text-secondary-foreground" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-4">
            LINE Flex Message
            <br />
            <span className="text-gradient-primary">內容管理系統</span>
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
            輕鬆建立精美的 Flex Message，透過 LIFF 分享給好友與群組
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/admin')}
              className="w-full h-14 rounded-2xl text-lg font-semibold gap-3"
              style={{ background: 'var(--gradient-primary)' }}
            >
              開始使用
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full h-14 rounded-2xl text-lg font-semibold"
            >
              登入後台
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container max-w-lg mx-auto px-4 py-12">
        <div className="space-y-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="card-elevated p-5 flex items-start gap-4 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: index === 0 
                      ? 'var(--gradient-primary)' 
                      : index === 1 
                      ? 'var(--gradient-secondary)'
                      : 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--muted)))'
                  }}
                >
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-muted-foreground">
        <p>Built with ❤️ for LINE developers</p>
      </footer>
    </div>
  );
}
