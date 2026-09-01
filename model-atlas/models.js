window.MODELS = [
{
"id": "inkling",
"name": "Inkling",
"org": "Thinking Machines",
"family": "Inkling",
"released": "2026-07",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 975,
"params_active_B": 41,
"n_layers": 66,
"d_model": 6144,
"d_ff": 24576,
"d_ff_moe": 3072,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "55 local sliding-window layers (window 512) + 11 global, 5:1 pattern; GQA 64 heads, 8 KV global, 16 KV local; no RoPE — learned relative-position logits (d_rel 16, extent 1024 global / 512 local) with log-length attention scaling (floor 128K); short conv (kernel 4); 8 multi-token-prediction layers.",
"n_experts": 256,
"active_experts": 6,
"shared_experts": 2,
"vocab_size": 201024,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "relative",
"activation": "SwiGLU",
"tie_embeddings": true,
"vision": {
"encoder": "hierarchical patch (hmlp)",
"encoder_params_B": null,
"fusion": "early-fusion",
"notes": "4-layer hierarchical patch encoder (patch 40, temporal patch 2) projects pixels directly into the decoder's hidden space; no separate ViT. Audio enters as discrete dMel tokens (80 mel bins, 16-level quantization)."
},
"notes": "Thinking Machines Lab's first open-weight frontier model: natively trimodal (text, image/video, audio) 975B/41B MoE — 256 experts top-6 + 2 shared, one dense FFN block (d_ff 24576) at layer index 2, all other layers MoE. No RoPE: learned relative-position logits carry position. Tied embeddings; 8 MTP layers; main BF16 checkpoint stores 952B (975B is the card's official total). Apache-2.0, 1M context.",
"sources": [
"https://huggingface.co/thinkingmachines/Inkling",
"https://huggingface.co/thinkingmachines/Inkling/resolve/main/config.json",
"https://raw.githubusercontent.com/huggingface/transformers/main/src/transformers/models/inkling/modeling_inkling.py"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Local SWA",
"n": 55,
"type": "sliding",
"sub": "win 512"
},
{
"name": "Global",
"n": 11,
"type": "global",
"sub": "8 KV · rel-pos"
}
],
"pattern": "lllllglllllglllllglllllglllllglllllglllllglllllglllllglllllglllllg",
"pattern_map": {
"l": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "5:1 sliding / global with relative-position logits (no RoPE)",
"p": {
"variants": [
{
"n": 55,
"name": "local sliding 512",
"type": "sliding",
"span": "win",
"frac": 0.25,
"spanLabel": "window 512",
"sub1": "64Q/16KV ×128 — more KV on local",
"sub2": "rel-bias extent 512"
},
{
"n": 11,
"name": "global",
"type": "global",
"span": "full",
"spanLabel": "full 1M",
"sub1": "64Q/8KV ×128 · rel-extent 1024",
"sub2": "log-len temp ×(1+0.1·ln(pos/128K))"
}
],
"common": [
"NoPE: query-conditioned rel-pos bias (r_proj → 16 dims/head)",
"K and V (not Q) pass a depthwise causal conv (k=4)",
"per-head RMS-normed Q,K → softmax scale 1/128 (1/d)"
],
"cache": "global: 2,048 el/token unbounded · local capped at 512 × 16 KV heads"
}
}
]
},
{
"id": "solar-open2-250b",
"name": "Solar Open 2 (250B-A15B)",
"org": "Upstage",
"family": "Solar",
"released": "2026-07",
"license": "Upstage Solar License",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 250,
"params_active_B": 15,
"n_layers": 48,
"d_model": 4096,
"d_ff": null,
"d_ff_moe": 1280,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "[Softmax x1, Linear x3] x12: 12 softmax GQA layers (64Q/8KV, elementwise sigmoid output gate) interleaved with 36 KDA (Kimi Delta Attention) linear-attention layers (64 heads, short-conv kernel 4, negative-eigenvalue extension beta=2*sigmoid in (0,2)); NoPE — no positional encoding anywhere.",
"n_experts": 320,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 196608,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "NoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Upstage's Korean-sovereign 250B/15B MoE, scaled from Solar Open 1 (102B) by selective weight transfer (5.69B params, ~2.3%). All 48 layers are MoE — no dense FFN (config's intermediate_size 10240 is vestigial); 320 experts top-8 + 1 shared, expert d_ff 1280. Hybrid softmax+KDA linear attention with NoPE enables the 1M context. Tech report lists the activation as SiLU; its per-module counts (241.7B routed experts = 3 matrices x 320 x 48 x 4096x1280) confirm the gated SwiGLU form. ~12T training tokens on B200s.",
"sources": [
"https://huggingface.co/upstage/Solar-Open2-250B",
"https://arxiv.org/abs/2607.20062",
"https://huggingface.co/upstage/Solar-Open2-250B/resolve/main/config.json"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Softmax GQA",
"n": 12,
"type": "GQA",
"sub": "64/8 · gated"
},
{
"name": "KDA",
"n": 36,
"type": "linear",
"sub": "delta · conv k4"
}
],
"pattern": "slllslllslllslllslllslllslllslllslllslllslllslll",
"pattern_map": {
"s": "GQA",
"l": "linear"
}
},
"attn_modules": [
{
"kind": "gqa",
"title": "Softmax GQA + output gate (12 layers — first of each block of 4)",
"p": {
"d": 4096,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "NoPE (no pos. encoding)",
"gate": "σ(g_proj h) elementwise",
"cache": "2,048 el/token/layer × 12 GQA layers — the only sequence-growing memory"
},
"notes": [
"softmax-FIRST S-L-L-L — unlike Kimi Linear / Qwen3.5’s L-L-L-S",
"ablation: softmax-first ≈ +1.5% token efficiency",
"sigmoid output gate suppresses the attention-sink pathology"
]
},
{
"kind": "deltanet",
"title": "KDA linear attention (36 layers)",
"p": {
"d": 4096,
"kh": 64,
"vh": 64,
"dh": 128,
"conv": 4,
"proj": "q / k / v_proj 4096 → 8192",
"projSub": "MHA-style 64 heads — no KV grouping",
"qsub": "L2 norm",
"vsub": "64 × 128",
"update": "S ← (I − β·kkᵀ)(Diag(a)·S) + β·kvᵀ",
"decayName": "per-channel decay Diag(a)",
"decaySub": "f_a(128) → f_b(8192) low-rank",
"beta": "β = 2σ(b) ∈ (0,2) — negative-eigenvalue extension",
"out": "o = Sᵀq → RMSNorm(128) ⊗ σ(g_b(g_a h))",
"outSub": "low-rank output gate → o_proj 8192 → 4096",
"cacheline": "no KV cache — state 64 × 128 × 128 ≈ 1.05 M el + conv states per layer; position carried by the recurrence"
},
"notes": [
"same KDA operator as Kimi (fla kernels; A_log, dt_bias, f_a/f_b, b_proj weights)"
]
}
]
},
{
"id": "laguna-s-2-1",
"name": "Laguna S 2.1",
"org": "poolside",
"family": "Laguna",
"released": "2026-07",
"license": "OpenMDW-1.1",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 118,
"params_active_B": 8,
"n_layers": 48,
"d_model": 3072,
"d_ff": 12288,
"d_ff_moe": 1024,
"n_heads": 48,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "12 full-attention layers (48 heads, partial-rotary 0.5 YaRN theta 500K factor 128: 8K->1M) interleaved 1:3 with 36 sliding-window layers (window 512, 72 heads, full-rotary RoPE theta 10K); 8 KV heads throughout; QK-norm (RMSNorm per head, pre-RoPE) on every layer; per-head softplus output gate on every attention layer.",
"n_experts": 256,
"active_experts": 10,
"shared_experts": 1,
"vocab_size": 100352,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "poolside's open agentic-coding MoE: 118B/8B, 256 experts top-10 + 1 shared (expert d_ff 1024); first layer uses a dense FFN (d_ff 12288). Sliding-window layers widen attention to 72 heads (9216 > d_model). Interleaved thinking between tool calls; ships a DFlash speculative-decoding draft model. OpenMDW-1.1 license.",
"sources": [
"https://huggingface.co/poolside/Laguna-S-2.1",
"https://huggingface.co/poolside/Laguna-S-2.1/resolve/main/config.json",
"https://huggingface.co/poolside/Laguna-S-2.1/resolve/main/configuration_laguna.py"
],
"confidence": "verified",
"dense_first_layers": 1,
"attention_split": {
"parts": [
{
"name": "Full",
"n": 12,
"type": "global",
"sub": "48h · YaRN"
},
{
"name": "Sliding",
"n": 36,
"type": "sliding",
"sub": "72h · win 512"
}
],
"pattern": "fsssfsssfsssfsssfsssfsssfsssfsssfsssfsssfsssfsss",
"pattern_map": {
"f": "global",
"s": "sliding"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "1:3 full / sliding with head widening + softplus gates",
"p": {
"variants": [
{
"n": 12,
"name": "full attention",
"type": "global",
"span": "full",
"spanLabel": "full 1M",
"sub1": "48 heads × 128 · partial RoPE 0.5",
"sub2": "YaRN θ 500K ×128 (8K → 1M)"
},
{
"n": 36,
"name": "sliding window 512",
"type": "sliding",
"span": "win",
"frac": 0.25,
"spanLabel": "window 512",
"sub1": "72 heads ×128 — 9216 > d_model",
"sub2": "full-rotary RoPE θ 10K"
}
],
"common": [
"per-head softplus output gate on every layer (unbounded ≥ 0)",
"QK-norm (RMSNorm/head) pre-RoPE on every layer",
"8 KV heads throughout — KV cache identical for both head widths"
],
"cache": "full layers: 2,048 el/token unbounded · sliding capped at 512"
}
}
]
},
{
"id": "kimi-k3",
"name": "Kimi K3",
"org": "Moonshot",
"family": "Kimi",
"released": "2026-07",
"license": "Kimi K3 License",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 2800,
"params_active_B": 104,
"n_layers": 93,
"d_model": 7168,
"d_ff": 33792,
"d_ff_moe": 3072,
"n_heads": 96,
"n_kv_heads": 96,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "69 KDA (Kimi Delta Attention) linear-attention layers interleaved with 24 gated-MLA full-attention layers (full_attn_layers every 4th, 4/8/.../92 plus final layer 93). KDA: 96 heads, head_dim 128, short-conv kernel 4, per-channel safe decay gate bounded in (-5,0), full-rank sigmoid output gate. Gated MLA: q_lora 1536, kv_lora 512, qk_nope 128 + qk_rope 64, v 128, NoPE (rotary never applied; the 64-dim rope slot is unrotated) + sigmoid output gate; attn_res_block_size 12 (Attention Residuals).",
"n_experts": 896,
"active_experts": 16,
"shared_experts": 2,
"vocab_size": 163840,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "NoPE",
"activation": "SiTU-GLU",
"tie_embeddings": false,
"vision": {
"encoder": "MoonViT (27L/1024d)",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "27-layer, 1024-dim (12-head) vision tower, patch 14, divided-fixed positional embeddings, sd2_tpool patch merger (2x2) projecting into the 7168-dim decoder; native text/image/video input."
},
"notes": "World's first open 3T-class model: 2.8T/104B Stable LatentMoE on a Kimi Delta Attention backbone — 896 experts top-16 + 2 shared (latent dim 3584, expert d_ff 3072), first layer dense (d_ff 33792). 93 layers split 69 KDA linear + 24 gated-MLA full attention with Attention Residuals (AttnRes); SiTU-GLU activation (situ beta 4.0); noaux_tc routing. ~2.5x scaling-efficiency gain over Kimi K2. Native multimodal, 1M context. HF release is MXFP4-quantized (compressed-tensors; attention, shared experts, and vision tower kept at full precision).",
"sources": [
"https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf",
"https://www.kimi.com/blog/kimi-k3",
"https://huggingface.co/moonshotai/Kimi-K3",
"https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json"
],
"confidence": "verified",
"dense_first_layers": 1,
"moe_latent_dim": 3584,
"attention_split": {
"parts": [
{
"name": "KDA",
"n": 69,
"type": "linear",
"sub": "delta rule · conv k4 · gated"
},
{
"name": "Gated MLA",
"n": 24,
"type": "MLA",
"sub": "latent KV · NoPE"
}
],
"pattern": "kkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmkkkmm",
"pattern_map": {
"k": "linear",
"m": "MLA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "KDA — Kimi Delta Attention (69 layers)",
"p": {
"d": 7168,
"kh": 96,
"vh": 96,
"dh": 128,
"conv": 4,
"proj": "q / k / v / g projections 7168 → 12288",
"projSub": "β: b_proj → 96 · decay: f_a(128) → f_b(12288)",
"qsub": "L2 norm",
"vsub": "96 × 128",
"update": "S ← Diag(e^g)·S + β·k⊗(v − (Diag(e^g)S)ᵀk)",
"decayName": "per-channel decay Diag(e^g)",
"decaySub": "g = −5·σ(·) ∈ (−5, 0)",
"beta": "β = σ(b) per head ∈ (0,1)",
"out": "o = Sᵀq → RMSNorm(128) ⊗ σ(g_proj h)",
"outSub": "full-rank output gate → o_proj 12288 → 7168",
"cacheline": "no KV cache — recurrent state 96 × 128 × 128 ≈ 1.57 M el + 3 conv states (12288 × 4) per layer"
},
"notes": [
"per-channel (diagonal) decay — vs Gated DeltaNet’s per-head scalar",
"safe decay gate: g = −5·σ(e^A(f + dt_bias))",
"RMSNorm weight (128) shared across all 96 heads (one FusedRMSNormGated)",
"position comes from the recurrence — the whole decoder is NoPE"
]
},
{
"kind": "mla",
"title": "Gated MLA, NoPE (24 layers — every 4th + final)",
"p": {
"d": 7168,
"nh": 96,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"nope_mode": true,
"gate": "σ(g_proj h)",
"cache": "architecturally 576 el/token × 24 MLA layers ≈ 27 KB/token (HF reference caches expanded per-head K/V — kernel-dependent)"
},
"notes": [
"NoPE: rotary never applied — the 64-dim slot stays unrotated",
"softmax scale 192⁻⁰·⁵ — no YaRN temperature",
"full-rank sigmoid output gate (7168 → 12288) before o_proj"
]
},
{
"kind": "attnres",
"title": "AttnRes — Attention Residuals",
"p": {
"d": 7168,
"block": 12,
"snapshots": 8,
"mixes": 187
}
}
],
"residual": {
"kind": "attnres",
"note": "AttnRes: stream snapshots every 12 layers; every sublayer input is a softmax mix over {bank ∪ stream} — see panel"
},
"attn_bullets": [
"KDA layers carry constant-size state (no per-token growth); only the 24 MLA layers cache latents",
"93-layer NoPE decoder: position is implicit in KDA recurrence + short conv"
]
},
{
"id": "longcat-2-0",
"name": "LongCat-2.0",
"org": "Meituan",
"family": "LongCat",
"released": "2026-07",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 1600,
"params_active_B": 48,
"n_layers": 38,
"d_model": 8192,
"d_ff": 12288,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 192,
"attention": "sparse",
"attention_detail": "MLA + LongCat Sparse Attention (LSA): indexer (index_n_heads=32, index_head_dim=128, RMS key-norm) selects top-2048 tokens via streaming-aware + hierarchical (coarse block recall, then fine token selection) indexing; cross-layer indexing shares one index pass across 2 consecutive attention blocks. MLA q_lora 1536 / kv_lora 512, qk_nope 128 + qk_rope 64, v 128; each of the 38 layers holds two MLA blocks (ScMoE dual-path).",
"n_experts": 768,
"active_experts": 12,
"shared_experts": 0,
"vocab_size": 163840,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Meituan's 1.6T/48B MoE flagship, scaled up from LongCat-Flash's shortcut-connected MoE (ScMoE): each of the 38 layers = 2 MLA blocks + 2 dense FFN (d_ff 12288) + 1 MoE block with 768 parameterized experts top-12 plus 128 zero-computation identity experts in the routing pool (safetensors index confirms 38x768 expert tensors, untied embeddings). 135B of N-gram (over-tokenizer) embedding parameters — 16 tables, ~16.5M n-gram entries (config oe_vocab_size_ratio 100.567 x 163840 vocab) — supplement the token embeddings. LSA replaces DSA's lightning indexer to fix its output discontinuity and quadratic scoring cost. 3-step MTP module (single replicated layer) for speculative decoding. Trained entirely on Chinese AI ASIC superpods, 35T+ tokens incl. hundreds of billions of 1M-context tokens. Context 1M (config max_position_embeddings 262144 is the max-output window; deepseek_yarn factor 120 from 8192 base).",
"sources": [
"https://huggingface.co/meituan-longcat/LongCat-2.0",
"https://huggingface.co/meituan-longcat/LongCat-2.0/raw/main/config.json",
"https://huggingface.co/meituan-longcat/LongCat-2.0/raw/main/model.safetensors.index.json",
"https://longcat.chat/blog/longcat-2.0/"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "dsaidx",
"title": "LSA — sparse indexer (top-k token selection)",
"p": {
"iheads": 32,
"idim": 128,
"topk": 2048,
"keynorm": "RMS",
"note": "streaming-aware budget · hierarchical: coarse block recall → fine token select",
"cache": "cross-layer indexing (CLI): one index pass serves 2 consecutive attention blocks; all 3 MTP draft steps share a single pass"
},
"notes": [
"replaces DSA's lightning indexer — fixes output discontinuity + quadratic scoring",
"CLI trained by cross-layer distillation of attention saliency",
"streaming-aware: hardware-aligned contiguous reads + dynamic random selection"
]
},
{
"kind": "mla",
"title": "MLA base (2 blocks per layer, ScMoE dual-path)",
"p": {
"d": 8192,
"nh": 64,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "deepseek_yarn ×120",
"cache": "576 el/token per attn block × 76 blocks — LSA masks to the top-2048 selected tokens"
},
"notes": [
"each of the 38 layers: 2 MLA + 2 dense FFN (12288) + 1 MoE (shortcut-connected)",
"routing pool adds 128 zero-computation identity experts (no parameters)",
"135B N-gram embedding: 16 tables, ~16.5M n-gram entries beside the 163,840 vocab"
]
}
],
"attn_bullets": [
"attention cost ≈ O(L·k), k = 2048 — the indexer recalls candidates hierarchically, MLA attends to the winners"
]
},
{
"id": "minimax-h3",
"name": "MiniMax H3 (Hailuo 3.0)",
"org": "MiniMax",
"family": "Hailuo",
"released": "2026-08",
"license": "MiniMax H3 Community License (excludes local deployment in US/EU/UK/KR)",
"modality": "video-gen",
"decoder_type": "DiT (video diffusion transformer)",
"params_total_B": 33,
"params_active_B": 33,
"n_layers": 50,
"d_model": 5376,
"d_ff": 14336,
"d_ff_moe": null,
"n_heads": 56,
"n_kv_heads": null,
"head_dim": 128,
"attention": "MHA",
"attention_detail": "Single-stream Omni-Transformer: video, text and audio tokens packed into one sequence (one attention document) with full bidirectional 3D self-attention; per-head QK-RMSNorm; attention inner dim 7168 (56×128) exceeds d_model 5376; per-modality AdaLN (6 mod params × 3 modalities: video/text/audio); 2 text-token refiner blocks before packing.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": null,
"context_length": null,
"norm": "AdaLN",
"norm_placement": "pre",
"pos_encoding": "3D MM-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "33B dense single-stream latent video diffusion transformer (custom MiniMaxH3Scheduler, shift 12); generates 4-15 s clips up to 2K/24 fps with native stereo audio in one pass. Text conditioning enters in-stream from Qwen3-VL-32B layer-50 hidden states (text_dim 5120, no cross-attention); temporally causal video VAE f16t4d24 (16x spatial, 4x temporal, 24 latent ch) + 1x2x2 patchify gives 32x effective spatial downsampling; audio VAE compresses 32 kHz audio to 40 Hz latents (audio_in_channels 32); ~13B of AdaLN modulation weights are precomputable at inference. Undisclosed: training data, exact param breakdown; vocab/context are N/A (latent-token model).",
"sources": [
"https://huggingface.co/MiniMaxAI/MiniMax-H3",
"https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/transformer/config.json",
"https://github.com/huggingface/diffusers/blob/main/src/diffusers/models/transformers/transformer_minimax_h3.py"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Single-stream 3D full attention (×50)",
"p": {
"d": 5376,
"nq": 56,
"nkv": 56,
"dh": 128,
"nocache": true,
"rope": "3D MM-RoPE (t,h,w) · θ 10K",
"qknorm": "per-head QK-RMSNorm",
"cache": "none — full bidirectional attention over the packed video+text+audio document, recomputed every denoising step"
},
"notes": [
"attention inner dim 7168 = 56 × 128 > d_model 5376",
"per-modality AdaLN: 6 mods × 3 modalities — ~13B precomputable",
"2 text token-refiner blocks before packing into the stream",
"text cond. = Qwen3-VL-32B layer-50 hidden states (5120)"
]
}
]
},
{
"id": "qwen3-8-max",
"name": "Qwen3.8-Max (2.4T-A95B)",
"org": "Alibaba",
"family": "Qwen3.8",
"released": "2026-08",
"license": "Qwen3.8-Max License (custom)",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 2400,
"params_active_B": 95,
"n_layers": 92,
"d_model": 8192,
"d_ff": null,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 4,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — 69 Gated DeltaNet linear-attention layers (16 QK / 128 V heads, head_dim 128) + 23 gated full-attention layers (GQA 64 Q / 4 KV, head_dim 256, partial RoPE 0.25); full_attention_interval=4.",
"n_experts": 512,
"active_experts": 10,
"shared_experts": 1,
"vocab_size": 248320,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Largest open-weight model to date: 2.4T total / 95B active. Same Qwen3_5MoeForCausalLM class as Qwen3.5-397B scaled ~6x — every one of the 92 layers is MoE (no dense layers), 512 experts with 10 routed + 1 shared active, hybrid Gated-DeltaNet + gated full attention 3:1. Text-only, thinking-mode-only; MTP-trained; native 262K context extensible to ~1.01M (card: 1,010,000). Custom (non-Apache) Qwen3.8-Max license.",
"sources": [
"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B",
"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B/raw/main/config.json"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "DeltaNet",
"n": 69,
"type": "linear",
"sub": "gated linear"
},
{
"name": "Full GQA",
"n": 23,
"type": "GQA",
"sub": "64/4 · pRoPE"
}
],
"pattern": "lllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllf",
"pattern_map": {
"l": "linear",
"f": "GQA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Gated DeltaNet (69 layers)",
"p": {
"d": 8192,
"kh": 16,
"vh": 128,
"dh": 128,
"conv": 4,
"proj": "in_proj_qkv 8192 → 20480 · in_proj_z → 16384",
"projSub": "split projections (Qwen3.5 class) · in_proj_b / a → β, α",
"qsub": "L2 norm",
"vsub": "128 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "per-head decay α = e^g",
"decaySub": "g = −e^A · softplus(a + bias)",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNormGated ⊗ SiLU(z)",
"outSub": "→ out_proj 16384 → 8192",
"cacheline": "no KV cache on linear layers — state 128 × 128 × 128 ≈ 2.1 M el (fp32) + conv state 20480 × 4 per layer"
},
"notes": [
"128 v-heads / 16 qk-heads — 2× value width vs Qwen3.5-397B"
]
},
{
"kind": "gqa",
"title": "Gated Full Attention (23 layers — every 4th)",
"p": {
"d": 8192,
"nq": 64,
"nkv": 4,
"dh": 256,
"rope": "partial RoPE 64/256",
"qknorm": "zero-centered QK-norm / head",
"gate": "σ(gate) per head",
"cache": "2,048 el/token/layer × 23 full-attention layers"
},
"notes": [
"text-only — plain partial RoPE (no MRoPE)",
"every layer MoE: 512 experts, 10 routed + 1 shared"
]
}
]
},
{
"id": "qwen3-8-27b",
"name": "Qwen3.8-27B",
"org": "Alibaba",
"family": "Qwen3.8",
"released": "2026-08",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 27,
"params_active_B": 27,
"n_layers": 64,
"d_model": 5120,
"d_ff": 17408,
"d_ff_moe": null,
"n_heads": 24,
"n_kv_heads": 4,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — 48 Gated DeltaNet linear-attention layers (16 QK / 48 V heads, head_dim 128) + 16 gated full-attention layers (GQA 24 Q / 4 KV, head_dim 256, partial RoPE 0.25, interleaved MRoPE); full_attention_interval=4.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 248320,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "Interleaved-MRoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "SigLIP2-so400m-class ViT (depth 27, hidden 1152)",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "Native image+video (patch 16, temporal_patch 2, GELU ViT, d_ff 4304); 2x2 spatial merge projects to out_hidden 5120."
},
"notes": "Dense-backbone companion to Qwen3.8-Max (Qwen3_5ForConditionalGeneration): native vision-language with the same 3:1 Gated-DeltaNet + gated full-attention hybrid stack, 16 x (3 linear + 1 full) = 64 layers. MTP-trained; native 262K context extensible to 1M. Hit #1 on Hacker News at release (2026-08-15).",
"sources": [
"https://huggingface.co/Qwen/Qwen3.8-27B",
"https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "DeltaNet",
"n": 48,
"type": "linear",
"sub": "gated linear"
},
{
"name": "Full GQA",
"n": 16,
"type": "GQA",
"sub": "24/4 · iMRoPE"
}
],
"pattern": "lllflllflllflllflllflllflllflllflllflllflllflllflllflllflllflllf",
"pattern_map": {
"l": "linear",
"f": "GQA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Gated DeltaNet (48 layers)",
"p": {
"d": 5120,
"kh": 16,
"vh": 48,
"dh": 128,
"conv": 4,
"proj": "in_proj_qkv 5120 → 10240 · in_proj_z → 6144",
"projSub": "split projections (Qwen3.5 class) · in_proj_b / a → β, α",
"qsub": "L2 norm",
"vsub": "48 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "per-head decay α = e^g",
"decaySub": "g = −e^A · softplus(a + bias)",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNormGated ⊗ SiLU(z)",
"outSub": "→ out_proj 6144 → 5120",
"cacheline": "no KV cache on linear layers — state 48 × 128 × 128 ≈ 786 K el (fp32) + conv state 10240 × 4 per layer"
},
"notes": [
"dense FFN every layer (d_ff 17408) — no MoE"
]
},
{
"kind": "gqa",
"title": "Gated Full Attention (16 layers — every 4th)",
"p": {
"d": 5120,
"nq": 24,
"nkv": 4,
"dh": 256,
"rope": "iMRoPE 64/256",
"qknorm": "zero-centered QK-norm / head",
"gate": "σ(gate) per head",
"cache": "2,048 el/token/layer × 16 full-attention layers"
},
"notes": [
"attention module shared with Qwen3.8-Max (same class)",
"text-only input degenerates to partial RoPE"
]
}
]
},
{
"id": "muse-glimmer-30b",
"name": "Muse Glimmer 30B",
"org": "Meta",
"family": "Muse",
"released": "2026-08",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 30,
"params_active_B": 30,
"n_layers": 52,
"d_model": 6656,
"d_ff": 19968,
"d_ff_moe": null,
"n_heads": 32,
"n_kv_heads": 2,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "3:1 local/global — 39 sliding-window layers (window 2048, RoPE theta 500K) + 13 full-attention NoPE layers (layer_rope_theta 0); gated GQA 32 Q / 2 KV heads x 128 with QK-norm and extra query scaling (qk_scale_factor 3.87).",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 202048,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE + NoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "Meta Perception Encoder ViT-G/14 (depth 50, hidden 1536)",
"encoder_params_B": 1.9,
"fusion": "adapter",
"notes": "Window/full 3:1 attention inside the ViT too (patch 14, temporal_patch 2, d_ff 8960); MLP projector (GELU, hidden 4096) with 2x2 merge."
},
"notes": "Meta's return to open weights (first since Llama 4, Apache 2.0): a 30B dense VLM (28B text decoder + ~2B Perception Encoder) distilled from Muse Spark 1.2 for on-device agentic use. (SWA,SWA,SWA,Full) x 13 pattern — RoPE on sliding layers, NoPE on full layers; final logit softcapping 20.0; speculative-decoding drafter model released alongside. Day-0 GGUF/ExecuTorch support.",
"sources": [
"https://huggingface.co/meta-models/Muse-Glimmer-30B",
"https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/main/config.json",
"https://huggingface.co/blog/muse-glimmer"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Local SWA",
"n": 39,
"type": "sliding",
"sub": "win 2048"
},
{
"name": "Global",
"n": 13,
"type": "global",
"sub": "NoPE"
}
],
"pattern": "lllglllglllglllglllglllglllglllglllglllglllglllglllg",
"pattern_map": {
"l": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "3:1 local / global attention — RoPE local, NoPE global",
"p": {
"variants": [
{
"n": 39,
"name": "local sliding 2048",
"type": "sliding",
"span": "win",
"frac": 0.3,
"spanLabel": "window 2048",
"sub1": "gated GQA 32Q / 2KV × 128",
"sub2": "RoPE θ 500K (sliding layers only)"
},
{
"n": 13,
"name": "global NoPE",
"type": "global",
"span": "full",
"spanLabel": "full 128K",
"sub1": "no positional encoding (layer_rope_theta 0)",
"sub2": "1 global after every 3 local"
}
],
"common": [
"QK-norm + extra query scaling (qk_scale_factor 3.87)",
"per-layer attention output gate (6656 × 4096)",
"final logit softcap 20.0"
],
"cache": "global layers: 512 el/token unbounded × 13 · local capped at 2048 tokens"
}
}
]
},
{
"id": "k-exaone-2-0",
"name": "K-EXAONE 2.0 (750B-A37B)",
"org": "LG AI Research",
"family": "EXAONE",
"released": "2026-07",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 750,
"params_active_B": 37,
"n_layers": 78,
"d_model": 6144,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "LLLG hybrid — 2 dense head layers (1 global + 1 sliding-window 4096) followed by 19 × (3×128-token sliding-window + 1 global) blocks: 20 global NoPE layers + 58 sliding layers with RoPE theta 1M (SWA-only RoPE); GQA 64 Q / 8 KV heads × 128 with per-head QK-norm.",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 153600,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE + NoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "LG AI Research's frontier open-weight MoE, upcycled from K-EXAONE (236B): depth 48→78 layers (block-level duplication, 12→19 LLLG blocks) and width 128→256 experts (expert + router-row duplication), followed by continual pretraining. 750B total / ~37B active: top-8 of 256 experts + 1 shared expert with sigmoid scoring, sequence-level load balancing, dropless routing (noaux_tc). Two dense head layers (d_ff 18,432) then 76 MoE layers (expert d_ff 2,048); the last 16 layers use Clamped SwiGLU (limit 7.0) to bound exploding activations. Ships MTP (1 sliding-window layer, 4 speculative steps) and DSpark drafters for ~3–5× decoding speedup. 256K context, 10 languages, BF16 weights (749.4B params in the safetensors index). Published on HF 2026-07-29.",
"sources": [
"https://arxiv.org/abs/2608.04505",
"https://www.lgresearch.ai/news/view?seq=678",
"https://huggingface.co/LGAI-EXAONE/K-EXAONE-2.0-750B-A37B",
"https://huggingface.co/LGAI-EXAONE/K-EXAONE-2.0-750B-A37B/raw/main/config.json"
],
"confidence": "verified",
"dense_first_layers": 2,
"attention_split": {
"parts": [
{
"name": "Sliding",
"n": 58,
"type": "sliding",
"sub": "win 128 · 1×4096"
},
{
"name": "Global",
"n": 20,
"type": "global",
"sub": "NoPE"
}
],
"pattern": "gssssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssgsssg",
"pattern_map": {
"s": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "LLLG hybrid — sliding-window + global NoPE blocks",
"p": {
"variants": [
{
"n": 58,
"name": "sliding window",
"type": "sliding",
"span": "win",
"frac": 0.15,
"spanLabel": "window 128 (layer 1: 4096)",
"sub1": "GQA 64Q / 8KV × 128 · per-head QK-norm",
"sub2": "RoPE θ 1M — applied on SWA layers only"
},
{
"n": 20,
"name": "global NoPE",
"type": "global",
"span": "full",
"spanLabel": "full context 256K",
"sub1": "no positional encoding",
"sub2": "1 global per LLLG block · layer 0 + final layer"
}
],
"common": [
"2 dense head layers (global + 4096-SWA, d_ff 18,432) before the MoE stack",
"last 16 layers: Clamped SwiGLU (limit 7.0) bounds exploding activations"
],
"cache": "global layers: 2,048 el/token unbounded × 20 · sliding layers capped at 128 tokens (4,096 at layer 1)"
},
"notes": []
}
],
"attn_bullets": [
"upcycled from K-EXAONE (236B/23B): depth 48→78 by duplicating middle LLLG blocks, width 128→256 experts by duplicating experts + router rows — then continual pretraining",
"sigmoid-routing dropless MoE (top-8 + 1 shared of 256, routed_scaling_factor 2.5); BF16 weights total 749.4B params in the safetensors index",
"ships MTP (1 SWA layer, 4 speculative steps) + DSpark drafters → ~3–5× decoding speedup"
]
},
{
"id": "glm-5-3-flash",
"name": "GLM-5.3-Flash",
"org": "Zhipu",
"family": "GLM",
"released": "2026-08",
"license": "MIT",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 320,
"params_active_B": 18,
"n_layers": 45,
"d_model": 4096,
"d_ff": 12288,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — 34 KDA linear-attention layers (gated DeltaNet-style: 64 heads × 128, short conv 4, per-head decay + gate) + 11 DSA sparse layers every 4th (MLA with full NoPE: q_lora 1536, kv_lora 512, qk_nope 256, v 256; indexer 32 × 128 heads, top-2048, 4-key block pooling); interleaved indexer RoPE only.",
"n_experts": 288,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 154880,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "sandwich",
"pos_encoding": "NoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "ViT (24 layers, hidden 1024, 16 heads, patch 14, image 448)",
"encoder_params_B": 0.3,
"fusion": "adapter",
"notes": "Native image+video (temporal patch 2, spatial merge 2); 1024 → 10240 → 4096 projection into the LM."
},
"notes": "Z.ai's first natively multimodal GLM-5: 320B total / 18B active with a novel sparse + linear attention hybrid — 34 KDA gated-linear-attention layers (DeltaNet-style, 64 heads × 128, short conv 4) interleaved 3:1 with 11 DeepSeek-style DSA layers (full-NoPE MLA: q_lora 1536, kv_lora 512, v 256; indexer 32 × 128, top-2048, 4-key block pooling). 288 experts top-8 + 1 shared with sigmoid dropless routing (noaux_tc); first 3 layers dense (d_ff 12,288). mHC manifold-constrained hyper-connections (Sinkhorn 20); Clamped SwiGLU (limit 10); MTP 1 layer. 1M context; FP8 release (BF16 sibling repo). Approaches Claude Opus 4.8 on coding/agentic benchmarks at ~1/10 the serving cost.",
"sources": [
"https://huggingface.co/zai-org/GLM-5.3-Flash",
"https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/config.json",
"https://z.ai/blog/glm-5.3-flash",
"https://arxiv.org/abs/2602.15763"
],
"confidence": "verified",
"dense_first_layers": 3,
"attention_split": {
"parts": [
{
"name": "KDA linear",
"n": 34,
"type": "linear",
"sub": "gated δ · conv 4"
},
{
"name": "DSA sparse",
"n": 11,
"type": "sparse",
"sub": "MLA NoPE · top-2048"
}
],
"pattern": "lllslllslllslllslllslllslllslllslllslllslllsl",
"pattern_map": {
"l": "linear",
"s": "sparse"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "KDA — gated linear attention (34 layers)",
"p": {
"d": 4096,
"kh": 64,
"vh": 64,
"dh": 128,
"conv": 4,
"proj": "fused qkvbfg → q | k | v | β | f | g",
"projSub": "single fused projection (KDA)",
"qsub": "L2 norm",
"vsub": "64 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "input-dependent decay",
"decaySub": "A_log · dt_bias · b_proj",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNorm ⊗ SiLU(z)",
"outSub": "→ out_proj",
"cacheline": "no KV cache on linear layers — state 64×128×128 ≈ 1.05M el (fp32) + conv 4×4096"
},
"notes": [
"gate lower bound −5 keeps decay stable",
"34 of 45 layers: every layer except the 4th, 8th, … (DSA)"
]
},
{
"kind": "dsaidx",
"title": "DSA indexer — top-2048 token selection",
"p": {
"iheads": 32,
"idim": 128,
"topk": 2048,
"keynorm": "LN",
"note": "kpool 4 — 4-key block pooling · interleaved indexer RoPE",
"cache": "indexer keys cached on the 11 sparse layers — no IndexShare (Flash runs its own indexer per sparse layer)"
},
"notes": [
"MLA on the sparse layers is fully NoPE (q_lora 1536, kv_lora 512, qk_nope 256, v 256)",
"the MTP layer also carries its own indexer"
]
},
{
"kind": "mhc",
"title": "mHC — manifold-constrained hyper-connections",
"p": {
"sinkhorn": 20,
"cap": "x_{l+1} = H_res·x_l + H_postᵀ·F(H_pre·x_l) — each mapping = static + input-dynamic part"
}
}
],
"residual": {
"kind": "mhc",
"note": "Residuals: 4-stream manifold-constrained Hyper-Connections (mHC)"
},
"attn_bullets": [
"MTP module: 1 extra layer (indexer-equipped) for multi-token prediction",
"Clamped SwiGLU (limit 10) bounds activation spikes on every layer",
"vision: 24-layer ViT (1024) + 10240-dim projector feeds the LM (image + video)"
]
},
{
"id": "qwen3-8-flash-next",
"name": "Qwen3.8-Flash-Next",
"org": "Alibaba",
"family": "Qwen3.8",
"released": "2026-08",
"license": "Qwen Community License 1.0 (custom)",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 125,
"params_active_B": 6,
"n_layers": 48,
"d_model": 2560,
"d_ff": null,
"d_ff_moe": 640,
"n_heads": 24,
"n_kv_heads": 2,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — 36 Gated DeltaNet linear-attention layers (16 QK / 48 V heads, head_dim 128, conv 4) + 12 QSA sparse layers every 4th (GQA 24 Q / 2 KV, head_dim 256, partial RoPE 0.25, interleaved MRoPE; indexer MQA 4 Q / 1 shared K head × 128, budget 512 blocks = 2048 tokens, 4-token micro-blocks).",
"n_experts": 512,
"active_experts": 10,
"shared_experts": 1,
"vocab_size": 248320,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "SigLIP2-so400m-class ViT (27 layers, hidden 1152, 16 heads, patch 16)",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "Native image+video (temporal patch 2, GELU ViT, d_ff 4304); 2×2 spatial merge projects to d_model 2560."
},
"notes": "Experimental preview of the Qwen4 architecture (Qwen4ExpForConditionalGeneration): 125B total / 6B active MoE (512 experts top-10 + 1 shared, expert d_ff 640) PLUS 51B N-gram embedding parameters (20M bigram/trigram entries indexed at layer 2 — cheap, offload-friendly parameter scaling) and a 4B MTP layer. 3:1 hybrid of Gated DeltaNet and QSA (Qwen Sparse Attention) — QSA selects 4-token micro-blocks via an MQA indexer (512 blocks = 2048-token budget) instead of per-token top-k. Gated Residual: 4 branches with a rank-320 bottleneck, element-wise data-dependent read gate + per-branch scalar write gate. Muon+AdamW split-optimizer recipe, no batch-size warmup. Native 262K context, extensible to 1M.",
"sources": [
"https://huggingface.co/Qwen/Qwen3.8-Flash-Next",
"https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/main/config.json",
"https://github.com/QwenLM/Qwen3.8-Flash-Next/blob/main/tech_report.pdf"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Gated DeltaNet",
"n": 36,
"type": "linear",
"sub": "16QK/48V × 128 · conv 4"
},
{
"name": "QSA sparse",
"n": 12,
"type": "sparse",
"sub": "24Q/2KV × 256 · 512 blocks"
}
],
"pattern": "lllslllslllslllslllslllslllslllslllslllslllsllls",
"pattern_map": {
"l": "linear",
"s": "sparse"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Gated DeltaNet (36 layers)",
"p": {
"d": 2560,
"kh": 16,
"vh": 48,
"dh": 128,
"conv": 4,
"proj": "in_proj_qkv 2560 → 10240 · in_proj_z → gate",
"projSub": "split projections (Qwen4Exp class) · in_proj_b / a → β, α",
"qsub": "L2 norm",
"vsub": "48 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "per-head decay α = e^g",
"decaySub": "g = −e^A · softplus(a + bias)",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNorm ⊗ SiLU(z)",
"outSub": "→ out_proj",
"cacheline": "no KV cache on linear layers — state 48×128×128 ≈ 0.79M el (fp32) + conv 4×10240"
}
},
{
"kind": "msa",
"title": "QSA — Qwen Sparse Attention (12 layers)",
"p": {
"nq": 24,
"nkv": 2,
"dh": 256,
"iheads": 4,
"idim": 128,
"topk": 512,
"block": 4,
"budget": 2048,
"group": 12,
"blockSub": "block-level scoring",
"qsub": "per-head QK-norm · partial RoPE 64/256",
"cache": "indexer MQA: 4 Q heads / 1 shared K head × 128 — 4-token micro-blocks, 512 blocks"
},
"notes": [
"replaces gated full attention: block-level selection instead of per-token top-k",
"full_attention_interval 4 — every 4th layer"
]
}
],
"attn_bullets": [
"N-gram embeddings: 20M bigram/trigram entries (51B params) indexed at layer 2 — parameter scaling with near-zero compute",
"Gated Residual: 4 branches, rank-320 bottleneck — element-wise read gate + per-branch write gate",
"MTP: 1 layer · Muon + AdamW split recipe · no batch-size warmup"
]
},
{
"id": "hy4-preview",
"name": "Hunyuan Hy4 (preview)",
"org": "Tencent Hunyuan",
"family": "Hunyuan",
"released": "2026-08",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 770,
"params_active_B": 49,
"n_layers": 78,
"d_model": 6144,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 256,
"attention": "sparse",
"attention_detail": "Gated MLA + Gated DeepSeek Sparse Attention on all 78 layers — MLA (q_lora 2048, kv_lora 512, qk_nope 192 + qk_rope 64, v 256) with an element-wise output gate; DSA indexer 32 × 128 heads, top-2048, with IndexCache cross-layer reuse (21 full indexer layers, 57 shared); learnable sink tokens.",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 120832,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "sandwich",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Tencent's 770B total / 49B active flagship preview (Apache-2.0): Gated MLA + Gated DSA sparse attention on every one of the 78 layers — DeepSeek-style indexer (top-2048, 32 × 128 heads) with element-wise attention gating and IndexCache cross-layer index reuse (21 of 78 layers run the indexer, 57 reuse the nearest top-k). Residuals: iHC identity Hyper-Connections (4 streams, hc_mult 4, magnitude 2.0). Layer 0 is a dense FFN (d_ff 18,432), layers 1–77 are MoE (256 experts top-8 + 1 shared, dropless e_score_correction_bias routing). Native MTP speculative-decoding layer (10B total / 0.7B active). Learnable sink tokens; Clamped SwiGLU (limit 10); RoPE θ 10M; 1M context.",
"sources": [
"https://huggingface.co/tencent/Hy4-preview",
"https://huggingface.co/tencent/Hy4-preview/raw/main/config.json",
"https://github.com/Tencent-Hunyuan/Hy4-preview"
],
"confidence": "verified",
"dense_first_layers": 1,
"attn_modules": [
{
"kind": "dsaidx",
"title": "Gated DSA — IndexCache cross-layer reuse",
"p": {
"iheads": 32,
"idim": 128,
"topk": 2048,
"keynorm": "LN",
"note": "element-wise gate on attention output (gated MLA)",
"shareLabel": "IndexCache",
"share": {
"full": 21,
"shared": 57,
"total": 78,
"layers": [
0,
1,
5,
9,
13,
17,
21,
25,
29,
33,
37,
41,
45,
49,
53,
57,
61,
65,
69,
73,
77
]
},
"cache": "k^I cached on the 21 indexer layers — 57 shared layers reuse the nearest top-k"
},
"notes": [
"Gated DSA: inspired by DeepSeek's sparse attention + GLM's gating",
"IndexCache: cross-layer sparse-index reuse (arXiv 2603.12201)"
]
},
{
"kind": "mla",
"title": "Gated MLA — element-wise gating",
"p": {
"d": 6144,
"nh": 64,
"qlora": 2048,
"kvlora": 512,
"nope": 192,
"rope": 64,
"v": 256,
"gate": "element-wise gate",
"cache": "KV cache: c_KV 512 + k_R 64 = 576 el/token/layer"
},
"notes": [
"gated_mla: learned element-wise gate scales the attention output per channel"
]
}
],
"attn_bullets": [
"iHC (identity Hyper-Connections): 4 residual streams, hc_mult 4 — expands inter-layer information flow",
"layer 0: dense FFN (d_ff 18,432) · layers 1–77: MoE 256 experts top-8 + 1 shared",
"native MTP layer (10B total / 0.7B active) built in for speculative decoding",
"learnable sink tokens · Clamped SwiGLU (limit 10) · RoPE θ 10M"
]
},
{
"id": "deepseek-v4-flash-vision-exp",
"name": "DeepSeek-V4-Flash-Vision-Exp",
"org": "DeepSeek",
"family": "DeepSeek-V4",
"released": "2026-08",
"license": "MIT",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 297,
"params_active_B": 13,
"n_layers": 43,
"d_model": 4096,
"d_ff": 2048,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 1,
"head_dim": 512,
"attention": "sparse",
"attention_detail": "CSA+HCA hybrid sparse stack over a shared K=V MQA backbone (n_kv=1), sliding-window 128, Lightning Indexer top-512; partial-RoPE on 64 of 512 head dims. First two layers are pure sliding-window.",
"n_experts": 256,
"active_experts": 6,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "ViT (32 layers, hidden 1024, 16 heads, patch 14)",
"encoder_params_B": 0.3,
"fusion": "adapter",
"notes": "Patch 14 with 3× downsample (≤384 visual tokens, min 147,456 px input); vision RoPE θ 10K; MLP aligner (w1 4096 → 9216, w2 → 4096) into the LM."
},
"notes": "DeepSeek's first multimodal model in the V4 family: the verified V4-Flash LM stack (CSA+HCA compressed sparse attention over a shared K=V MQA backbone, mHC hyper-connections, hash-routed first 3 MoE layers, 256 experts top-6 + 1 shared) with a 32-layer ViT vision tower (dim 1024, 16 heads, patch 14, 3× downsample) + MLP aligner, and continued training for visual understanding. Ships 3 MTP drafters (vs 1 in the base) and DSpark noise-token speculative decoding (block 5, Markov rank 256, targets layers 40–42). Total params not officially disclosed: ~297B estimated — 284B verified V4-Flash base + ~0.35B vision tower/aligner + 2 extra MTP layers (each with a 256-expert MoE FFN, ~6.4B). FP4 experts + FP8 weights (167.8 GB).",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
"https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp/raw/main/config.json"
],
"confidence": "partial",
"attention_split": {
"parts": [
{
"name": "CSA",
"n": 21,
"type": "CSA",
"sub": "top-512"
},
{
"name": "HCA",
"n": 20,
"type": "HCA",
"sub": "ratio 128"
},
{
"name": "SW",
"n": 2,
"type": "SW",
"sub": "win 128"
}
],
"pattern": "??CHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHC",
"pattern_map": {
"C": "CSA",
"H": "HCA",
"?": "SW"
}
},
"attn_modules": [
{
"kind": "csa",
"title": "CSA — Compressed Sparse Attention (21 layers)",
"p": {
"d": 4096,
"nh": 64,
"qlora": 1024,
"m": 4,
"topk": 512,
"win": 128,
"og": 8,
"olora": 1024,
"cache": "CSA cache/token: C_comp ~128 el + indexer ~32 el amortized + 128 × 512 ring — FP8 (RoPE dims BF16)"
},
"notes": [
"indexer scores 4:1-compressed blocks, not raw tokens (V3.2-DSA lineage)",
"shared K=V: each 512-dim entry serves as both key and value (n_kv = 1)",
"query latent shared by main attention and indexer",
"output RoPE(−i): outputs carry relative, not absolute, position"
]
},
{
"kind": "hca",
"title": "HCA — Heavily Compressed Attention (20 layers)",
"p": {
"d": 4096,
"nh": 64,
"qlora": 1024,
"m": 128,
"win": 128,
"og": 8,
"olora": 1024,
"cache": "HCA cache/token: ~4 el amortized + ring"
},
"notes": [
"alternates with CSA — near-free global context on half the stack",
"same query path, sinks, grouped W_O as CSA; only KV compression differs",
"first 2 layers: pure 128-token sliding window (compress_ratio 0)"
]
},
{
"kind": "mhc",
"title": "mHC — Manifold-Constrained Hyper-Connections",
"p": {
"sinkhorn": 20,
"cap": "x_{l+1} = H_res·x_l + H_postᵀ·F(H_pre·x_l) — each mapping = static + input-dynamic part · ~6.7% train overhead"
}
}
],
"residual": {
"kind": "mhc",
"note": "Residuals: 4-stream Manifold-Constrained Hyper-Connections (mHC), doubly-stochastic mixing — see panel"
},
"attn_bullets": [
"vision tower: 32-layer ViT (dim 1024, 16 heads, patch 14) with 3× downsample → ≤384 tokens + MLP aligner",
"3 MTP drafters (vs 1 in the base) · DSpark noise-token speculative decoding (block 5, Markov rank 256)",
"first 3 MoE layers Hash-routed · FP4 experts + FP8 weights (167.8 GB)"
]
},
{
"id": "glm-4-5",
"name": "GLM-4.5",
"org": "Zhipu",
"family": "GLM",
"released": "2025-07",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 355,
"params_active_B": 32,
"n_layers": 92,
"d_model": 5120,
"d_ff": 12288,
"d_ff_moe": 1536,
"n_heads": 96,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 96 Q / 8 KV heads, head_dim 128, QK-norm, attention bias, partial RoPE (0.5).",
"n_experts": 160,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 151552,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "355B/32B MoE with first 3 dense layers then 160 routed experts (top-8) + 1 shared; QK-norm and partial (50%) RoPE; includes an MTP layer.",
"sources": [
"https://huggingface.co/zai-org/GLM-4.5"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 5120,
"nq": 96,
"nkv": 8,
"dh": 128,
"rope": "partial RoPE 64/128",
"qknorm": "QK-RMSNorm per head",
"cache": "2,048 el/token/layer × 92"
},
"notes": [
"attention bias on q/k/v (rare in 2025) — o_proj bias-free",
"96 heads: attention width 12288 = 2.4× d_model",
"+1 MTP layer"
]
}
]
},
{
"id": "glm-4-6",
"name": "GLM-4.6",
"org": "Zhipu",
"family": "GLM",
"released": "2025-09",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 355,
"params_active_B": 32,
"n_layers": 92,
"d_model": 5120,
"d_ff": 12288,
"d_ff_moe": 1536,
"n_heads": 96,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 96 Q / 8 KV heads, head_dim 128, QK-norm, attention bias, partial RoPE (0.5).",
"n_experts": 160,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 151552,
"context_length": 202752,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Architecturally identical to GLM-4.5 but extends native context to ~200K; 160 routed experts top-8 + 1 shared.",
"sources": [
"https://huggingface.co/zai-org/GLM-4.6"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 5120,
"nq": 96,
"nkv": 8,
"dh": 128,
"rope": "partial RoPE 64/128",
"qknorm": "QK-RMSNorm per head",
"cache": "2,048 el/token/layer × 92"
},
"notes": [
"config identical to GLM-4.5 except context (198K)",
"attention bias on q/k/v · QK-norm · partial RoPE trio"
]
}
]
},
{
"id": "kimi-k2",
"name": "Kimi K2",
"org": "Moonshot",
"family": "Kimi",
"released": "2025-07",
"license": "Modified MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 1000,
"params_active_B": 32,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "DeepSeek-V3 MLA: kv_lora_rank 512, q_lora_rank 1536, qk_nope 128 + qk_rope 64, v_head_dim 128; 64 heads; YaRN to 128K.",
"n_experts": 384,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 163840,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "1T/32B MoE reusing DeepSeek-V3's MLA architecture but scaled to 384 routed experts (top-8) + 1 shared and only 1 dense layer; trained with the MuonClip optimizer for stability. Ships FP8.",
"sources": [
"https://huggingface.co/moonshotai/Kimi-K2-Instruct"
],
"confidence": "verified",
"dense_first_layers": 1,
"attn_modules": [
{
"kind": "mla",
"title": "Multi-head Latent Attention (MLA) module",
"p": {
"d": 7168,
"nh": 64,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 1.81",
"cache": "KV cache: 576 el/token/layer × 61 ≈ 68.6 KB/token — identical to DeepSeek-V3 despite half the heads (cache is head-count independent)"
},
"notes": [
"64 heads (½ of DeepSeek-V3): q_b / kv_b / o_proj halve, cache unchanged",
"RoPE θ 50000 · YaRN ×32 with unusual β_fast = β_slow = 1",
"runs on DeepSeek-V3 modeling code (auto_map)"
]
}
]
},
{
"id": "minimax-m2",
"name": "MiniMax-M2",
"org": "MiniMax",
"family": "MiniMax",
"released": "2025-10",
"license": "Modified MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 230,
"params_active_B": 10,
"n_layers": 62,
"d_model": 3072,
"d_ff": 8192,
"d_ff_moe": 1536,
"n_heads": 48,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Full softmax GQA 48 Q / 8 KV heads (no lightning attention, unlike M1/Text-01), QK-norm, partial RoPE (rotary_dim 64).",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 0,
"vocab_size": 200064,
"context_length": 196608,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "~230B/10B MoE with 256 experts (top-8), tuned for agentic/coding. Unlike MiniMax-Text-01/M1, M2 uses full softmax attention throughout (dropped the linear-attention hybrid).",
"sources": [
"https://huggingface.co/MiniMaxAI/MiniMax-M2"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Full softmax GQA (all 62 layers)",
"p": {
"d": 3072,
"nq": 48,
"nkv": 8,
"dh": 128,
"rope": "RoPE 64/128 · θ 5e6",
"qknorm": "per-layer QK-RMSNorm (whole projection)",
"cache": "2 × 8 × 128 = 2,048 el/token/layer × 62"
},
"notes": [
"design reversal: dropped M1/Text-01’s linear attention entirely",
"why (blog): multi-hop reasoning · numerical precision · immature infra",
"QK-norm OLMo2-style: whole projection pre-head-split, not per head",
"3 MTP modules for speculative decoding"
]
}
]
},
{
"id": "minimax-text-01",
"name": "MiniMax-Text-01",
"org": "MiniMax",
"family": "MiniMax",
"released": "2025-01",
"license": "MiniMax Model License",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 456,
"params_active_B": 45.9,
"n_layers": 80,
"d_model": 6144,
"d_ff": 9216,
"d_ff_moe": 9216,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "Lightning (linear) attention in 7 of every 8 layers + 1 softmax GQA layer (7:1); softmax layers use partial RoPE (rotary_dim 64).",
"n_experts": 32,
"active_experts": 2,
"shared_experts": 0,
"vocab_size": 200064,
"context_length": 10240000,
"norm": "RMSNorm",
"norm_placement": "post",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "456B/45.9B MoE (32 experts, top-2). Hybrid attention: lightning linear attention on 7/8 layers with a full softmax layer every 8th; postnorm placement; extrapolates to 10M+ context.",
"sources": [
"https://huggingface.co/MiniMaxAI/MiniMax-Text-01",
"https://arxiv.org/pdf/2501.08313"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Lightning",
"n": 70,
"type": "linear",
"sub": "linear attn"
},
{
"name": "Softmax GQA",
"n": 10,
"type": "GQA",
"sub": "64/8 · RoPE"
}
],
"pattern": "lllllllflllllllflllllllflllllllflllllllflllllllflllllllflllllllflllllllflllllllf",
"pattern_map": {
"l": "linear",
"f": "GQA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Lightning Attention (70 layers)",
"p": {
"d": 6144,
"kh": 64,
"vh": 64,
"dh": 128,
"conv": null,
"proj": "qkv_proj 6144 → 24576 → SiLU",
"projSub": "64 heads × 128",
"qsub": "SiLU",
"vsub": "SiLU",
"update": "S ← e^{−slope}·S + kᵀv",
"decayName": "per-head ALiBi-slope decay",
"decaySub": "layer scale ×(1 − l/79 + ε)",
"out": "o = q·S → RMSNorm(8192) ⊗ σ(W_g h)",
"outSub": "→ out_proj 8192 → 6144",
"cacheline": "constant state 64 × 128 × 128 fp32 (4 MiB/layer) — no per-token cache; lightning layers have NO positional encoding"
},
"notes": [
"O(1) decode via the right-product kernel trick (TransNormer lineage)",
"deeper layers decay slower → longer memory"
]
},
{
"kind": "gqa",
"title": "Softmax GQA (every 8th layer — 10 layers)",
"p": {
"d": 6144,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE 64/128 · θ 1e7",
"cache": "2,048 el/token/layer — only the 10 softmax layers"
},
"notes": [
"plain GQA: no QK-norm, no gate"
]
}
],
"residual": {
"kind": "deepnorm",
"note": "Post-norm residual: h → α·LN(h) + F(LN(h)), α = 3.557 = (2·80)^¼ (DeepNorm)"
}
},
{
"id": "gemma-3-27b",
"name": "Gemma 3 27B",
"org": "Google",
"family": "Gemma",
"released": "2025-03",
"license": "Gemma",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 27,
"params_active_B": 27,
"n_layers": 62,
"d_model": 5376,
"d_ff": 21504,
"d_ff_moe": null,
"n_heads": 32,
"n_kv_heads": 16,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "GQA 32 Q / 16 KV heads with QK-norm; 5 local sliding-window (1024) layers per 1 global layer; local RoPE base 10K, global RoPE base 1M.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 262208,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "sandwich",
"pos_encoding": "RoPE",
"activation": "GeGLU",
"tie_embeddings": true,
"vision": {
"encoder": "SigLIP-So400m",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "SigLIP-So400m encoder (896x896 image); 256 tokens/image via a mean-pool projector into the LM."
},
"notes": "Dense 27B LM with interleaved 5:1 local:global attention (local sliding window 1024) to cut KV-cache cost, QK-norm, GeGLU MLP, and sandwich (pre+post) RMSNorm around each block. Multimodal via a SigLIP encoder.",
"sources": [
"https://huggingface.co/google/gemma-3-27b-it",
"https://arxiv.org/html/2503.19786v1"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Local SWA",
"n": 52,
"type": "sliding",
"sub": "win 1024"
},
{
"name": "Global",
"n": 10,
"type": "global",
"sub": "RoPE 1M"
}
],
"pattern": "lllllglllllglllllglllllglllllglllllglllllglllllglllllglllllgll",
"pattern_map": {
"l": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "5:1 local / global attention with dual RoPE",
"p": {
"variants": [
{
"n": 52,
"name": "local sliding 1024",
"type": "sliding",
"span": "win",
"frac": 0.3,
"spanLabel": "window 1024",
"sub1": "GQA 32Q / 16KV × 128 · QK-norm",
"sub2": "RoPE θ 10K (local frequency)"
},
{
"n": 10,
"name": "global",
"type": "global",
"span": "full",
"spanLabel": "full 128K",
"sub1": "RoPE θ 1M · 8× linear interp",
"sub2": "1 global after every 5 local"
}
],
"common": [
"softmax scale 1/√168 (query_pre_attn_scalar), not 1/√head_dim",
"QK-norm replaces Gemma-2 soft-capping",
"sandwich RMSNorm around both sublayers"
],
"cache": "global layers: 4,096 el/token unbounded · local capped at 1024 tokens"
}
}
]
},
{
"id": "ernie-4-5-300b-a47b",
"name": "ERNIE 4.5 300B-A47B",
"org": "Baidu",
"family": "ERNIE",
"released": "2025-06",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 300,
"params_active_B": 47,
"n_layers": 54,
"d_model": 8192,
"d_ff": 28672,
"d_ff_moe": 3584,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 Q / 8 KV heads, head_dim 128; FlashMask dynamic attention masking; RoPE theta 500K.",
"n_experts": 64,
"active_experts": 8,
"shared_experts": 0,
"vocab_size": 103424,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "300B/47B text MoE (64 routed experts, top-8, no shared); first 3 layers dense. Text portion of Baidu's heterogeneous-MoE ERNIE 4.5 (full multimodal model ~424B); includes an MTP layer.",
"sources": [
"https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT",
"https://ernie.baidu.com/blog/publication/ERNIE_Technical_Report.pdf"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 8192,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ 500K",
"cache": "2,048 el/token/layer × 54"
},
"notes": [
"bias-free projections everywhere (use_bias false)",
"FlashMask is training infra — inference attention is plain GQA",
"+1 MTP layer"
]
}
]
},
{
"id": "glm-5-2",
"name": "GLM-5.2",
"org": "Zhipu",
"family": "GLM",
"released": "2026-06",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 744,
"params_active_B": 40,
"n_layers": 78,
"d_model": 6144,
"d_ff": 12288,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 256,
"attention": "sparse",
"attention_detail": "DeepSeek-style MLA + DSA sparse attention (index_topk 2048; IndexShare: only 21 of 78 layers run the indexer, the rest reuse the nearest top-k); q_lora 2048, kv_lora 512, qk_nope 192 + qk_rope 64 = 256, v 256.",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 154880,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "GLM-5.2 continues the GLM-5 line's DeepSeek-style MLA + DSA sparse attention (top-2048 keys; the GQA-to-MLA+DSA shift happened at GLM-5, which is what enables the 1M-token context); 744B/40B, 256 experts top-8 + 1 shared.",
"sources": [
"https://huggingface.co/zai-org/GLM-5.2"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "dsaidx",
"title": "DSA indexer + IndexShare (cross-layer top-k reuse)",
"p": {
"iheads": 32,
"idim": 128,
"topk": 2048,
"keynorm": "LN",
"note": "fp32 scoring · interleaved indexer RoPE",
"share": {
"full": 21,
"shared": 57,
"total": 78,
"layers": [
0,
1,
2,
6,
10,
14,
18,
22,
26,
30,
34,
38,
42,
46,
50,
54,
58,
62,
66,
70,
74
]
},
"cache": "k^I cached only on the 21 indexer layers — 57 shared layers cache nothing"
},
"notes": [
"IndexShare: shared layers reuse the nearest preceding top-k verbatim",
"README: 2.9× per-token FLOP cut at 1M ctx · MTP keeps its own indexer",
"indexers distilled against the averaged attention of served layers"
]
},
{
"kind": "mla",
"title": "MLA base (GLM-wide variant)",
"p": {
"d": 6144,
"nh": 64,
"qlora": 2048,
"kvlora": 512,
"nope": 192,
"rope": 64,
"v": 256,
"cache": "KV cache: c_KV 512 + k_R 64 = 576 el/token/layer × 78 ≈ 87.8 KB/token bf16",
"yarn": null
},
"notes": [
"wider MLA: q/k 256 (192 nope + 64 rope) · v 256 · 64 heads",
"GLM-5 report: bigger head dim, fewer heads than DeepSeek",
"plain RoPE — no YaRN temperature",
"1M context via RoPE θ 8e6 (no YaRN)"
]
}
]
},
{
"id": "kimi-k2-7",
"name": "Kimi K2.7",
"org": "Moonshot",
"family": "Kimi",
"released": "2026-06",
"license": "Modified MIT",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 1000,
"params_active_B": 32,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "DeepSeek-V3-style MLA (kv_lora 512, q_lora 1536, qk 192, v 128); full attention.",
"n_experts": 384,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 163840,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "MoonViT",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "400M MoonViT vision encoder for native multimodal input."
},
"notes": "Kimi K2.7-Code: 1T/32B MoE on the DeepSeek-V3 MLA backbone (61 layers, 384 experts top-8 + 1 shared), now multimodal via a 400M MoonViT encoder; 256K context.",
"sources": [
"https://www.kimi.com/resources/kimi-k2-7-code",
"https://huggingface.co/moonshotai/Kimi-K2.7-Code",
"https://huggingface.co/moonshotai/Kimi-K2.7-Code/raw/main/config.json"
],
"confidence": "verified",
"dense_first_layers": 1,
"attn_modules": [
{
"kind": "mla",
"title": "Multi-head Latent Attention (MLA) module",
"p": {
"d": 7168,
"nh": 64,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 2.0",
"cache": "KV cache: 576 el/token/layer × 61 ≈ 68.6 KB/token bf16"
},
"notes": [
"attention identical to K2.6 (key-by-key diff) — only quantization differs",
"MoonViT 400M vision tower unchanged from K2.6"
]
}
]
},
{
"id": "llama-3-3-70b",
"name": "Llama 3.3 70B",
"org": "Meta",
"family": "Llama",
"released": "2024-12",
"license": "Llama 3.3 Community",
"modality": "text",
"decoder_type": "Dense",
"params_total_B": 70,
"params_active_B": 70,
"n_layers": 80,
"d_model": 8192,
"d_ff": 28672,
"d_ff_moe": null,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Full attention, GQA 64 query / 8 KV heads; RoPE theta 500000 with Llama3 rope-scaling (factor 8) for 128K context.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 128256,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Dense 70B decoder, architecturally identical to Llama 3.1 70B; instruction-tuned refresh reaching ~405B-class quality. GQA with 8 KV heads, 128K context.",
"sources": [
"https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 8192,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ500K · llama3 ×8",
"cache": "2,048 el/token/layer × 80"
},
"notes": [
"the plain-GQA reference design: no QK-norm, no bias, no window"
]
}
]
},
{
"id": "llama-4-scout",
"name": "Llama 4 Scout (17B-16E)",
"org": "Meta",
"family": "Llama",
"released": "2025-04",
"license": "Llama 4 Community",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 109,
"params_active_B": 17,
"n_layers": 48,
"d_model": 5120,
"d_ff": 16384,
"d_ff_moe": 8192,
"n_heads": 40,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "iRoPE: interleaved chunked local attention (chunk 8192) with global NoPE layers every 4th layer; QK-norm on RoPE layers; GQA 40/8; temperature-scaled attention for extrapolation to 10M context.",
"n_experts": 16,
"active_experts": 1,
"shared_experts": 1,
"vocab_size": 202048,
"context_length": 10485760,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "iRoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "MetaCLIP (native early-fusion)",
"encoder_params_B": null,
"fusion": "early-fusion",
"notes": "Native multimodal via early fusion of vision tokens into the decoder."
},
"notes": "MoE with 16 routed experts (top-1) plus 1 always-on shared expert in every layer; native multimodal early fusion; iRoPE (RoPE + periodic NoPE layers) enables a 10M-token context. Fits one H100 at int4.",
"sources": [
"https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct",
"https://ai.meta.com/blog/llama-4-multimodal-intelligence/"
],
"confidence": "verified",
"moe_every": 1,
"attention_split": {
"parts": [
{
"name": "Local",
"n": 36,
"type": "sliding",
"sub": "chunk 8192"
},
{
"name": "Global NoPE",
"n": 12,
"type": "global",
"sub": "every 4th"
}
],
"pattern": "lllglllglllglllglllglllglllglllglllglllglllglllg",
"pattern_map": {
"l": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "iRoPE — chunked-local RoPE + global NoPE",
"p": {
"variants": [
{
"n": 36,
"name": "chunked local (RoPE)",
"type": "sliding",
"span": "chunk",
"frac": 0.4,
"spanLabel": "8192-token chunks (block-diagonal)",
"sub1": "GQA 40Q / 8KV × 128",
"sub2": "RoPE θ 500K · llama3 ×16",
"sub3": "L2 QK-norm after RoPE"
},
{
"n": 12,
"name": "global NoPE",
"type": "global",
"span": "full",
"spanLabel": "full 10M",
"sub1": "no positional encoding — every 4th layer",
"sub2": "inference: Q × (1 + 0.1·log1p(pos/8192))"
}
],
"common": [
"chunked ≠ rolling window: attention resets at each 8192 boundary",
"Scout: weightless L2 QK-norm on RoPE layers"
],
"cache": "NoPE layers: 2,048 el/token unbounded · chunked layers capped at 8192"
}
}
]
},
{
"id": "llama-4-maverick",
"name": "Llama 4 Maverick (17B-128E)",
"org": "Meta",
"family": "Llama",
"released": "2025-04",
"license": "Llama 4 Community",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 400,
"params_active_B": 17,
"n_layers": 48,
"d_model": 5120,
"d_ff": 16384,
"d_ff_moe": 8192,
"n_heads": 40,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "hybrid",
"attention_detail": "iRoPE: chunked local attention (chunk 8192) interleaved with global NoPE layers every 4th layer; GQA 40/8; no QK-norm. MoE alternates with dense layers (interleave step 2).",
"n_experts": 128,
"active_experts": 1,
"shared_experts": 1,
"vocab_size": 202048,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "iRoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "MetaCLIP (native early-fusion)",
"encoder_params_B": null,
"fusion": "early-fusion",
"notes": "Native multimodal early fusion."
},
"notes": "128 routed experts (top-1) plus 1 shared expert, with MoE layers alternating with dense FFN layers; 17B active of ~400B total; native multimodal; 1M-token context.",
"sources": [
"https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct",
"https://ai.meta.com/blog/llama-4-multimodal-intelligence/"
],
"confidence": "verified",
"moe_every": 2,
"attention_split": {
"parts": [
{
"name": "Local",
"n": 36,
"type": "sliding",
"sub": "chunk 8192"
},
{
"name": "Global NoPE",
"n": 12,
"type": "global",
"sub": "every 4th"
}
],
"pattern": "lllglllglllglllglllglllglllglllglllglllglllglllg",
"pattern_map": {
"l": "sliding",
"g": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "iRoPE — chunked-local RoPE + global NoPE",
"p": {
"variants": [
{
"n": 36,
"name": "chunked local (RoPE)",
"type": "sliding",
"span": "chunk",
"frac": 0.4,
"spanLabel": "8192-token chunks (block-diagonal)",
"sub1": "GQA 40Q / 8KV × 128",
"sub2": "RoPE θ 500K · no scaling",
"sub3": "no QK-norm"
},
{
"n": 12,
"name": "global NoPE",
"type": "global",
"span": "full",
"spanLabel": "full 1M",
"sub1": "no positional encoding — every 4th layer",
"sub2": "inference: Q × (1 + 0.1·log1p(pos/8192))"
}
],
"common": [
"chunked ≠ rolling window: attention resets at each 8192 boundary",
"Maverick: NO QK-norm (the Scout differentiator)"
],
"cache": "NoPE layers: 2,048 el/token unbounded · chunked layers capped at 8192"
}
}
]
},
{
"id": "mistral-small-3-1-24b",
"name": "Mistral Small 3.1 24B",
"org": "Mistral AI",
"family": "Mistral",
"released": "2025-03",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 24,
"params_active_B": 24,
"n_layers": 40,
"d_model": 5120,
"d_ff": 32768,
"d_ff_moe": null,
"n_heads": 32,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Full (dense) attention, no sliding window; GQA 32 query / 8 KV heads; RoPE theta 1e9 for 128K context.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 131072,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "Pixtral ViT",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "Pixtral vision encoder for native multimodality."
},
"notes": "Dense 24B decoder with large RoPE theta (1e9) and no sliding window (unlike earlier Mistral); adds a Pixtral vision encoder. 128K context, Apache-2.0.",
"sources": [
"https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 5120,
"nq": 32,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ 1e9",
"cache": "2,048 el/token/layer × 40"
},
"notes": [
"attention inner dim 4096 < d_model 5120 — q_proj down-projects",
"θ 1e9 for 128K, no scaling, no window",
"Pixtral ViT: 2D RoPE, full attention"
]
}
]
},
{
"id": "mixtral-8x22b",
"name": "Mixtral 8x22B",
"org": "Mistral AI",
"family": "Mixtral",
"released": "2024-04",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 141,
"params_active_B": 39,
"n_layers": 56,
"d_model": 6144,
"d_ff": null,
"d_ff_moe": 16384,
"n_heads": 48,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Full attention, GQA 48 query / 8 KV heads; RoPE theta 1e6; no sliding window in this release.",
"n_experts": 8,
"active_experts": 2,
"shared_experts": null,
"vocab_size": 32768,
"context_length": 65536,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Classic sparse MoE: 8 experts per FFN, top-2 routed, no shared expert; 141B total / ~39B active. 64K context, 32K vocab. The reference open MoE.",
"sources": [
"https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1",
"https://mistral.ai/news/mixtral-8x22b/"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 6144,
"nq": 48,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ 1e6",
"cache": "2,048 el/token/layer × 56"
},
"notes": [
"dropped the Mistral-7B-era 4K sliding window — pure full attention"
]
}
]
},
{
"id": "gpt-oss-120b",
"name": "gpt-oss-120b",
"org": "OpenAI",
"family": "gpt-oss",
"released": "2025-08",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 117,
"params_active_B": 5.1,
"n_layers": 36,
"d_model": 2880,
"d_ff": null,
"d_ff_moe": 2880,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 64,
"attention": "hybrid",
"attention_detail": "Alternating banded sliding-window (window 128) and full attention layers; learned per-head attention sinks; GQA 64/8; YaRN RoPE (theta 150000, factor 32) to 131K.",
"n_experts": 128,
"active_experts": 4,
"shared_experts": null,
"vocab_size": 201088,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "OpenAI's open-weight MoE: 128 experts (top-4), MXFP4-quantized expert weights (~63GB, fits one 80GB GPU); sliding-window+full attention alternation with learned attention sinks; clipped SwiGLU. 5.1B active / 117B total.",
"sources": [
"https://huggingface.co/openai/gpt-oss-120b",
"https://openai.com/index/introducing-gpt-oss/"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Sliding",
"n": 18,
"type": "sliding",
"sub": "win 128"
},
{
"name": "Full",
"n": 18,
"type": "global",
"sub": "attn sinks"
}
],
"pattern": "sfsfsfsfsfsfsfsfsfsfsfsfsfsfsfsfsfsf",
"pattern_map": {
"s": "sliding",
"f": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "Alternating sliding / full attention with sinks",
"p": {
"variants": [
{
"n": 18,
"name": "sliding window 128",
"type": "sliding",
"span": "win",
"frac": 0.18,
"spanLabel": "window 128",
"sub1": "GQA 64Q / 8KV × 64 · biased q/k/v/o",
"sub2": "YaRN RoPE θ 150K ×32 (every layer)"
},
{
"n": 18,
"name": "full attention",
"type": "global",
"span": "full",
"spanLabel": "full context 131K",
"sub1": "same GQA heads + sinks",
"sub2": "order S,F,S,F,… — layer 0 sliding"
}
],
"common": [
"learned per-head sink logit — softmax mass can be < 1",
"head_dim 64: attention width 4096 > d_model 2880"
],
"sink": true,
"cache": "full layers: 1,024 el/token unbounded · sliding layers capped at 128 tokens"
},
"notes": []
}
]
},
{
"id": "gpt-oss-20b",
"name": "gpt-oss-20b",
"org": "OpenAI",
"family": "gpt-oss",
"released": "2025-08",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 21,
"params_active_B": 3.6,
"n_layers": 24,
"d_model": 2880,
"d_ff": null,
"d_ff_moe": 2880,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 64,
"attention": "hybrid",
"attention_detail": "Alternating banded sliding-window (window 128) and full attention; learned per-head attention sinks; GQA 64/8; YaRN RoPE to 131K.",
"n_experts": 32,
"active_experts": 4,
"shared_experts": null,
"vocab_size": 201088,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Smaller gpt-oss with 32 experts (top-4), MXFP4-quantized experts fitting ~16GB; same sliding-window+full alternation with attention sinks and clipped SwiGLU. 3.6B active / 21B total.",
"sources": [
"https://huggingface.co/openai/gpt-oss-20b",
"https://openai.com/index/introducing-gpt-oss/"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "Sliding",
"n": 12,
"type": "sliding",
"sub": "win 128"
},
{
"name": "Full",
"n": 12,
"type": "global",
"sub": "attn sinks"
}
],
"pattern": "sfsfsfsfsfsfsfsfsfsfsfsf",
"pattern_map": {
"s": "sliding",
"f": "global"
}
},
"attn_modules": [
{
"kind": "swa",
"title": "Alternating sliding / full attention with sinks",
"p": {
"variants": [
{
"n": 12,
"name": "sliding window 128",
"type": "sliding",
"span": "win",
"frac": 0.18,
"spanLabel": "window 128",
"sub1": "GQA 64Q / 8KV × 64 · biased q/k/v/o",
"sub2": "YaRN RoPE θ 150K ×32 (every layer)"
},
{
"n": 12,
"name": "full attention",
"type": "global",
"span": "full",
"spanLabel": "full context 131K",
"sub1": "same GQA heads + sinks",
"sub2": "order S,F,S,F,… — layer 0 sliding"
}
],
"common": [
"learned per-head sink logit — softmax mass can be < 1",
"head_dim 64: attention width 4096 > d_model 2880"
],
"sink": true,
"cache": "full layers: 1,024 el/token unbounded · sliding layers capped at 128 tokens"
},
"notes": []
}
]
},
{
"id": "qwen2.5-vl-72b",
"name": "Qwen2.5-VL-72B",
"org": "Alibaba",
"family": "Qwen2.5-VL",
"released": "2025-01",
"license": "Qwen License",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 73,
"params_active_B": 73,
"n_layers": 80,
"d_model": 8192,
"d_ff": 29568,
"d_ff_moe": null,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 query / 8 KV heads; full attention (sliding window disabled). M-RoPE for video/time alignment.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 152064,
"context_length": 128000,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "M-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "Native-dynamic-resolution ViT (depth 32, hidden 1280)",
"encoder_params_B": 0.675,
"fusion": "adapter",
"notes": "From-scratch ViT with window attention (window 112) + full attention at 4 layers; MLP patch-merger (2x2 -> 8192); 2D-RoPE; native dynamic resolution."
},
"notes": "Dense 72B Qwen2.5 LLM + from-scratch native-dynamic-resolution ViT with window attention for near-linear visual scaling; M-RoPE adds absolute-time/video alignment.",
"sources": [
"https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct",
"https://arxiv.org/abs/2502.13923"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "GQA + chunked M-RoPE module",
"p": {
"d": 8192,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "M-RoPE [16t|24h|24w]",
"cache": "2,048 el/token/layer × 80"
},
"notes": [
"QKV bias (Qwen2 era) · no QK-norm",
"video: temporal axis advances with real time (2 tokens/s)",
"ViT: 112-px window attention in 28 of 32 blocks"
]
}
]
},
{
"id": "qwen3-vl-235b-a22b",
"name": "Qwen3-VL-235B-A22B",
"org": "Alibaba",
"family": "Qwen3-VL",
"released": "2025-09",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 235,
"params_active_B": 22,
"n_layers": 94,
"d_model": 4096,
"d_ff": 12288,
"d_ff_moe": 1536,
"n_heads": 64,
"n_kv_heads": 4,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 query / 4 KV heads, head_dim 128 (decoupled); Interleaved-MRoPE, rope_theta 5e6.",
"n_experts": 128,
"active_experts": 8,
"shared_experts": 0,
"vocab_size": 151936,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "Interleaved-MRoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "Redesigned ViT (depth 27, hidden 1152)",
"encoder_params_B": 0.58,
"fusion": "adapter",
"notes": "MLP merger (2x2) plus DeepStack: features extracted from ViT layers 8/16/24 and injected into the first three LLM decoder layers; native dynamic resolution."
},
"notes": "Qwen3-235B-A22B MoE backbone (128 experts / 8 active, no shared) fused with a ViT via DeepStack multi-level feature injection and Interleaved-MRoPE; 256K native context extendable to 1M.",
"sources": [
"https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct",
"https://arxiv.org/abs/2511.21631"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "GQA + Interleaved-MRoPE module",
"p": {
"d": 4096,
"nq": 64,
"nkv": 4,
"dh": 128,
"rope": "iMRoPE [24t,20h,20w]",
"qknorm": "QK-RMSNorm per head",
"cache": "1,024 el/token/layer × 94"
},
"notes": [
"MRoPE interleaved T,H,W,… — every axis spans the full spectrum",
"DeepStack: ViT layer-8/16/24 features added into decoder layers 0–2",
"ViT: 27 blocks, all full attention (no windows)"
]
}
]
},
{
"id": "internvl3-78b",
"name": "InternVL3-78B",
"org": "OpenGVLab",
"family": "InternVL3",
"released": "2025-04",
"license": "Qwen License",
"modality": "multimodal",
"decoder_type": "Dense",
"params_total_B": 78,
"params_active_B": 78,
"n_layers": 80,
"d_model": 8192,
"d_ff": 29568,
"d_ff_moe": null,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 query / 8 KV heads, head_dim 128; RoPE theta 1e6 with dynamic-NTK scaling.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 151674,
"context_length": 32768,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "InternViT-6B-448px (depth 45, hidden 3200, QK-norm)",
"encoder_params_B": 6.0,
"fusion": "adapter",
"notes": "ViT-MLP-LLM; pixel-shuffle downsampling cuts visual tokens to 1/4, MLP projector to 8192; dynamic 448px tiling (1-12 tiles + thumbnail)."
},
"notes": "Dense InternViT-6B encoder + Qwen2.5-72B LLM via an MLP projector; adds Native Multimodal Pre-Training and Variable Visual Position Encoding (V2PE). ~78B total = 6B ViT + 72B LLM.",
"sources": [
"https://huggingface.co/OpenGVLab/InternVL3-78B",
"https://arxiv.org/abs/2504.10479"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module (Qwen2.5-72B LLM)",
"p": {
"d": 8192,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ1e6 · dyn-NTK ×2",
"cache": "2,048 el/token/layer × 80"
},
"notes": [
"QKV bias (Qwen2.5 heritage) · no QK-norm",
"InternViT-6B: QK-norm + RMSNorm inside the ViT (25 × 128 heads)",
"pixel-shuffle: 1024 → 256 visual tokens per 448-px tile"
]
}
]
},
{
"id": "kimi-vl-a3b",
"name": "Kimi-VL-A3B",
"org": "Moonshot",
"family": "Kimi-VL",
"released": "2025-04",
"license": "MIT",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 16,
"params_active_B": 2.8,
"n_layers": 27,
"d_model": 2048,
"d_ff": 11264,
"d_ff_moe": 1408,
"n_heads": 16,
"n_kv_heads": 16,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "MLA (DeepSeek-V2-Lite style: direct full-rank q_proj, no query latent — q_lora_rank null): kv_lora_rank 512, decoupled RoPE qk_nope 128 + qk_rope 64 (=192), v_head_dim 128.",
"n_experts": 64,
"active_experts": 6,
"shared_experts": 2,
"vocab_size": 163840,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "MoonViT (SigLIP-SO400M init; depth 27, hidden 1152)",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "Native-resolution encoder (no tiling), 2x2 spatial merge then MLP projector into 2048-dim LLM space."
},
"notes": "Efficient MoE VLM: MoonViT + MLP projector feeding a Moonlight-16B-A3B DeepSeek-V3-style MoE LLM (MLA, aux-loss-free routing, 64 routed + 2 shared, 6 active); ~2.8B active of 16B, 128K context.",
"sources": [
"https://huggingface.co/moonshotai/Kimi-VL-A3B-Instruct",
"https://arxiv.org/abs/2504.07491"
],
"confidence": "verified",
"dense_first_layers": 1,
"attn_modules": [
{
"kind": "mla",
"title": "MLA module — no query compression (V2-Lite form)",
"p": {
"d": 2048,
"nh": 16,
"qlora": null,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"cache": "KV cache: 576 el/token/layer × 27 ≈ 30.4 KB/token bf16 — ~7.1× smaller than 16-head MHA"
},
"notes": [
"q_lora_rank null → full-rank q_proj (2048→3072); no c_Q latent",
"long context via RoPE θ 800000 — no YaRN (unique in this family)",
"attention code is a verbatim copy of DeepseekV3Attention"
]
}
]
},
{
"id": "gpt2-xl",
"name": "GPT-2 XL",
"org": "OpenAI",
"family": "GPT-2",
"released": "2019-11",
"license": "MIT",
"modality": "text",
"decoder_type": "Dense",
"params_total_B": 1.5,
"params_active_B": 1.5,
"n_layers": 48,
"d_model": 1600,
"d_ff": 6400,
"d_ff_moe": null,
"n_heads": 25,
"n_kv_heads": 25,
"head_dim": 64,
"attention": "MHA",
"attention_detail": "Standard multi-head causal self-attention, 25 heads x 64 dim; no GQA/MQA.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 50257,
"context_length": 1024,
"norm": "LayerNorm",
"norm_placement": "pre",
"pos_encoding": "learned",
"activation": "GeLU",
"tie_embeddings": true,
"vision": null,
"notes": "Historical anchor: largest GPT-2 (1.5B). Popularized pre-normalization + an extra final LayerNorm, learned absolute positional embeddings, and tied input/output embeddings (tanh-approx GeLU).",
"sources": [
"https://huggingface.co/openai-community/gpt2-xl",
"https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Multi-Head Attention module (canonical GPT-2)",
"p": {
"d": 1600,
"nq": 25,
"nkv": 25,
"dh": 64,
"rope": "learned abs. positions",
"cache": "2 × 25 × 64 = 3,200 el/token/layer × 48"
},
"notes": [
"fused QKV as Conv1D with bias on every projection",
"odd head count: 25 = 1600 / 64",
"pre-LN + final LayerNorm · GELU(tanh) · dropout 0.1"
]
}
]
},
{
"id": "llama-2-70b",
"name": "Llama 2 70B",
"org": "Meta",
"family": "Llama 2",
"released": "2023-07",
"license": "Llama 2 Community",
"modality": "text",
"decoder_type": "Dense",
"params_total_B": 70,
"params_active_B": 70,
"n_layers": 80,
"d_model": 8192,
"d_ff": 28672,
"d_ff_moe": null,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Grouped-query attention, 64 query heads sharing 8 KV heads, head_dim 128; ~8x smaller KV cache vs MHA.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 32000,
"context_length": 4096,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "The GQA anchor: GQA applied to 34B/70B sizes (smaller Llama 2 use MHA). Pre-norm RMSNorm + RoPE + SwiGLU with ~2/3 scaling.",
"sources": [
"https://huggingface.co/meta-llama/Llama-2-70b-hf",
"https://arxiv.org/abs/2307.09288"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 8192,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ 10K · 4K context",
"cache": "2,048 el/token/layer × 80"
},
"notes": [
"the GQA anchor: only 70B in the Llama-2 family uses GQA (7B/13B are MHA)"
]
}
]
},
{
"id": "flux1-dev",
"name": "FLUX.1 [dev]",
"org": "Black Forest Labs",
"family": "FLUX.1",
"released": "2024-08",
"license": "FLUX.1 [dev] Non-Commercial",
"modality": "image-gen",
"decoder_type": "DiT (diffusion transformer)",
"params_total_B": 12,
"params_active_B": 12,
"n_layers": 57,
"d_model": 3072,
"d_ff": 12288,
"d_ff_moe": null,
"n_heads": 24,
"n_kv_heads": null,
"head_dim": 128,
"attention": "MMDiT",
"attention_detail": "19 double-stream (MMDiT, joint text+image attention with separate modulation) + 38 single-stream (unified DiT) blocks; QK-RMSNorm.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": null,
"context_length": null,
"norm": "AdaLN",
"norm_placement": "pre",
"pos_encoding": "2D-RoPE",
"activation": "GeLU",
"tie_embeddings": false,
"vision": null,
"notes": "12B rectified-flow (flow-matching) text-to-image transformer; 57 blocks = 19 double-stream + 38 single-stream. Text via T5-XXL + CLIP-L; 16-ch VAE latent; guidance-distilled; axial RoPE; AdaLN timestep/guidance modulation.",
"sources": [
"https://huggingface.co/black-forest-labs/FLUX.1-dev"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "mmdit",
"title": "Double-stream MMDiT block (×19)",
"p": {
"d": 3072,
"mods": 6,
"pos": "3-axis RoPE [16,56,56] θ 10K — txt ids 0 (unrotated), img (row, col)",
"cap": "no mask, no KV cache — full bidirectional attention recomputed each denoising step"
},
"notes": [
"24 heads × 128 · QK-RMSNorm per head",
"streams share only the attention op — all weights separate"
]
},
{
"kind": "sstream",
"title": "Single-stream parallel block (×38)",
"p": {
"d": 3072,
"l1": 21504,
"qkv": 9216,
"mlp": 12288,
"nh": 24,
"dh": 128,
"cap": "ViT-22B-style parallel attention + MLP: one fused input and one fused output projection"
}
}
]
},
{
"id": "stable-diffusion-3-5-large",
"name": "Stable Diffusion 3.5 Large",
"org": "Stability AI",
"family": "Stable Diffusion 3.5",
"released": "2024-10",
"license": "Stability Community",
"modality": "image-gen",
"decoder_type": "DiT (diffusion transformer)",
"params_total_B": 8,
"params_active_B": 8,
"n_layers": 38,
"d_model": 2432,
"d_ff": 9728,
"d_ff_moe": null,
"n_heads": 38,
"n_kv_heads": null,
"head_dim": 64,
"attention": "MMDiT",
"attention_detail": "Joint (multimodal) text+image attention with per-stream modulation, concatenated for one attention op; QK-RMSNorm.",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": null,
"context_length": null,
"norm": "AdaLN",
"norm_placement": "pre",
"pos_encoding": "2D-sincos (fixed)",
"activation": "GeLU",
"tie_embeddings": false,
"vision": null,
"notes": "8B improved-MMDiT rectified-flow text-to-image model. Three text encoders (CLIP-L + OpenCLIP-bigG + T5-XXL); 16-ch VAE, patch_size 2, fixed 2D-sincos patch pos emb; QK-RMSNorm added over SD3 for stable high-res training.",
"sources": [
"https://huggingface.co/stabilityai/stable-diffusion-3.5-large",
"https://arxiv.org/abs/2403.03206"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "mmdit",
"title": "MMDiT joint block (×38)",
"p": {
"d": 2432,
"mods": 6,
"pos": "fixed 2D-sincos pos-emb added at patch embed (192×192 grid) — no RoPE",
"cap": "final block: context stream is pre_only — it feeds joint attention but its output is discarded"
},
"notes": [
"38 heads × 64 (heads = depth scaling rule)",
"QK-RMSNorm added in SD3.5 for bf16 hi-res stability",
"no MMDiT-X dual attention in Large (Medium only)"
]
}
]
},
{
"id": "qwen3-32b",
"name": "Qwen3-32B",
"org": "Alibaba",
"family": "Qwen",
"released": "2025-04",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "Dense",
"params_total_B": 32.8,
"params_active_B": 32.8,
"n_layers": 64,
"d_model": 5120,
"d_ff": 25600,
"d_ff_moe": null,
"n_heads": 64,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 query / 8 KV heads, head_dim 128 (decoupled from d_model); QK-Norm (RMSNorm on q,k)",
"n_experts": null,
"active_experts": null,
"shared_experts": null,
"vocab_size": 151936,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Dense Qwen3 with QK-Norm on query/key for training stability; head_dim (128) decoupled from hidden_size. Native 32K context, extendable to 131K via YARN.",
"sources": [
"https://huggingface.co/Qwen/Qwen3-32B/raw/main/config.json",
"https://arxiv.org/abs/2505.09388"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 5120,
"nq": 64,
"nkv": 8,
"dh": 128,
"rope": "RoPE θ 1e6",
"qknorm": "QK-RMSNorm / head (Qwen3)",
"cache": "2,048 el/token/layer × 64"
},
"notes": [
"dropped Qwen2.5’s QKV bias",
"attention width 8192 > d_model 5120",
"native 32K context; 131K via YaRN"
]
}
]
},
{
"id": "qwen3-235b-a22b",
"name": "Qwen3-235B-A22B",
"org": "Alibaba",
"family": "Qwen",
"released": "2025-04",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 235,
"params_active_B": 22,
"n_layers": 94,
"d_model": 4096,
"d_ff": 12288,
"d_ff_moe": 1536,
"n_heads": 64,
"n_kv_heads": 4,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "GQA 64 query / 4 KV heads, head_dim 128; QK-Norm on q,k",
"n_experts": 128,
"active_experts": 8,
"shared_experts": 0,
"vocab_size": 151936,
"context_length": 131072,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Fine-grained MoE with 128 experts, top-8 per token, no shared expert (unlike Qwen2-MoE); every layer is MoE. Uses QK-Norm; native 32K extendable to 131K via YARN.",
"sources": [
"https://huggingface.co/Qwen/Qwen3-235B-A22B/raw/main/config.json",
"https://arxiv.org/abs/2505.09388"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Grouped-Query Attention module",
"p": {
"d": 4096,
"nq": 64,
"nkv": 4,
"dh": 128,
"rope": "RoPE θ 1e6",
"qknorm": "QK-RMSNorm per head",
"cache": "2 × 4 × 128 = 1,024 el/token/layer × 94"
},
"notes": [
"largest GQA ratio in the atlas: 16 Q heads per KV head",
"native 32K context; 131K via YaRN"
]
}
]
},
{
"id": "qwen3-next-80b-a3b",
"name": "Qwen3-Next-80B-A3B",
"org": "Alibaba",
"family": "Qwen",
"released": "2025-09",
"license": "Apache-2.0",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 80,
"params_active_B": 3,
"n_layers": 48,
"d_model": 2048,
"d_ff": 5120,
"d_ff_moe": 512,
"n_heads": 16,
"n_kv_heads": 2,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — 36 Gated DeltaNet linear-attn layers + 12 full Gated Attention layers (16 q / 2 KV, head_dim 256, partial RoPE 0.25); full_attention_interval=4",
"n_experts": 512,
"active_experts": 10,
"shared_experts": 1,
"vocab_size": 151936,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Ultra-sparse hybrid: for every 3 Gated DeltaNet (linear) blocks there is 1 full-attention block; 512 experts with 10 routed + 1 shared active (only 3B of 80B active). Adds MTP; native 262K context.",
"sources": [
"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct/raw/main/config.json",
"https://vllm.ai/blog/2025-09-11-qwen3-next"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "DeltaNet",
"n": 36,
"type": "linear",
"sub": "gated linear"
},
{
"name": "Full GQA",
"n": 12,
"type": "GQA",
"sub": "16/2 · RoPE"
}
],
"pattern": "lllflllflllflllflllflllflllflllflllflllflllflllf",
"pattern_map": {
"l": "linear",
"f": "GQA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Gated DeltaNet (36 layers)",
"p": {
"d": 2048,
"kh": 16,
"vh": 32,
"dh": 128,
"conv": 4,
"proj": "in_proj_qkvz 2048 → 12288 (fused)",
"projSub": "interleaved per K-head group · in_proj_ba → β, α",
"qsub": "L2 norm",
"vsub": "32 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "per-head decay α = e^g",
"decaySub": "g = −e^A · softplus(a + bias)",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNormGated ⊗ SiLU(z)",
"outSub": "→ out_proj 4096 → 2048",
"cacheline": "no KV cache on linear layers — state 32 × 128 × 128 ≈ 524 K el + conv state 8192 × 4 per layer"
},
"notes": [
"q,k L2-normalized in kernel · chunked prefill (chunk 64)",
"zero-centered RMSNorm throughout the model"
]
},
{
"kind": "gqa",
"title": "Gated Full Attention (12 layers — every 4th)",
"p": {
"d": 2048,
"nq": 16,
"nkv": 2,
"dh": 256,
"rope": "partial RoPE 64/256",
"qknorm": "zero-centered QK-norm / head",
"gate": "σ(gate) per head",
"cache": "2 × 2 × 256 = 1,024 el/token/layer — only these 12 layers cache anything"
},
"notes": [
"q_proj emits [query | gate] per head (double width)",
"output gate suppresses attention sinks / massive activations"
]
}
]
},
{
"id": "deepseek-v3",
"name": "DeepSeek-V3",
"org": "DeepSeek",
"family": "DeepSeek",
"released": "2024-12",
"license": "DeepSeek Model License",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 671,
"params_active_B": 37,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 128,
"n_kv_heads": 128,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "MLA: q_lora_rank=1536, kv_lora_rank=512, qk_nope=128, qk_rope=64 (q/k head_dim=192), v_head_dim=128",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 163840,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Multi-head Latent Attention (MLA) with low-rank q/kv compression; fine-grained MoE (256 routed + 1 shared, top-8), first 3 layers dense; auxiliary-loss-free sigmoid routing + node-limited routing; MTP; FP8 training.",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json",
"https://arxiv.org/abs/2412.19437"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "mla",
"title": "Multi-head Latent Attention (MLA) module",
"p": {
"d": 7168,
"nh": 128,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 1.87",
"cache": "KV cache: c_KV 512 + k_R 64 = 576 el/token/layer — head-count independent; × 61 layers ≈ 68.6 KB/token bf16 → 56.9× smaller than 128-head MHA (= GQA with 2.25 groups)"
},
"notes": [
"RMSNorm on both latents (c_Q, c_KV) — k_R not normed",
"k_R shared by all 128 heads (MQA-style)",
"decode: W_UK absorbed into query → attends on the 576-el cache",
"YaRN ×40 (4K→160K): softmax × mscale² ≈ 1.87",
"no bias · no QK-norm · no gate"
]
}
],
"attn_bullets": [
"MLA cache 576 el/token/layer: only the two latents are stored; per-head K/V are re-expanded (prefill) or absorbed (decode)",
"1 MTP module (a full MLA block) for speculative decoding"
]
},
{
"id": "deepseek-v3-2-exp",
"name": "DeepSeek-V3.2-Exp",
"org": "DeepSeek",
"family": "DeepSeek",
"released": "2025-09",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 671,
"params_active_B": 37,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 128,
"n_kv_heads": 128,
"head_dim": 192,
"attention": "sparse",
"attention_detail": "MLA + DeepSeek Sparse Attention (DSA): lightning indexer (index_n_heads=64, index_head_dim=128) selects top-2048 tokens per query; MLA q_lora=1536/kv_lora=512, qk_nope=128/qk_rope=64, v=128",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 163840,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Same MLA+MoE backbone as V3 but adds DeepSeek Sparse Attention (DSA): a lightning indexer picks top-2048 tokens per query, cutting attention from O(L^2) to O(Lk) for long context while preserving quality.",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp/raw/main/config.json",
"https://github.com/deepseek-ai/DeepSeek-V3.2-Exp"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "dsaidx",
"title": "DSA — lightning indexer (top-k token selection)",
"p": {
"iheads": 64,
"idim": 128,
"topk": 2048,
"keynorm": "LN",
"note": "FP8 kernel · Hadamard rotation · scale 64⁻⁰·⁵·128⁻⁰·⁵",
"cache": "adds k^I (128, FP8) per token on every layer, beside the 576-el MLA latent"
},
"notes": [
"indexer trained by KL-distilling the dense attention distribution",
"indexer RoPE non-interleaved · MLA RoPE interleaved (bugfix note)",
"prefill: MHA mode (expand c_KV) · decode: MQA on the latent cache"
]
},
{
"kind": "mla",
"title": "MLA base (identical to DeepSeek-V3)",
"p": {
"d": 7168,
"nh": 128,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 1.87",
"cache": "576 el/token/layer × 61 — DSA masks it to the top-2048 selected tokens per query"
}
}
],
"attn_bullets": [
"attention cost O(L·k) with k = 2048 — the indexer scores all tokens, MLA attends to the winners"
]
},
{
"id": "deepseek-r1",
"name": "DeepSeek-R1",
"org": "DeepSeek",
"family": "DeepSeek",
"released": "2025-01",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 671,
"params_active_B": 37,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 128,
"n_kv_heads": 128,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "MLA identical to V3: q_lora=1536, kv_lora=512, qk_nope=128, qk_rope=64 (head_dim=192), v_head_dim=128",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 163840,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Reasoning model with the SAME architecture as DeepSeek-V3 (MLA + fine-grained MoE, 256+1 experts, top-8); trained from V3-Base via large-scale RL. Config architecturally identical to V3 (differs only in transformers_version).",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-R1/raw/main/config.json",
"https://arxiv.org/abs/2501.12948"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "mla",
"title": "Multi-head Latent Attention (MLA) module",
"p": {
"d": 7168,
"nh": 128,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 1.87",
"cache": "KV cache: 576 el/token/layer × 61 ≈ 68.6 KB/token bf16 — 56.9× smaller than MHA"
},
"notes": [
"attention bit-identical to DeepSeek-V3 — R1 differs only in weights (RL)",
"YaRN ×40 · softmax × mscale² ≈ 1.87"
]
}
],
"attn_bullets": [
"Same MLA cache economics as V3: 35,136 el/token total"
]
},
{
"id": "deepseek-v4-pro",
"name": "DeepSeek-V4-Pro",
"org": "DeepSeek",
"family": "DeepSeek-V4",
"released": "2026-04",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 1600,
"params_active_B": 49,
"n_layers": 61,
"d_model": 7168,
"d_ff": 3072,
"d_ff_moe": 3072,
"n_heads": 128,
"n_kv_heads": 1,
"head_dim": 512,
"attention": "sparse",
"attention_detail": "Hybrid CSA (Compressed Sparse Attention, Lightning Indexer top-1024) + HCA (Heavily Compressed Attention) over a shared K=V MQA backbone (n_kv=1) plus a local sliding-window (128) branch; partial-RoPE on 64 of 512 head dims.",
"n_experts": 384,
"active_experts": 6,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "MoE flagship (1.6T/49B). Replaces V3's MLA with a CSA+HCA sparse-attention stack and swaps residuals for Manifold-Constrained Hyper-Connections; the first 3 MoE layers use Hash routing (a fixed hash of the input token ID picks the experts, replacing V3's dense first layers), and learned top-k routing uses Sqrt(Softplus) affinity scoring. Ships FP4+FP8 mixed (MoE expert weights FP4, most other params FP8). 1M context.",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro",
"https://arxiv.org/abs/2606.19348"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "CSA",
"n": 30,
"type": "CSA",
"sub": "top-1024"
},
{
"name": "HCA",
"n": 31,
"type": "HCA",
"sub": "ratio 128"
}
],
"pattern": "HHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHC",
"pattern_map": {
"C": "CSA",
"H": "HCA"
}
},
"attn_modules": [
{
"kind": "csa",
"title": "CSA — Compressed Sparse Attention (30 layers)",
"p": {
"d": 7168,
"nh": 128,
"qlora": 1536,
"m": 4,
"topk": 1024,
"win": 128,
"og": 16,
"olora": 1024,
"cache": "CSA cache/token: C_comp ~128 el + indexer ~32 el amortized + 128 × 512 ring — FP8 (RoPE dims BF16)"
},
"notes": [
"indexer scores 4:1-compressed blocks, not raw tokens (V3.2-DSA lineage)",
"shared K=V: each 512-dim entry serves as both key and value (n_kv = 1)",
"query latent shared by main attention and indexer",
"output RoPE(−i): outputs carry relative, not absolute, position"
]
},
{
"kind": "hca",
"title": "HCA — Heavily Compressed Attention (31 layers)",
"p": {
"d": 7168,
"nh": 128,
"qlora": 1536,
"m": 128,
"win": 128,
"og": 16,
"olora": 1024,
"cache": "HCA cache/token: ~4 el amortized + ring — this is what shrinks the total cache to ~10% of V3.2"
},
"notes": [
"alternates with CSA — near-free global context on half the stack",
"same query path, sinks, grouped W_O as CSA; only KV compression differs"
]
},
{
"kind": "mhc",
"title": "mHC — Manifold-Constrained Hyper-Connections",
"p": {
"sinkhorn": 20,
"cap": "x_{l+1} = H_res·x_l + H_postᵀ·F(H_pre·x_l) — each mapping = static + input-dynamic part · ~6.7% train overhead"
}
}
],
"residual": {
"kind": "mhc",
"note": "Residuals: 4-stream Manifold-Constrained Hyper-Connections (mHC), doubly-stochastic mixing — see panel"
},
"attn_bullets": [
"per-head sink logits: a head can attend to nothing (softmax mass < 1)",
"KV cache FP8 with the 64 RoPE dims in BF16 — total ≈ 10% of V3.2’s cache",
"first 3 MoE layers Hash-routed (token-id hash picks the experts) · Sqrt(Softplus) affinity scoring"
]
},
{
"id": "deepseek-v4-flash",
"name": "DeepSeek-V4-Flash",
"org": "DeepSeek",
"family": "DeepSeek-V4",
"released": "2026-04",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 284,
"params_active_B": 13,
"n_layers": 43,
"d_model": 4096,
"d_ff": 2048,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 1,
"head_dim": 512,
"attention": "sparse",
"attention_detail": "CSA+HCA hybrid sparse stack over a shared K=V MQA backbone (n_kv=1), sliding-window 128, Lightning Indexer top-512; partial-RoPE on 64 of 512 head dims. First two layers are pure sliding-window (Pro uses HCA there); q compression 1024 vs Pro's 1536.",
"n_experts": 256,
"active_experts": 6,
"shared_experts": 1,
"vocab_size": 129280,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Smaller/faster MoE sibling of V4-Pro: same CSA+HCA sparse-attention family, hyper-connections, Hash routing for the first 3 MoE layers, scaled down in width/depth/experts. Unlike Pro (first two layers HCA), Flash's first two layers are pure sliding-window attention. 284B/13B active, FP4+FP8 mixed, 1M context.",
"sources": [
"https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash",
"https://arxiv.org/abs/2606.19348"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "CSA",
"n": 21,
"type": "CSA",
"sub": "top-512"
},
{
"name": "HCA",
"n": 20,
"type": "HCA",
"sub": "ratio 128"
},
{
"name": "SW",
"n": 2,
"type": "SW",
"sub": "win 128"
}
],
"pattern": "??CHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHCHC",
"pattern_map": {
"C": "CSA",
"H": "HCA",
"?": "SW"
}
},
"attn_modules": [
{
"kind": "csa",
"title": "CSA — Compressed Sparse Attention (21 layers)",
"p": {
"d": 4096,
"nh": 64,
"qlora": 1024,
"m": 4,
"topk": 512,
"win": 128,
"og": 8,
"olora": 1024,
"cache": "CSA cache/token: C_comp ~128 el + indexer ~32 el amortized + 128 × 512 ring — FP8 (RoPE dims BF16)"
},
"notes": [
"indexer scores 4:1-compressed blocks, not raw tokens (V3.2-DSA lineage)",
"shared K=V: each 512-dim entry serves as both key and value (n_kv = 1)",
"query latent shared by main attention and indexer",
"output RoPE(−i): outputs carry relative, not absolute, position",
"vs Pro: top-512, q_lora 1024, 64 heads, 8 output groups"
]
},
{
"kind": "hca",
"title": "HCA — Heavily Compressed Attention (20 layers)",
"p": {
"d": 4096,
"nh": 64,
"qlora": 1024,
"m": 128,
"win": 128,
"og": 8,
"olora": 1024,
"cache": "HCA cache/token: ~4 el amortized + ring"
},
"notes": [
"alternates with CSA — near-free global context on half the stack",
"same query path, sinks, grouped W_O as CSA; only KV compression differs",
"first 2 layers: pure 128-token sliding window (compress_ratio 0; inferred)"
]
},
{
"kind": "mhc",
"title": "mHC — Manifold-Constrained Hyper-Connections",
"p": {
"sinkhorn": 20,
"cap": "x_{l+1} = H_res·x_l + H_postᵀ·F(H_pre·x_l) — each mapping = static + input-dynamic part · ~6.7% train overhead"
}
}
],
"residual": {
"kind": "mhc",
"note": "Residuals: 4-stream Manifold-Constrained Hyper-Connections (mHC), doubly-stochastic mixing — see panel"
},
"attn_bullets": [
"per-head sink logits: a head can attend to nothing (softmax mass < 1)",
"KV cache FP8 with the 64 RoPE dims in BF16 — total ≈ 10% of V3.2’s cache",
"first 3 MoE layers Hash-routed (token-id hash picks the experts) · Sqrt(Softplus) affinity scoring"
]
},
{
"id": "qwen3-5-397b-a17b",
"name": "Qwen3.5-397B-A17B",
"org": "Alibaba",
"family": "Qwen3.5",
"released": "2026-02",
"license": "Apache-2.0",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 397,
"params_active_B": 17,
"n_layers": 60,
"d_model": 4096,
"d_ff": null,
"d_ff_moe": 1024,
"n_heads": 32,
"n_kv_heads": 2,
"head_dim": 256,
"attention": "hybrid",
"attention_detail": "3:1 hybrid — Gated DeltaNet linear attention (64 V / 16 QK heads, head_dim 128) in 3 of every 4 layers + gated full attention (GQA 32 Q / 2 KV, head_dim 256) every 4th layer.",
"n_experts": 512,
"active_experts": 10,
"shared_experts": 1,
"vocab_size": 248320,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "SigLIP2-so400m-class ViT (depth 27, hidden 1152)",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "Native multimodal (image+video, temporal_patch 2); ViT projects to d_model 4096 via 2x2 spatial merge."
},
"notes": "Qwen3.5 open-weight flagship: a natively multimodal MoE with a Gated-DeltaNet + full-attention 3:1 hybrid backbone (like Qwen3-Next scaled up), 512 experts (10 active + 1 shared), MRoPE, and an MTP head; native 262K context extensible to ~1M.",
"sources": [
"https://huggingface.co/Qwen/Qwen3.5-397B-A17B",
"https://github.com/QwenLM/Qwen3.5"
],
"confidence": "verified",
"attention_split": {
"parts": [
{
"name": "DeltaNet",
"n": 45,
"type": "linear",
"sub": "gated linear"
},
{
"name": "Full GQA",
"n": 15,
"type": "GQA",
"sub": "32/2 · RoPE"
}
],
"pattern": "lllflllflllflllflllflllflllflllflllflllflllflllflllflllflllf",
"pattern_map": {
"l": "linear",
"f": "GQA"
}
},
"attn_modules": [
{
"kind": "deltanet",
"title": "Gated DeltaNet (45 layers)",
"p": {
"d": 4096,
"kh": 16,
"vh": 64,
"dh": 128,
"conv": 4,
"proj": "in_proj_qkv 4096 → 12288 · in_proj_z → 8192",
"projSub": "split projections (vs Next’s fused) · in_proj_b / a → β, α",
"qsub": "L2 norm",
"vsub": "64 × 128",
"update": "S ← e^g·S + β·k⊗(v − (e^g S)ᵀk)",
"decayName": "per-head decay α = e^g",
"decaySub": "g = −e^A · softplus(a + bias)",
"beta": "β = σ(b) per v-head",
"out": "o = qᵀS → RMSNormGated ⊗ SiLU(z)",
"outSub": "→ out_proj 8192 → 4096",
"cacheline": "no KV cache on linear layers — state 64 × 128 × 128 ≈ 1.05 M el (fp32) + conv state 12288 × 4 per layer"
},
"notes": [
"64 v-heads / 16 qk-heads — doubled value width vs Qwen3-Next"
]
},
{
"kind": "gqa",
"title": "Gated Full Attention (15 layers — every 4th)",
"p": {
"d": 4096,
"nq": 32,
"nkv": 2,
"dh": 256,
"rope": "iMRoPE 64/256",
"qknorm": "zero-centered QK-norm / head",
"gate": "σ(gate) per head",
"cache": "1,024 el/token/layer × 15 full-attention layers"
},
"notes": [
"attention module byte-identical to Qwen3-Next’s (subclassed)",
"text-only input degenerates to standard partial RoPE"
]
}
]
},
{
"id": "glm-5-1",
"name": "GLM-5.1",
"org": "Zhipu",
"family": "GLM",
"released": "2026-04",
"license": "MIT",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 744,
"params_active_B": 40,
"n_layers": 78,
"d_model": 6144,
"d_ff": 12288,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 256,
"attention": "sparse",
"attention_detail": "DeepSeek-style MLA (q_lora 2048, kv_lora 512, qk_nope 192 + qk_rope 64 = 256, v 256) + DSA sparse lightning indexer (index_n_heads 32, index_topk 2048).",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 154880,
"context_length": 202752,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "GLM-5.1 (744B/40B) shares the GLM-5 architecture: MLA + DSA sparse attention, first 3 dense layers then 256 experts top-8 + 1 shared, plus an MTP layer. Lineage GLM-4.6 → 4.7 → GLM-5 → GLM-5.1 → GLM-5.2. A continued-training/RL refresh of GLM-5.",
"sources": [
"https://huggingface.co/zai-org/GLM-5.1",
"https://docs.z.ai/release-notes/new-released"
],
"confidence": "verified",
"dense_first_layers": 3,
"attn_modules": [
{
"kind": "dsaidx",
"title": "DSA — lightning indexer (top-k token selection)",
"p": {
"iheads": 32,
"idim": 128,
"topk": 2048,
"keynorm": "LN",
"note": "fp32 scoring · scale 32⁻⁰·⁵ · interleaved indexer RoPE",
"cache": "k^I (128) cached per token on all 78 layers"
},
"notes": [
"every layer owns its own indexer (vs GLM-5.2 IndexShare)",
"indexer frozen during RL (GLM-5 report)"
]
},
{
"kind": "mla",
"title": "MLA base (GLM-wide variant)",
"p": {
"d": 6144,
"nh": 64,
"qlora": 2048,
"kvlora": 512,
"nope": 192,
"rope": 64,
"v": 256,
"cache": "KV cache: c_KV 512 + k_R 64 = 576 el/token/layer × 78 ≈ 87.8 KB/token bf16",
"yarn": null
},
"notes": [
"wider MLA: q/k 256 (192 nope + 64 rope) · v 256 · 64 heads",
"GLM-5 report: bigger head dim, fewer heads than DeepSeek",
"plain RoPE — no YaRN temperature",
"RoPE θ 1e6 · 198K context"
]
}
]
},
{
"id": "kimi-k2-6",
"name": "Kimi K2.6",
"org": "Moonshot",
"family": "Kimi",
"released": "2026-04",
"license": "Modified MIT",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 1000,
"params_active_B": 32,
"n_layers": 61,
"d_model": 7168,
"d_ff": 18432,
"d_ff_moe": 2048,
"n_heads": 64,
"n_kv_heads": 64,
"head_dim": 192,
"attention": "MLA",
"attention_detail": "DeepSeek-style MLA: kv_lora 512, q_lora 1536, qk_nope 128 + qk_rope 64 (=192), v 128.",
"n_experts": 384,
"active_experts": 8,
"shared_experts": 1,
"vocab_size": 163840,
"context_length": 262144,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "MoonViT",
"encoder_params_B": 0.4,
"fusion": "adapter",
"notes": "~400M MoonViT vision encoder; enables image-text-to-text (config has nested text_config + vision_config)."
},
"notes": "Multimodal 1T/32B MoE on the DeepSeek-V3 MLA backbone (384 experts top-8 + 1 shared, first layer dense) + MoonViT; successor to Kimi-K2.5, precursor to K2.7. 256K context.",
"sources": [
"https://huggingface.co/moonshotai/Kimi-K2.6"
],
"confidence": "verified",
"dense_first_layers": 1,
"attn_modules": [
{
"kind": "mla",
"title": "Multi-head Latent Attention (MLA) module",
"p": {
"d": 7168,
"nh": 64,
"qlora": 1536,
"kvlora": 512,
"nope": 128,
"rope": 64,
"v": 128,
"yarn": "mscale² 2.0",
"cache": "KV cache: 576 el/token/layer × 61 ≈ 68.6 KB/token bf16"
},
"notes": [
"YaRN ×64 → 256K context (β_fast back to 32)",
"attention excluded from the int4 checkpoint quantization",
"MoonViT vision tokens enter the same MLA layers via projector"
]
}
]
},
{
"id": "minimax-m2-7",
"name": "MiniMax-M2.7",
"org": "MiniMax",
"family": "MiniMax",
"released": "2026-04",
"license": "Non-commercial (MiniMax)",
"modality": "text",
"decoder_type": "MoE",
"params_total_B": 229,
"params_active_B": 10,
"n_layers": 62,
"d_model": 3072,
"d_ff": null,
"d_ff_moe": 1536,
"n_heads": 48,
"n_kv_heads": 8,
"head_dim": 128,
"attention": "GQA",
"attention_detail": "Full softmax attention on all 62 layers; GQA 48 Q / 8 KV, head_dim 128, per-layer QK-norm, partial RoPE (rotary_dim 64). No linear attention.",
"n_experts": 256,
"active_experts": 8,
"shared_experts": 0,
"vocab_size": 200064,
"context_length": 204800,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": null,
"notes": "Text-only agentic coding/reasoning MoE (229B/~10B), successor to M2/M2.5, full softmax attention throughout; fp8, 3 MTP modules. Superseded by MiniMax-M3. All 62 layers are MoE; config discloses no dense FFN width (M2's vestigial mlp_intermediate_size is absent in M2.7). Non-commercial license verified from HF LICENSE file.",
"sources": [
"https://huggingface.co/MiniMaxAI/MiniMax-M2.7",
"https://huggingface.co/MiniMaxAI/MiniMax-M2.7/raw/main/config.json",
"https://www.minimax.io/news/minimax-m27-en"
],
"confidence": "verified",
"attn_modules": [
{
"kind": "gqa",
"title": "Full softmax GQA (all 62 layers)",
"p": {
"d": 3072,
"nq": 48,
"nkv": 8,
"dh": 128,
"rope": "RoPE 64/128 · θ 5e6",
"qknorm": "per-layer QK-RMSNorm (whole projection)",
"cache": "2 × 8 × 128 = 2,048 el/token/layer × 62"
},
"notes": [
"attention identical to M2 · context 196K → 200K",
"QK-norm per-layer (whole projection) · partial RoPE 64/128",
"3 MTP modules"
]
}
]
},
{
"id": "minimax-m3",
"name": "MiniMax-M3",
"org": "MiniMax",
"family": "MiniMax",
"released": "2026-06",
"license": "MiniMax Community",
"modality": "multimodal",
"decoder_type": "MoE",
"params_total_B": 428,
"params_active_B": 23,
"n_layers": 60,
"d_model": 6144,
"d_ff": 12288,
"d_ff_moe": 3072,
"n_heads": 64,
"n_kv_heads": 4,
"head_dim": 128,
"attention": "sparse",
"attention_detail": "MiniMax Sparse Attention (MSA): top-k block-sparse (16 blocks of 128, 4 index heads) on all but the first 3 dense-warmup layers.",
"n_experts": 128,
"active_experts": 4,
"shared_experts": 1,
"vocab_size": 200064,
"context_length": 1048576,
"norm": "RMSNorm",
"norm_placement": "pre",
"pos_encoding": "partial-RoPE",
"activation": "SwiGLU",
"tie_embeddings": false,
"vision": {
"encoder": "CLIP-style ViT (hidden 1280, 32 layers)",
"encoder_params_B": 0.6,
"fusion": "adapter",
"notes": "MLP projector with patch-merge token compression; supports image and video (3D RoPE)."
},
"notes": "MiniMax's latest: native multimodal (text+image+video) sparse-attention MoE with 1M context. First 3 layers dense, remaining 57 MoE (128 experts, 4 active + 1 shared). 428B/23B active, 7 MTP modules.",
"sources": [
"https://huggingface.co/MiniMaxAI/MiniMax-M3"
],
"confidence": "verified",
"dense_first_layers": 3,
"attention_split": {
"parts": [
{
"name": "Full",
"n": 3,
"type": "global",
"sub": "warmup"
},
{
"name": "MSA",
"n": 57,
"type": "sparse",
"sub": "block top-16"
}
],
"pattern": "fffsssssssssssssssssssssssssssssssssssssssssssssssssssssssss",
"pattern_map": {
"f": "global",
"s": "sparse"
}
},
"attn_modules": [
{
"kind": "msa",
"title": "MSA — MiniMax Sparse Attention (57 layers)",
"p": {
"d": 6144,
"nq": 64,
"nkv": 4,
"dh": 128,
"iheads": 4,
"idim": 128,
"block": 128,
"topk": 16,
"budget": 2048,
"qsub": "per-head Gemma QK-norm · RoPE first 64",
"cache": "full KV cache retained (1,024 el/token/layer, all 60 layers) + 128-el idx key on 57 sparse layers — MSA cuts compute, not memory"
},
"notes": [
"4 index-query heads map 1:1 onto the 4 GQA groups",
"16 Q heads per group share one block selection",
"local block always force-included · raw fp32 scores, no softmax",
"first 3 layers: dense full-attention warm-up (see layer strip)"
]
}
]
}
];
