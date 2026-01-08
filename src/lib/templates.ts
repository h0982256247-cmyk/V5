import { Template, TemplateSchema } from '@/types/schema';

const FLEX_TEXT_SIZES = ['xxs','xs','sm','md','lg','xl','xxl','3xl','4xl','5xl'];
const FLEX_TEXT_WEIGHTS = ['regular','bold'];
const FLEX_ASPECT_RATIOS = ['1:1','4:3','16:9','20:13','2:3'];
const FLEX_ASPECT_MODES = ['cover','fit'];
const FLEX_BUTTON_STYLES = ['primary','secondary','link'];
const FLEX_BUTTON_HEIGHTS = ['sm','md','lg'];

// -----------------------------
// Carousel (flexible)
// -----------------------------

export const carouselSchema: TemplateSchema = {
  schemaVersion: 2,
  title: '通用多頁 Carousel（彈性）',
  sections: [
    {
      id: 'meta',
      title: '基本資訊',
      fields: [
        { key: 'altText', label: 'altText（通知摘要）', type: 'text', required: true, default: '查看訊息', constraints: { maxLength: 60 } },
        { key: 'title', label: '分享頁標題', type: 'text', required: true, default: '分享訊息', constraints: { maxLength: 40 } },
        { key: 'subtitle', label: '分享頁副標題', type: 'text', required: false, constraints: { maxLength: 60 } }
      ]
    },
    {
      id: 'hero',
      title: '圖片預設（可被每頁覆蓋）',
      fields: [
        { key: 'hero.aspectRatio', label: '圖片比例', type: 'select', required: true, default: '1:1', options: FLEX_ASPECT_RATIOS },
        { key: 'hero.aspectMode', label: '圖片裁切', type: 'select', required: true, default: 'cover', options: FLEX_ASPECT_MODES }
      ]
    },
    {
      id: 'style',
      title: '全域樣式預設（可被每頁覆蓋）',
      fields: [
        { key: 'style.headline.size', label: '標題字級', type: 'select', required: true, default: 'lg', options: FLEX_TEXT_SIZES },
        { key: 'style.headline.weight', label: '標題粗細', type: 'select', required: true, default: 'bold', options: FLEX_TEXT_WEIGHTS },
        { key: 'style.headline.color', label: '標題顏色', type: 'color', required: true, default: '#111111' },

        { key: 'style.desc.size', label: '內文字級', type: 'select', required: true, default: 'sm', options: FLEX_TEXT_SIZES },
        { key: 'style.desc.color', label: '內文顏色', type: 'color', required: true, default: '#666666' },

        { key: 'style.bubble.bodyBgColor', label: '卡片背景', type: 'color', required: true, default: '#ffffff' },

        { key: 'style.button.style', label: '按鈕預設樣式', type: 'select', required: true, default: 'primary', options: FLEX_BUTTON_STYLES },
        { key: 'style.button.color', label: '按鈕主色（primary/secondary）', type: 'color', required: false, default: '#06C755', help: 'LINK 按鈕通常不需要顏色。' },
        { key: 'style.button.height', label: '按鈕高度', type: 'select', required: true, default: 'sm', options: FLEX_BUTTON_HEIGHTS }
      ]
    },
    {
      id: 'pages',
      title: '頁面內容（可新增多頁）',
      repeatable: true,
      key: 'pages',
      constraints: { minItems: 1, maxItems: 10 },
      itemSchema: {
        title: '第 {{index}} 頁',
        fields: [
          { key: 'headline', label: '標題', type: 'text', required: true, constraints: { maxLength: 40 } },
          { key: 'headlineSize', label: '標題字級（覆蓋）', type: 'select', required: false, options: FLEX_TEXT_SIZES },
          { key: 'headlineWeight', label: '標題粗細（覆蓋）', type: 'select', required: false, options: FLEX_TEXT_WEIGHTS },
          { key: 'headlineColor', label: '標題顏色（覆蓋）', type: 'color', required: false },

          { key: 'desc', label: '內文', type: 'textarea', required: false, constraints: { maxLength: 300 } },
          { key: 'descSize', label: '內文字級（覆蓋）', type: 'select', required: false, options: FLEX_TEXT_SIZES },
          { key: 'descColor', label: '內文顏色（覆蓋）', type: 'color', required: false },

          { key: 'imageUrl', label: '圖片 URL', type: 'imageUrl', required: true, constraints: { httpsOnly: true } },
          { key: 'imageAspectRatio', label: '圖片比例（覆蓋）', type: 'select', required: false, options: FLEX_ASPECT_RATIOS },
          { key: 'imageAspectMode', label: '圖片裁切（覆蓋）', type: 'select', required: false, options: FLEX_ASPECT_MODES },

          { key: 'bodyBgColor', label: '卡片背景（覆蓋）', type: 'color', required: false },

          {
            key: 'cta',
            label: '按鈕（CTA）',
            type: 'repeatable',
            required: false,
            constraints: { minItems: 0, maxItems: 4 },
            itemSchema: {
              fields: [
                { key: 'label', label: '按鈕文字', type: 'text', required: true, constraints: { maxLength: 20 } },
                {
                  key: 'actionType',
                  label: '按鈕動作',
                  type: 'select',
                  required: true,
                  default: 'uri',
                  options: [
                    { label: '開啟連結 (uri)', value: 'uri' },
                    { label: '送出文字 (message)', value: 'message' },
                    { label: '回傳資料 (postback)', value: 'postback' }
                  ]
                },
                {
                  key: 'url',
                  label: '連結（uri）',
                  type: 'url',
                  required: false,
                  constraints: { httpsOnly: true, requiredIf: { when: 'actionType', is: 'uri' } }
                },
                {
                  key: 'text',
                  label: '要送出的文字（message）',
                  type: 'text',
                  required: false,
                  constraints: { maxLength: 300, requiredIf: { when: 'actionType', is: 'message' } }
                },
                {
                  key: 'data',
                  label: 'postback data（postback）',
                  type: 'text',
                  required: false,
                  constraints: { maxLength: 300, requiredIf: { when: 'actionType', is: 'postback' } }
                },
                { key: 'style', label: '樣式', type: 'select', required: false, default: 'primary', options: FLEX_BUTTON_STYLES },
                { key: 'color', label: '按鈕顏色（primary/secondary）', type: 'color', required: false },
                { key: 'height', label: '高度', type: 'select', required: false, default: 'sm', options: FLEX_BUTTON_HEIGHTS },
                { key: 'buttonPatch', label: '進階：Button JSON Patch', type: 'json', required: false, help: '可填入 Flex button 其他屬性（例如 margin, gravity, flex, action altUri 等）。' }
              ]
            }
          }
        ]
      }
    },
    {
      id: 'shareUi',
      title: '分享頁設定',
      fields: [
        { key: 'shareUi.iconUrl', label: '分享頁 icon', type: 'imageUrl', required: false, constraints: { httpsOnly: true } },
        { key: 'shareUi.primaryButtonText', label: '分享按鈕文字', type: 'text', required: true, default: '選擇分享對象', constraints: { maxLength: 12 } },
        { key: 'shareUi.moreText', label: '展開預覽文字', type: 'text', required: true, default: '查看內容', constraints: { maxLength: 12 } }
      ]
    },
    {
      id: 'advanced',
      title: '進階（高手用）',
      fields: [
        { key: 'advanced.messagePatch', label: '整份 Flex JSON Patch（覆蓋/補充）', type: 'json', required: false, help: '會在最後對渲染完成的 Flex Message 做 deep-merge。' }
      ]
    }
  ]
};

