import { LucideIcon, MessageCircle } from 'lucide-react';

interface ShareHeroProps {
  iconUrl?: string;
  title: string;
  subtitle?: string;
}

export function ShareHero({ iconUrl, title, subtitle }: ShareHeroProps) {
  return (
    <div className="text-center mb-8 animate-slide-up">
      {/* Icon */}
      <div className="relative inline-block mb-6">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover shadow-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = (e.target as HTMLImageElement).nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`${iconUrl ? 'hidden' : 'flex'} w-20 h-20 rounded-2xl items-center justify-center shadow-lg`}
          style={{ background: 'var(--gradient-primary)' }}
        >
          <MessageCircle className="w-10 h-10 text-primary-foreground" />
        </div>
        
        {/* Glow effect */}
        <div
          className="absolute -inset-2 rounded-3xl opacity-30 blur-xl -z-10"
          style={{ background: 'var(--gradient-primary)' }}
        />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
