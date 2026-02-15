"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PersistState = "checking" | "granted" | "denied" | "unsupported";

export function StoragePersistenceBanner() {
  const [state, setState] = useState<PersistState>("checking");
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (typeof navigator === "undefined" || !navigator.storage?.persisted || !navigator.storage?.persist) {
        setState("unsupported");
        return;
      }

      const already = await navigator.storage.persisted();
      if (already) {
        setState("granted");
        return;
      }

      setState("denied");
    };

    void run();
  }, []);

  const message = useMemo(() => {
    switch (state) {
      case "granted":
        return requested
          ? "永続化を有効化しました。ブラウザが容量不足でも、このアプリの保存データが消えにくくなります。"
          : "ストレージ永続化は有効です。ブラウザが容量不足でも、このアプリの保存データが消えにくい状態です。";
      case "denied":
        return requested
          ? "永続化は有効化されませんでした。ブラウザ設定や端末条件により拒否される場合があります。"
          : "データ消去リスクを下げるため、永続化を有効化できます（端末によっては確認ダイアログなしで判定されます）。";
      case "unsupported":
        return "このブラウザは永続化リクエストに対応していません。";
      default:
        return "ストレージ永続化を確認中...";
    }
  }, [state, requested]);

  const requestPersist = async () => {
    if (!navigator.storage?.persist) {
      setState("unsupported");
      return;
    }

    setRequested(true);
    const granted = await navigator.storage.persist();
    setState(granted ? "granted" : "denied");
  };

  return (
    <section className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={requestPersist}
          disabled={state === "checking" || state === "granted" || state === "unsupported"}
        >
          永続化を有効化
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        実行内容: この端末のブラウザに「このサイトの保存領域を優先保持してよいか」を問い合わせます。外部送信はありません。
      </p>
    </section>
  );
}

export function ServiceWorkerUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const wireRegistration = (registration: ServiceWorkerRegistration) => {
      const checkWaiting = () => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }
      };

      checkWaiting();

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(worker);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        wireRegistration(registration);
      }
    });

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) {
      return;
    }

    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  if (!waitingWorker) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-md border border-accent/40 bg-accent/10 p-3",
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <p className="text-sm text-primary">新しいバージョンが利用できます。</p>
      <Button size="sm" onClick={applyUpdate}>更新</Button>
    </section>
  );
}
