"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">About</h1>
        <Button asChild variant="outline">
          <Link href="/">戻る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>このアプリについて</CardTitle>
          <CardDescription>Amazon定期便などの購入周期を月単位に換算して、固定費を把握するためのツールです。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- 周期が異なる商品（例: 3週ごと、2か月ごと）を月換算して合計します。</p>
          <p>- メンバーごとの比率に応じて、個人負担額も表示します。</p>
          <p>- 画像/テキストからの取り込み、手動編集、CSVエクスポートに対応しています。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データ保存と注意事項</CardTitle>
          <CardDescription>保存先はサーバーではなく、この端末のブラウザです。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- データはこの端末のブラウザに保存されます。</p>
          <p>- ブラウザのデータ削除、端末の空き容量不足時の整理、シークレットモードでは消える可能性があります。</p>
          <p>- 重要データは「CSVエクスポート」または「データを共有（URL）」でバックアップしてください。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>バックアップ方法</CardTitle>
          <CardDescription>2つの方法を使い分けできます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- CSVエクスポート: Googleスプレッドシートでの管理に向いています。</p>
          <p>- 共有URL: このアプリでの復元・移行に向いています。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データ取り込み方法</CardTitle>
          <CardDescription>定期便データは2つの方法で取り込めます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- テキストから追加: Amazon定期便ページのテキストを貼り付けて解析します。</p>
          <p>- 画像から追加: 定期便商品一覧の画像や、配送スケジュールの画像をアップロードして解析します。</p>
          <p>- 取り込み後は定期便一覧で内容を編集し、保存してください。</p>
        </CardContent>
      </Card>
    </main>
  );
}