// Handlebars JSON template
export const carouselTemplateText = `{
  "type": "flex",
  "altText": {{{json (default altText "查看訊息")}}},
  "contents": {
    "type": "carousel",
    "contents": [
      {{#each pages}}
      {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": {{{json imageUrl}}},
          "size": "full",
          "aspectRatio": {{{json (default imageAspectRatio (default ../hero.aspectRatio "1:1"))}}},
          "aspectMode": {{{json (default imageAspectMode (default ../hero.aspectMode "cover"))}}}
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": {{{json (default bodyBgColor (default ../style.bubble.bodyBgColor "#ffffff"))}}},
          "contents": [
            {
              "type": "text",
              "text": {{{json headline}}},
              "wrap": true,
              "weight": {{{json (default headlineWeight (default ../style.headline.weight "bold"))}}},
              "size": {{{json (default headlineSize (default ../style.headline.size "lg"))}}},
              "color": {{{json (default headlineColor (default ../style.headline.color "#111111"))}}}
            }{{#if desc}},
            {
              "type": "text",
              "text": {{{json desc}}},
              "wrap": true,
              "margin": "md",
              "size": {{{json (default descSize (default ../style.desc.size "sm"))}}},
              "color": {{{json (default descColor (default ../style.desc.color "#666666"))}}}
            }{{/if}}
          ]
        }
        {{#if (hasItems cta)}},
        "footer": {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "contents": [
            {{#each cta}}
            {
              "type": "button",
              "action": {
                "type": {{{json (default actionType "uri")}}},
                "label": {{{json label}}}
                {{#if (eq (default actionType "uri") "uri")}},
                "uri": {{{json url}}}
                {{else if (eq (default actionType "uri") "message")}},
                "text": {{{json text}}}
                {{else if (eq (default actionType "uri") "postback")}},
                "data": {{{json data}}}
                {{/if}}
              },
              "style": {{{json (default style (default ../../style.button.style "primary"))}}},
              "height": {{{json (default height (default ../../style.button.height "sm"))}}}
              {{#if (and (ne (default style (default ../../style.button.style "primary")) "link") (default (default color ../../style.button.color) null))}},
              "color": {{{json (default color ../../style.button.color)}}}
              {{/if}}
              {{#if buttonPatch}},
              "__patch": {{{json buttonPatch}}}
              {{/if}}
            }{{#unless @last}},{{/unless}}
            {{/each}}
          ]
        }
        {{/if}}
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }
}`;

