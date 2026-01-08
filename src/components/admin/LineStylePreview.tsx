import { FlexMessage, FlexBubble, FlexCarousel } from '@/types/schema';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';

interface LineStylePreviewProps {
  message: FlexMessage | null;
  loading?: boolean;
}

export function LineStylePreview({ message, loading }: LineStylePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>無法預覽訊息</p>
      </div>
    );
  }

  const isCarousel = message.contents.type === 'carousel';
  const bubbles: FlexBubble[] = isCarousel
    ? (message.contents as FlexCarousel).contents
    : [message.contents as FlexBubble];

  const scrollTo = (index: number) => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const items = container.querySelectorAll('.carousel-item');
      if (items[index]) {
        items[index].scrollIntoView({ behavior: 'smooth', inline: 'center' });
        setCurrentIndex(index);
      }
    }
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const scrollPosition = container.scrollLeft;
      const itemWidth = container.clientWidth * 0.75;
      const newIndex = Math.round(scrollPosition / itemWidth);
      setCurrentIndex(Math.min(newIndex, bubbles.length - 1));
    }
  };

  return (
    <div className="relative">
      {/* Carousel Navigation - Only show for carousel with > 1 bubble */}
      {isCarousel && bubbles.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-md flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollTo(Math.min(bubbles.length - 1, currentIndex + 1))}
            disabled={currentIndex === bubbles.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-md flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bubbles Container */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className={`${isCarousel && bubbles.length > 1 ? 'carousel-container px-8' : 'flex justify-center'}`}
      >
        {bubbles.map((bubble, index) => (
          <div
            key={index}
            className={`carousel-item ${isCarousel && bubbles.length > 1 ? 'w-3/4 flex-shrink-0' : ''}`}
          >
            <BubbleRenderer bubble={bubble} />
          </div>
        ))}
      </div>

      {/* Carousel Indicators */}
      {isCarousel && bubbles.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {bubbles.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* altText Display */}
      <div className="mt-4 p-3 bg-muted/50 rounded-xl">
        <p className="text-xs text-muted-foreground mb-1">altText（通知訊息）</p>
        <p className="text-sm text-foreground">{message.altText}</p>
      </div>
    </div>
  );
}

function BubbleRenderer({ bubble }: { bubble: FlexBubble }) {
  // 取得 hero 圖片
  const heroUrl = bubble.hero?.type === 'image' ? bubble.hero.url : undefined;
  const heroAspectRatio = bubble.hero?.type === 'image' ? bubble.hero.aspectRatio : '1:1';

  // 解析 aspect ratio
  const getAspectRatioClass = (ratio?: string) => {
    switch (ratio) {
      case '1:1':
        return 'aspect-square';
      case '20:13':
        return 'aspect-[20/13]';
      case '16:9':
        return 'aspect-video';
      case '4:3':
        return 'aspect-[4/3]';
      default:
        return 'aspect-square';
    }
  };

  // 取得 body 內容
  const bodyContents = bubble.body?.contents || [];

  // 取得 footer 按鈕
  const footerContents = bubble.footer?.contents || [];

  return (
    <div className="line-bubble mx-auto">
      {/* Hero Image */}
      {heroUrl && (
        <div className={`relative ${getAspectRatioClass(heroAspectRatio)} bg-muted overflow-hidden`}>
          <img
            src={heroUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Image';
            }}
          />
        </div>
      )}

      {/* Body */}
      {bodyContents.length > 0 && (
        <div className="line-bubble-body">
          {bodyContents.map((content, index) => {
            if (content.type === 'text') {
              return (
                <p
                  key={index}
                  className={`${
                    content.weight === 'bold' ? 'font-bold' : ''
                  } ${
                    content.size === 'xl' ? 'text-lg' :
                    content.size === 'lg' ? 'text-base' :
                    content.size === 'sm' ? 'text-sm' : 'text-base'
                  } ${content.wrap ? '' : 'truncate'}`}
                  style={{ color: content.color, marginTop: content.margin === 'md' ? '0.75rem' : content.margin === 'sm' ? '0.5rem' : undefined }}
                >
                  {content.text}
                </p>
              );
            }
            if (content.type === 'box' && content.layout === 'baseline') {
              return (
                <div
                  key={index}
                  className="flex items-baseline gap-2"
                  style={{ marginTop: content.margin === 'md' ? '0.75rem' : content.margin === 'sm' ? '0.5rem' : undefined }}
                >
                  {content.contents.map((item: unknown, i: number) => {
                    const textItem = item as { type: string; text: string; size?: string; color?: string };
                    if (textItem.type === 'text') {
                      return (
                        <span
                          key={i}
                          className={textItem.size === 'sm' ? 'text-sm' : 'text-base'}
                          style={{ color: textItem.color }}
                        >
                          {textItem.text}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Footer Buttons */}
      {footerContents.length > 0 && (
        <div className="line-bubble-footer">
          {footerContents.map((content, index) => {
            if (content.type === 'button') {
              const action = content.action;
              return (
                <a
                  key={index}
                  href={action.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`line-bubble-button block ${
                    content.style === 'primary' ? 'bg-primary text-primary-foreground' :
                    content.style === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                    'text-primary'
                  }`}
                >
                  {action.label}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
