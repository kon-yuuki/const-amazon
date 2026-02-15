export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4">
      <section className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold text-primary">オフラインです</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          一度読み込んだデータは、オフラインでも確認できます。
        </p>
      </section>
    </main>
  );
}
