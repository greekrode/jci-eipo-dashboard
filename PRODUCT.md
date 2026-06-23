# Product

## Register

product

## Users

Indonesian retail investors and analysts doing IPO diligence on the IDX (Indonesia Stock Exchange). They arrive in a research task: either scanning the historical record of how IPOs traded (day-1 to day-7 returns, by underwriter and sector), or sizing up the current crop of prospectus-stage deals before deciding whether to subscribe. They are numerate and skeptical, comfortable with dense tables, and want to verify a signal rather than be told one.

## Product Purpose

Turn raw IDX e-IPO data and dense prospectus PDFs into legible signal. Two surfaces: a historical analytics dashboard over ~246 deals (return behavior, underwriter league tables, sector/time trends), and an "Upcoming" section that puts prospectus-stage deals side by side (offering, float, valuation, leverage, use of proceeds, ownership) and drills into a per-deal forensic. Success is a user trusting a number because they can see its basis, then making a faster, better-informed subscribe/skip call.

## Brand Personality

Rigorous, terminal-native, quietly confident. Three words: precise, dense, trustworthy. It should feel like a professional trading terminal (Bloomberg/TradingView lineage) rather than a consumer fintech app: structure carried by borders and tabular numerals, not elevation or color. The voice states the number and its caveat; it never hypes.

## Anti-references

Colorful "AI-slop" dashboards (pastel gradient cards, glassmorphism, rounded 24px+ corners, emoji, hero-metric templates). Glossy consumer-SaaS marketing aesthetics. Any treatment that decorates the data instead of clarifying it, or that trades density for whitespace where the user wants more rows.

## Design Principles

- **Rigor over decoration.** Every pixel serves comprehension; if it doesn't help the user verify or compare, it goes.
- **Borders carry structure, not shadows.** Semi-brutalist: flat panels, strong visible lines, near-square corners (radius ~2px).
- **Data is the hero.** Tabular numerals, right-aligned figures, charts paired with the exact numbers behind them.
- **Density with clarity.** Favor more information per screen, but keep hierarchy legible through scale and weight, not noise.
- **Honest signal.** Show the basis (page citations, derivation notes, directional caveats); never imply false precision.

## Accessibility & Inclusion

WCAG AA contrast for all text (≥4.5:1 body, ≥3:1 large/labels). Full keyboard navigation with visible focus indicators. `prefers-reduced-motion` fully respected (all entrance/chart motion disabled, instant state). Color is never the sole signal (pos/neg pair color with sign and position).
