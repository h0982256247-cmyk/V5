import { useState } from 'react';
import { FlexMessage } from '@/types/schema';
import { LineStylePreview } from '@/components/admin/LineStylePreview';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface SharePreviewAccordionProps {
  message: FlexMessage | null;
  moreText?: string;
  loading?: boolean;
}

export function SharePreviewAccordion({ 
  message, 
  moreText = '更多訊息',
  loading 
}: SharePreviewAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 py-4 text-muted-foreground hover:text-foreground transition-colors tap-target"
      >
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">{moreText}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Preview Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-4 pb-6">
          <LineStylePreview message={message} loading={loading} />
        </div>
      </div>
    </div>
  );
}
