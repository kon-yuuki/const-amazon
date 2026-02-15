"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clearImportDraft, loadImportDraft } from "@/lib/import/draft";
import { loadAppState, saveAppState } from "@/lib/state/storage";

const MAX_TEXT_LENGTH = 20000;

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

export default function ImportTextPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("Amazon定期便ページのテキストを貼り付けてください。");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const draft = loadImportDraft();
    if (draft.length === 0) {
      return;
    }

    const rows = draft.map((item) => ({
      ...item,
      quantity: item.quantity ?? 1,
      include: true,
      id: crypto.randomUUID(),
    }));

    setParsedItems(rows);
    setStatus("success");
    setMessage(`画像取込の解析結果 ${rows.length} 件を読み込みました。`);
    clearImportDraft();
  }, []);

  const validationError = useMemo(() => {
    if (rawText.trim().length === 0) {
      return "テキスト入力は必須です。";
    }

    if (rawText.length > MAX_TEXT_LENGTH) {
      return `文字数が上限（${MAX_TEXT_LENGTH}文字）を超えています。`;
    }

    return null;
  }, [rawText]);

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
    });

    return errors;
  }, [parsedItems]);

  const updateRow = <K extends keyof ParsedItem>(id: string, key: K, value: ParsedItem[K]) => {
    setParsedItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const submit = async () => {
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("loading");
    setMessage("テキストを解析中です...（完了まで数分かかる場合があります）");

    try {
      const response = await fetch("/api/import/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ rawText }),
      });

      const payload = (await response.json()) as ParseApiPayload;

      if (!response.ok) {
        throw new Error(payload.message ?? "テキスト解析に失敗しました。");
      }

      const rows = (payload.items ?? []).map((item) => ({
        ...item,
        quantity: item.quantity ?? 1,
        include: true,
        id: crypto.randomUUID(),
      }));

      setParsedItems(rows);
      setStatus("success");
      setMessage(payload.message ?? "解析が完了しました。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "予期しないエラーが発生しました。");
    }
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">テキスト取込</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/import/image">画像アップロード</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">戻る</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>テキスト解析</CardTitle>
          <CardDescription>Amazon定期便管理画面のテキストを丸ごと貼り付けて解析します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-64 w-full rounded-md border border-input bg-background p-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={rawText}
            maxLength={MAX_TEXT_LENGTH + 1000}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="ここにAmazon定期便ページのテキストを貼り付け"
          />
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">{rawText.length} / {MAX_TEXT_LENGTH}</p>
            <Button onClick={submit} disabled={status === "loading"}>テキスト解析</Button>
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
                  <TableCell className="text-muted-foreground" colSpan={5}>解析結果はまだありません。</TableCell>
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
                      <Input
                        value={item.name}
                        onChange={(event) => updateRow(item.id, "name", event.target.value)}
                      />
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
                          onChange={(event) =>
                            updateRow(item.id, "frequencyInterval", Number(event.target.value))
                          }
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
