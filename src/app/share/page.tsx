"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateMonthlyCostOfItem } from "@/lib/forecast/calc";
import { decodeShareState, encodeShareState } from "@/lib/share/codec";
import { loadAppState, saveAppState } from "@/lib/state/storage";
import type { AppState } from "@/types/domain";

function escapeCsv(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(state: AppState) {
  const header = [
    "商品名",
    "個数",
    "単価(円)",
    "周期",
    "月換算コスト(円)",
  ];
  const rows = state.items.map((item) => [
    item.name,
    item.quantity,
    item.priceYen,
    `${item.frequencyInterval}${item.frequencyUnit === "week" ? "週" : "か月"}`,
    Math.round(calculateMonthlyCostOfItem(item)),
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function buildExportFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `const-subscriptions-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
}

export default function SharePage() {
  const [state, setState] = useState<AppState | null>(null);
  const [url, setUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [message, setMessage] = useState("ローカルデータから共有URLを生成できます。");

  useEffect(() => {
    const run = async () => {
      const loaded = await loadAppState();
      setState(loaded);
    };

    void run();
  }, []);

  useEffect(() => {
    const data = new URL(window.location.href).searchParams.get("data");
    if (data) {
      setInputUrl(window.location.href);
    }
  }, []);

  const lengthWarning = useMemo(() => {
    if (url.length > 1800) {
      return "警告: 一部のアプリやチャットではURLが長すぎる可能性があります。";
    }

    return null;
  }, [url]);

  const generateUrl = () => {
    if (!state) {
      setMessage("データ読み込み中です。");
      return;
    }

    const encoded = encodeShareState(state);
    const generated = `${window.location.origin}/share?data=${encoded}`;
    setUrl(generated);
    setMessage("共有URLを生成しました。");
  };

  const copyUrl = async () => {
    if (!url) {
      return;
    }

    await navigator.clipboard.writeText(url);
    setMessage("共有URLをコピーしました。");
  };

  const importFromUrl = async () => {
    try {
      const parsed = new URL(inputUrl);
      const data = parsed.searchParams.get("data");

      if (!data) {
        throw new Error("URLに data パラメータがありません。");
      }

      const restored = decodeShareState(data);
      await saveAppState(restored);
      setState(restored);
      setMessage("このブラウザへデータを取り込みました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取り込みに失敗しました。");
    }
  };

  const exportCsv = () => {
    if (!state) {
      setMessage("データ読み込み中です。");
      return;
    }

    const csv = toCsv(state);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const urlObject = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = urlObject;
    anchor.download = buildExportFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(urlObject);
    setMessage("Googleスプレッドシート取り込み用CSVをダウンロードしました。");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">共有 / バックアップ</h1>
        <Button asChild variant="outline">
          <Link href="/">戻る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>共有URLを作成</CardTitle>
          <CardDescription>ローカルデータを圧縮してURLに埋め込みます。サーバーDBは使用しません。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={generateUrl}>生成</Button>
            <Button variant="outline" onClick={copyUrl} disabled={!url}>コピー</Button>
          </div>
          <textarea
            className="min-h-32 w-full rounded-md border border-input bg-background p-3 text-xs"
            value={url}
            readOnly
            placeholder="生成したURLがここに表示されます"
          />
          {lengthWarning ? <p className="text-sm text-orange-600">{lengthWarning}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スプレッドシートへエクスポート</CardTitle>
          <CardDescription>Googleスプレッドシートの「ファイル→インポート」で使えるCSVを出力します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportCsv}>CSVをダウンロード</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URLから取り込み</CardTitle>
          <CardDescription>共有URLを貼り付けて、埋め込まれたデータをこのブラウザに取り込みます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-xs"
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            placeholder="共有URLを貼り付け"
          />
          <Button onClick={importFromUrl}>取り込み</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>プライバシーに関する注意</CardTitle>
          <CardDescription>データ取り扱い方針</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- このアプリは定期便データをサーバー側DBに保存しません。</p>
          <p>- 共有URLには圧縮データが含まれます。URLを知っている人は復元して閲覧できます。</p>
          <p>- 購入内容などの機微情報を含む場合は公開チャネルで共有しないでください。</p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
