# Const

Amazon定期おトク便の情報を取り込み、月次の固定費として可視化する Next.js 15 製の PWA です。  
データは基本的にブラウザ内（IndexedDB）に保存し、共有時は圧縮したURLパラメータを使います。

## 主な機能

- テキスト/画像からの定期便データ取り込み（Gemini API）
- 月の固定費の集計・可視化
- 複数人家計の按分（均等/比率）
- 共有URLの生成・復元（バージョン付き）
- CSVエクスポート
- PWA対応（オフライン画面、更新通知）

## 技術スタック

- Next.js 15（App Router, TypeScript）
- React 19
- Tailwind CSS + shadcn/ui
- Gemini API（`@google/genai`）
- IndexedDB（Dexie）
- `next-pwa` + Workbox
- `lz-string`
- Vitest / Playwright

## 必要環境

- Node.js 20 以上推奨
- npm
- Gemini APIキー（インポート機能を使う場合）

## セットアップ

```bash
npm install
```

`.env.local` を作成し、以下を設定します。

```bash
# Required for import feature
GEMINI_API_KEY=your_api_key

# Optional (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Optional (recommended for production metadata)
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

### 環境変数の補足

- `GEMINI_API_KEY`
  - 未設定時、`/api/import/parse` はエラーになります。
  - サーバー側でのみ参照し、クライアントへ露出しません。
- `GEMINI_MODEL`
  - 未設定時は `gemini-2.5-flash` を使用します。
- `NEXT_PUBLIC_SITE_URL`
  - OGP/TwitterカードなどのURL整合に使うため、本番では設定推奨です。

## 開発コマンド

```bash
npm run dev       # .next を削除してから dev 起動
npm run lint      # ESLint
npm run test      # Unit tests (Vitest)
npm run test:e2e  # E2E tests (Playwright)
npm run build     # .next を削除してから production build
npm run start     # production server 起動
```

## 画面/ルート構成

- `/` : ダッシュボード（固定費表示）
- `/import` : 取り込み導線
- `/import/image` : 画像取り込み
- `/household` : 家計按分設定
- `/share` : 共有URL生成・復元、CSV出力
- `/offline` : オフライン時フォールバック
- `/about` : 説明ページ

## セキュリティ設定

`next.config.mjs` で以下ヘッダーを設定済みです。

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`

## 本番公開（Vercel）

### 1. 事前チェック

```bash
npm run lint
npm run test
npm run build
```

### 2. リポジトリ反映

- `main` ブランチに最新コードを push

### 3. Vercelでプロジェクト作成

1. Vercelで `Add New Project`
2. このGitHubリポジトリを選択
3. Framework Preset は `Next.js`（通常自動検出）

### 4. Environment Variables 設定

- `GEMINI_API_KEY`（必須）
- `GEMINI_MODEL`（任意）
- `NEXT_PUBLIC_SITE_URL`（推奨）

`Production` / `Preview` それぞれ必要に応じて設定します。

### 5. Deploy

- `main` を Production としてデプロイ

### 6. 公開後チェック

- `/` が表示される
- `/import` で解析導線が動作する
- `/share` でURL生成/復元が動作する
- PWAインストールと更新通知が確認できる

## 動作仕様メモ

- ローカル保存は IndexedDB（Dexie）を利用
- 共有データは圧縮してURLに同梱
- URL復元はバージョン情報を見て処理
- 壊れたURLや不正データは安全にエラー表示

## トラブルシューティング

- Gemini解析が失敗する
  - `GEMINI_API_KEY` の未設定/誤設定を確認
  - Gemini APIの利用制限（429/5xx）を確認
- 共有URLが復元できない
  - URLの `data` パラメータ欠損・改変を確認
- PWA更新が反映されない
  - アプリ内の更新通知から再読み込み
- ビルドが不安定
  - 本プロジェクトは `dev/build` 実行時に `.next` を削除する設定

## テスト

- Unit: `npm run test`
- E2E: `npm run test:e2e`

E2E実行時はローカル環境差分（ブラウザ実行可否、ヘッドレス設定）に依存するため、CIでの実行を推奨します。

## ドキュメント

- 要件/設計: `docs/prd.md`, `docs/concept.md`
- 実装課題一覧: `docs/issues.md`
- 品質ガイド: `docs/best-practices.md`
