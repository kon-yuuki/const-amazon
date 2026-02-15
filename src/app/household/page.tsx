"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { applyEqualSplit, ratioTotal, validateRatio } from "@/lib/household/split";
import { loadAppState, saveAppState } from "@/lib/state/storage";
import type { AppState, HouseholdMember } from "@/types/domain";

export default function HouseholdPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "ratio">("equal");
  const [message, setMessage] = useState("メンバーを編集して保存してください。");

  useEffect(() => {
    const run = async () => {
      const loaded = await loadAppState();
      setState(loaded);
      setMembers(loaded.members);
      setSplitMode(loaded.settings.splitMode);
    };

    void run();
  }, []);

  const total = useMemo(() => ratioTotal(members), [members]);
  const isValid = useMemo(() => (splitMode === "equal" ? true : validateRatio(members)), [members, splitMode]);

  const addMember = () => {
    const next = [...members, { id: crypto.randomUUID(), name: `Member ${members.length + 1}`, ratioPercent: 0 }];
    setMembers(splitMode === "equal" ? applyEqualSplit(next) : next);
  };

  const removeMember = (id: string) => {
    const next = members.filter((member) => member.id !== id);
    setMembers(splitMode === "equal" ? applyEqualSplit(next) : next);
  };

  const updateName = (id: string, name: string) => {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, name } : member)));
  };

  const updateRatio = (id: string, ratioPercent: number) => {
    if (splitMode === "equal") {
      return;
    }

    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, ratioPercent } : member)),
    );
  };

  const changeMode = (mode: "equal" | "ratio") => {
    setSplitMode(mode);
    setMembers((current) => (mode === "equal" ? applyEqualSplit(current) : current));
  };

  const save = async () => {
    if (!state) {
      return;
    }

    if (!isValid) {
      setMessage("比率モードでは合計比率を100%にしてください。");
      return;
    }

    const payload = {
      ...state,
      members: splitMode === "equal" ? applyEqualSplit(members) : members,
      settings: {
        ...state.settings,
        splitMode,
      },
    };

    const next = await saveAppState(payload);
    setState(next);
    setMembers(next.members);
    setMessage("家計メンバー設定を保存しました。");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">家計メンバー設定</h1>
        <Button asChild variant="outline">
          <Link href="/">戻る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>按分モード</CardTitle>
          <CardDescription>初期は均等割りです。必要なら任意比率に切り替えてください。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant={splitMode === "equal" ? "default" : "outline"} onClick={() => changeMode("equal")}>均等割り</Button>
          <Button variant={splitMode === "ratio" ? "default" : "outline"} onClick={() => changeMode("ratio")}>任意比率</Button>
          <Button variant="outline" onClick={addMember}>メンバー追加</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>メンバー一覧</CardTitle>
          <CardDescription>{splitMode === "ratio" ? `比率合計: ${total}%` : "均等割りは自動計算されます。"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="grid grid-cols-[1fr_140px_auto] gap-2">
              <Input value={member.name} onChange={(event) => updateName(member.id, event.target.value)} />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={Number.isFinite(member.ratioPercent) ? member.ratioPercent : 0}
                disabled={splitMode === "equal"}
                onChange={(event) => updateRatio(member.id, Number(event.target.value))}
              />
              <Button variant="outline" onClick={() => removeMember(member.id)} disabled={members.length <= 1}>削除</Button>
            </div>
          ))}
          {!isValid ? <p className="text-sm text-red-600">比率合計を100%にしてください。</p> : null}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button onClick={save}>設定を保存</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