// -----------------------------
// Single Poster (flexible)
// -----------------------------

export const singlePosterSchema: TemplateSchema = {
  schemaVersion: 2,
  title: '單頁活動海報（彈性）',
  sections: [
    {
      id: 'meta',
      title: '基本資訊',
      fields: [
        { key: 'altText', label: 'altText（通知摘要）', type: 'text', required: true, default: '查看活動海報', constraints: { maxLength: 60 } }
      ]
    },
    {
      id: 'hero',
      title: '主視覺',
      fields: [
        { key: 'heroImageUrl', label: '主圖 URL', type: 'imageUrl', required: true, constraints: { httpsOnly: true } },
        { key: 'heroAspectRatio', label: '圖片比例', type: 'select', required: true, default: '20:13', options: FLEX_ASPECT_RATIOS },
        { key: 'heroAspectMode', label: '圖片裁切', type: 'select', required: true, default: 'cover', options: FLEX_ASPECT_MODES }
      ]
    },
    {
      id: 'content',
      title: '內容',
      fields: [
        { key: 'title', label: '標題', type: 'text', required: true, constraints: { maxLength: 40 } },
        { key: 'titleSize', label: '標題字級', type: 'select', required: true, default: 'xl', options: FLEX_TEXT_SIZES },
        { key: 'titleColor', label: '標題顏色', type: 'color', required: true, default: '#111111' },

        { key: 'description', label: '描述', type: 'textarea', required: false, constraints: { maxLength: 400 } },
        { key: 'descriptionSize', label: '描述字級', type: 'select', required: true, default: 'sm', options: FLEX_TEXT_SIZES },
        { key: 'descriptionColor', label: '描述顏色', type: 'color', required: true, default: '#666666' },

        { key: 'date', label: '日期時間', type: 'text', required: false, constraints: { maxLength: 40 } },
        { key: 'location', label: '地點', type: 'text', required: false, constraints: { maxLength: 60 } },

        { key: 'bodyBgColor', label: '卡片背景', type: 'color', required: true, default: '#ffffff' }
      ]
    },
    {
      id: 'buttons',
      title: '按鈕（CTA）',
      repeatable: true,
      key: 'buttons',
      constraints: { minItems: 0, maxItems: 4 },
      itemSchema: {
        title: '按鈕 {{index}}',
        fields: [
          { key: 'label', label: '按鈕文字', type: 'text', required: true, constraints: { maxLength: 20 } },
          {
            key: 'actionType',
            label: '按鈕動作',
            type: 'select',
            required: true,
            default: 'uri',
            options: [
              { label: '開啟連結 (uri)', value: 'uri' },
              { label: '送出文字 (message)', value: 'message' },
              { label: '回傳資料 (postback)', value: 'postback' }
            ]
          },
          {
            key: 'url',
            label: '連結（uri）',
            type: 'url',
            required: false,
            constraints: { httpsOnly: true, requiredIf: { when: 'actionType', is: 'uri' } }
          },
          {
            key: 'text',
            label: '要送出的文字（message）',
            type: 'text',
            required: false,
            constraints: { maxLength: 300, requiredIf: { when: 'actionType', is: 'message' } }
          },
          {
            key: 'data',
            label: 'postback data（postback）',
            type: 'text',
            required: false,
            constraints: { maxLength: 300, requiredIf: { when: 'actionType', is: 'postback' } }
          },
          { key: 'style', label: '樣式', type: 'select', required: true, default: 'primary', options: FLEX_BUTTON_STYLES },
          { key: 'color', label: '按鈕顏色（primary/secondary）', type: 'color', required: false },
          { key: 'height', label: '高度', type: 'select', required: true, default: 'sm', options: FLEX_BUTTON_HEIGHTS },
          { key: 'buttonPatch', label: '進階：Button JSON Patch', type: 'json', required: false }
        ]
      }
    },
    {
      id: 'shareUi',
      title: '分享頁設定',
      fields: [
        { key: 'shareUi.iconUrl', label: '分享頁 icon', type: 'imageUrl', required: false, constraints: { httpsOnly: true } },
        { key: 'shareUi.primaryButtonText', label: '分享按鈕文字', type: 'text', required: true, default: '立即分享', constraints: { maxLength: 12 } },
        { key: 'shareUi.moreText', label: '展開預覽文字', type: 'text', required: true, default: '查看內容', constraints: { maxLength: 12 } }
      ]
    },
    {
      id: 'advanced',
      title: '進階（高手用）',
      fields: [
        { key: 'advanced.messagePatch', label: '整份 Flex JSON Patch（覆蓋/補充）', type: 'json', required: false }
      ]
    }
  ]
};

