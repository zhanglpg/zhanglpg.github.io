window.ATLAS_CHANGELOG = {
  "last_run": "2026-10-29 10:37",
  "entries": [
  {
    "date": "2026-10-29",
    "added": [
      "safin-1-35b-a3b"
    ],
    "upgraded": [],
    "note": "Added AI45Lab's Safin-1 35B-A3B (HF org AI45Research, weights Oct 19) — the first foundation model built on MARCH (Memory-Anchor Routing across Context History, arXiv 2608.12435): on top of Qwen3.5's Gated DeltaNet it caches recurrent-state anchors every 512 tokens into a growing content-routed memory bank, with HSD history-read (top-4 of 32K-token blocks) on layers 10-30; 35.63B/3B MoE, Apache-2.0, verified against config.json + BF16 safetensors header. It slipped past three weekly sweeps (0 likes, org not tracked) — caught by the cursor-paginated createdAt sweep. Considered and skipped: inclusionAI Ling-3.1-flash-1019 (byte-identical config + index to tracked ling-3-1-flash — post-training refresh), AI45Research Safin-1.5 (same 1121 tensors, runtime-flag-only diff), 26B-Suite Gemory-26B-A4B-SOMPOA (Gemma-4 community merge), Apexintelligence Apex-35B (Qwen3.6 finetune), stealth-model Qwen4 / Nvmx-8B (empty placeholder repos), baidu Unlimited-OCR-2 (OCR utility class), nvidia Metatron-v1 + BAAI MS-Human-700 (robotics RL policies, out of scope)."
  },
  {
    "date": "2026-10-28",
    "added": [
      "lfm3-1-7b",
      "lfm3-vl-2b"
    ],
    "upgraded": [],
    "note": "Liquid AI's LFM3 family landed (blog Oct 27) with a brand-new tri-hybrid backbone — 24 layers mixing 13 gated short convolutions (kernel 7, up from 3 in LFM2), 5 sliding-window attention (256), and 6 global attention with half-RoPE, plus head-wise sigmoid output gates and sandwich RMSNorm — and two of its six 2B-class members are now in the atlas: LFM3-1.7B (256K context, measured 1,728,801,536 params from the BF16 safetensors header vs the 1.73B claim) and LFM3-VL-2B (1.92B = 1.73B LM + 164M new in-house tri-hybrid vision encoder + 25M projector, measured 1,918,181,888; native-res image/video, 2×2 patch merge). Both verified against config.json + README + blog; 3-way split diagram (13+5+6=24) renders clean in both themes. Skipped: Nanbeige4.3-33B (stock Llama-arch dense teacher, minor org), LiquidAI d1-2B/d1-Omni-2B (single-forward decision-router class), LFM3-Audio/Omni (audio modality out of scope), hi3d Hi3D v1.0 (3D geometry refinement on published Sparc3D arch — outside atlas scope), tencent Hy-Nomas's Oct-28 touch (new LoRA adapters only, tracked entry unchanged), and the usual GGUF/quant churn. WATCH unchanged: Mistral Large 4 still has no HF repo past its Oct-31 ETA, Kimi-K3-Base / flux-3 root / LTX-2.5 / Muse-Spark-Open gates still 401, no Beam tech report in the repo. Partial rechecks: LLaDA2.2-flash (Oct 14) and DeepSeek-V4-Flash-Vision-Exp (Sep 1) unchanged — stay partial. 94 models, v46."
  },
  {
    "date": "2026-10-27",
    "added": [],
    "upgraded": [],
    "note": "Completed the interrupted Oct-26 deploy: FLUX.3 Image Klein (BFL, 5.6B) and MemT-1.0-Flash (MemTensor, 288B/17B) — both verified, every mandatory check re-run green this morning — now live at v45 (92 models). Discovery window Oct 26 10:58 → Oct 27 09:23 CST found no new archivable release: tencent Hy-SimulMT-30B-A3B (speech-to-speech simultaneous translation — audio modality, out of atlas scope like granite-speech/MOSS-Audio), inclusionAI LBS-27B and ZwZ-2B (GRPO/SFT finetunes of Qwen3.8-27B / Qwen3.5-4B, no-finetune rule), baidu Unlimited-OCR-2 (OCR/document-parsing utility class, indra-ocr precedent), Comfy-Org Ming-3.0-TTS (audio repack of Ming-3.0-tts-tiny), IFM Jais-3 FP8/MLX siblings (quant derivatives of the tracked K2-Horizon/MoVA line), baseten toy-task LoRA experts, JetBrains Qwen3.8 blends, and the usual GGUF/uncensored churn. WATCH unchanged: Mistral Large 4 (no HF repo despite the Oct-31 ETA; guessed names still 401), Kimi-K3-Base / flux-3 root / LTX-2.5 / Muse-Spark-Open gates still 401, no Beam tech report in the repo; Realtime-Venus's Oct-26 touch is the audio sub-checkpoint only (identical 18.74B index), and Step-5-Preview-BF16's now-readable config matches the tracked entry exactly. Partial rechecks: LLaDA2.2-flash (Oct 14) and DeepSeek-V4-Flash-Vision-Exp (Sep 1) unchanged — stay partial."
  },
  {
    "date": "2026-10-26",
    "added": [
      "flux-3-image-klein",
      "memt-1-0-flash"
    ],
    "upgraded": [],
    "note": "Added two verified entries. FLUX.3 Image Klein (BFL, 5.6B, FLUX Kommunity License) — the long-gated WATCH item became archable without the gate: BFL's public reference implementation (src/flux3/dit.py) plus diffusers' Flux3Transformer2DModel give the exact architecture (3072-d, 24 heads × 128, 5 per-mode stages × 3 modes with separate weights, then 28 joint single-stream blocks over [image; image_cond; text], 4-axis RoPE θ10000, Qwen3-VL-4B 8-layer stacked 20480-d text tokens), and the open ml-resources BF16 repack measured 5,548,681,984 params (Base 5,538,458,368; the delta is exactly the flow-map ref_time_in embedder) — my analytic block reconstruction matches both to the parameter. MemT-1.0-Flash (MemTensor, 288B/17B, MIT, arXiv 2610.26825) — a memory foundation model: DeepSeek-V4-Flash backbone (config-identical 21 CSA + 20 HCA + 2 SW) plus Native Memory Blocks in 20 layers, where a grouped-KV low-rank memory attention (64 heads × 512, gated RMSNorm softcap 2.0) reads a constant-size fp32 state that a stable GDN-2 updates token-level at each turn end — 336M state elements ≈ 66× smaller than a full KV cache at 128K. Skipped: Nanbeige4.3-33B (stock Llama dense teacher, minor org), GrootTeam Groot family (post-trains of tracked Qwen3.8-Flash-Next / GLM-5.3-Flash / DeepSeek-V4.1-Flash-1017), MemT-1.0-Nano (Qwen3.6-35B-A3B finetune sibling), briaai Fibo-2.0-edit-turbo (gated 401 + same-arch distillation of tracked fibo-2-0), tencent WeVisOne-VL-2B (Qwen3-VL perception finetune), Ling-3.1-flash/Realtime-Venus/Hy-Nomas Oct-25 touches (MTP fix / heartbeat Zarr data / download-counter file), GGUF-quant churn. WATCH unchanged: Mistral Large 4 (still no HF repo, ETA end-Oct), Kimi-K3-Base / flux-3 root / LTX-2.5 gated 401, no Beam tech report, Muse-Spark gate unchanged. Partial rechecks: LLaDA2.2-flash (Oct 14) and DeepSeek-V4-Flash-Vision-Exp (Sep 1) unchanged — stay partial. 92 models, v45."
  },
  {
    "date": "2026-10-25",
    "added": [
      "fibo-2-0"
    ],
    "upgraded": [],
    "note": "Added BRIA Fibo 2.0 (8.13B, CC BY-NC 4.0, verified) — the #1 open-weights image-editing model on Artificial Analysis (Oct 20, 2026), unifying text-to-image and instruction editing in one 44-block single-stream flow-matching DiT (3584-d, 28 heads × 128, Z-Image block lineage) over FLUX.2 VAE latents. Its conditioning is the story: Qwen3-VL-4B prompts compress through a 2-layer Perceiver resampler into 256–512 'gist' tokens (count scales with prompt length, bounding cost for 1,000+-word structured VGL JSON captions), while six 3-layer Qwen3-VL bundles additionally feed five injection blocks (6/14/22/30/38) through zero-init tanh-gated cross-attention. Skipped as previously assessed or derivative: Sage-A1.5 / Ornith-1.5-122B (stock Qwen3.5-MoE agentic finetunes), Spark-X2.6-4B (same arch as X2.5, post-training refresh), Hy-Nomas-Diffusers (repack of tracked hy-nomas), FastH3-Omni-Comfy (MiniMax-H3 distill repack), Kromoss (MOSS-Image finetune), Nemotron-3.5-Bolt churn, Realtime-Venus Oct-24 touches (heartbeat data blocks, not weights), turion-extract-alpha (Gemma-4 LoRA extraction adapter). WATCH unchanged: Mistral Large 4 (all guessed names 401, ETA ~Oct 27–31), Kimi-K3-Base / flux-3-klein / LTX-2.5 still gated 401, FrancisRing/Prism flags-only since Oct 6, no Beam tech report/1.1, Muse-Spark-Open HF gate unchanged (already in atlas via ModelScope). Partial rechecks: LLaDA2.2-flash (unchanged Oct 14) and DeepSeek-V4-Flash-Vision-Exp (unchanged Sep 1) stay partial. 90 models, v44."
  },
  {
    "date": "2026-10-24",
    "added": [
      "hy-nomas"
    ],
    "upgraded": [],
    "note": "Added Tencent Hunyuan Hy-Nomas (8.6B, Apache-2.0, verified) — an open interactive world-generation model that grows a persistent video world one segment at a time via segment-autoregressive diffusion: 54 double-stream MMDiT blocks (2048-d, 16 heads × 128, GELU-tanh MLP 8192) with segment-wise causal joint attention and a persistent KV cache, per-block camera cross-attention over 4×4 extrinsics, keyboard-action conditioning modules (242M), and a fine-tuned PixelUMM decoder (7.89B) over DCAE-V f32t4c32 latents; the distilled DiT measures 8.55B from its FP32 checkpoint and the weights landed Oct 23, hours after the last run. Skipped: internlm/Atria-Dawn full release (config.json byte-identical to tracked GLM-5.2 — a post-train of a tracked model, same call as the Sep-15 Preview skip), tencent/WeVisOne-VL (Qwen3-VL-4B perception finetune + 9.6M pixel head, no report), HuggingFaceBio Carbon-X (Qwen3-14B DNA finetune), Ling-3.0-UBTree tree-speculative drafters, granite-switch GGUFs, Xiaomi-OCR-0 (docs-only touch), Nemotron utility churn. WATCH unchanged: Mistral Large 4 (no HF repo; weights ETA Oct 27), Kimi-K3-Base / flux-3-image-klein / LTX-2.5 still gated 401, FrancisRing/Prism flags-only, no Beam tech report. Partial rechecks: LLaDA2.2-flash (README unchanged since Oct 14, active params still undisclosed) and DeepSeek-V4-Flash-Vision-Exp (unchanged Sep 1) both stay partial. 89 models, v43."
  },
  {
    "date": "2026-10-23",
    "added": [
      "recursive-flint",
      "raon-1-mini",
      "minimax-m3-1-flash"
    ],
    "upgraded": [],
    "note": "Added three verified MoEs: Recursive Flint (39.8B/2.5B coding-agent MoE — 35 sliding-window + 14 full-NoPE GQA layers, learned per-head softmax sinks, 256 experts top-6 + shared; measured 39.79B from the BF16 index), KRAFTON Raon-1 mini (28.8B/4.3B preview — Raon Delta Attention decouples KDA's erase/write gates in an 18+7 RDA/gated-MLA hybrid with zero positional encoding, Raon-mHC 4-stream residuals replace DeepSeek mHC's Sinkhorn projection with a static Helmert chart), and MiniMax-M3.1-Flash (428B/23B — the Oct-23 open-weights drop we were watching: same M3 stack but MiniMax Sparse Attention now covers ALL 60 layers (no dense warm-up), RoPE θ 5M→10M, DSpark draft head replaces MTP, MXFP8/NVFP4 quantization-aware release). Skipped: Muse Spark Open 816B-A42B was already staged in the repo from yesterday's session and is committed with this run; Sage-A1.5 / Ornith-1.5-122B (stock Qwen3.5-MoE configs), Spark-X2.6-4B (README says architecture identical to X2.5, previously skipped as minor-org dense 4B), Nemotron-3.5-Super-VL (tri-block Mamba/MoE/GQA stack still un-mappable to the schema), Fibo-2.0 (gated README 401, FLUX.2-VAE image stack), drama-3/tyger (speech). WATCH unchanged: Mistral-Large-4 (ETA Oct 31), Kimi-K3-Base, flux-3-klein, LTX-2.5 all still 401."
  },
  {
    "date": "2026-10-21",
    "added": [],
    "upgraded": [],
    "note": "Checked — no changes. Discovery window Oct 20 10:25 → Oct 21 09:25 CST: likes7d top-40, trendingScore top-60, paged createdAt and a 35-org lastModified sweep found zero new qualifying open-weight releases — everything trending is already tracked (DeepSeek-V4.1-Flash-1017, MOSS-Image family, Hy-Memory, Ling-3.1-flash, LFM2.5-24B-A2B) or a derivative (LiquidAI's Oct 21 \"add drafter\" commit + DSpark/GGUF siblings — LFM2.5 config byte-identical to tracked; Hy-Memory-GGUF, MiniCPM-V 4.7 quants, EdenLive-Diffusers Wan-family repacks). The window's headline launches are API-only with no weights or architecture disclosure — Inception Mercury 3 (diffusion LLM, 1M ctx, 1,068 tok/s), Elorian Glimpse (visual scratch-space reasoning), Mistral Voxtral 3 (speech stack), MiniMax M3.1 Flash — all skipped per the open-weights rule; new WATCH item: MiniMax M3.1 Flash (428B/23B multimodal MoE, 1M ctx, API since Oct 19, open weights promised Oct 23 — recheck the MiniMaxAI org directly each run). WATCH: Muse-Spark / Mistral-Large-4 / Kimi-K3-Base / flux-3-klein still gated 401; reflection org has no Beam tech report or 1.1; Prism still flags-only. Partial rechecks: LLaDA2.2-flash README still discloses no activated-param number; V4-Flash-Vision-Exp config + index unchanged — both stay partial. 84 models unchanged, v41."
  },
  {
    "date": "2026-10-20",
    "added": [
      "xiaomi-lens-0"
    ],
    "upgraded": [],
    "note": "Added Xiaomi-Lens-0 (4.6B, Apache-2.0, verified): Xiaomi's grounded-reasoning MLLM on a Qwen3.5-4B hybrid backbone (24 Gated DeltaNet + 8 gated full-attention layers) that predicts pixel masks from its own visual latents — each <|mask|> token's hidden state plus vision-encoder patch features feed a 0.084B decoder, so mask supervision reaches the shared backbone with no extra segmentation encoder (arXiv 2610.23279; +5.6 pts over Qwen3.5 on RefCOCO splits). Skipped: VAST-AI EdenLive (real-time proxy-video rendering; its DiTs are stock WanTransformer3DModel configs — Wan2.1-14B/Wan2.2-5B family plus a DINOv3 control encoder, no new architecture or tech report), lodestones Kromoss (MOSS-Image-Base finetune), and a wave of DeepSeek-V4.1-Flash-1017 / flux-3-klein / MOSS-Image quants and repacks; WATCH items unchanged (Muse-Spark gate, ML4, Kimi-K3-Base, Prism flags-only)."
  },
  {
    "date": "2026-10-19",
    "added": [],
    "upgraded": [],
    "note": "Checked — no changes. Discovery window Oct 18 09:55 → Oct 19 09:25: createdAt sweep (top-500, generation/image/video pipelines), likes7d top-40, trendingScore top-60, and a 33-org lastModified sweep — zero new qualifying releases. Everything trending was already tracked (DeepSeek-V4.1-Flash, MiniCPM-V 4.7, LFM2.5-24B-A2B, Hy-Memory, MOSS-Image, Dory, Ling-3.1-flash, iris-3b) or a derivative/quant/repack of a tracked model (V4.1-Flash-1017 strata/FLARE ports, Hy-Memory-FP8, Dory BF16/GGUF/MXFP8, Comfy-Org MOSS-Image, klein-comfy ComfyUI repack, Underdog-Saluki = Qwen3.8-27B quant). Skipped as out of scope: nvidia cosmos3-nano-libero10 robot-data exports (0 likes), Nemotron-3.5-Parse (document-parser utility VLM: C-RADIOv4-SO400M + 10L mBART decoder — indra-ocr class), mistralai Timestral (time-series forecasting), UltraBERT 150M/380M (BERT-class retrieval encoders), swiss-ai Apertus 1.5 (Oct-18 news was documentation for Jul–Sep weights; dense standard architecture), LiquidAI d1-omni GGUF (decision-router skip list). WATCH rechecks: Mistral Large 4 'le Chonk' placeholder repo now 401s with ETA Oct 31; meta-models Muse-Spark-Open-816B-A42B still gated-manual 401; Kimi-K3-Base, LTX-2.5 and flux-3-image-klein still gated 401; reflection org has no Beam tech report or 1.1 yet (FP8/NVFP4/DFlash2 siblings are derivatives); FrancisRing/Prism config still flags-only. Partial rechecks: LLaDA2.2-flash + DeepSeek-V4-Flash-Vision-Exp configs unchanged — stay partial. 83 models unchanged, v40."
  },
  {
    "date": "2026-10-18",
    "added": [
      "beam-1-0-501b-a23b"
    ],
    "upgraded": [],
    "note": "Added Reflection Beam 1.0 (501.3B total / 23.4B active, Apache-2.0, confidence verified) — the first open release from Reflection, the new US lab, and the model we had been watching for three weeks under the wrong org handle (weights landed Oct 16 on HF org 'reflection', not 'reflection-ai'): a 52-layer sparse MoE (3 dense SwiGLU + 49 MoE layers of 256 routed experts top-8 with NO shared expert, DeepSeek-V3-style group-limited sigmoid routing ×2.5) whose attention is a 43+9 sliding/full gated-GQA hybrid where the 9 full layers drop positional encoding entirely in favour of scalable-softmax query scaling, and whose residual stream adds each sublayer with weight 1/√k while rescaling by √((k−1)/k) so the stream stays at constant scale. Verified against config.json + README table + HF blog + safetensors index (1002.66 GB = 501.33B measured; computed 499.6B, ratio 1.00; active recomputes to 23.43B). Skipped: DeepSeek-V4.1-Flash-1017 (config byte-identical to the tracked DeepSeek-V4.1-Flash — a weight-only post-training refresh), Meta Muse Spark Open 816B-A42B (still gated manual 401 — config unreadable), black-forest-labs flux-3-image-klein (still gated auto), MOSS-Image-SFT/Base + quant/MLX ports and DFlash2 drafters (finetunes/derivatives), datalab-to/indra-ocr (1M-param OCR utility, out of scope), tencent/Qwen3-8B-DSpine-b16 (research ablation). WATCH rechecks: reflection org now live (Beam added; FP8/NVFP4/DFlash2 siblings noted), Mistral Large 4 'le Chonk' still absent from mistralai, FrancisRing/Prism still flags-only, Kimi-K3-Base + LTX-2.5 still gated 401. Partial rechecks: LLaDA2.2-flash + DeepSeek-V4-Flash-Vision-Exp configs unchanged — stay partial. 83 models, v40."
  },
  {
    "date": "2026-10-17",
    "added": [
      "dory-1-0-4b",
      "hy-memory-30b-a3b",
      "moss-image"
    ],
    "upgraded": [],
    "note": "Added three Oct-16 releases, all verified against HF config.json + safetensors headers: NVIDIA Nemotron Labs Dory 1.0 4B (first looped/latent-recurrent open LLM — 36 nGPT blocks (8 Input + 20 shared Recurrent applied ×2 loops + 8 Output), 3:1 sliding/full GQA hybrid with dual RoPE θ, no LayerNorm anywhere; measured 3.975B, ratio 1.11), Tencent Hunyuan Hy-Memory-30B-A3B (specialized long-term-memory writer for Mem0/MemOS/Hy-Memory harnesses — hy_v3 MoE, 128 narrow experts top-8 + 1 shared with true expert d_ff 768, OPD + attributed-memory RL training; measured 30.06B, ratio 1.00), and Fudan OpenMOSS MOSS-Image (5B flow-matching DiT over FLUX.2 VAE latents with SiTU-GLU FFN, one shared adaLN modulation across all 42 blocks, frozen Qwen3.5 hybrid text encoder, layout control + strong in-image text rendering; measured 5.08B). Skipped: NVIDIA Nemotron 3.5 Super VL 120B-A12B (still un-archable: tri-block Mamba-2/MoE-only/GQA stack breaks the param gate, deferred Oct 16), meta-models Muse-Spark-Open-816B-A42B (gated 401), flux-3-image-klein (gated), MOSS-Image-SFT (finetune of Base), tencent/Qwen3-8B-DSpine-b16 (research ablation). Partial rechecks: LLaDA2.2-flash + DeepSeek-V4-Flash-Vision-Exp configs unchanged → stay partial. 82 models, v39."
  },
  {
    "date": "2026-10-16",
    "added": [
      "step-5-preview"
    ],
    "upgraded": [],
    "note": "Added StepFun Step 5 Preview (600B total / 27B active, StepFun Model License 1.0, confidence verified) — the flagship agentic model whose BF16 weights went ungated on HF Oct 15 after weeks of 401s (announced Sep 20, API-only until then). 92 layers = 88 MoE (352 experts top-8 + 1 shared, expert d_ff 1536, SwiGLU clamped at 7, fp32 router with learned bias) + 4 dense (d_ff 13824); attention is a 3:1 sliding/full hybrid — 69 sliding-window GQA layers (window 512, 64/4 heads, head_dim 192, θ 10K) + 23 full-attention layers (θ 10M, 1/3 partial RoPE, YaRN) each carrying a DSA-style sparse indexer selecting top-512 tokens (proxy_dim 256, ssmax, csa_block_compress); head-wise sigmoid output gates + per-head QK RMSNorm throughout; 3 MTP speculative heads; 47-layer perception-encoder ViT (1536d, quick_gelu) with a single 6144→4096 projector; 1M context, vocab 128,896. Verified against config.json + README table + safetensors index (1208.7 GB ≈ 604.3B) + per-shard tensor shapes; computed 604.4B vs 600B claimed (ratio 0.99). Considered and skipped: NVIDIA Nemotron 3.5 Super VL 120B-A12B (Oct 15, fully verified from config + tensor shapes — 88 single-mixer layers: 40 Mamba-2 + 40 MoE-only + 8 GQA, 512 experts top-22 + shared in a 1024-d latent, C-RADIO ViT-H 0.65B, 1M ctx — but its per-layer tri-block stack has no honest mapping to the atlas's per-layer attention schema or param gate, so deferred to a future harness change rather than misdrawn), Nemotron 3.5 Bolt 74B-A9B (2-bit quant of Super VL), FLUX-3-Image-Klein family (gated 401; ungated 'pup' is a Qwen3.5-VL wrapper), granite-switch-4.1 (LoRA-adapter ensemble), mistralai Timestral (time-series forecasting, out of scope), TaoMate-H3-FL2VA (MiniMax-H3 LoRA), anon-1b (gemma-3-1b quant). WATCH rechecks: reflection-ai org endpoint still empty + /beam 401; Mistral Large 4 absent; FrancisRing/Prism flags-only; Kimi-K3-Base + FLUX.3-Image still 401; LTX-2.5 gated. Partial rechecks: LLaDA2.2-flash + DeepSeek-V4-Flash-Vision-Exp configs unchanged — stay partial. 79 models, v38."
  },
  {
    "date": "2026-10-15",
    "added": [
      "ling-3-1-flash"
    ],
    "upgraded": [],
    "note": "Added InclusionAI Ling-3.1-flash (560B total / 25B active, MIT, confidence verified) — Ant Group's upgraded native hybrid-reasoning flagship: 72 layers = 63 KDA delta-rule linear + 9 gated-MLA full-attention (7:1), 512 experts top-8 + 1 shared with aux-loss-free expert_bias routing, 4 dense head layers, 1M-token context claimed over a 262K native window, shipped FP8 e4m3 with day-0 SGLang/vLLM (NEXTN MTP) support. Verified against HF config.json + README table + safetensors index (FP8 573.75 GB ≈ 560B; computed 560.1B, ratio 1.00). Also checked: Qwen-Image-2.1-Turbo (distill of tracked model), Underdog-Saluki (GGUF quant), JEV-35B/d3/clef decision-router class, MiniCPM-V 4.7 quant ports — all skipped; watch list (reflection-ai Beam, Mistral Large 4, Prism) unchanged."
  },
  {
    "date": "2026-10-14",
    "added": [
      "lfm2-5-24b-a2b"
    ],
    "upgraded": [],
    "note": "Added Liquid AI LFM2.5-24B-A2B (24B total / 2.45B active, LFM Open License v1.0, confidence verified) — the largest and final model of the LFM2.5 family (230M→24B), an always-thinking on-device agent MoE (184 tok/s on Apple M5 Max) on Liquid AI's hybrid LFM2 backbone: 30 double-gated short-convolution blocks (depthwise causal conv1d kernel 3, in_proj 2048→6144 split B/C/x with B⊙x gating, no KV cache) interleaved every 4th layer with 10 full-attention GQA layers (32 Q / 8 KV, head_dim 64, per-head QK RMSNorm, RoPE θ 1e7); 64-expert top-4 MoE on every layer except 2 dense SwiGLU first layers (d_ff 11776), aux-loss-free expert_bias routing with norm_topk_prob, tied embeddings, 128K vocab and 131K context (both doubled vs LFM2-24B-A2B via in-place tokenizer expansion), ~36T training tokens with agentic RL in OpenClaw/Hermes/Pi/OpenCode harnesses. Verified against HF config.json + README + model.safetensors.index.json (23.97B measured vs 24B claimed) + transformers modeling_lfm2_moe.py (conv/attention module shapes confirm head_dim 64, kernel 3, dense layers 0-1); param self-consistency ratio 1.01. Considered and skipped: Qwen-Image-2.1-Turbo (8-step distill of tracked Qwen-Image-2.1), openbmb/MiniCPM-V-4.7-1B (small sibling of tracked 35B-A3B), ConwayResearch/Underdog-Saluki-27B-1.0 (2-bit GGUF quant of Qwen3.8-27B), LiquidAI d1-3B + d1-omni-600M (single-forward decision-router class, standing skip), LightOnOCR-3-4B (Qwen3.5 OCR finetune), JetBrains Mellum2.1 (Sep 20, pre-window), ai-forever Zarya-4B (4B diffusion-LM, minor org, 2 likes), fishaudio/drama-3 (TTS, out of scope), autotrust/JEV-35B + vllm-sr/d3 (decision class). WATCH rechecks: reflection-ai org endpoint still returns an empty list and reflection-ai/beam still 401 (weights promised end of Oct); Mistral Large 4 'le Chonk' still absent from mistralai; FrancisRing/Prism root config still flags-only; Step-5-Preview-BF16, Kimi-K3-Base, FLUX.3-Image and LTX-2.5 still gated 401. Partial rechecks: inclusionAI/LLaDA2.2-flash and deepseek-ai/DeepSeek-V4-Flash-Vision-Exp configs unchanged — both stay partial. 77 models, v36."
  },
  {
    "date": "2026-10-13",
    "added": [],
    "upgraded": [],
    "note": "Checked — no changes. Discovery window Oct 11 09:30 → Oct 13 09:25 CST (~48h): swept ~70 tracked orgs by lastModified, likes7d top-40 + trendingScore top-60, HF newest across 11 pipelines (218 in-window repos, all zero/low-like churn), global-newest sweep (zero repos created in-window with ≥20 likes), and web news (theopenweights timeline/editions). Considered and skipped: vllm-sr/d3 + five size variants (Oct 10-12, trending; single-forward structured decision models, finetune of Qwen3.8-27B — standing no-finetune + decision-router skip, Clef/JEV/d1/pplx-decider precedents); autotrust/JEV-35B + NVFP4 (Oct 11, 196 likes — same decision class, Qwen3.5-35B-A3B finetune); openbmb/Trident-Qwen3VL-2B (Oct 12 — multimodal-embedding/retrieval finetune of Qwen3-VL-2B, out-of-scope task); TencentARC/Multics (Oct 12, 3 likes — multi-player world-model research checkpoint finetuned from Wan2.1/2.2, no architecture novelty); FenomAI/YuE2-3B (mirror of Sep 9 m-a-p/YuE2-3B); the MiniCPM-V 4.7 quant wave (GGUF/GPTQ/AWQ/FP8/int4/DSpark), LiquidAI MLX ports, gemma-4 quants, and metadata/README touches (DeepSeek-V4.1-Flash indexer-cache fix, GLM-5.3 card benchmarks, Qwen-Image-2.1-Turbo README, Ling-3.0-flash MTP fix — no spec changes). Qwen3.8-2.4T-A95B resurfaced on openweights news = already in atlas as qwen3-8-max (verified). Kimi-K3 cross-check: moonshotai/Kimi-K3 config.json now readable — 93L / 7168d / 896 experts top-16 + 2 shared / 69 KDA + 24 MLA / situ / MXFP4 all match the stored verified entry; Kimi-K3-Base still 401. WATCH unchanged: Reflection AI Beam (org endpoint now returns an empty list instead of 404 — possibly provisioned; reflection-ai/beam still 401, weights promised by end of Oct), Mistral Large 4 'le Chonk' (absent from mistralai org; guessed repo names 401), FrancisRing/Prism (root config still flags-only, no DiT arch), Step-5-Preview-BF16 / FLUX.3-Image / LTX-2.5 still gated 401. Partial rechecks: inclusionAI/LLaDA2.2-flash and deepseek-ai/DeepSeek-V4-Flash-Vision-Exp (mod Sep 1) configs unchanged — both stay partial. 76 models unchanged, v35."
  },
  {
    "date": "2026-10-11",
    "added": [],
    "upgraded": [],
    "note": "Checked — no changes. Discovery window Oct 10 10:44 → Oct 11 09:24 CST (~23h): swept 42 tracked orgs by lastModified (only hits: yandex/AliceAI-Foundation-80B-A3B-Base README-only edit — entry already in atlas; stabilityai audio touch; nvidia robotics/AGILE checkpoints + SOMA-X body model — out of scope), HF newest per pipeline (text-generation, image-text-to-text, text-to-image, image-to-image, text-to-video, image-to-video, any-to-any, text-to-audio, video-to-video), likes7d + trendingScore top-150 (nothing created in-window above the already-assessed Qwen-Image-2.1-Turbo distill, LiquidAI d1 decision pair, LightOnOCR-3, Mellum2.1 GGUF), and a global newest sweep (zero repos created in-window with ≥25 likes). News check surfaced nothing new: Wan 3.0 (calamansi/wan-3-0-video text stub) is API-only with no open weights — open Wan line still ends at 2.2; Microsoft-Decision-1 and h2oai/h2o-lightning-31b are Qwen3.5-9B/gemma-4-31B decision-model class (standing JEV/Clef/d1 skip); unbiased Pareto 26.9 'official release' is a closed blended router, no weights. WATCH unchanged: Reflection AI Beam (501B/23B) still no HF org, Mistral Large 4 'le Chonk' still absent from mistralai (weights promised end of October), Step-5-Preview-BF16 / Kimi-K3-Base / LTX-2.5 / North-Small-Translate-1.0 / MiniCPM-V-4.7 / Kandinsky-6.0-Pro all still gated 401, FrancisRing/Prism config.json still flags-only (no DiT arch; report 'stay tuned'). Partial rechecks: inclusionAI/LLaDA2.2-flash and deepseek-ai/DeepSeek-V4-Flash-Vision-Exp configs unchanged — stay partial. 76 models unchanged, v35."
  },
  {
    "date": "2026-10-10",
    "added": [
      "youtu-parsing-omni",
      "iris-3b"
    ],
    "upgraded": [],
    "note": "Added two architecturally novel open-weight releases, both verified against primary sources. Tencent Youtu-Parsing-Omni (5B, custom Youtu-Parsing license) — an omni-modal parser that turns documents, natural images, charts/flowcharts, geometry figures, audio and audio-visual video into one structured OmniSchema JSON envelope; its novelty is a single unified Youtu-Omni-Encoder (one 28-layer bidirectional GQA transformer initialized from a text LM, thin modality stems, shared (t,h,w) positional encoding, 4 audio-visual fusion layers) feeding a 40-layer MLA decoder (2560-d, q_lora 1536 / kv_lora 512, 1M context, tied embeddings); verified vs config.json + modeling code + safetensors header (5.33B measured vs 5B claimed, 0.94); SOTA on OmniDocBench v1.6 (96.96). SperidLabs Iris-3B (3B, Apache-2.0) — the atlas's first pixel-space image generator: no VAE anywhere; a dual-level rectified-flow DiT (8 dual-stream MMDiT + 16 single-stream blocks, 2560-d, GQA 20/5, sigmoid-gated attention, sandwich RMSNorm) over 16x16 RGB patches plus a 4-block pixel-refinement head, frozen Qwen3-VL-4B text adapter; verified vs config.yaml + GitHub modeling code + safetensors header (2.99B FP32 measured vs 3B claimed); arXiv 2610.09450. Skipped per the placeholder rule: Mistral Large 4 'le Chonk' (weights promised end of October; mistralai newest is still LIDstral-Arabic) and Reflection AI Beam (still no HF org); also Qwen-Image-2.1-Turbo (8-step distill checkpoint of tracked Qwen-Image-2.1), IQuestLab/SAIL (post-training of Qwen3.6-35B-A3B), JetBrains Mellum2.1 (Sep 20, pre-window), LightOnOCR-3 (Qwen3.5 finetune), Phocinae-Largha/neuphonic neudecide/pplx-decider (decision-router class), XiaomiMiMo MOPD pair (distills of tracked checkpoints), and the usual GGUF/MLX/LoRA churn. Partial rechecks: LLaDA2.2-flash and DeepSeek-V4-Flash-Vision-Exp unchanged; Step-5-Preview-BF16, Kimi-K3-Base, LTX-2.5, North-Small-Translate-1.0, MiniCPM-V-4.7 and Kandinsky-6.0-Pro still gated 401. 76 models, v35."
  },
  {
    "date": "2026-10-09",
    "added": [
      "kandinsky-6-0-pro"
    ],
    "upgraded": [],
    "note": "Added Kandinsky 6.0 Video Pro (29B, MIT) — Kandinsky Lab's dual-stream CrossDiT for synchronized video+audio generation (5 s clips with lip-synced 44 kHz audio, Full-HD via a separate 1.41B SR-DiT): 60 paired blocks of a 4096-d video stream + 2048-d audio stream joined by gated bidirectional cross-attention (19B + 5B + 5B per the arXiv 2610.05608 tech report; ungated Pro-pretrain safetensors header measures 30.14B, ratio 0.96), 3D RoPE video / 1D RoPE audio, Qwen2.5-VL-7B + CLIP text conditioning. Verified against transformer configs + safetensors tensor headers + report Table 2. Late-window catch: repo created Sep 9 but the tech report landed Oct 4 and the final Pro checkpoint appeared gated this week; the Lite sister (3B) and quant churn were skipped as derivatives. Skipped per the placeholder rule: Reflection AI Beam (501B/23B — still no HF org), Mistral Large 4 'le Chonk' (mistralai newest is still Jul 16), FLUX 3 Image (no open weights); also LiquidAI d1-3B/d1-omni-600M (decision-router class — standing Clef/JEV skip, plus base_model:finetune LFM2.5-VL), interfaze-1-lite (mixture-of-architectures tool-orchestration product, not a single-model architecture), Underdog-Saluki (Qwen3.8-27B GGUF quant), and the usual LoRA/GGUF/MLX churn. Partial rechecks: LLaDA2.2-flash and DeepSeek-V4-Flash-Vision-Exp unchanged; Step-5-Preview-BF16, Kimi-K3-Base, LTX-2.5, North-Small-Translate-1.0 still gated 401."
  },
  {
    "date": "2026-10-07",
    "added": [
      "minicpm-v-4-7-35b-a3b"
    ],
    "upgraded": [],
    "note": "Added OpenBMB MiniCPM-V 4.7 (35B-A3B) — a silent Oct 6 upload (16 BF16 shards, no model card, no license, no benchmarks) that is the first MiniCPM-V on a Qwen3.5-MoE text backbone: 30 Gated DeltaNet + 10 gated full-GQA layers (3:1), 256 experts top-8 + 1 shared, 256K context, 16x-downsample ViT; verified against config.json + safetensors index (computed 35.2B vs 35.21B, ratio 1.03), license left undeclared in the entry until a card lands. Skipped per the placeholder rule: Mistral Large 4 (1T/49B, announced Oct 6, weights end of month) and Reflection AI Beam (still no HF org); also FrancisRing/Prism (Tencent-Hunyuan joint video+audio DiT — preview checkpoint, no architecture config) and the usual quant/finetune churn (clef, JEV/GEV, apex-flash-1 = GLM-5.3-Flash FT, Ornith = Qwen3.5-35B-A3B FT). Partial rechecks: LLaDA2.2-flash and DeepSeek-V4-Flash-Vision-Exp unchanged; Step-5-Preview-BF16, Kimi-K3-Base, LTX-2.5, North-Small-Translate-1.0 still gated."
  }
]
};
