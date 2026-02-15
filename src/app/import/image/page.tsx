"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveImportDraft } from "@/lib/import/draft";

type Status = "idle" | "loading" | "success" | "error";

type ParseApiPayload = {
  message?: string;
  items?: Array<{
    name: string;
    quantity: number;
    priceYen: number;
    frequencyUnit: "week" | "month";
    frequencyInterval: number;
  }>;
};

export default function ImportImagePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("1枚以上のスクリーンショットをアップロードしてください。");

  const error = useMemo(() => {
    if (files.length === 0) {
      return "画像ファイルを1つ以上選択してください。";
    }

    const invalid = files.find((file) => !file.type.startsWith("image/"));
    if (invalid) {
      return `画像ファイルのみ対応です。対象外: ${invalid.name}`;
    }

    return null;
  }, [files]);

  const submit = async () => {
    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    setStatus("loading");
    setMessage("画像を解析中です...");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/import/parse", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const payload = (await response.json()) as ParseApiPayload;
      if (!response.ok) {
        throw new Error(payload.message ?? "画像解析に失敗しました。");
      }

      if (payload.items?.length) {
        saveImportDraft(payload.items);
      }

      setStatus("success");
      setMessage(`${payload.message ?? "解析が完了しました。"} 戻ると表に反映されます。`);
    } catch (submitError) {
      setStatus("error");
      setMessage(submitError instanceof Error ? submitError.message : "予期しないエラーが発生しました。");
    }
  };

  const addFiles = (nextFiles: File[]) => {
    if (nextFiles.length === 0) {
      return;
    }
    setFiles((current) => [...current, ...nextFiles]);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">画像取込</h1>
        <Button asChild variant="outline">
          <Link href="/">戻る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>画像解析</CardTitle>
          <CardDescription>
            複数画像に対応しています。商品一覧と配送スケジュール（価格）を一緒に入れると精度が上がります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-md border-2 border-dashed p-6 text-center text-sm transition ${
              dragActive ? "border-accent bg-accent/10" : "border-border"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              addFiles(Array.from(event.dataTransfer.files ?? []));
            }}
          >
            ここに画像をドラッグ＆ドロップ
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            className="block w-full text-sm"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />

          <p className="text-sm text-muted-foreground">選択中: {files.length} ファイル</p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={submit} disabled={status === "loading"}>画像解析</Button>
            <Button variant="outline" onClick={submit} disabled={status !== "error"}>再試行</Button>
          </div>

          <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>
            {message}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
