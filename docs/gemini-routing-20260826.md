# Gemini Flash routing benchmark — 2026-08-26

Production benchmark using the configured GEMINI_API_KEY and a fixed Korean Bible-search intent task:

- gemini-3.7-flash: 3/3 runs timed out at about 9s in the current production window.
- gemini-3.6-flash: successful in 2/3 measured runs, about 1.1–1.8s when successful.
- gemini-3.5-flash: successful in 3/3 measured runs, about 1.0–1.2s.

Routing decision for latency-sensitive endpoints:

1. Use Gemini 3.5 Flash first for search intent and short verse Q&A.
2. Hedge Gemini 3.6 Flash shortly after as a quality/speed backup.
3. Do not place Gemini 3.7 Flash on the hot path while it is repeatedly timing out; keep it available for future re-benchmarking.
4. Keep NVIDIA as the quality/deep reasoning path and as provider fallback.
5. Keep local deterministic fallback as the final safety path.

This decision is based on measured production latency, not model capability alone.