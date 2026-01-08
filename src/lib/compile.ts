import { FlexMessage, Template, ValidationError, TemplateSchema } from '@/types/schema';
import { renderFlexMessage } from './render';
import {
  carouselTemplateText,
  carouselSchema,
  singlePosterTemplateText,
  singlePosterSchema
} from './templates';
import { validateFlexForShareTargetPicker, validateSchemaData } from './validation';

type ResolvedTemplate = {
  templateText: string;
  schema: TemplateSchema;
  kind: 'carousel' | 'single' | 'custom';
};

/**
 * Resolve a template definition used for rendering/validation.
 *
 * Why:
 * - Your Supabase DB may still have an older `${data.xxx}` template_text.
 * - Older template_text can't render pages[] into carousel.contents[].
 * - We route common templates to the built-in Handlebars templates that support loops.
 */
export function resolveTemplateDefinition(template: Template): ResolvedTemplate {
  const name = (template.name || '').toLowerCase();
  const desc = (template.description || '').toLowerCase();
  const isCarousel = name.includes('carousel') || name.includes('多頁') || desc.includes('carousel');
  const isSingle = name.includes('單頁') || name.includes('海報') || desc.includes('single');

  // If DB template already uses Handlebars, keep it (custom templates).
  if (template.templateText?.includes('{{')) {
    return { templateText: template.templateText, schema: template.schema, kind: 'custom' };
  }

  // Route old templates to our built-in upgraded definitions.
  if (isCarousel) return { templateText: carouselTemplateText, schema: carouselSchema, kind: 'carousel' };
  if (isSingle) return { templateText: singlePosterTemplateText, schema: singlePosterSchema, kind: 'single' };

  // Fallback: use DB values.
  return { templateText: template.templateText, schema: template.schema, kind: 'custom' };
}

/**
 * Return a template object that uses the resolved (upgraded) schema/templateText
 * while keeping the original template id.
 */
export function upgradeTemplate(template: Template): Template {
  const resolved = resolveTemplateDefinition(template);
  if (resolved.kind === 'custom') return template;
  return {
    ...template,
    templateText: resolved.templateText,
    schema: resolved.schema
  };
}

export function compileAndValidate(
  template: Template,
  data: Record<string, unknown>
): { message: FlexMessage | null; errors: ValidationError[]; resolved: ResolvedTemplate } {
  const resolved = resolveTemplateDefinition(template);

  // 1) Schema validation
  const schemaErrors = validateSchemaData(resolved.schema, data);

  // 2) Render to Flex JSON
  const { message, errors: renderErrors } = renderFlexMessage(resolved.templateText, data);

  // 3) Flex-level sanity checks (actions etc.)
  const flexErrors = message ? validateFlexForShareTargetPicker(message) : [];

  return {
    message,
    errors: [...schemaErrors, ...renderErrors, ...flexErrors],
    resolved
  };
}