export const singlePosterTemplateText = `{
  "type": "flex",
  "altText": {{{json (default altText "查看活動海報")}}},
  "contents": {
    "type": "bubble",
    "size": "mega",
    "hero": {
      "type": "image",
      "url": {{{json heroImageUrl}}},
      "size": "full",
      "aspectRatio": {{{json (default heroAspectRatio "20:13")}}},
      "aspectMode": {{{json (default heroAspectMode "cover")}}}
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": {{{json (default bodyBgColor "#ffffff")}}},
      "contents": [
        {
          "type": "text",
          "text": {{{json title}}},
          "weight": "bold",
          "size": {{{json (default titleSize "xl")}}},
          "color": {{{json (default titleColor "#111111")}}},
          "wrap": true
        }
        {{#if description}},
        {
          "type": "text",
          "text": {{{json description}}},
          "size": {{{json (default descriptionSize "sm")}}},
          "color": {{{json (default descriptionColor "#666666")}}},
          "margin": "md",
          "wrap": true
        }
        {{/if}}
        {{#if date}},
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {"type": "text", "text": "📅", "size": "sm", "flex": 0},
            {"type": "text", "text": {{{json date}}}, "size": "sm", "color": "#666666", "margin": "sm", "flex": 1}
          ]
        }
        {{/if}}
        {{#if location}},
        {
          "type": "box",
          "layout": "baseline",
          "margin": "sm",
          "contents": [
            {"type": "text", "text": "📍", "size": "sm", "flex": 0},
            {"type": "text", "text": {{{json location}}}, "size": "sm", "color": "#666666", "margin": "sm", "flex": 1}
          ]
        }
        {{/if}}
      ]
    }
    {{#if (hasItems buttons)}},
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {{#each buttons}}
        {
          "type": "button",
          "action": {
            "type": {{{json (default actionType "uri")}}},
            "label": {{{json label}}}
            {{#if (eq (default actionType "uri") "uri")}},
            "uri": {{{json url}}}
            {{else if (eq (default actionType "uri") "message")}},
            "text": {{{json text}}}
            {{else if (eq (default actionType "uri") "postback")}},
            "data": {{{json data}}}
            {{/if}}
          },
          "style": {{{json (default style "primary")}}},
          "height": {{{json (default height "sm")}}}
          {{#if (and (ne (default style "primary") "link") (default color null))}},
          "color": {{{json color}}}
          {{/if}}
          {{#if buttonPatch}},
          "__patch": {{{json buttonPatch}}}
          {{/if}}
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }
    {{/if}}
  }
}`;

