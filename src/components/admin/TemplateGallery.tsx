import { useState, useMemo, useEffect } from 'react';
import { Template } from '@/types/schema';
import { templatesStore } from '@/lib/supabase-store';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Image, ChevronRight, Sparkles, Loader2 } from 'lucide-react';

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      const data = await templatesStore.getAll();
      setTemplates(data);
      setIsLoading(false);
    };
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const query = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
  }, [templates, search]);

  const getTemplateIcon = (template: Template) => {
    if (template.name.includes('Carousel') || template.name.includes('多頁')) {
      return <Image className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  const getTemplateColor = (index: number) => {
    const colors = [
      'from-primary/20 to-primary/5',
      'from-secondary/20 to-secondary/5',
      'from-accent to-accent/30',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground mb-4 shadow-button">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">選擇模板</h2>
        <p className="text-muted-foreground">選擇一個模板開始建立您的 Flex Message</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜尋模板..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
        />
      </div>

      {/* Template Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">載入模板中...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{search ? '找不到符合的模板' : '尚無可用模板'}</p>
          </div>
        ) : (
          filteredTemplates.map((template, index) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full text-left group"
            >
              <div className="card-interactive p-5 flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${getTemplateColor(index)} flex items-center justify-center text-primary`}
                >
                  {getTemplateIcon(template)}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {template.name}
                    </h3>
                    {template.status === 'published' && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        v{template.version}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground text-clamp-2">
                    {template.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
