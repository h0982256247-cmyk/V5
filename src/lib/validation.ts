import { 
  TemplateSchema, 
  SchemaField, 
  SchemaSection, 
  ValidationError, 
  ValidationResult,
  FlexMessage,
  FlexAction
} from '@/types/schema';

// 取得巢狀值
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    if (typeof result === 'object') {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return result;
}

// 設定巢狀值
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
}

// 驗證單一欄位
export function validateField(
  field: SchemaField,
  value: unknown,
  path: string,
  context?: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const displayPath = path || field.key;

  // 必填檢查
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        path: displayPath,
        message: `「${field.label}」為必填欄位`,
        fieldKey: field.key
      });
      return errors; // 必填未填就不繼續驗證
    }
  }

  const constraints = field.constraints || {};

  // Conditional required
  if (!field.required && constraints.requiredIf && context) {
    const sibling = getNestedValue(context as Record<string, unknown>, constraints.requiredIf.when);
    const shouldRequire = sibling === constraints.requiredIf.is;
    if (shouldRequire && (value === undefined || value === null || value === '')) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」為必填欄位`,
        fieldKey: field.key
      });
      return errors;
    }
  }

  // 若無值且非必填，跳過驗證
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // 顏色格式（#RRGGBB 或 #RRGGBBAA）
  if (field.type === 'color' && typeof value === 'string') {
    const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    if (!colorRegex.test(value)) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」顏色格式不正確，請使用 #RRGGBB（或 #RRGGBBAA）`,
        fieldKey: field.key
      });
    }
  }

  // JSON 欄位驗證
  if (field.type === 'json') {
    // 允許 object 直接存入
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
      } catch {
        errors.push({
          path: displayPath,
          message: `「${field.label}」JSON 格式不正確`,
          fieldKey: field.key
        });
      }
    } else if (typeof value !== 'object') {
      errors.push({
        path: displayPath,
        message: `「${field.label}」需要是 JSON 物件`,
        fieldKey: field.key
      });
    }
  }

  // 文字長度驗證
  if (typeof value === 'string') {
    if (constraints.maxLength && value.length > constraints.maxLength) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」超過 ${constraints.maxLength} 字元限制（目前 ${value.length} 字）`,
        fieldKey: field.key
      });
    }
    if (constraints.minLength && value.length < constraints.minLength) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」至少需要 ${constraints.minLength} 字元`,
        fieldKey: field.key
      });
    }
  }

  // URL 驗證
  if (field.type === 'url' || field.type === 'imageUrl') {
    if (typeof value === 'string') {
      try {
        const url = new URL(value);
        if (constraints.httpsOnly && url.protocol !== 'https:') {
          errors.push({
            path: displayPath,
            message: `「${field.label}」必須使用 https:// 開頭的網址`,
            fieldKey: field.key
          });
        }
      } catch {
        errors.push({
          path: displayPath,
          message: `「${field.label}」網址格式不正確`,
          fieldKey: field.key
        });
      }
    }
  }

  // Pattern 驗證
  if (constraints.pattern && typeof value === 'string') {
    const regex = new RegExp(constraints.pattern);
    if (!regex.test(value)) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」格式不符合規定`,
        fieldKey: field.key
      });
    }
  }

  // Repeatable 欄位驗證
  if (field.type === 'repeatable' && Array.isArray(value)) {
    if (constraints.minItems !== undefined && value.length < constraints.minItems) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」至少需要 ${constraints.minItems} 項`,
        fieldKey: field.key
      });
    }
    if (constraints.maxItems !== undefined && value.length > constraints.maxItems) {
      errors.push({
        path: displayPath,
        message: `「${field.label}」最多只能有 ${constraints.maxItems} 項`,
        fieldKey: field.key
      });
    }

    // 驗證每個子項目
    const repeatableField = field as { itemSchema: { fields: SchemaField[] } };
    value.forEach((item, index) => {
      repeatableField.itemSchema.fields.forEach((subField) => {
        const subPath = `${displayPath}[${index}].${subField.key}`;
        const subValue = getNestedValue(item as Record<string, unknown>, subField.key);
        errors.push(...validateField(subField, subValue, subPath, item as Record<string, unknown>));
      });
    });
  }

  return errors;
}

