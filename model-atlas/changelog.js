// Maintained automatically by the weekly update job (scripts/weekly-update-prompt.md).
// Newest entry first; capped at 20 entries. last_run updates on EVERY run, even no-change runs.
window.ATLAS_CHANGELOG = {
  "last_run": "2026-07-27 09:38",
  "entries": [
    {
      "date": "2026-07-27",
      "added": ["inkling", "solar-open2-250b", "laguna-s-2-1"],
      "upgraded": [],
      "note": "Three verified late-July releases: Inkling (Thinking Machines' first open model — 975B/41B trimodal MoE, RoPE-free relative-position attention, 1M ctx), Solar Open 2 250B-A15B (Upstage — hybrid softmax + KDA linear attention, NoPE), and Laguna S 2.1 (poolside's 118B/8B agentic-coding MoE, per-head attention gating). Kimi K3 skipped again: its HF repo is still an 'upcoming release' placeholder with no config to verify against."
    },
    {
      "date": "2026-07-24",
      "added": [],
      "upgraded": ["kimi-k2-7", "minimax-m2-7"],
      "note": "Weekly run: upgraded Kimi K2.7 and MiniMax-M2.7 to verified against newly published HF configs (M2.7 dense d_ff corrected to n/a — all 62 layers are MoE). Considered Kimi K3 (2.8T, 896 experts, KDA linear attention); skipped until weights/config go public 2026-07-27."
    },
    {
      "date": "2026-07-24",
      "added": [],
      "upgraded": [],
      "note": "Dark/light theme (auto-detects OS preference, ?theme= override) and click-to-enlarge diagram lightbox."
    },
    {
      "date": "2026-07-24",
      "added": [],
      "upgraded": [],
      "note": "Source-fidelity audit: 18 corrections across 12 models (GLM-5.1 active 40B; GLM-5.2 vocab 154,880 + lineage; DeepSeek-V4 Hash-routing description and FP4+FP8 precision; Qwen3-VL DeepStack direction + ViT 0.58B; M-RoPE labels; MiniMax licenses; SD3.5 fixed-sincos pos-emb)."
    },
    {
      "date": "2026-07-24",
      "added": ["initial catalog — 37 models"],
      "upgraded": [],
      "note": "Initial release: 37 LLM / VLM / generative models with generated architecture diagrams (Raschka-gallery style), search, filters, sort, spec drawer, and side-by-side compare. Specs verified against HF config.json and tech reports."
    }
  ]
};
