# Flex Share Studio (Vite + React)

這是一個「Flex Message 製作 + 分享連結」的前端專案：

- 後台製作 Flex Message（支援多頁 carousel）
- 發布後產生 `/share?token=...`
- share 頁面使用 LIFF v2 `shareTargetPicker()` 分享給好友/群組


## 管理員模式（不提供註冊）

此版本已移除前端「註冊」功能，僅提供「登入」。

你需要在 Supabase 後台手動建立你的管理員使用者（Email/Password），並在資料庫把該 user 設為 admin 角色（user_roles）。
同時也建議在 Supabase 後台關閉 Email Signups，避免任何人自行註冊。


---

## 目前專案狀態（你關心的 3 件事）

### 1) 有沒有 LIFF SDK？
有。`/share` 會動態載入 LIFF SDK：

- `src/pages/Share.tsx` 透過 `<script src="https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js">` 載入。

### 2) 有沒有串接 shareTargetPicker？
有。`src/components/share/ShareButton.tsx` 會呼叫：

- `liff.shareTargetPicker([{ type: 'flex', altText, contents }])`

### 3) Schema（TemplateSchema）要怎麼填？

你可以在 `src/lib/templates.ts` 看到兩個預設模板（可直接複製改）：

- **通用多頁 Carousel（彈性）**：可設定字級、顏色、按鈕樣式、按鈕顏色…等
- **單頁活動海報（彈性）**：適合單頁推播/活動海報

模板由兩部分組成：

1. `schema`：決定後台表單欄位、驗證規則、預設值
2. `templateText`：用 Handlebars 輸出合法的 Flex JSON

你可以用 `advanced.messagePatch`（JSON）對最終 Flex Message 做 deep-merge，屬於高手用的「最後一層覆蓋」。

---

## 本地開發

```bash
npm i
cp .env.example .env
npm run dev
```

### 必要環境變數

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_LIFF_ID`（LINE Developers Console 建 LIFF App 後取得）

---

## Supabase（資料庫）

此專案使用 Supabase 儲存 template/doc/share 相關資料。

- migration SQL：`supabase/migrations/...sql`

你可以用 Supabase Dashboard 直接貼上 migration SQL 執行，或用 Supabase CLI。

---

## Zeabur 部署（推薦）

此專案已內建 `Dockerfile` + `nginx.conf`（含 SPA fallback），並支援 Zeabur 注入的 `PORT` 環境變數，可直接部署到 Zeabur：

1. 將專案推到 GitHub
2. Zeabur → New Project → 連結 GitHub Repo
3. Zeabur 會自動偵測 `Dockerfile` 並建置
4. 設定 Environment Variables：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_LIFF_ID`
5. Deploy 完成後，使用 Zeabur 網域測試：
   - 後台：`/admin`
   - 分享頁：`/share?token=...`

> 重要：shareTargetPicker 必須在 LIFF 環境（LINE 內建瀏覽器）使用。若你用一般 Chrome 直接開 share 頁，會看到「不支援 shareTargetPicker」的提示。
