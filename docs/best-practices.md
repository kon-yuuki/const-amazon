# Const 技術スタック ベストプラクティス集

最終更新: 2026-02-14
対象: `Next.js (App Router) / Vercel / Gemini API / IndexedDB(Dexie) / lz-string / next-pwa`

## 1. 結論サマリ（先に決めるべきこと）

- Next.jsは「Server Componentsを基本、必要な部分だけ`use client`」を徹底する。
- データ更新がある箇所は、キャッシュ戦略（`no-store` / `revalidate` / `revalidateTag`）を明示する。
- Geminiは「Structured Outputs(JSON Schema) + アプリ側バリデーション」を必須にする。
- APIキーはサーバーのみで扱い、`NEXT_PUBLIC_`は公開前提の値だけに限定する。
- IndexedDB保存はDexieでスキーマを明示し、単一レコード更新を基本に競合を避ける。
- PWAはオフラインだけでなく「Service Worker更新通知」を実装する。
- 共有URL圧縮（lz-string）はバージョン差異を考慮し、将来互換のためバージョン情報を同梱する。

## 2. Next.js (App Router)

### 推奨

- 既定をServer Componentsとして扱い、ブラウザAPIが必要な箇所だけClient Componentsに分離する。
- `use client`境界を細かく切って、クライアントJSバンドルを最小化する。
- `fetch`のキャッシュ挙動を「明示」する。
  - 常に最新が必要: `cache: 'no-store'`
  - ある程度の鮮度でよい: `next: { revalidate: N }`
  - イベント駆動更新: `next.tags` + `revalidateTag`

### 理由

- App RouterはServer Components前提で、機密情報保持やJS削減に向く。
- キャッシュは書き方で挙動が変わるため、暗黙にしない方が事故が少ない。

## 3. Vercel運用

### 推奨

- `Production / Preview / Development`で環境変数を分離する。
- 環境変数変更時は「再デプロイが必要」を運用ルールに入れる。
- リリース前にVercel Production Checklistをチェックリスト運用する。
- セキュリティヘッダー（CSP等）を`next.config`で明示設定する。

### 理由

- Vercelの環境変数は既存デプロイへ自動反映されない。
- セキュリティヘッダー未設定は脆弱性リスクと運用負債になる。

## 4. Gemini API（OCR/抽出）

### 推奨

- 返却はStructured Outputs（JSON Schema）を使う。
- スキーマ通過後も「業務バリデーション」を必ず通す。
  - 価格は0以上
  - 頻度は`week|month`のenum
  - 次回配送日はISO日付
- モデルは本番でStable系を優先し、Preview/Experimentalは限定利用にする。
- レート制限（RPM/TPM/RPD）前提で再試行（指数バックオフ）を実装する。

### 理由

- Structured Outputsはフォーマット安定化に有効だが、意味的正しさまでは保証しない。
- レート制限はAPIキー単位でなくプロジェクト単位のため、複数クライアント同時利用で詰まりやすい。

## 5. IndexedDB + Dexie

### 推奨

- 単一の`appState`レコードを`put`で更新し、一貫性を保つ。
- テーブルスキーマを固定し、将来の拡張時はDexie version migrationで管理する。
- 保存データに`schemaVersion`を持たせ、将来の移行を可能にする。

### 理由

- DexieはIndexedDBを型付きで扱いやすくし、保守しやすい。
- ブラウザ保存は既定でbest-effort。永続化要求をしないとOS都合で消える可能性がある。

## 6. PWA（next-pwa / Workbox）

### 推奨

- `next-pwa`は設定を最小化して導入し、必要時のみruntime cachingを拡張する。
- Service Worker更新時に「新バージョンがあります」通知を出す。
- オフライン時フォールバック（最低限Dashboard表示）を設ける。

### 理由

- Service Workerは更新検知してもタブが残ると切り替わらないため、通知なしだと古い挙動が残る。
- PWA体験は「インストール可否」より「更新/オフライン時UX」で品質差が出る。

## 7. lz-string（共有URL圧縮）

### 推奨

- 圧縮方式のバージョンをペイロードに含める（例: `v=1`）。
- 復元失敗時のフォールバックメッセージを実装する。
- 将来の互換性問題を避けるため、ライブラリ更新時は互換テストを行う。

### 理由

- lz-stringはバージョン/実装差でエンコード互換が崩れる注意点がある。
- 共有URLは壊れると復元不能なので、バージョン管理が必須。

## 8. このプロジェクト向け実装チェックリスト

- [ ] `NEXT_PUBLIC_`を最小化し、Gemini APIキーをクライアントに露出しない
- [ ] `fetch`全箇所にキャッシュ方針コメントを付与
- [ ] インポートAPIでJSON Schema + Zod検証
- [ ] 429/5xxの再試行ポリシー実装（上限回数・バックオフ）
- [ ] IndexedDBデータに`schemaVersion`を追加
- [ ] SW更新通知UI（再読み込み導線）
- [ ] セキュリティヘッダー（CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy）設定
- [ ] 共有URL復元の失敗ハンドリング（壊れたURL時）

## 9. 参考リンク（一次情報）

- Next.js Server/Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Caching Guide: https://nextjs.org/docs/app/guides/caching
- Next.js Environment Variables: https://nextjs.org/docs/app/guides/environment-variables
- Next.js headers config: https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Production Checklist: https://vercel.com/docs/production-checklist
- Vercel CSP: https://vercel.com/docs/headers/security-headers
- Vercel Conformance (required security headers): https://vercel.com/docs/conformance/rules/NEXTJS_MISSING_SECURITY_HEADERS
- Gemini Structured Outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini Models: https://ai.google.dev/gemini-api/docs/models
- Dexie: https://dexie.org/
- MDN Storage quotas/eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN `StorageManager.persist()`: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- next-pwa docs: https://ducanh-next-pwa.vercel.app/
- Workbox SW update handling: https://developer.chrome.com/docs/workbox/handling-service-worker-updates
- lz-string: https://github.com/pieroxy/lz-string

## 10. 注記（推論を含む項目）

- `Gemini 1.5 Flash`固定指定は、現行モデル体系との乖離リスクがあるため更新検討を推奨（モデル一覧とリリース運用からの推論）。
- `next-pwa`継続利用は可能だが、将来保守性を考えると代替（例: Serwist系）評価を早めに実施するのが安全（npm注記と運用一般論からの推論）。
