import { useState, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { TemplateSchema, SchemaSection, SchemaField, ValidationError } from '@/types/schema';
import { getNestedValue, setNestedValue, validateField } from '@/lib/validation';
import { storageStore } from '@/lib/supabase-store';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  HelpCircle,
  Image,
  Link as LinkIcon
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SchemaFormRendererProps {
  schema: TemplateSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  errors?: ValidationError[];
}

export function SchemaFormRenderer({ schema, value, onChange, errors = [] }: SchemaFormRendererProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    schema.sections.map((s) => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getFieldError = (path: string): string | undefined => {
    const error = errors.find((e) => e.path === path);
    return error?.message;
  };

  const updateValue = useCallback((path: string, newValue: unknown) => {
    const updated = { ...value };
    setNestedValue(updated, path, newValue);
    onChange(updated);
  }, [value, onChange]);

  return (
    <div className="space-y-4 animate-fade-in">
      {schema.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          value={value}
          onChange={updateValue}
          errors={errors}
          getFieldError={getFieldError}
          isExpanded={expandedSections.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
        />
      ))}
    </div>
  );
}

interface SectionRendererProps {
  section: SchemaSection;
  value: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
  errors: ValidationError[];
  getFieldError: (path: string) => string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

function SectionRenderer({
  section,
  value,
  onChange,
  errors,
  getFieldError,
  isExpanded,
  onToggle
}: SectionRendererProps) {
  const sectionHasError = errors.some((e) => 
    e.path.startsWith(section.key || section.id)
  );

  if (section.repeatable && section.key) {
    return (
      <RepeatableSectionRenderer
        section={section}
        value={value}
        onChange={onChange}
        errors={errors}
        getFieldError={getFieldError}
        isExpanded={isExpanded}
        onToggle={onToggle}
        sectionHasError={sectionHasError}
      />
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="card-elevated overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 tap-target">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              {sectionHasError && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {section.fields?.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={getNestedValue(value, field.key)}
                onChange={(val) => onChange(field.key, val)}
                error={getFieldError(field.key)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface RepeatableSectionRendererProps extends Omit<SectionRendererProps, 'sectionHasError'> {
  sectionHasError: boolean;
}

function RepeatableSectionRenderer({
  section,
  value,
  onChange,
  errors,
  getFieldError,
  isExpanded,
  onToggle,
  sectionHasError
}: RepeatableSectionRendererProps) {
  const items = (getNestedValue(value, section.key!) as unknown[]) || [];
  const constraints = section.constraints || {};

  const addItem = () => {
    if (constraints.maxItems && items.length >= constraints.maxItems) return;
    const newItem: Record<string, unknown> = {};
    section.itemSchema?.fields.forEach((field) => {
      if (field.default !== undefined) {
        setNestedValue(newItem, field.key, field.default);
      }
    });
    onChange(section.key!, [...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (constraints.minItems && items.length <= constraints.minItems) return;
    const updated = items.filter((_, i) => i !== index);
    onChange(section.key!, updated);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(section.key!, updated);
  };

  const updateItem = (index: number, fieldKey: string, fieldValue: unknown) => {
    const updated = [...items];
    const item = { ...(updated[index] as Record<string, unknown>) };
    setNestedValue(item, fieldKey, fieldValue);
    updated[index] = item;
    onChange(section.key!, updated);
  };

  const canAdd = !constraints.maxItems || items.length < constraints.maxItems;
  const canRemove = !constraints.minItems || items.length > constraints.minItems;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="card-elevated overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 tap-target">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <span className="text-sm text-muted-foreground">
                ({items.length} 項)
              </span>
              {sectionHasError && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {items.map((item, index) => (
              <div key={index} className="relative bg-muted/30 rounded-xl p-4 space-y-3">
                {/* Item Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-foreground">
                    {section.itemSchema?.title.replace('{{index}}', String(index + 1))}
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={!canRemove}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Item Fields */}
                {section.itemSchema?.fields.map((field) => {
                  const path = `${section.key}[${index}].${field.key}`;
                  return (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      value={getNestedValue(item as Record<string, unknown>, field.key)}
                      onChange={(val) => updateItem(index, field.key, val)}
                      error={getFieldError(path)}
                      basePath={`${section.key}[${index}]`}
                      parentItems={item}
                      parentIndex={index}
                      onUpdateItem={(key, val) => updateItem(index, key, val)}
                      getFieldError={getFieldError}
                    />
                  );
                })}
              </div>
            ))}

            {/* Add Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={!canAdd}
              className="w-full h-12 rounded-xl border-dashed"
            >
              <Plus className="w-5 h-5 mr-2" />
              新增項目
              {constraints.maxItems && (
                <span className="ml-2 text-muted-foreground">
                  ({items.length}/{constraints.maxItems})
                </span>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface FieldRendererProps {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  basePath?: string;
  parentItems?: unknown;
  parentIndex?: number;
  onUpdateItem?: (key: string, value: unknown) => void;
  getFieldError?: (path: string) => string | undefined;
}

function FieldRenderer({ 
  field, 
  value, 
  onChange, 
  error,
  basePath,
  parentItems,
  parentIndex,
  onUpdateItem,
  getFieldError
}: FieldRendererProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasError = !!error;

  // 處理巢狀 repeatable 欄位（如 cta）
  if (field.type === 'repeatable') {
    const repeatableField = field as { itemSchema: { fields: SchemaField[] }; constraints?: { minItems?: number; maxItems?: number } };
    const items = (value as unknown[]) || [];
    const constraints = field.constraints || {};

    const addSubItem = () => {
      if (constraints.maxItems && items.length >= constraints.maxItems) return;
      const newItem: Record<string, unknown> = {};
      repeatableField.itemSchema.fields.forEach((f) => {
        if (f.default !== undefined) {
          setNestedValue(newItem, f.key, f.default);
        }
      });
      onChange([...items, newItem]);
    };

    const removeSubItem = (index: number) => {
      if (constraints.minItems && items.length <= constraints.minItems) return;
      onChange(items.filter((_, i) => i !== index));
    };

    const updateSubItem = (index: number, fieldKey: string, fieldValue: unknown) => {
      const updated = [...items];
      const item = { ...(updated[index] as Record<string, unknown>) };
      item[fieldKey] = fieldValue;
      updated[index] = item;
      onChange(updated);
    };

    const canAdd = !constraints.maxItems || items.length < constraints.maxItems;
    const canRemove = !constraints.minItems || items.length > constraints.minItems;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.help && (
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{field.help}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-start bg-background/50 rounded-lg p-3">
            <div className="flex-grow grid grid-cols-2 gap-2">
              {repeatableField.itemSchema.fields.map((subField) => (
                <div key={subField.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{subField.label}</Label>
                  {subField.type === 'select' ? (
                    <Select
                      value={String((item as Record<string, unknown>)[subField.key] || (subField as any).default || '')}
                      onValueChange={(val) => updateSubItem(index, subField.key, val)}
                      disabled={(subField as any).locked}
                    >
                      <SelectTrigger className="bg-transparent border h-9 text-sm">
                        <SelectValue placeholder={`選擇${subField.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(((subField as any).options || []) as string[]).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : subField.type === 'color' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={String((item as Record<string, unknown>)[subField.key] || '#000000')}
                        onChange={(e) => updateSubItem(index, subField.key, e.target.value)}
                        className="h-9 w-10 p-1 rounded-md border border-border bg-transparent"
                      />
                      <Input
                        value={String((item as Record<string, unknown>)[subField.key] || '')}
                        onChange={(e) => updateSubItem(index, subField.key, e.target.value)}
                        placeholder="#RRGGBB"
                        className="h-9 text-sm"
                      />
                    </div>
                  ) : subField.type === 'textarea' || subField.type === 'json' ? (
                    <Textarea
                      value={String((item as Record<string, unknown>)[subField.key] || '')}
                      onChange={(e) => updateSubItem(index, subField.key, e.target.value)}
                      placeholder={subField.type === 'json' ? '{"key":"value"}' : subField.label}
                      className="min-h-[64px] text-sm"
                    />
                  ) : (
                    <Input
                      type={subField.type === 'number' ? 'number' : 'text'}
                      value={String((item as Record<string, unknown>)[subField.key] || '')}
                      onChange={(e) => updateSubItem(index, subField.key, e.target.value)}
                      placeholder={subField.label}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSubItem(index)}
              disabled={!canRemove}
              className="h-9 w-9 text-destructive hover:text-destructive shrink-0 mt-5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSubItem}
          disabled={!canAdd}
          className="w-full h-9 border-dashed"
        >
          <Plus className="w-4 h-4 mr-1" />
          新增{field.label}
        </Button>

        {hasError && (
          <p className="field-error">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  const getInputIcon = () => {
    if (field.type === 'imageUrl') return <Image className="w-4 h-4" />;
    if (field.type === 'url') return <LinkIcon className="w-4 h-4" />;
    return null;
  };

  const triggerUpload = () => {
    if (field.locked || uploading) return;
    fileInputRef.current?.click();
  };

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so selecting same file twice still triggers onChange
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '檔案格式不支援',
        description: '請選擇圖片檔（jpg/png/webp…）',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    const res = await storageStore.uploadImageToAssetsBucket(file);
    setUploading(false);

    if (!res?.url) {
      toast({
        title: '上傳失敗',
        description: '請確認你已登入且具有 admin 權限，並且 Supabase Storage bucket「assets」與 RLS 已建立。',
        variant: 'destructive'
      });
      return;
    }

    onChange(res.url);
    toast({
      title: '上傳成功',
      description: '已自動填入 Public URL，並寫入 assets 表。'
    });
  };

  return (
    <div className="field-container">
      <div className="flex items-center gap-2 mb-1.5">
        <Label className="field-label mb-0">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.help && (
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{field.help}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {field.type === 'select' ? (
        <Select
          value={String(value || field.default || '')}
          onValueChange={(val) => onChange(val)}
          disabled={field.locked}
        >
          <SelectTrigger className="bg-transparent border-0 h-10 p-0">
            <SelectValue placeholder={`選擇${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {((field as { options: string[] }).options || []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === 'textarea' ? (
        <Textarea
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`輸入${field.label}`}
          disabled={field.locked}
          className="field-input border-0 resize-none min-h-[80px] p-0"
        />
      ) : field.type === 'json' ? (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
          onChange={(e) => onChange(e.target.value)}
          placeholder='{"key":"value"}'
          disabled={field.locked}
          className="field-input border rounded-md resize-none min-h-[120px]"
        />
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={String(value || field.default || '#000000')}
            onChange={(e) => onChange(e.target.value)}
            disabled={field.locked}
            className="h-10 w-12 p-1 rounded-md border border-border bg-transparent"
          />
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#RRGGBB"
            disabled={field.locked}
            className="field-input border-0 h-10 p-0"
          />
        </div>
      ) : field.type === 'imageUrl' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {getInputIcon() && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getInputIcon()}
                </div>
              )}
              <Input
                type="text"
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`輸入${field.label}`}
                disabled={field.locked}
                className={`field-input border-0 h-10 p-0 ${getInputIcon() ? 'pl-6' : ''}`}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileInputChange}
              disabled={field.locked}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerUpload}
              disabled={field.locked || uploading}
              className="shrink-0"
            >
              {uploading ? '上傳中…' : '上傳圖片'}
            </Button>
          </div>

          {String(value || '').trim() && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src={String(value)}
                alt="preview"
                className="w-full h-auto max-h-64 object-contain"
                loading="lazy"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {getInputIcon() && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getInputIcon()}
                </div>
              )}
              <Input
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`輸入${field.label}`}
                disabled={field.locked}
                className={`field-input border-0 h-10 p-0 ${getInputIcon() ? 'pl-6' : ''}`}
              />
            </div>

          </div>
        </div>
      )}

      {hasError && (
        <p className="field-error">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      {field.constraints?.maxLength && (
        <p className="text-xs text-muted-foreground mt-1">
          {String(value || '').length} / {field.constraints.maxLength}
        </p>
      )}
    </div>
  );
}
