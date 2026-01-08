import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('請輸入有效的電子郵件地址');
const passwordSchema = z.string().min(6, '密碼至少需要 6 個字元');

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, isAdmin } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? '/admin' : '/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: '電子郵件格式錯誤',
        description: emailResult.error.issues[0]?.message,
        variant: 'destructive'
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: '密碼格式錯誤',
        description: passwordResult.error.issues[0]?.message,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: '登入失敗',
        description: error,
        variant: 'destructive'
      });
      return;
    }

    toast({ title: '登入成功' });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-xl border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">管理員登入</h1>
              <p className="text-muted-foreground text-sm">
                只有你在 Supabase 建立的帳號可以登入（本系統不提供註冊）。
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              提醒：請到 Supabase 後台關閉 Email Signups，並手動建立你的 admin 使用者。
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                電子郵件
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登入中...
                </>
              ) : (
                '登入後台'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
