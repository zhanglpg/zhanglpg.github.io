// Maintained automatically by the weekly update job (scripts/weekly-update-prompt.md).
// Newest entry first; capped at 20 entries. last_run updates on EVERY run, even no-change runs.
window.ATLAS_CHANGELOG = {
  "last_run": "2026-09-18 10:58",
  "entries": [
    {
      "date": "2026-09-18",
      "added": [
        "gigachat3-5-reasoning",
        "xing4-0-29b-a4b"
      ],
      "upgraded": [],
      "note": "Added two open-weight frontier-class MoEs verified against HF config.json + README: GigaChat 3.5 Reasoning (Sber, 432B/28B, MIT — 256-expert top-8 + 1 shared over 30 GatedDeltaNet / 10 gated-MLA hybrid layers, ZeroCenteredGatedNorm pre+post, 3 MTP heads, six domain experts merged by online-RL + on-policy distillation, natively FP8-trained) and Xing4.0-29B-A4B (China Telecom, TeleChat lineage, 29B/4B Apache-2.0 — all-MLA MoE with 4-stream mHC hyper-connected residuals, 1 MTP draft layer, first model of its scale trained end-to-end on Ascend NPUs). Skipped as derivatives: prism-ml Ternary-Bonsai-2-27B (ternary quant of tracked Qwen3.8-27B per base_model tag), nvidia DeepSeek-V4.1-Flash-NVFP4, ZGCM-1-7B (small dense, no novelty). 62 models, v24."
    },
    {
      "date": "2026-09-17",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Scanned HF newest-models (text-generation, image-text-to-text, text-to-image, text-to-video, image-to-video; createdAt ≥ Sep 15), ~40-org sweep (DeepSeek, Qwen, zai-org, THUDM, moonshotai, meta, Mistral, google, nvidia, MiniMax, inclusionAI, internlm, BAAI, Agnes-AI, openbmb, nex-agi, m-a-p, TaichuAI, ibm-granite, Lightricks, et al.), trendingScore + likes7d top-40, and web search. Everything new since the last run was a derivative or re-upload of tracked/previously-assessed models: empero-ai/Qwen3.8-35B-A3B-Distill (12 likes) is an SFT distillation of tracked Qwen3.6-35B-A3B per its base_model tag — no-distill rule; harshatheg/Qwen-2.5-1B-RLCD (127 likes) is an MLX constrained-decoding finetune of Qwen2.5-1.5B-Instruct; CrowtherLabs/atom-proton-1.0 and Mapika/decider-2b-vision are Qwen3.8-27B-FP8 / Qwen3.5-2B finetunes; x-square-robot/X-Planner-9B and keepstar/Kali-Lite-Vision-9B are qwen3_5-arch domain VLMs; BAAI/Brainmu-Spike is a spike-camera reconstruction LoRA (out of atlas scope); internlm/Atria-Dawn-Preview-Ascend-w8a8 is a quant of the Sep-15-skipped Atria (config-identical to tracked GLM-5.2); PrismLive-2B/4B are MLX quants of gemma-4-E4B; TaichuAI/ZDTaichu5.0-9B-FP8/MLX/GGUF are quants of the already-assessed Sep-4 9B; plus the usual luganoquant/kingjones777/comatto/Abiray quant-GGUF wave over DeepSeek-V4.1-Flash, GLM-5.3-Flash, Kimi-K3, Agnes-3.0-Flash, Qwen3.8-Flash-Next, LTX-2.5, MiniMax-H3 and Wan2.2, the frtertaer LTX-2.5-uncensored FP8 re-upload, FastVideo-FastH3 LoRAs, and SDXL/Flux/Krea/Z-Image LoRA churn. Web search surfaced only closed-weight or derivative items (Abacus Smaug = Kimi-K3/V4-Flash/Qwen3.8-27B post-trains; State-of-Open-Source report mentions no new open weights). Partial rechecks: llada2-2-flash README still discloses no official active-param count (lastModified Aug 20) and deepseek-v4-flash-vision-exp is unchanged (lastModified Sep 1) — both stay partial; CohereLabs/North-Small-Translate-1.0 and Lightricks/LTX-2.5 still gated HTTP 401 (18th run). 60 models unchanged."
    },
    {
      "date": "2026-09-16",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Scanned HF newest-models (text-generation, image-text-to-text, text-to-image, text-to-video, image-to-video; createdAt ≥ Sep 14), ~40 org sweeps, trendingScore top-40, and web search. Everything new was a derivative or re-upload of tracked/previously-assessed models: Accio-Lab/occamy-1.0 (81 likes, the 'Alibaba co-work agent' in Sep 15 press) is an agentic post-train of Qwen3.6-35B-A3B per its own README (base_model tag) — skipped per the no-finetune rule; cloudyu/GLM-5.3-SLIM-E192 is an expert-pruned FP8 cut of GLM-5.3 (itself config-identical to tracked GLM-5.2); Cyclone-Labs/Solar-Griffin-26B-A4B is a mergekit merge of Gemma-4 finetunes; aoiandroid/LFM2.5-2.6B re-uploads the August LiquidAI release (pre-window); the inclusionAI *-singprobe wave (Sep 14) are eval probes of 15 tracked models; qikuanz/Spark-X2.5-4B and Sonorix/pulsar-v0.7 are a GGUF of an already-skipped 4B and a Qwen2.5-0.5B LoRA; nvidia foundationpose/c-foundationstereo are 3D pose/stereo models, out of atlas scope; the rest was the usual Qwen3.8/GLM-5.3/DeepSeek-V4.1 quant + SDXL/Wan/LTX LoRA churn. Web search surfaced only closed-weight items (Salesforce Koa pilot, TypeSafe Jev early-access). Partial rechecks: llada2-2-flash README still discloses no official active-param count and deepseek-v4-flash-vision-exp is unchanged (lastModified Sep 1) — both stay partial; CohereLabs/North-Small-Translate-1.0 and Lightricks/LTX-2.5 still gated HTTP 401 (17th run). 60 models unchanged."
    },
    {
      "date": "2026-09-15",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Two Shanghai AI Lab releases since Sep 13 were both post-trained variants of tracked architectures: internlm/Intern-S2-397B (40 likes) is Qwen3_5MoeForConditionalGeneration — the identical 60L/d4096/512-expert-top-10 Gated-DeltaNet 3:1 hybrid spec as the tracked Qwen3.5-397B-A17B — and internlm/Atria-Dawn-Preview (57 likes, agentic research model) is GlmMoeDsaForCausalLM with the exact GLM-5.2 config (78L/d6144/256 experts, MLA+DSA with 21-of-78 IndexShare layers), its README stating it is built on the 744B GLM-5.2 foundation — both skipped per the no-finetune-of-tracked-models rule (consistent with the Nex-N2.5 decisions). Also skipped: tencent/Simple-Attention-Sparsification (research attention-gate weights for Qwen3-4B/14B, arXiv 2609.13141), OPENGCM/GTM-3-base (75M single-GPU nanoGPT toy), zeromodels SD/SDXL re-uploads, and the DeepSeek-V4.1-Flash / Qwen3.8 / GLM-5.3 quant wave (soyrsoyr NVFP4/MXFP4/FP8 validation builds, MLX, GGUF, thoughtworks backdoor research checkpoints). Partial rechecks: llada2-2-flash README still discloses no official active-param count and deepseek-v4-flash-vision-exp is unchanged (lastModified Sep 1, ~297B stays estimated) — both remain partial; CohereLabs/North-Small-Translate-1.0 and Lightricks/LTX-2.5 still gated HTTP 401 (16th run). 60 models unchanged."
    },
    {
      "date": "2026-09-14",
      "added": [
        "agnes-3-0-flash",
        "aliceai-t5-35b-a0-6b"
      ],
      "upgraded": [],
      "note": "Added Agnes-3.0-Flash Preview (Sep 11, Agnes AI): a 33B dense multimodal hybrid-attention decoder in the gated-delta-net lineage — 54 delta-rule recurrent layers (16k/48v heads, conv k4, fp32 state) alternating 3:1 with 18 GQA global-attention layers (24q/4kv, d_h 256), so only 18 of 72 layers hold a growing KV cache; 262K context, parallel SwiGLU 2048 branch in every layer, 27L/1152d ViT, Apache-2.0, verified against config.json + README + 19-shard bf16 weights (66.2 GB). New 3:1 delta/global split diagram with a 72-tick layer strip. Also added Yandex AliceAI-T5-35B-A0.6B (Sep 10): a UL2-style encoder-decoder (16L encoder + 12L decoder, d1536) whose FFNs in all 28 layers are dMoE blocks with 512 tiny SwiGLU experts (d_ff 512) top-8 via a learned sigmoid router with L1-normalized weights and aux-loss-free bias updates — 34.35B unique but only ~0.6B active per token; 128K context via YaRN, tied shared embeddings, Apache-2.0, verified against config.json + README + 15-shard weights. Considered and skipped: Edge0-35B-A3B-preview (4-bit MLX quant of Qwen3.5-35B-A3B), NeoHorse-1-4B (Qwen3.5-4B finetune), Lotus-1 (Qwen3.5-35B-A3B RP finetune), Odette-26B-A4B (Gemma-4 merge), FlyGPT (fruit-fly-connectome toy), GeoCore-9B (domain DiT re-upload), the PYTHAI fork wave and the usual DeepSeek/Qwen/MiniMax-H3 quant wave. Partial rechecks: llada2-2-flash and deepseek-v4-flash-vision-exp disclosures unchanged — both stay partial (58/60 verified)."
    },
    {
      "date": "2026-09-13",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Scanned HF newest-models across text-generation, image-text-to-text, text-to-image and text-to-video since Sep 11, plus 16 major orgs (moonshotai, google, Qwen, deepseek-ai, THUDM, MiniMaxAI, zai-org, OpenBMB, inclusionAI, BAAI, Lightricks, CohereLabs, unsloth, meta-llama, stabilityai, mistralai): everything new was a quant/merge/finetune of tracked models (DeepSeek-V4.1-Flash GGUF/FP8/MLX wave, Qwen3.8-27B quants incl. abliterated GGUFs, MiniMax-H3 video derivatives, SD/Wan/Z-Image re-uploads). AlayaLab/Evoke-Turbo (Sep 11) is a controllability distill of the small Aug EVOKE world-model (26 likes) — not frontier, low traction, skipped; xagent2025/VelaVec-T2I is a 9.8M-param retrieval encoder, not a generator; BAAI/AIDD is a resource index, not a model. CohereLabs/North-Small-Translate-1.0 and Lightricks/LTX-2.5 both still gated HTTP 401 (LTX-2.5 — 14th run) so unverifiable from primary sources. Partial rechecks: llada2-2-flash README still discloses no official active-param count and deepseek-v4-flash-vision-exp is unchanged (lastModified Sep 1) — both stay partial (56/58 verified)."
    },
    {
      "date": "2026-09-12",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. Scanned HF newest-1000 across text-generation, image-text-to-text, and image/video-gen filters since Sep 10: everything notable was a quant, merge, or finetune of tracked models (DeepSeek-V4.1-Flash GGUF/MLX/EXL3/NVFP4 wave, Boulesis-26B-A4B = Gemma-4 RP merge). nex-agi/Nex-N2.5-Pro weights went live (123 shards, Sep 11) but its config.json is Qwen3_5MoeForConditionalGeneration — a post-trained variant of the tracked Qwen3.5-397B-A17B architecture, skipped per the no-finetune rule. CohereLabs/North-Small-Translate-1.0 (218B/25B MoE translation model, announced Sep 10) is auto-gated — config.json and README both HTTP 401, so it cannot be verified from primary sources; revisit once ungated. thesysdev/OUI-1 (26B diffusion-Gemma generative-UI model, Sep 7) is a LoRA/adapter finetune of google/diffusiongemma-26B-A4B-it (June release, previously assessed) — skipped. Partial rechecks: deepseek-v4-flash-vision-exp README still discloses no total param count (~297B stays estimated) and llada2-2-flash still has no official active-param count — both remain partial."
    },
    {
      "date": "2026-09-11",
      "added": [
        "deepseek-v4-1-flash"
      ],
      "upgraded": [],
      "note": "Added DeepSeek-V4.1-Flash (Sep 10): a 552B-backbone/16B-decode-active native-multimodal MoE and the gallery's first Causal Encoder-Decoder — 20 causal encoder + 20 decoder layers whose global KV is projected from the final encoder hidden state, activating only 8B params during prefill and 16B during decode. It replaces V4's CSA/HCA hybrid with pure CSA2: every layer runs a 128-token SWA while the global branch is statically split into Full (4 layers: own main KV + indexer, Top-512), Reindex (4: shared KV, fresh indices, 2048-block candidate pool) and Reuse (30: shared KV + indices) modes — and FP4 (E2M1) main KV caching shrinks the global cache to 890 B/token (¼ of V4-Flash) with SWA Bounded Replay cutting persistent KV to ⅛. Also adds 196B Engram conditional memory (763B on disk incl. vision + 3 DSpark drafters), Single-Pass mHC, and DSpark speculative decoding — config.json + tech report + 510 GB weights verified. Considered and skipped: Lightricks LTX-2.5 LoRAs (base model still config-gated — 12th run), BAAI AIDD (no pipeline tag), NVIDIA DeepSeek-V4-Pro-0813-NVFP4-DSpark and MiniCPM5-2B-DSpark-GGUF (quants of tracked models), XHToken/Spark-X2.5-4B (4B dense, minor org), Nex-N2.5-Pro (weights still unreleased). Partial rechecks: deepseek-v4-flash-vision-exp and llada2-2-flash disclosures unchanged — both stay partial."
    },
    {
      "date": "2026-09-10",
      "added": [],
      "upgraded": [],
      "note": "Checked — no changes. The only notable release since the last run was nex-agi's Nex-N2.5 family (Sep 7-8): Nex-N2.5-Max is a post-trained variant of the DeepSeek-V4-Pro architecture already in the gallery (its config.json is the identical DeepseekV4ForCausalLM spec — 61L, d7168, 384 experts top-6+1 shared, hash-routed first 3 MoE layers, CSA/HCA, 1M context), and Nex-N2.5-mini/Pro are post-trained variants of the Qwen3.5-MoE hybrid architecture already covered by Qwen3.5-397B-A17B — both skipped per the no-finetune-of-tracked-models rule. Also skipped: Ling-3.0-flash-VL fp4/fp8/int4 quants, MiniCPM5-2B-DSpark-GGUF, NVIDIA NVFP4 quants, and Qwen3.8-Flash-Next-FP8 (all of models present). Partial rechecks: deepseek-v4-flash-vision-exp README still discloses no total param count (~297B stays estimated) and LLaDA2.2-flash still has no official active-param count — both remain partial. Note: the 2026-09-09 run deployed to GitHub Pages but its source-repo commit was missed; it was committed today as 6000f0f."
    },
    {
      "date": "2026-09-09",
      "added": [
        "ling-3-0-flash-vl",
        "llada-image"
      ],
      "upgraded": [],
      "note": "Added InclusionAI's Ling-3.0-flash-VL (Sep 4): a 124B/5.5B-active native-multimodal MoE whose 42-layer backbone alternates KDA linear attention and gated MLA 5:1 (35 KDA + 7 MLA, layer pattern verified from the safetensors weight map), 512 experts top-8 + 1 shared, clamped SwiGLU, and a Qwen3-style ViT feeding M-RoPE video positions — config + README + safetensors index verified (124.9B on disk, computed ratio 1.00). Also added LLaDA-Image (Sep 4, arXiv:2609.03796): a 6B single-stream flow-matching DiT conditioned by a FROZEN LLaDA2.0-Mini masked-diffusion VLM through a residual-query adapter + 6-layer connector — the gallery's first image generator with a diffusion-LLM text encoder, and open-source SOTA on Qwen-Image-Bench (53.53 EN / 53.38 ZH); DiT config + weights verified (6.54B on disk). Considered and skipped: openbmb/MiniCPM5-2B (2.5B dense Llama-arch on-device model, no architectural novelty — 2nd run), tencent/EVIE-8B/4.5B (Colbert retrieval heads on a Qwen3.5 base — niche, 2nd run), inclusionAI/Ling-3.0-flash-VL-fp8 (quant of a tracked-family model), IFM K2-Horizon-32B (still Stage-1, final checkpoint unreleased), Lightricks LTX-2.5 (config still gated HTTP 401 — 11th run), BAAI ConsiSpace (Qwen2.5-VL-3B + VGGT geometry head — derivative, small). Partial rechecks: deepseek-v4-flash-vision-exp README still discloses no total param count and llada2-2-flash still has no official active count — both stay partial."
    },
    {
      "date": "2026-09-08",
      "added": [
        "llada2-2-flash",
        "llada2-2-mini"
      ],
      "upgraded": [],
      "note": "Added the LLaDA2.2 agentic diffusion-language-model family from Ant Group's InclusionAI — the gallery's first masked-diffusion LLMs (bidirectional attention, parallel block generation, Levenshtein Editing via DELETE/INSERT control tokens, Block Routing bounding MoE activation per 32-token block, L-EBPO agentic RL). LLaDA2.2-flash: 100B MoE, 32 layers, 256 experts top-8 + 1 shared, 128K context (config-verified; active params not officially disclosed — ~4.9B derived, so confidence=partial on that field alone). LLaDA2.2-mini (released 2026-09-05): 16B/1.4B active, 20 layers, same routing scheme (verified). Considered and skipped: openbmb/MiniCPM5-2B (dense Llama-arch 2B on-device model — no architectural novelty, small scale), tencent/EVIE-8B & 4.5B (visual-document-retrieval Colbert heads on a Qwen3.5 base — retrieval niche, previously skipped), Viggle/Viggle-Animate (MiniMax-H3 video blocks repackaged as pt2 modules — derivative), inclusionAI/LLaDA-Image (Aug 28 diffusion image generator built on LLaDA2 text encoder — outside the discovery window, revisit next run for the image-gen slot), Novasy/nova-video-gen (CogVideoX-2b re-upload), BAAI/ConsiSpace (still a zip dump). DeepSeek-V4-Flash-Vision-Exp re-checked: README still discloses no total param count — ~297B estimate and partial confidence stand."
    },
    {
      "date": "2026-09-07",
      "added": [
        "k2-horizon-375b-a23b",
        "k2-horizon-mova-36b-a4b"
      ],
      "upgraded": [],
      "note": "Added the K2-Horizon family from IFM (LLM360 lineage, Apache-2.0, released 2026-09-04): the 375B-A23B open MoE flagship (375B/23B active, 61 layers, 192 experts top-8 + 1 shared, 3 dense head layers, 512K context, partial-RoPE GQA) and the architecturally novel MoVA-36B-A4B — Mixture-of-Values attention, where 45 of 48 layers replace v_proj with 64 routed value experts (top-4, sigmoid) plus a per-head softplus output gate, stacked on a 100-expert FFN MoE. Both verified from the official config.json, README, modeling code, and safetensors index (379.2B raw params). Considered and skipped: K2-Horizon-32B (Stage1 intermediate checkpoint, final pending), 7B/3.7B/0.9B family members (not notable), Kimi-Linear-48B-A3B (2025 release), Zing-0.5 world model (Wan2.2-TI2V-5B derivative), and OpenAI GPT-6 Astra / World Labs Atlas (proprietary, no open weights)."
    },
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
    }
  ]
};
