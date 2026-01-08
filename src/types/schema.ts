// Template Schema Types
export interface FieldConstraints {
  maxLength?: number;
  minLength?: number;
  minItems?: number;
  maxItems?: number;
  httpsOnly?: boolean;
  pattern?: string;

  /**
   * Conditional requirement.
   * Example: { when: 'actionType', is: 'uri' }
   */
  requiredIf?: {
    when: string;
    is: string | number | boolean;
  };
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface BaseField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'imageUrl' | 'url' | 'select' | 'number' | 'color' | 'json' | 'repeatable';
  required?: boolean;
  default?: string | number | boolean | Record<string, unknown> | unknown[];
  help?: string;
  constraints?: FieldConstraints;
  locked?: boolean;
}

export interface SelectField extends BaseField {
  type: 'select';
  options: string[] | FieldOption[];
}

export interface RepeatableField extends BaseField {
  type: 'repeatable';
  itemSchema: {
    fields: SchemaField[];
  };
}

export type SchemaField = BaseField | SelectField | RepeatableField;

export interface SchemaSection {
  id: string;
  title: string;
  fields?: SchemaField[];
  repeatable?: boolean;
  key?: string;
  constraints?: FieldConstraints;
  itemSchema?: {
    title: string;
    fields: SchemaField[];
  };
}

export interface TemplateSchema {
  schemaVersion: number;
  title: string;
  sections: SchemaSection[];
}

// Data Types
export interface Template {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  version: number;
  templateText: string;
  schema: TemplateSchema;
  sampleData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Doc {
  id: string;
  title: string;
  templateId: string;
  data: Record<string, unknown>;
  mode: 'single' | 'carousel';
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  template?: Template;

  /**
   * Compiled Flex message JSON.
   * - Draft: best-effort preview
   * - Published: the canonical payload used by /share
   */
  previewJson?: FlexMessage;

  /** Latest validation status saved with the doc (for quick troubleshooting). */
  isValid?: boolean;
  validationErrors?: ValidationError[];
  lastValidatedAt?: string;
}

export interface ShareLink {
  token: string;
  docId: string;
  expiresAt?: string;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface Asset {
  id: string;
  type: 'image';
  url: string;
  width?: number;
  height?: number;
  createdAt: string;
}

// Validation Types
export interface ValidationError {
  path: string;
  message: string;
  fieldKey?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

// Flex Message Types
export interface FlexAction {
  type: 'uri' | 'message' | 'postback' | 'datetimepicker';
  label: string;
  uri?: string;
  text?: string;
  data?: string;
}

export interface FlexButton {
  type: 'button';
  action: FlexAction;
  style?: 'primary' | 'secondary' | 'link';
  height?: 'sm' | 'md';
  color?: string;
}

export interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  flex?: number;
  justifyContent?: string;
  alignItems?: string;
}

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  maxLines?: number;
  flex?: number;
  align?: string;
  margin?: string;
}

export interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  action?: FlexAction;
}

export type FlexComponent = FlexBox | FlexText | FlexImage | FlexButton;

export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  direction?: 'ltr' | 'rtl';
  header?: FlexBox;
  hero?: FlexImage | FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble | FlexCarousel;
}
