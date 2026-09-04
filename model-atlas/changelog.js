// Maintained automatically by the weekly update job (scripts/weekly-update-prompt.md).
// Newest entry first; capped at 20 entries. last_run updates on EVERY run, even no-change runs.
window.ATLAS_CHANGELOG = {
  "last_run": "2026-09-04 09:31",
  "entries": [
    {
      "date": "2026-09-04",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Muse Spark 1.3 launched Sep 2 but Meta shipped it proprietary (API/Muse Code only); the MuseSparkAI HF repos are empty README placeholders, so no open weights or config to verify (9th consecutive run watching Muse Spark). Considered and skipped: inclusionAI/Ling-3.0-flash-Fin (financial-domain variant of Ling-3.0-flash, same BailingMoeV3 architecture already judged small-scale/niche), BAAI ConsiSpace & MobileVLA-R1 (zip-dump repos with no config.json), BAAI Recon2Reason-Reasoning-4B (Qwen3-VL-4B finetune), and LTX-2.5 (still gated — HTTP 401 on config.json, 9th consecutive run). Re-checked the one partial entry, DeepSeek-V4-Flash-Vision-Exp: config unchanged and the README still discloses no total param count, so its ~297B estimate stands. All 51 models unchanged."
    },
    {
      "date": "2026-09-03",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Considered and skipped: OpenVDN/vdn-minimax-h3 (hybrid linear+softmax attention branch bolted onto MiniMax H3 — a community speed-up add-on, not a new base model), microsoft VibeVoice-ASR-Streaming 1.5B/7B (ASR, out of gallery scope), inclusionAI Ling-3.0 singprobe (5.18M-param streaming guardrail probe), internlm InternLumina-U2 (README-only placeholder, no weights), Whittle-Next-26B-A3B (GGUF research preview with no config.json), and LTX-2.5 / Muse Spark 1.2 (still gated or unpublished — 8th and 7th consecutive runs). DeepSeek-V4-Flash-Vision-Exp's README gained vLLM/SGLang serving recipes but still no total param count, so its ~297B estimate stands. All 51 models unchanged."
    },
    {
      "date": "2026-09-02",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Considered and skipped: Spark-X2.5-4B/1.7B (iFlytek's XHToken dense on-device models with a 3×sliding-window + full hybrid attention and native 1M context — verified from raw configs, but small-scale/niche and the SWA/full hybrid is already represented in the gallery), LTX-2.5 (still gated — HTTP 401 on config.json, 7th consecutive run), and Muse Spark 1.2 (still only a README placeholder on HF, no weights, 6th run). Re-checked the one partial entry, DeepSeek-V4-Flash-Vision-Exp: the official README still discloses no total parameter count, so its ~297B estimate stands. All 51 models unchanged."
    },
    {
      "date": "2026-09-01",
      "added": [
        "glm-5-3-flash",
        "qwen3-8-flash-next",
        "hy4-preview",
        "deepseek-v4-flash-vision-exp"
      ],
      "upgraded": [],
      "note": "Added the four frontier open-weight drops of the week, all verified from raw HF configs + official cards. GLM-5.3-Flash (320B/18B, MIT): Z.ai's first natively multimodal GLM-5 — a sparse + linear attention hybrid (34 KDA gated-linear layers, 64×128, conv 4, interleaved 3:1 with 11 DSA sparse layers on full-NoPE MLA; indexer 32×128 top-2048 with 4-key pooling), 288 experts top-8 + 1 shared with sigmoid dropless routing, mHC residuals, 1M context. Qwen3.8-Flash-Next (125B/6B + 51B n-gram embeddings + 4B MTP, Qwen Community License): the experimental Qwen4-architecture preview — 3:1 Gated DeltaNet + QSA (Qwen Sparse Attention) hybrid where a 4-Q-head MQA indexer selects 4-token micro-blocks (512 blocks = 2048-token budget) instead of per-token top-k, plus a Gated Residual (4 branches, rank-320). Hunyuan Hy4 preview (770B/49B, Apache-2.0): Tencent's flagship — Gated MLA + Gated DSA on all 78 layers with IndexCache cross-layer index reuse (21 of 78 layers run the indexer), iHC hyper-connections, native MTP drafter. DeepSeek-V4-Flash-Vision-Exp (~297B estimated, partial confidence — DeepSeek's first multimodal model): V4-Flash stack + 32-layer ViT tower, 3 MTP drafters, DSpark noise-token decoding. Considered and skipped: GLM-5.3 (text-only — config is byte-identical to the GLM-5.2 base except transformers_version; a post-training-only refresh, so the existing GLM-5.2 entry already covers the architecture), LTX-2.5 (still gated, 6th consecutive run), Muse Spark 1.2 (still unpublished). 51 models total."
    },
    {
      "date": "2026-08-25",
      "added": [
        "k-exaone-2-0"
      ],
      "upgraded": [],
      "note": "Added K-EXAONE 2.0 (750B/37B), LG AI Research's frontier open MoE — published on HF 2026-07-29 but missed by the earlier scans: 78 layers (2 dense head + 76 MoE), 256 experts top-8 + 1 shared with sigmoid dropless routing, LLLG hybrid attention (58 sliding-window layers with RoPE θ1M + 20 global NoPE layers in 19 × (3×128 + 1 global) blocks), Clamped SwiGLU on the last 16 layers, MTP + DSpark speculative drafters; verified against the raw config.json and arXiv:2608.04505 (recomputed 748.7B vs claimed 750B). Considered and skipped: SenseNova-U1.5-8B-MoT (dual-pathway Qwen3-based MoT any-to-any unified model — architecturally interesting but niche, 134 likes), LTX-2.5 (HF repos still gated, 3rd consecutive run), Ornith-1.5-35B-A3B (continued pretraining on the Qwen3.5 base), Muse Spark 1.2 (still unpublished, 4th run). All 47 entries verified."
    },
    {
      "date": "2026-08-24",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Considered and skipped: LTX-2.5 (Lightricks' 22B audiovisual DiT, still top-trending at ~738k downloads, but both HF repos remain gated — HTTP 401 on config.json, so no primary source for the released model; revisit if the config goes public), Ornith-1.5-397B (ornith-ai's flagship claims Opus-4.8-level coding, but it's continued pretraining + self-improvement RL on the Qwen3.5-397B base — same Qwen3_5Moe architecture already in the atlas), and Muse Spark 1.2 (still unpublished on HF, carried over from Aug 17/23). Also confirmed: Qwen/Qwen3.8-2.4T-A95B's full 213-shard weights are now public (created Aug 8) and its raw config matches the existing verified qwen3-8-max entry field-for-field (92 all-MoE layers, 512 experts top-10+1, 3:1 Gated-DeltaNet hybrid, 2.4T/95B per README) — no update needed. All 46 entries remain verified; zero partial/estimated entries left to upgrade."
    },
    {
      "date": "2026-08-23",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Considered and skipped: LTX-2.5 (Lightricks' 22B audiovisual DiT, the week's standout trending model — its HF repos are gated, so no primary-source config exists for the released 22B; the arXiv paper documents the earlier LTX-2 at 14B+5B, which does not match. Revisit if the config becomes public), DeepSeek-V4-Pro-0813 (config identical to the existing DeepSeek-V4-Pro entry except speculative-decoding metadata — checkpoint refresh), Ornith-1.5-35B-A3B (continued pretraining on the Qwen3.5-397B base, same Qwen3_5Moe architecture already in the atlas), Muse Spark 1.2 (weights announced Aug 10, still unpublished), and Kimi K3's Aug 20 repo update (tokenizer fix only, no architecture change). All 46 existing entries remain verified; nothing to upgrade."
    },
    {
      "date": "2026-08-17",
      "added": [
        "qwen3-8-max",
        "qwen3-8-27b",
        "muse-glimmer-30b"
      ],
      "upgraded": [],
      "note": "Added the three big open-weight drops of the week, all verified from raw HF configs. Qwen3.8-Max (2.4T total / 95B active) is the largest open-weight model to date: 92 all-MoE layers (512 experts, top-10 + 1 shared) on a 3:1 Gated-DeltaNet + gated full-attention hybrid, text-only under a custom license. Qwen3.8-27B is its dense vision-language companion (same hybrid stack, Apache 2.0). Muse Glimmer 30B is Meta's return to open weights (first since Llama 4): a 30B dense VLM distilled from Muse Spark 1.2 — (SWA×3, Full)×13 with RoPE on sliding layers and NoPE on global ones, Apache 2.0. Skipped: Muse Spark 1.2 itself (weights announced but not yet published — revisit)."
    },
    {
      "date": "2026-08-10",
      "added": [
        "minimax-h3"
      ],
      "upgraded": [],
      "note": "Added MiniMax H3 (Hailuo 3.0), the first video-generation model in the atlas: a 33B dense single-stream 'Omni-Transformer' video diffusion model (weights on HF 2026-08-03) — 50 layers, d_model 5376, 56 MHA heads with 3D MM-RoPE and per-head QK-RMSNorm, SwiGLU d_ff 14336, per-modality AdaLN (video/text/audio), text conditioning in-stream from Qwen3-VL-32B layer-50 states; generates 4-15 s clips at up to 2K/24fps with native stereo audio. All numbers from the HF transformer config.json and the official diffusers implementation. Considered and skipped: Qwen3.8-Max/27B (announced, weights promised for the week of Aug 10 but nothing published yet — revisit next run), DeepSeek-V4-Flash-0731 (checkpoint refresh, already covered)."
    },
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