// 驗證整個 Schema
export function validateSchemaData(
  schema: TemplateSchema,
  data: Record<string, unknown>
): ValidationResult {
  const errors: ValidationError[] = [];

  schema.sections.forEach((section: SchemaSection) => {
    if (section.repeatable && section.key) {
      // Repeatable section
      const items = getNestedValue(data, section.key) as unknown[] | undefined;
      const constraints = section.constraints || {};

      if (!Array.isArray(items)) {
        if (constraints.minItems && constraints.minItems > 0) {
          errors.push({
            path: section.key,
            message: `「${section.title}」至少需要 ${constraints.minItems} 項`,
            fieldKey: section.key
          });
        }
        return;
      }

      if (constraints.minItems !== undefined && items.length < constraints.minItems) {
        errors.push({
          path: section.key,
          message: `「${section.title}」至少需要 ${constraints.minItems} 項`,
          fieldKey: section.key
        });
      }

      if (constraints.maxItems !== undefined && items.length > constraints.maxItems) {
        errors.push({
          path: section.key,
          message: `「${section.title}」最多只能有 ${constraints.maxItems} 項（目前 ${items.length} 項），超過可能影響使用體驗`,
          fieldKey: section.key
        });
      }

      // 驗證每個項目
      items.forEach((item, index) => {
        section.itemSchema?.fields.forEach((field) => {
          const path = `${section.key}[${index}].${field.key}`;
          const value = getNestedValue(item as Record<string, unknown>, field.key);
          errors.push(...validateField(field, value, path, item as Record<string, unknown>));
        });
      });
    } else if (section.fields) {
      // 一般 section
      section.fields.forEach((field) => {
        const value = getNestedValue(data, field.key);
        errors.push(...validateField(field, value, field.key, data));
      });
    }
  });

  return {
    ok: errors.length === 0,
    errors
  };
}

// 驗證 Flex Message 是否可用於 shareTargetPicker
export function validateFlexForShareTargetPicker(message: FlexMessage): ValidationError[] {
  const errors: ValidationError[] = [];

  // 檢查 altText
  if (!message.altText || message.altText.trim() === '') {
    errors.push({
      path: 'altText',
      message: 'altText 為必填，LINE 通知會顯示此文字'
    });
  } else if (message.altText.length > 400) {
    errors.push({
      path: 'altText',
      message: `altText 超過 400 字元限制（目前 ${message.altText.length} 字）`
    });
  }

  // 遞迴檢查所有 action
  function checkActions(obj: unknown, path: string): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkActions(item, `${path}[${index}]`);
      });
      return;
    }

    const record = obj as Record<string, unknown>;

    // 檢查 action
    if (record.action && typeof record.action === 'object') {
      const action = record.action as FlexAction;
      const actionPath = `${path}.action`;

      if (!action.label || action.label.trim() === '') {
        errors.push({
          path: `${actionPath}.label`,
          message: '按鈕文字（label）不可為空'
        });
      }

      if (action.type === 'uri') {
        if (!action.uri) {
          errors.push({
            path: `${actionPath}.uri`,
            message: '連結 action 需要 uri'
          });
        } else {
          try {
            const url = new URL(action.uri);
            if (url.protocol !== 'https:') {
              errors.push({
                path: `${actionPath}.uri`,
                message: `按鈕連結必須使用 https://（目前為 ${url.protocol}//）`
              });
            }
          } catch {
            errors.push({
              path: `${actionPath}.uri`,
              message: '按鈕連結格式不正確'
            });
          }
        }
      } else if (action.type === 'message') {
        if (!action.text || action.text.trim() === '') {
          errors.push({
            path: `${actionPath}.text`,
            message: 'message action 需要 text'
          });
        }
      } else if (action.type === 'postback') {
        if (!action.data || action.data.trim() === '') {
          errors.push({
            path: `${actionPath}.data`,
            message: 'postback action 需要 data'
          });
        }
      }
    }

    // 遞迴檢查子屬性
    Object.entries(record).forEach(([key, value]) => {
      if (key !== 'action' && value && typeof value === 'object') {
        checkActions(value, `${path}.${key}`);
      }
    });
  }

  checkActions(message.contents, 'contents');

  return errors;
}

// 檢查 URL 是否為 HTTPS
export function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 取得欄位預設值
export function getDefaultValues(schema: TemplateSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  schema.sections.forEach((section) => {
    if (section.repeatable && section.key) {
      // 對於 repeatable section，建立一個空陣列或包含一個預設項目
      const minItems = section.constraints?.minItems || 0;
      if (minItems > 0 && section.itemSchema) {
        const items: Record<string, unknown>[] = [];
        for (let i = 0; i < minItems; i++) {
          const item: Record<string, unknown> = {};
          section.itemSchema.fields.forEach((field) => {
            if (field.default !== undefined) {
              setNestedValue(item, field.key, field.default);
            }
          });
          items.push(item);
        }
        setNestedValue(defaults, section.key, items);
      } else {
        setNestedValue(defaults, section.key, []);
      }
    } else if (section.fields) {
      section.fields.forEach((field) => {
        if (field.default !== undefined) {
          setNestedValue(defaults, field.key, field.default);
        }
      });
    }
  });

  return defaults;
}
