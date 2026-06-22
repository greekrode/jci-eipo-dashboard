// Categorical color per sector — used for the sector bar chart and table swatches.
// Muted but distinct hues tuned for the concrete-dark theme.
export const SECTOR_COLORS: Record<string, string> = {
  Financials: "#3d75ff",
  Technology: "#a78bfa",
  Healthcare: "#38c98a",
  Energy: "#f5a623",
  "Basic Materials": "#e0654f",
  "Consumer Non-Cyclicals": "#2dd4bf",
  "Consumer Cyclicals": "#f472b6",
  Industrials: "#94a3b8",
  "Transportation & Logistic": "#eab308",
  "Properties & Real Estate": "#c084fc",
  Infrastructures: "#fb923c",
};

export const sectorColor = (s: string): string => SECTOR_COLORS[s] ?? "#7c7f8a";

// Stable color per broker (hashed code -> palette). More brokers than colors, so it
// distinguishes neighbors rather than guaranteeing global uniqueness.
const BROKER_PALETTE = [
  "#3d75ff", "#38c98a", "#f5a623", "#e0654f", "#2dd4bf", "#f472b6", "#a78bfa",
  "#eab308", "#fb923c", "#60a5fa", "#34d399", "#c084fc", "#22b8cf", "#f87171",
  "#a3e635", "#e879f9",
];

export function brokerColor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return BROKER_PALETTE[h % BROKER_PALETTE.length];
}
