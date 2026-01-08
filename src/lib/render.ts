import Handlebars from 'handlebars';
import { FlexMessage, ValidationError } from '@/types/schema';
import { getNestedValue } from './validation';

// -----------------------------
// Handlebars setup (safe JSON rendering)
// -----------------------------

const hb = Handlebars.create();

// JSON-safe stringify (use triple braces {{{json value}}} in templates)
hb.registerHelper('json', (value: unknown) => {
  return JSON.stringify(value ?? null);
});

// Default value helper: {{default value "fallback"}}
hb.registerHelper('default', (value: unknown, fallback: unknown) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return value;
});

// Array length helper: {{#if (hasItems arr)}} ... {{/if}}
hb.registerHelper('hasItems', (arr: unknown) => {
  return Array.isArray(arr) && arr.length > 0;
});

hb.registerHelper('eq', (a: unknown, b: unknown) => a === b);
hb.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
hb.registerHelper('and', (...args: unknown[]) => {
  // last arg is handlebars options
  const vals = args.slice(0, -1);
  return vals.every(Boolean);
});

// -----------------------------
// Legacy interpolation (${data.xxx})
// -----------------------------

// 安全的變數插值（不使用 eval）
export function interpolateTemplate(
  templateText: string,
  data: Record<string, unknown>
): { result: string | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // 處理 ${data.xxx} 格式的變數
  const variablePattern = /\$\{data\.([^}]+)\}/g;

  let result = templateText;
  let match;

  while ((match = variablePattern.exec(templateText)) !== null) {
    const fullMatch = match[0];
    const path = match[1];

    try {
      const value = getNestedValue(data, path);

      if (value === undefined) {
        errors.push({
          path: `data.${path}`,
          message: `找不到欄位 "${path}" 的值`
        });
        continue;
      }

      // 根據值類型決定替換方式
      let replacement: string;
      if (typeof value === 'string') {
        replacement = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        replacement = String(value);
      } else {
        replacement = JSON.stringify(value);
      }

      result = result.replace(fullMatch, replacement);
    } catch (error) {
      errors.push({
        path: `data.${path}`,
        message: `處理欄位 "${path}" 時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`
      });
    }
  }

  if (errors.length > 0) {
    return { result: null, errors };
  }

  return { result, errors: [] };
}

// -----------------------------
// Deep merge for optional patching
// -----------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return base;
  const out: Record<string, unknown> = { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function applyInlinePatches(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(applyInlinePatches);
  if (!isPlainObject(node)) return node;

  const obj: Record<string, unknown> = { ...node };

  // Inline patch: "__patch": "{...}" or object
  if (obj.__patch !== undefined) {
    const patch = parseJsonMaybe(obj.__patch);
    delete obj.__patch;
    if (isPlainObject(patch)) {
      const merged = deepMerge(obj, patch);
      return applyInlinePatches(merged);
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    obj[k] = applyInlinePatches(v);
  }
  return obj;
}

// -----------------------------
// Render Flex Message from templateText
// -----------------------------

export function renderFlexMessage(
  templateText: string,
  data: Record<string, unknown>
): { message: FlexMessage | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!templateText || templateText.trim() === '') {
    return {
      message: null,
      errors: [{ path: 'templateText', message: '模板內容（templateText）為空' }]
    };
  }

  try {
    let rendered: string | null = null;

    // 1) Handlebars (recommended)
    if (templateText.includes('{{')) {
      const compiled = hb.compile(templateText, {
        noEscape: true,
        strict: false
      });
      rendered = compiled(data);
    }

    // 2) Legacy ${data.xxx}
    if (rendered === null && templateText.includes('${data.')) {
      const out = interpolateTemplate(templateText, data);
      if (!out.result) return { message: null, errors: out.errors };
      rendered = out.result;
    }

    // 3) Otherwise treat as raw JSON
    if (rendered === null) {
      rendered = templateText;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rendered);
    } catch (e) {
      return {
        message: null,
        errors: [{
          path: 'templateText',
          message: `模板渲染後不是合法 JSON：${e instanceof Error ? e.message : '未知錯誤'}`
        }]
      };
    }

    // Apply any inline "__patch" fields created by schema (buttonPatch)
    parsed = applyInlinePatches(parsed);

    // Optional: allow power-users to patch the final Flex JSON
    // data.advanced.messagePatch can be an object or JSON string
    const patch = parseJsonMaybe((data as any)?.advanced?.messagePatch);
    if (isPlainObject(patch)) {
      parsed = deepMerge(parsed, patch);
    }

    return { message: parsed as FlexMessage, errors: [] };
  } catch (error) {
    errors.push({
      path: 'root',
      message: `渲染失敗：${error instanceof Error ? error.message : '未知錯誤'}`
    });
    return { message: null, errors };
  }
}
