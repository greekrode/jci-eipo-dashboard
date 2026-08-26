import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** short secondary text rendered right-aligned in mono (e.g. a broker code) */
  hint?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** shown on the trigger when nothing is selected — e.g. "All sectors" */
  placeholder: string;
  /** singular noun for the summary line — "sector" renders "3 sectors" */
  noun: string;
  searchPlaceholder?: string;
  className?: string;
  align?: "left" | "right";
}

/** flat, semi-brutalist multi-select: searchable, select-all-shown, clear-all. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  noun,
  searchPlaceholder,
  className,
  align = "left",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listId = `${useId()}-list`;
  const selected = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(s));
  }, [options, query]);

  // filtered can shrink under the cursor — never point past the end
  const cursor = filtered.length === 0 ? -1 : Math.min(highlight, filtered.length - 1);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(
    (v: string) => {
      onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
    },
    [onChange, selected, value]
  );

  // click outside closes (also what makes only one panel open at a time)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // keep the highlighted row inside the scroll viewport
  useEffect(() => {
    if (!open || cursor < 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = (((cursor + (e.key === "ArrowDown" ? 1 : -1)) % filtered.length) + filtered.length) % filtered.length;
      setHighlight(next);
      // roving focus so Space/Enter land on the highlighted row
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.focus();
      return;
    }
    const onButton = (e.target as HTMLElement).tagName === "BUTTON";
    if (e.key === "Enter" && !onButton) {
      e.preventDefault();
      if (cursor >= 0) toggle(filtered[cursor].value);
      return;
    }
    // Space toggles the highlighted row — but must still type a space in the search box
    if (e.key === " " && !onButton && e.target !== searchRef.current) {
      e.preventDefault();
      if (cursor >= 0) toggle(filtered[cursor].value);
    }
  };

  const count = value.length;
  const summary =
    count === 0
      ? placeholder
      : count === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <div ref={rootRef} className={cn("relative w-full sm:w-auto", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-9 w-full items-center gap-1.5 rounded-[2px] border border-input bg-secondary px-2 text-left text-[17px] text-foreground",
          "focus-visible:border-primary focus-visible:outline-none sm:w-auto sm:min-w-[180px] sm:max-w-[260px]",
          count === 0 && "text-muted-foreground"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        {count > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${noun} filter`}
            title={`Clear ${noun} filter`}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }
            }}
            className="shrink-0 rounded-[2px] p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          onKeyDown={onPanelKeyDown}
          className={cn(
            "absolute left-0 right-0 top-full z-30 mt-1 rounded-[2px] border border-border bg-card shadow-md",
            "sm:w-[min(92vw,340px)]",
            align === "right" ? "sm:left-auto" : "sm:right-auto"
          )}
        >
          <div className="relative border-b border-border p-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              placeholder={searchPlaceholder ?? "Search…"}
              aria-label={searchPlaceholder ?? `Search ${noun}s`}
              className="h-9 w-full rounded-[2px] border border-input bg-secondary pl-7 pr-2 text-[17px] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-[12px] uppercase tracking-wider whitespace-nowrap text-muted-foreground">
            <span className="tabnum">{count} selected</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => {
                onChange([...new Set([...value, ...filtered.map((o) => o.value)])]);
                searchRef.current?.focus();
              }}
              className="uppercase tracking-wider hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select shown
            </button>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => {
                onChange([]);
                searchRef.current?.focus();
              }}
              className="ml-auto uppercase tracking-wider hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={`${noun} options`}
            className="max-h-[min(50vh,320px)] overflow-auto py-1"
          >
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3 text-[15px] text-muted-foreground">No matches</div>
            ) : (
              filtered.map((o, i) => {
                const on = selected.has(o.value);
                return (
                  // the row owns the click; the checkbox is the visual only, so a hit
                  // anywhere on the row toggles exactly once (no label re-dispatch)
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    data-idx={i}
                    onClick={() => toggle(o.value)}
                    onFocus={() => setHighlight(i)}
                    className={cn(
                      "flex min-h-[40px] cursor-pointer select-none items-center gap-2 px-2.5 py-1.5 text-[15px] outline-none",
                      on ? "bg-primary/10" : "hover:bg-muted/40",
                      i === cursor && (on ? "bg-primary/20" : "bg-muted/60")
                    )}
                  >
                    <input
                      type="checkbox"
                      className="pointer-events-none accent-primary"
                      checked={on}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{o.label}</span>
                    {o.hint && (
                      <span className="tabnum shrink-0 text-[13px] uppercase tracking-wider text-muted-foreground">
                        {o.hint}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
