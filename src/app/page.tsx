"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceWorkerUpdateBanner } from "@/components/pwa/persistence-banner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  calculateMonthlyCostOfItem,
  calculateMonthlyFixedCost,
  calculateYearlyFixedCost,
} from "@/lib/forecast/calc";
import { calculateShares } from "@/lib/household/split";
import { createDefaultState } from "@/lib/state/defaults";
import { loadAppState, saveAppState } from "@/lib/state/storage";
import type { AppState } from "@/types/domain";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const dateTimeJa = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [itemMessage, setItemMessage] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<AppState["items"][number] | null>(null);

  useEffect(() => {
    const run = async () => {
      const loaded = await loadAppState();
      setState(loaded);
    };

    void run();
  }, []);

  const monthlyFixedCost = useMemo(() => {
    if (!state) {
      return 0;
    }

    return calculateMonthlyFixedCost(state.items);
  }, [state]);

  const yearlyFixedCost = useMemo(() => {
    if (!state) {
      return 0;
    }

    return calculateYearlyFixedCost(state.items);
  }, [state]);

  const shares = useMemo(() => {
    if (!state) {
      return [];
    }
    return calculateShares(monthlyFixedCost, state.members);
  }, [state, monthlyFixedCost]);

  const resetState = async () => {
    const next = await saveAppState(createDefaultState());
    setState(next);
    setItemMessage("データを初期化しました。");
  };

  const startRowEdit = (item: AppState["items"][number]) => {
    if (editingRowId && editingRowId !== item.id) {
      setItemMessage("編集中の行を先に保存またはキャンセルしてください。");
      return;
    }
    setEditingRowId(item.id);
    setRowDraft({ ...item });
    setItemMessage("行を編集中です。");
  };

  const updateRowDraftField = <K extends keyof AppState["items"][number]>(
    key: K,
    value: AppState["items"][number][K],
  ) => {
    setRowDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowDraft(null);
    setItemMessage("編集をキャンセルしました。");
  };

  const saveRowEdit = async () => {
    if (!state || !rowDraft || !editingRowId) {
      return;
    }

    if (
      !rowDraft.name.trim() ||
      rowDraft.quantity <= 0 ||
      rowDraft.priceYen < 0 ||
      rowDraft.frequencyInterval <= 0
    ) {
      setItemMessage("入力内容を確認してください（商品名/個数/金額/周期）。");
      return;
    }

    const next = await saveAppState({
      ...state,
      items: state.items.map((item) => (item.id === editingRowId ? rowDraft : item)),
    });
    setState(next);
    setEditingRowId(null);
    setRowDraft(null);
    setItemMessage("行を保存しました。");
  };

  const addRow = async () => {
    if (!state) {
      return;
    }
    if (editingRowId) {
      setItemMessage("編集中の行を先に保存またはキャンセルしてください。");
      return;
    }
    const newItem: AppState["items"][number] = {
      id: crypto.randomUUID(),
      name: "新規商品",
      quantity: 1,
      priceYen: 0,
      frequencyUnit: "month",
      frequencyInterval: 1,
    };
    const next = await saveAppState({
      ...state,
      items: [...state.items, newItem],
    });
    setState(next);
    setEditingRowId(newItem.id);
    setRowDraft({ ...newItem });
    setItemMessage("新しい行を追加しました。");
  };

  const removeItem = async (id: string) => {
    if (!state) {
      return;
    }
    const next = await saveAppState({
      ...state,
      items: state.items.filter((item) => item.id !== id),
    });
    setState(next);
    if (editingRowId === id) {
      setEditingRowId(null);
      setRowDraft(null);
    }
    setItemMessage("定期便を削除しました。");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 overflow-x-hidden px-4 py-10 sm:px-8">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Const. ダッシュボード</p>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Amazon定期便の費用管理ツール</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/about">About</Link>
            </Button>
          </div>
        </div>
      </header>

      <ServiceWorkerUpdateBanner />
      <section className="rounded-md border border-[#F3D9A5] bg-[#FEF7E0] p-3">
        <div className="flex items-start gap-2 text-sm text-[#5F4A1A]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            データはこの端末のブラウザに保存されます。ブラウザデータ削除・シークレットモード利用時などは消える可能性があります。
            定期的に「CSVエクスポート」または「データを共有」でバックアップしてください。
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>月の固定費</CardTitle>
            <CardDescription>周期を月単位に換算した合計</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-3xl font-bold text-primary">{yen.format(monthlyFixedCost)} / 月</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {shares.length === 0 ? (
                <p>個人単位の固定費: メンバー未設定</p>
              ) : (
                shares.map(({ member, shareYen }) => (
                  <p key={member.id}>{member.name}: <span className="font-mono">{yen.format(shareYen)}</span> / 月</p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>年換算固定費</CardTitle>
            <CardDescription>月固定費 × 12</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-bold text-primary">{yen.format(yearlyFixedCost)} / 年</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>データ操作</CardTitle>
            <CardDescription>定期便データの追加と初期化を実行できます</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/import">テキストから追加</Link></Button>
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/import/image">画像から追加</Link></Button>
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/share">データを共有</Link></Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={resetState}>すべて初期化</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>定期便一覧（{(state?.items ?? []).length}件）</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/share">CSVエクスポート</Link>
              </Button>
            </div>
            <CardDescription>登録済み定期便一覧</CardDescription>
            <p className="text-xs text-muted-foreground">
              最終更新: {state && state.items.length > 0 ? dateTimeJa.format(new Date(state.updatedAt)) : "-"}
            </p>
          </CardHeader>
          <CardContent className="max-w-full space-y-3 overflow-x-hidden">
            <div className="w-full max-w-full overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>個数</TableHead>
                  <TableHead>周期</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>小計</TableHead>
                  <TableHead>月換算コスト</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(state?.items ?? []).length ? (
                  (state?.items ?? []).map((item) => {
                    const isEditingRow = editingRowId === item.id && rowDraft !== null;
                    const view = isEditingRow ? rowDraft : item;
                    return (
                    <TableRow
                      key={item.id}
                      title={isEditingRow ? undefined : "編集"}
                      className={isEditingRow ? "" : "cursor-pointer"}
                      onClick={() => startRowEdit(item)}
                    >
                      <TableCell>
                        {isEditingRow ? (
                          <Input value={view.name} onClick={(event) => event.stopPropagation()} onChange={(event) => updateRowDraftField("name", event.target.value)} />
                        ) : (
                          <span className="text-link">{item.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditingRow ? (
                          <Input
                            type="number"
                            min={1}
                            value={view.quantity}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateRowDraftField("quantity", Number(event.target.value))}
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditingRow ? (
                          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                            <Input
                              type="number"
                              min={1}
                              value={view.frequencyInterval}
                              onChange={(event) => updateRowDraftField("frequencyInterval", Number(event.target.value))}
                            />
                            <select
                              className="rounded-md border border-input bg-background px-2 text-sm"
                              value={view.frequencyUnit}
                              onChange={(event) => updateRowDraftField("frequencyUnit", event.target.value as "week" | "month")}
                            >
                              <option value="week">週</option>
                              <option value="month">か月</option>
                            </select>
                          </div>
                        ) : (
                          `${item.frequencyInterval}${item.frequencyUnit === "week" ? "週" : "か月"}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditingRow ? (
                          <Input
                            type="number"
                            min={0}
                            value={view.priceYen}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateRowDraftField("priceYen", Number(event.target.value))}
                          />
                        ) : (
                          yen.format(item.priceYen)
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-price">{yen.format(view.priceYen * view.quantity)}</TableCell>
                      <TableCell className="font-mono text-price">{yen.format(calculateMonthlyCostOfItem(view))}</TableCell>
                      <TableCell>
                        {isEditingRow ? (
                          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                            <Button size="sm" onClick={() => void saveRowEdit()}>保存</Button>
                            <Button size="sm" variant="outline" onClick={cancelRowEdit}>キャンセル</Button>
                            <Button size="sm" variant="destructive" onClick={() => void removeItem(item.id)}>削除</Button>
                          </div>
                        ) : (
                          <Button variant="destructive" onClick={(event) => { event.stopPropagation(); void removeItem(item.id); }} disabled={!state}>削除</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );})
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">商品が未登録です。取込から追加してください。</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{itemMessage}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void addRow()} disabled={!state}>行を追加</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>メンバー負担額</CardTitle>
          <CardDescription>月の固定費に対する各メンバーの負担額</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/household">メンバーと比率を設定</Link></Button>
          </div>
          <div className="overflow-x-auto">
          <Table className="min-w-[420px]">
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead>比率</TableHead>
                <TableHead>負担額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">メンバーが設定されていません。</TableCell>
                </TableRow>
              ) : (
                shares.map(({ member, shareYen }) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell className="font-mono">{member.ratioPercent}%</TableCell>
                    <TableCell className="font-mono">{yen.format(shareYen)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Button
        asChild
        className="fixed bottom-6 right-6 z-50 h-12 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg hover:bg-accent/90"
      >
        <Link href="/import/image">AIで取込</Link>
      </Button>
    </main>
  );
}
