export function Footer() {
  return (
    <footer className="border-t border-ink/15 mt-24">
      <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-rice text-rice font-mono text-[10px] font-bold"
            aria-hidden="true"
          >
            K
          </span>
          <span className="font-display text-sm font-semibold">Kianja</span>
          <span className="text-xs text-ink-soft/70">
            — la place de marche des freelances etudiants
          </span>
        </div>
        <p className="text-xs text-ink-soft/70 font-mono">
          Projet L3 Informatique — EMIT Fianarantsoa
        </p>
      </div>
    </footer>
  );
}
