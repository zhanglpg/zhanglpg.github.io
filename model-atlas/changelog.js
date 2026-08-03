// Maintained automatically by the weekly update job (scripts/weekly-update-prompt.md).
// Newest entry first; capped at 20 entries. last_run updates on EVERY run, even no-change runs.
window.ATLAS_CHANGELOG = {
  "last_run": "2026-08-03 09:30",
  "entries": [
    {
      "date": "2026-08-03",
      "added": [
        "longcat-2-0"
      ],
      "upgraded": [],
      "note": "Added LongCat-2.0 (Meituan) as verified: 1.6T/48B ScMoE flagship trained entirely on Chinese AI ASICs — 38 layers each holding 2 MLA blocks + 2 dense FFNs + a 768-expert top-12 MoE with 128 zero-computation identity experts, LongCat Sparse Attention (a DSA-style top-2048 indexer with streaming-aware, cross-layer and hierarchical indexing), 135B of N-gram embedding parameters, 1M context. Structure confirmed from the safetensors tensor map. Considered and skipped: DeepSeek-V4-Flash-0731 (checkpoint refresh, same architecture), XYZ-Aquila-pro (Qwen3.5-397B finetune), Microsoft Fara1.5-27B (Qwen3.5-27B finetune), Kroma (LoRA for Krea 2); Mistral's teased MoE family has no weights or specs yet."
    },
    {
      "date": "2026-07-29",
      "added": [],
      "upgraded": [
        "deepseek-v4-pro",
        "deepseek-v4-flash",
        "kimi-k3",
        "deepseek-v3",
        "deepseek-r1",
        "kimi-k2",
        "kimi-k2-6",
        "kimi-k2-7",
        "kimi-vl-a3b",
        "deepseek-v3-2-exp",
        "glm-5-1",
        "glm-5-2",
        "qwen3-next-80b-a3b",
        "qwen3-5-397b-a17b",
        "minimax-text-01",
        "minimax-m2",
        "minimax-m2-7",
        "minimax-m3",
        "gpt-oss-120b",
        "gpt-oss-20b",
        "gemma-3-27b",
        "llama-4-scout",
        "llama-4-maverick",
        "inkling",
        "laguna-s-2-1",
        "solar-open2-250b",
        "flux1-dev",
        "stable-diffusion-3-5-large"
      ],
      "note": "Diagrams now open up the attention mechanism itself, not just its name. Each model gets exploded per-mechanism panels showing the real internal dataflow with verified dimensions: MLA latent compression (c_KV/k_R cache, decoupled RoPE, weight absorption), DeepSeek-V4's CSA/HCA compressed-sparse stacks over a shared-K=V MQA backbone with the Lightning Indexer, DSA token top-k (+ GLM-5.2 IndexShare cross-layer reuse), Kimi K3's KDA delta-rule linear attention and AttnRes snapshot-bank residuals, Gated DeltaNet, MiniMax Lightning/MSA block-sparse, sliding/chunk/full spans, GQA head-grouping, MMDiT joint attention, and DeepSeek-V4's mHC hyper-connection residual stream. Every number was re-verified against HF configs + tech reports (9-family research pass with adversarial fact-checking) and the diagrams passed a multi-agent visual review. Corrected a few dataset labels the sources contradicted: Kimi K3 is NoPE (not RoPE), Kimi-VL-A3B uses V2-Lite MLA with no query compression, GLM-5.2 runs IndexShare, DeepSeek-V3.2 is partial-RoPE."
    },
    {
      "date": "2026-07-28",
      "added": [],
      "upgraded": [
        "solar-open2-250b",
        "inkling",
        "laguna-s-2-1",
        "minimax-text-01",
        "gemma-3-27b",
        "llama-4-scout",
        "llama-4-maverick",
        "gpt-oss-120b",
        "gpt-oss-20b",
        "qwen3-next-80b-a3b",
        "qwen3-5-397b-a17b",
        "deepseek-v4-pro",
        "deepseek-v4-flash",
        "minimax-m3"
      ],
      "note": "Rolled out the K3-style split-attention diagram to all 14 heterogeneous models. The decoder block now shows each attention type as a labeled box (width ∝ layer count) plus a per-layer tick strip of the true interleave order — sliding-window vs full (gpt-oss, Gemma 3, Llama 4, Inkling, Laguna), linear vs softmax (Solar Open 2, MiniMax Text-01, Qwen3-Next/3.5), and DeepSeek-V4's CSA vs HCA compressed-attention alternation (from config compress_ratios; Flash adds 2 sliding warmup layers). Patterns verified against HF config.json layer lists."
    },
    {
      "date": "2026-07-28",
      "added": [
        "kimi-k3"
      ],
      "upgraded": [],
      "note": "Kimi K3 tech report + open weights dropped — no longer the 'upcoming release' placeholder we'd been skipping. Added as verified against HF config.json: 2.8T/104B Stable LatentMoE (896 experts top-16 + 2 shared, latent dim 3584) on a Kimi Delta Attention backbone — 93 layers, 69 KDA linear + 24 gated-MLA full attention with Attention Residuals, SiTU-GLU activation, native multimodal (MoonViT), 1M context. World's first open 3T-class model. New: dedicated KDA/MLA split diagram — the attention box shows both types side by side with a 93-tick layer-order strip of the true interleave pattern."
    },
    {
      "date": "2026-07-27",
      "added": [
        "inkling",
        "solar-open2-250b",
        "laguna-s-2-1"
      ],
      "upgraded": [],
      "note": "Three verified late-July releases: Inkling (Thinking Machines' first open model — 975B/41B trimodal MoE, RoPE-free relative-position attention, 1M ctx), Solar Open 2 250B-A15B (Upstage — hybrid softmax + KDA linear attention, NoPE), and Laguna S 2.1 (poolside's 118B/8B agentic-coding MoE, per-head attention gating). Kimi K3 skipped again: its HF repo is still an 'upcoming release' placeholder with no config to verify against."
    },
    {
      "date": "2026-07-24",
      "added": [],
      "upgraded": [
        "kimi-k2-7",
        "minimax-m2-7"
      ],
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
      "added": [
        "initial catalog — 37 models"
      ],
      "upgraded": [],
      "note": "Initial release: 37 LLM / VLM / generative models with generated architecture diagrams (Raschka-gallery style), search, filters, sort, spec drawer, and side-by-side compare. Specs verified against HF config.json and tech reports."
    }
  ]
};
