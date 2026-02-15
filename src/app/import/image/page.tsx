"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadAppState, saveAppState } from "@/lib/state/storage";

type Status = "idle" | "loading" | "success" | "error";

type ParsedItem = {
  id: string;
  include: boolean;
  name: string;
  quantity: number;
  priceYen: number;
  frequencyUnit: "week" | "month";
  frequencyInterval: number;
};

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

function normalizeName(name: string) {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

function dedupeItems(items: ParseApiPayload["items"]): NonNullable<ParseApiPayload["items"]> {
  const source = items ?? [];
  const unique = new Map<string, NonNullable<ParseApiPayload["items"]>[number]>();

  for (const item of source) {
    const key = [
      normalizeName(item.name),
      item.quantity,
      item.priceYen,
      item.frequencyUnit,
      item.frequencyInterval,
    ].join("|");

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()];
}

export default function ImportImagePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("1枚以上のスクリーンショットをアップロードしてください。");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [expectedItemCount, setExpectedItemCount] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);

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

  const rowErrors = useMemo(() => {
    const errors: string[] = [];

    parsedItems.forEach((item, index) => {
      if (!item.include) {
        return;
      }

      if (!item.name.trim()) {
        errors.push(`行${index + 1}: 商品名は必須です。`);
      }

      if (!Number.isFinite(item.priceYen) || item.priceYen < 0) {
        errors.push(`行${index + 1}: 金額は0以上で入力してください。`);
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        errors.push(`行${index + 1}: 個数は1以上で入力してください。`);
      }

      if (!Number.isFinite(item.frequencyInterval) || item.frequencyInterval <= 0) {
        errors.push(`行${index + 1}: 周期は1以上で入力してください。`);
      }
    });

    return errors;
  }, [parsedItems]);

  const updateRow = <K extends keyof ParsedItem>(id: string, key: K, value: ParsedItem[K]) => {
    setParsedItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

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
      if (expectedItemCount !== "") {
        formData.append("expectedItemCount", String(expectedItemCount));
      }

      const response = await fetch("/api/import/parse", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const payload = (await response.json()) as ParseApiPayload;
      if (!response.ok) {
        throw new Error(payload.message ?? "画像解析に失敗しました。");
      }

      const deduped = dedupeItems(payload.items);
      const rows = deduped.map((item) => ({
        ...item,
        quantity: item.quantity ?? 1,
        include: true,
        id: crypto.randomUUID(),
      }));

      setParsedItems(rows);

      setStatus("success");
      if (expectedItemCount !== "") {
        setMessage(`解析完了: 重複除外後 ${rows.length} 件（指定: ${expectedItemCount} 件）`);
      } else {
        setMessage(`解析完了: 重複除外後 ${rows.length} 件`);
      }
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

  const removeFileAt = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const saveSelected = async () => {
    if (isSaving) {
      return;
    }

    if (rowErrors.length > 0) {
      setStatus("error");
      setMessage(rowErrors[0]);
      return;
    }

    const selected = parsedItems.filter((item) => item.include);
    if (selected.length === 0) {
      setStatus("error");
      setMessage("保存対象の行を1件以上選択してください。");
      return;
    }

    setIsSaving(true);
    try {
      const current = await loadAppState();
      await saveAppState({
        ...current,
        items: [
          ...current.items,
          ...selected.map((item) => ({
            id: crypto.randomUUID(),
            name: item.name,
            quantity: item.quantity,
            priceYen: item.priceYen,
            frequencyUnit: item.frequencyUnit,
            frequencyInterval: item.frequencyInterval,
          })),
        ],
      });

      router.push("/");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "保存に失敗しました。");
      setIsSaving(false);
    }
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

          <div className="space-y-2">
            <label htmlFor="expected-item-count" className="block text-sm font-medium">
              商品点数（任意）
            </label>
            <Input
              id="expected-item-count"
              type="number"
              min={1}
              value={expectedItemCount}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "") {
                  setExpectedItemCount("");
                  return;
                }
                setExpectedItemCount(Number(value));
              }}
              placeholder="例: 8"
            />
            <p className="text-xs text-muted-foreground">
              入力すると解析時に件数ヒントとして利用します。結果表示時は重複行を自動除外します。
            </p>
          </div>

          <p className="text-sm text-muted-foreground">選択中: {files.length} ファイル</p>
          {files.length > 0 ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">アップロード済み画像</p>
                <Button variant="outline" size="sm" onClick={clearFiles}>
                  すべて削除
                </Button>
              </div>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-muted-foreground">{file.name}</p>
                    <Button variant="outline" size="sm" onClick={() => removeFileAt(index)}>
                      削除
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={submit} disabled={status === "loading"}>画像解析</Button>
            <Button variant="outline" onClick={submit} disabled={status !== "error"}>再試行</Button>
          </div>

          <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>
            {message}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>解析結果</CardTitle>
          <CardDescription>内容を確認・編集し、不要行を外してから保存してください。</CardDescription>
          <p className="text-xs text-muted-foreground">
            AIは誤って解析することがあります。保存前に商品名・金額・周期を必ず確認してください。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>使用</TableHead>
                <TableHead>商品名</TableHead>
                <TableHead className="w-20 whitespace-nowrap">個数</TableHead>
                <TableHead className="w-28 whitespace-nowrap">金額</TableHead>
                <TableHead className="w-40 whitespace-nowrap">周期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedItems.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    解析結果はまだありません。
                  </TableCell>
                </TableRow>
              ) : (
                parsedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={item.include}
                        onChange={(event) => updateRow(item.id, "include", event.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input value={item.name} onChange={(event) => updateRow(item.id, "name", event.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 px-2"
                        value={item.quantity}
                        onChange={(event) => updateRow(item.id, "quantity", Number(event.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-9 px-2"
                        value={item.priceYen}
                        onChange={(event) => updateRow(item.id, "priceYen", Number(event.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-9 w-16 px-2"
                          value={item.frequencyInterval}
                          onChange={(event) => updateRow(item.id, "frequencyInterval", Number(event.target.value))}
                        />
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={item.frequencyUnit}
                          onChange={(event) =>
                            updateRow(item.id, "frequencyUnit", event.target.value as "week" | "month")
                          }
                        >
                          <option value="week">週</option>
                          <option value="month">か月</option>
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button onClick={saveSelected} disabled={parsedItems.length === 0 || isSaving}>
              {isSaving ? "保存中..." : "選択行を保存"}
            </Button>
          </div>

          {rowErrors.length > 0 ? <p className="text-sm text-red-600">{rowErrors[0]}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