// -----------------------------
// Defaults
// -----------------------------

export const defaultTemplates: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '通用多頁 Carousel（彈性）',
    description: '適合產品展示、圖片輪播、多頁訊息。支援每頁獨立字級/顏色/按鈕樣式，並提供進階 JSON Patch。',
    status: 'published',
    version: 2,
    templateText: carouselTemplateText,
    schema: carouselSchema,
    sampleData: {
      altText: '2026年度行事曆',
      title: '2026 行事曆',
      subtitle: '點擊分享給好友/群組',
      hero: {
        aspectRatio: '1:1',
        aspectMode: 'cover'
      },
      style: {
        headline: { size: 'xl', weight: 'bold', color: '#111111' },
        desc: { size: 'sm', color: '#666666' },
        bubble: { bodyBgColor: '#ffffff' },
        button: { style: 'primary', color: '#06C755', height: 'sm' }
      },
      pages: [
        {
          headline: '一月精選',
          desc: '新年新希望，一起迎接美好的開始！',
          imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1040',
          cta: [
            { label: '了解更多', url: 'https://example.com/jan', style: 'primary', color: '#06C755', height: 'sm' }
          ]
        },
        {
          headline: '二月情人節',
          headlineColor: '#C2185B',
          desc: '浪漫情人節活動進行中',
          imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1040',
          cta: [
            { label: '查看活動', url: 'https://example.com/feb', style: 'secondary', color: '#111111', height: 'sm' }
          ]
        }
      ],
      shareUi: {
        primaryButtonText: '選擇分享對象',
        moreText: '查看內容'
      }
    }
  },
  {
    name: '單頁活動海報（彈性）',
    description: '適合活動宣傳、單一訊息推播。支援字級/顏色/按鈕樣式與進階 JSON Patch。',
    status: 'published',
    version: 2,
    templateText: singlePosterTemplateText,
    schema: singlePosterSchema,
    sampleData: {
      altText: '年度盛會邀請函',
      heroImageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1040',
      heroAspectRatio: '20:13',
      heroAspectMode: 'cover',
      title: '2026 年度盛會',
      titleSize: 'xl',
      titleColor: '#111111',
      description: '誠摯邀請您參加我們的年度盛會，精彩活動不容錯過！',
      descriptionSize: 'sm',
      descriptionColor: '#666666',
      date: '2026/03/15 14:00-18:00',
      location: '台北國際會議中心',
      bodyBgColor: '#ffffff',
      buttons: [
        { label: '立即報名', url: 'https://example.com/register', style: 'primary', color: '#06C755', height: 'sm' },
        { label: '查看詳情', url: 'https://example.com/details', style: 'secondary', color: '#111111', height: 'sm' }
      ],
      shareUi: {
        primaryButtonText: '立即分享',
        moreText: '查看內容'
      }
    }
  }
];
