import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsValue | undefined>;

const MAX_ANALYTICS_TEXT_LENGTH = 120;
const FIRST_ACTION_KEY = "ipo-dashboard:first-action";

const clampText = (value: string) => value.slice(0, MAX_ANALYTICS_TEXT_LENGTH);

function cleanProperties(properties: AnalyticsProperties = {}): Record<string, AnalyticsValue> {
  const cleaned: Record<string, AnalyticsValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    cleaned[clampText(key)] = typeof value === "string" ? clampText(value) : value;
  }

  return cleaned;
}

export function cleanSearchTerm(value: string, maxLength = 64): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") return;

  try {
    track(clampText(name), cleanProperties(properties));
  } catch {
    // Analytics must never break the dashboard UX.
  }
}

export function trackUserAction(name: string, properties?: AnalyticsProperties) {
  trackEvent(name, properties);

  if (typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(FIRST_ACTION_KEY)) return;
    sessionStorage.setItem(FIRST_ACTION_KEY, name);
    trackEvent("First Action", {
      action: name,
      tab: window.location.hash.replace("#", "") || "overview",
      ...properties,
    });
  } catch {
    // Private browsing or blocked storage should not prevent normal tracking.
  }
}
