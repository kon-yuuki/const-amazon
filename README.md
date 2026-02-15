# Const

日用品のAmazon定期便データを可視化し、月額固定費として扱うためのPWAアプリです。

## Tech Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Gemini API (`@google/genai`) for text/image extraction
- IndexedDB (`idb-keyval`) for local persistence
- `next-pwa` + Workbox for offline support
- `lz-string` for share URL compression

## Setup

```bash
npm install
```

`.env.local` を作成:

```bash
GEMINI_API_KEY=your_api_key
# optional
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` が未設定の場合、`/api/import/parse` はエラーを返します。

## Scripts

```bash
npm run dev       # local dev server
npm run lint      # eslint
npm run test      # unit tests (vitest)
npm run test:e2e  # e2e tests (playwright)
npm run build     # production build
npm run start     # production server
```

## Security Headers

`next.config.mjs` で以下を設定済み:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`

## Deploy (Vercel)

1. Vercelにリポジトリを接続
2. Environment Variablesに `GEMINI_API_KEY` を設定
3. `main` へデプロイ
4. 反映確認:
   - `/` ダッシュボード表示
   - `/import` で解析導線
   - `/share` でURL生成/復元

## Troubleshooting

- Gemini呼び出し失敗:
  - `GEMINI_API_KEY` 未設定/制限超過を確認
- Share URL復元失敗:
  - URLが欠損していないか、`data=` パラメータを確認
- PWA更新が反映されない:
  - 画面上部の更新通知からアップデートを適用
# const-amazon
