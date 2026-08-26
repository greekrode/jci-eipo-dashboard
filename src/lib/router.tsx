/**
 * Hand-rolled path router — pushState + popstate, no dependency.
 *
 * SSR-safe: the current path lives in context, seeded with `initialPath` so the prerender can
 * render any route on the server and the browser can hydrate the same tree.
 */
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { legacyHashToPath, normalizePath } from "@/lib/seo";

const NAV_EVENT = "app:navigate";

const RouteContext = createContext<string>("/");

function readPath(): string {
  return typeof window === "undefined" ? "/" : normalizePath(window.location.pathname);
}

export function RouteProvider({ initialPath, children }: { initialPath?: string; children: ReactNode }) {
  const [path, setPath] = useState(() => normalizePath(initialPath ?? readPath()));

  useEffect(() => {
    // Legacy hash tabs (/#explorer) — rewrite to the path equivalent once, without a reload.
    const legacy = legacyHashToPath(window.location.hash);
    if (legacy) {
      window.history.replaceState(null, "", legacy);
      setPath(legacy);
    }

    const sync = () => setPath(readPath());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAV_EVENT, sync);
    };
  }, []);

  return <RouteContext.Provider value={path}>{children}</RouteContext.Provider>;
}

/** Current pathname (normalized). */
export function useRoute(): string {
  return useContext(RouteContext);
}

/** pushState + notify. Navigating to the current path is a no-op (keeps the history stack clean). */
export function navigate(path: string): void {
  if (typeof window === "undefined") return;
  const next = normalizePath(path);
  if (next === readPath()) return;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(NAV_EVENT));
}

function isPlainLeftClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * A real `<a href>` — crawlers, middle-click, and "open in new tab" all work — that navigates
 * in-page on a plain left click. `forwardRef` so Radix `asChild` can slot it in.
 */
export const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function Link({ href, onClick, target, ...rest }, ref) {
    return (
      <a
        {...rest}
        ref={ref}
        href={href}
        target={target}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          if (!isPlainLeftClick(e)) return;
          if (target && target !== "_self") return;
          // Same-origin internal paths only; anything absolute is a normal link.
          if (!href.startsWith("/") || href.startsWith("//")) return;
          e.preventDefault();
          navigate(href);
        }}
      />
    );
  }
);
