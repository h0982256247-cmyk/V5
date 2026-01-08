import { useState, useCallback, useEffect, useMemo } from 'react';
import { Template, Doc, ValidationError } from '@/types/schema';
import { getDefaultValues } from '@/lib/validation';
import { compileAndValidate, upgradeTemplate } from '@/lib/compile';
import { docsStore } from '@/lib/supabase-store';
import { TemplateGallery } from './TemplateGallery';
import { SchemaFormRenderer } from './SchemaFormRenderer';
import { LineStylePreview } from './LineStylePreview';
import { PublishDialog } from './PublishDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  FileText, 
  Edit3, 
  Eye,
  Send,
  Code,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildShareUrls } from '@/lib/shareUrl';
import { useDebounce } from '@/hooks/use-debounce';

type WizardStep = 'template' | 'content' | 'preview';

interface DocWizardProps {
  existingDoc?: Doc;
  onComplete: () => void;
  onCancel: () => void;
}

export function DocWizard({ existingDoc, onComplete, onCancel }: DocWizardProps) {
  const [step, setStep] = useState<WizardStep>(existingDoc ? 'content' : 'template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    existingDoc?.template ? upgradeTemplate(existingDoc.template) : null
  );
  const [docTitle, setDocTitle] = useState(existingDoc?.title || '');
  const [docData, setDocData] = useState<Record<string, unknown>>(
    existingDoc?.data || {}
  );
  const [docId, setDocId] = useState<string | null>(existingDoc?.id || null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'json'>('preview');
  const { toast } = useToast();

  // Debounced data for auto-save
  const debouncedData = useDebounce(docData, 1000);
  const debouncedTitle = useDebounce(docTitle, 1000);

  // 自動儲存
  useEffect(() => {
    if (!docId || !selectedTemplate) return;
    
    const { message, errors } = compileAndValidate(selectedTemplate, debouncedData);

    // Quick提示：存草稿/更新草稿前先 validate
    setErrors(errors);

    docsStore.update(docId, {
      data: debouncedData,
      title: debouncedTitle,
      previewJson: message || undefined,
      validationErrors: errors,
      isValid: errors.length === 0,
      lastValidatedAt: new Date().toISOString()
    });
  }, [debouncedData, docId, selectedTemplate, debouncedTitle]);

  // 選擇模板
  const handleSelectTemplate = useCallback(async (template: Template) => {
    const upgraded = upgradeTemplate(template);
    setSelectedTemplate(upgraded);
    
    // 使用 sampleData 或 default values
    const initialData = upgraded.sampleData || getDefaultValues(upgraded.schema);
    setDocData(initialData);
    
    // 建立新 Doc
    const newDoc = await docsStore.create({
      title: docTitle || `新文件 - ${upgraded.name}`,
      templateId: upgraded.id,
      data: initialData,
      mode: upgraded.name.includes('Carousel') ? 'carousel' : 'single',
      status: 'draft'
    });
    
    if (newDoc) {
      setDocId(newDoc.id);
      setStep('content');
    } else {
      toast({
        title: '錯誤',
        description: '無法建立文件',
        variant: 'destructive'
      });
    }
  }, [docTitle, toast]);

  // Compile + validate (schema -> render -> flex sanity)
  const compiled = useMemo(() => {
    if (!selectedTemplate) {
      return { message: null, errors: [] as ValidationError[] };
    }
    const { message, errors } = compileAndValidate(selectedTemplate, docData);
    return { message, errors };
  }, [selectedTemplate, docData]);

  // 驗證資料
  const validateData = useCallback(() => compiled.errors, [compiled.errors]);

  // 前往預覽
  const handleGoToPreview = () => {
    const validationErrors = validateData();
    setErrors(validationErrors);
    setStep('preview');
  };

  // 渲染預覽訊息
  const previewMessage = compiled.message;

  // 發布
  const handlePublish = async (): Promise<{ success: boolean; shareUrl?: string; liffUrl?: string | null }> => {
    if (!docId) return { success: false };

    setIsPublishing(true);

    try {
      if (!selectedTemplate) return { success: false };

      const { message, errors } = compileAndValidate(selectedTemplate, docData);
      if (!message || errors.length > 0) {
        setErrors(errors);
        return { success: false };
      }

      const result = await docsStore.publishValidated(docId, {
        previewJson: message,
        validationErrors: []
      });
      if (!result) {
        return { success: false };
      }

      const { webUrl, liffUrl } = buildShareUrls(result.shareLink.token);
      
      toast({
        title: '發布成功',
        description: '您的訊息已發布',
      });

      return { success: true, shareUrl: webUrl, liffUrl };
    } catch (error) {
      console.error('Publish error:', error);
      return { success: false };
    } finally {
      setIsPublishing(false);
    }
  };

  // 複製 JSON
  const handleCopyJson = async () => {
    if (previewMessage) {
      await navigator.clipboard.writeText(JSON.stringify(previewMessage, null, 2));
      toast({
        title: '已複製',
        description: 'JSON 已複製到剪貼簿',
      });
    }
  };

  // Step indicator
  const steps = [
    { id: 'template', label: '選模板', icon: FileText },
    { id: 'content', label: '填內容', icon: Edit3 },
    { id: 'preview', label: '預覽發布', icon: Eye }
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="w-5 h-5 mr-1" />
            取消
          </Button>
          <h1 className="font-semibold text-foreground">
            {existingDoc ? '編輯文件' : '建立文件'}
          </h1>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`step-indicator ${
                    isActive
                      ? 'step-indicator-active'
                      : isCompleted
                      ? 'step-indicator-completed'
                      : 'step-indicator-pending'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow overflow-y-auto">
        <div className="container max-w-lg mx-auto px-4 py-6">
          {step === 'template' && (
            <TemplateGallery onSelect={handleSelectTemplate} />
          )}

          {step === 'content' && selectedTemplate && (
            <div className="space-y-6 animate-fade-in">
              {/* Doc Title */}
              <div className="field-container">
                <label className="field-label">文件標題</label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="輸入文件標題"
                  className="field-input border-0 h-10 p-0"
                />
              </div>

              {/* Schema Form */}
              <SchemaFormRenderer
                schema={selectedTemplate.schema}
                value={docData}
                onChange={setDocData}
                errors={errors}
              />
            </div>
          )}

          {step === 'preview' && selectedTemplate && (
            <div className="space-y-6 animate-fade-in">
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'preview' | 'json')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="w-4 h-4" />
                    預覽
                  </TabsTrigger>
                  <TabsTrigger value="json" className="gap-2">
                    <Code className="w-4 h-4" />
                    JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <LineStylePreview message={previewMessage} />
                </TabsContent>

                <TabsContent value="json" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyJson}
                      className="absolute top-2 right-2 z-10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <pre className="bg-muted rounded-xl p-4 overflow-x-auto text-xs max-h-96">
                      {JSON.stringify(previewMessage, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Validation Errors */}
              {errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-destructive">驗證錯誤</h3>
                  {errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                    >
                      <p className="text-sm">{error.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {error.path}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Actions */}
      <footer className="sticky bottom-0 glass border-t border-border safe-bottom">
        <div className="container max-w-lg mx-auto px-4 py-4 flex gap-3">
          {step === 'content' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('template')}
                className="flex-1 h-12"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                上一步
              </Button>
              <Button
                onClick={handleGoToPreview}
                className="flex-1 h-12"
              >
                下一步
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('content')}
                className="flex-1 h-12"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                編輯
              </Button>
              <Button
                onClick={() => setShowPublishDialog(true)}
                className="flex-1 h-12"
                disabled={errors.length > 0}
              >
                <Send className="w-5 h-5 mr-2" />
                發布
              </Button>
            </>
          )}
        </div>
      </footer>

      {/* Publish Dialog */}
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        errors={errors}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
    </div>
  );
}
