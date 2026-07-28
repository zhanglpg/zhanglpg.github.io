/* LLM & Multimodal Architecture Atlas — vanilla JS, zero build. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const MODELS = (window.MODELS || []).slice();

  // ---------- formatting ----------
  const fmtParams = (b) => {
    if (b == null) return '—';
    if (b >= 1000) { const t = b / 1000; return (Number.isInteger(t) ? t : t.toFixed(1)) + 'T'; }
    return (Number.isInteger(b) ? b : b.toFixed(1)) + 'B';
  };
  const fmtCtx = (n) => {
    if (n == null) return '—';
    if (n >= 1e6) return Math.round(n / 1048576) + 'M';
    if (n >= 1024) return Math.round(n / 1024) + 'K';
    return '' + n;
  };
  const fmtNum = (n) => (n == null ? '—' : n.toLocaleString('en-US'));
  const relDate = (s) => {
    if (!s) return '';
    const [y, mo] = s.split('-');
    const M = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (M[+mo] || '') + ' ' + y;
  };
  const dateKey = (s) => (s ? +(s.replace('-', '')) : 0);

  const isMoE = (m) => m.decoder_type === 'MoE';
  const isGen = (m) => m.modality === 'image-gen';
  const isMM = (m) => m.modality === 'multimodal';
  const typeBadge = (m) => {
    if (isGen(m)) return '<span class="badge b-dit">' + esc(m.decoder_type) + '</span>';
    if (isMoE(m)) return '<span class="badge b-moe">MoE</span>';
    return '<span class="badge b-dense">Dense</span>';
  };
  const accentColor = (m) => isGen(m) ? 'var(--gen)' : isMM(m) ? 'var(--mm)' : isMoE(m) ? 'var(--moe)' : 'var(--dense)';

  // ---------- state ----------
  const state = { q: '', org: '', sort: 'date', types: new Set(), mods: new Set(), cmp: false, picked: [], detailId: null };
  const getTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

  // ---------- card ----------
  function cardHTML(m) {
    const attnTag = m.attention + (m.n_heads ? ' · ' + m.n_heads + (m.n_kv_heads ? '/' + m.n_kv_heads : '') + 'h' : '');
    const moeTag = isMoE(m) && m.n_experts ? m.n_experts + 'E·top-' + m.active_experts + (m.shared_experts ? '+' + m.shared_experts + 's' : '') : null;
    return `<div class="card${state.picked.includes(m.id) ? ' picked' : ''}" data-id="${esc(m.id)}">
      <div class="accentbar" style="background:${accentColor(m)}"></div>
      <div class="cmpbox"></div>
      <div class="top">
        <div><div class="nm">${esc(m.name)}</div><div class="org">${esc(m.org)}${isMM(m) ? ' · 👁 multimodal' : ''}</div></div>
        ${typeBadge(m)}
      </div>
      <div class="stats">
        <div class="stat"><span class="k">Total</span><span class="v">${fmtParams(m.params_total_B)}</span></div>
        <div class="stat"><span class="k">Active</span><span class="v">${fmtParams(m.params_active_B)}</span></div>
        <div class="stat"><span class="k">Layers</span><span class="v">${m.n_layers ?? '—'}</span></div>
        <div class="stat"><span class="k">d_model</span><span class="v">${fmtNum(m.d_model)}</span></div>
        <div class="stat"><span class="k">Context</span><span class="v">${fmtCtx(m.context_length)}</span></div>
        <div class="stat"><span class="k">${isMoE(m) ? 'Experts' : 'FFN'}</span><span class="v">${isMoE(m) ? (m.n_experts ?? '—') : fmtNum(m.d_ff)}</span></div>
      </div>
      <div class="foot">
        <span class="tag attn">${esc(attnTag)}</span>
        ${moeTag ? '<span class="tag">' + esc(moeTag) + '</span>' : ''}
        <span class="rel">${relDate(m.released)}</span>
      </div>
    </div>`;
  }

  // ---------- spec table ----------
  function specRows(m) {
    const rows = [
      ['Organization', esc(m.org)],
      ['Family', esc(m.family)],
      ['Released', relDate(m.released)],
      ['License', esc(m.license)],
      ['Modality', esc(m.modality)],
      ['Decoder type', esc(m.decoder_type)],
      ['Total params', fmtParams(m.params_total_B)],
      ['Active params', fmtParams(m.params_active_B)],
      ['Layers', m.n_layers],
      ['Hidden (d_model)', fmtNum(m.d_model)],
      ['FFN dim (dense)', fmtNum(m.d_ff)],
      ['FFN dim (expert)', fmtNum(m.d_ff_moe)],
      ['Attention', esc(m.attention)],
      ['Query heads', m.n_heads],
      ['KV heads', m.n_kv_heads],
      ['Head dim', m.head_dim],
      ['Experts (total)', m.n_experts ?? '—'],
      ['Experts (active)', m.active_experts ?? '—'],
      ['Shared experts', m.shared_experts ?? '—'],
      ['Vocab size', fmtNum(m.vocab_size)],
      ['Context length', fmtCtx(m.context_length) + (m.context_length ? ' (' + fmtNum(m.context_length) + ')' : '')],
      ['Normalization', esc(m.norm) + ' · ' + esc(m.norm_placement) + '-norm'],
      ['Positional', esc(m.pos_encoding)],
      ['Activation', esc(m.activation)],
      ['Tied embeddings', m.tie_embeddings ? 'yes' : 'no'],
    ];
    return rows.filter(r => r[1] != null && r[1] !== '' && r[1] !== '— (—)')
      .map(([k, v]) => `<div class="cell"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
  }

  // ---------- architecture SVG ----------
  // Raschka-gallery-style generated diagram: bottom-up main stack (input at bottom, logits at top)
  // inside a gray model container with a purple repeated-block, proper residual skip lines,
  // RoPE side box, dotted-leader callouts, and exploded FFN / MoE sub-module diagrams on the right.
  const A_COL = { MHA: '#3fb950', GQA: '#3fb950', MQA: '#3fb950', MLA: '#bc8cff', sparse: '#f0883e', hybrid: '#58a6ff', linear: '#39c5cf', MMDiT: '#f778ba' };
  const A_NAME = { MHA: 'Multi-Head Attention', GQA: 'Grouped-Query Attention', MQA: 'Multi-Query Attention', MLA: 'Multi-head Latent Attention', sparse: 'Sparse Attention', hybrid: 'Hybrid Attention', linear: 'Linear Attention', MMDiT: 'Joint Attention (MMDiT)' };
  function attnColor(a) { return A_COL[a] || '#3fb950'; }

  function archSVG(m) {
    const gen = isGen(m), moe = isMoE(m);
    const AC = '#6cb2ff', FG = '#e6edf3', DIM = '#9aa7b4', DIM2 = '#8b96a3', LINE = '#3a4352';
    const W = 1080, cx = 340, skipX = cx + 142, RX = 612, cxA = 828, RW = 436;
    const P = [];
    const num = (v) => `<tspan fill="${AC}" font-weight="700">${v}</tspan>`;
    const plain = (s) => String(s).replace(/<[^>]+>/g, '');
    const estW = (s, fs) => plain(s).length * fs * 0.6;
    // tspan-safe wrap: a whole <tspan>…</tspan> is one token (never split inside markup)
    const wrap = (s, maxW, fs) => { const toks = String(s).match(/<tspan[^>]*>[^<]*<\/tspan>|\S+/g) || []; const out = []; let line = ''; for (const w of toks) { const t = line ? line + ' ' + w : w; if (estW(t, fs) > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
    const T = (x, y, s, o = {}) => { const { fs = 12, fill = FG, an = 'middle', fw = 600, fam = '' } = o; P.push(`<text x="${x}" y="${y}" text-anchor="${an}" fill="${fill}" font-size="${fs}" font-weight="${fw}"${fam ? ` font-family="${fam}"` : ''}>${s}</text>`); };
    const TL = (x, y, arr, o = {}) => { const { lh = 15, ...rest } = o; arr.forEach((l, i) => T(x, y + i * lh, l, rest)); };
    const R = (x, y, w, h, o = {}) => { const { fill = '#0d1420', stroke = LINE, rx = 9, sw = 1.4, dash = '' } = o; P.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`); };
    const cbox = (y, w, h, l1, l2, o = {}) => { R(cx - w / 2, y, w, h, o); if (l2) { T(cx, y + h / 2 - 2, l1, { fs: o.fs1 || 13, fill: o.c1 || FG }); T(cx, y + h / 2 + 13.5, l2, { fs: 10.5, fill: DIM, fw: 500 }); } else T(cx, y + h / 2 + 4.5, l1, { fs: o.fs1 || 13, fill: o.c1 || FG }); };
    const up = (x, yLo, yHi) => P.push(`<line x1="${x}" y1="${yLo}" x2="${x}" y2="${yHi + 8}" stroke="${DIM2}" stroke-width="1.6" marker-end="url(#au)"/>`);
    const plus = (x, y) => { P.push(`<circle cx="${x}" cy="${y}" r="11" fill="#0d1420" stroke="${DIM2}" stroke-width="1.5"/>`); T(x, y + 4.5, '+', { fs: 15 }); };
    const otimes = (x, y) => { P.push(`<circle cx="${x}" cy="${y}" r="10" fill="#0d1420" stroke="${DIM2}" stroke-width="1.5"/>`); T(x, y + 3.8, '×', { fs: 13 }); };
    const dot = (x1, y1, x2, y2) => P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5f6975" stroke-width="1.2" stroke-dasharray="2.5 3.5"/>`);
    const aColor = attnColor(m.attention);
    const normN = m.norm || 'RMSNorm';
    const sandwich = m.norm_placement === 'sandwich', postN = m.norm_placement === 'post';
    const preN = !postN; // pre or sandwich draw the pre-norm

    // ============ MAIN STACK (drawn top-down; data flows bottom-up) ============
    let y = 16;
    T(20, y + 20, `${esc(m.name)}  <tspan fill="${DIM}" font-weight="600" font-size="15">(${fmtParams(m.params_total_B)}${moe ? `, ${fmtParams(m.params_active_B)} active` : ''})</tspan>`, { fs: 20, an: 'start', fw: 800 });
    y += m.context_length ? 96 : 52;   // extra headroom for the top-left context callout
    // out arrow above output box
    const outTip = y; y += 16;
    const yOut = y, hOut = 40; y += hOut;
    y += 26;
    const yFN = y, hFN = 32; y += hFN;
    y += 26;
    const purpleTop = y; y += 16;
    // ⊕2 (after FFN/MoE sublayer)
    const yPlus2 = y + 11; y += 22;
    // post-norm above MoE (post / sandwich)
    let yPN2 = null; if (postN || sandwich) { y += 6; yPN2 = y; y += 24; }
    y += 18;
    const yMoE = y, hMoE = 46; y += hMoE;
    // pre-norm below MoE
    let yN2 = null; if (preN) { y += 20; yN2 = y; y += 28; }
    y += 18;
    const yPlus1 = y + 11; y += 22;
    let yPN1 = null; if (postN || sandwich) { y += 6; yPN1 = y; y += 24; }
    y += 16;
    const yAtt = y, hAtt = m.attention_split ? 96 : 48; y += hAtt;
    let yN1 = null; if (preN) { y += 18; yN1 = y; y += 28; }
    y += 16;
    const purpleBot = y;
    y += 26;
    const yEmb = y, hEmb = 40; y += hEmb;
    const contTop = yOut - 18, contBot = y + 16; y = contBot;
    y += 24;
    const yTok = y, hTok = 30; y += hTok;
    y += 34; // input arrow + label
    const yInputLabel = y; y += 8;
    let mainBot = y;

    // gray model container + purple block (drawn first = behind)
    P.push(`<rect x="${cx - 215}" y="${contTop}" width="430" height="${contBot - contTop}" rx="16" fill="#151b28" stroke="#2c3442" stroke-width="1.4"/>`);
    P.push(`<rect x="${cx - 170}" y="${purpleTop}" width="340" height="${purpleBot - purpleTop}" rx="14" fill="url(#pg)" stroke="#8b5cf6" stroke-width="1.6"/>`);

    // boxes
    cbox(yOut, 260, hOut, gen ? 'Linear proj → unpatchify' : 'Linear output layer', null, {});
    cbox(yFN, 200, hFN, gen ? 'Final AdaLN' : `Final ${normN}`, null, { fs1: 12 });
    // MoE / FFN box
    if (moe) {
      cbox(yMoE, 260, hMoE, 'MoE FFN', `${num(m.n_experts)} experts · top-${num(m.active_experts)}${m.shared_experts ? ` + ${num(m.shared_experts)} shared` : ''}`, { fill: 'rgba(210,153,34,.10)', stroke: '#d29922', c1: '#e3b341' });
    } else {
      cbox(yMoE, 260, hMoE, gen ? `MLP · ${esc(m.activation)}` : `FeedForward · ${esc(m.activation)}`, m.d_ff ? `d_ff ${num(fmtNum(m.d_ff))}` : '', { fill: 'rgba(88,166,255,.08)', stroke: '#4a7dbf', c1: '#79b8ff' });
    }
    if (yN2 != null) cbox(yN2, 190, 28, gen ? 'AdaLN mod' : `${normN} 2`, null, { fs1: 11.5 });
    if (yPN2 != null) cbox(yPN2, 190, 24, `${normN} (post)`, null, { fs1: 10.5 });
    // attention box — single, or a two-type split (e.g. Kimi K3: KDA linear + gated-MLA)
    if (m.attention_split) {
      const sp = m.attention_split;
      const parts = sp.parts || [];
      const nA = parts[0] ? parts[0].n : 0, nB = parts[1] ? parts[1].n : 0;
      const nAB = nA + nB || 1;
      const wA = Math.max(118, Math.round(336 * nA / nAB)), wB = 336 - wA;
      const xA = cx - 168, xB = xA + wA;
      const rowY = yAtt + 10, rowH = 42;
      const partBox = (x, w, p) => {
        const col = attnColor(p.type);
        R(x, rowY, w, rowH, { fill: '#242b3d', stroke: col });
        T(x + w / 2, rowY + 17, `${p.n}× ${esc(p.name)}`, { fs: 11.5, fill: col, fw: 700 });
        T(x + w / 2, rowY + 32, esc(p.sub || ''), { fs: 9, fill: DIM, fw: 500 });
      };
      partBox(xA, wA, parts[0]);
      if (parts[1]) partBox(xB, wB, parts[1]);
      // layer-pattern strip: one tick per layer, in true interleaved order
      const pat = sp.pattern || '';
      const map = sp.pattern_map || {};
      const sY = yAtt + 60, sH = 14, sW = 336;
      R(xA, sY, sW, sH, { fill: '#0d1420', stroke: LINE, rx: 5 });
      if (pat) {
        const tw = sW / pat.length;
        for (let i = 0; i < pat.length; i++) {
          const col = attnColor(map[pat[i]] || 'hybrid');
          P.push(`<rect x="${(xA + i * tw + 0.35).toFixed(1)}" y="${sY + 2.5}" width="${(tw - 0.7).toFixed(2)}" height="${sH - 5}" rx="1" fill="${col}" opacity="0.9"/>`);
        }
      }
      T(xA, sY + sH + 13, 'layer order · bottom = first', { fs: 9, an: 'start', fill: DIM2, fw: 500 });
      T(xA + sW, sY + sH + 13, `${num(sp.parts ? sp.parts.map(p => p.n).join(' + ') : '')} = ${num(m.n_layers ?? nAB)} layers`, { fs: 9, an: 'end', fill: DIM2, fw: 500 });
    } else {
      const attTitle = A_NAME[m.attention] || esc(m.attention);
      const attSub = m.n_heads ? `${num(m.n_heads)} heads${m.n_kv_heads && m.n_kv_heads !== m.n_heads ? ` · ${num(m.n_kv_heads)} KV` : ''} · d_h ${num(m.head_dim ?? '?')}` : '';
      cbox(yAtt, 260, hAtt, attTitle, attSub, { fill: '#242b3d', stroke: aColor, c1: aColor, fs1: 13.5 });
    }
    if (yN1 != null) cbox(yN1, 190, 28, gen ? 'AdaLN mod' : `${normN} 1`, null, { fs1: 11.5 });
    if (yPN1 != null) cbox(yPN1, 190, 24, `${normN} (post)`, null, { fs1: 10.5 });
    cbox(yEmb, 260, hEmb, gen ? 'Patchify + embed' : 'Token embedding layer', `d_model = ${num(fmtNum(m.d_model))}`, {});
    cbox(yTok, 190, hTok, gen ? 'Latent patches + text' : 'Tokenized text', null, { fs1: 12 });
    T(cx, yInputLabel, gen ? 'noised latent · timestep · text cond.' : 'Sample input text', { fs: 12, fill: DIM2, fam: 'ui-monospace,Menlo,monospace', fw: 500 });

    // residual ⊕ nodes + main arrows (bottom-up)
    plus(cx, yPlus2); plus(cx, yPlus1);
    up(cx, yOut, outTip);                                    // logits out
    up(cx, yFN, yOut + hOut);
    up(cx, yPlus2 - 11, yFN + hFN);
    up(cx, yMoE, (yPN2 != null ? yPN2 + 24 : yPlus2 + 11));
    if (yPN2 != null) up(cx, yPN2, yPlus2 + 11);
    if (yN2 != null) { up(cx, yN2, yMoE + hMoE); up(cx, yPlus1 - 11, yN2 + 28); }
    else up(cx, yPlus1 - 11, yMoE + hMoE);
    up(cx, yAtt, (yPN1 != null ? yPN1 + 24 : yPlus1 + 11));
    if (yPN1 != null) up(cx, yPN1, yPlus1 + 11);
    if (yN1 != null) { up(cx, yN1, yAtt + hAtt); up(cx, yEmb, yN1 + 28); }
    else up(cx, yEmb, yAtt + hAtt);
    up(cx, yTok, yEmb + hEmb);
    up(cx, yTok + hTok + 26, yTok + hTok);

    // residual skip lines (right side, into ⊕ from the right)
    const skip = (yBranch, yPlusC) => P.push(`<path d="M ${cx} ${yBranch} L ${skipX} ${yBranch} L ${skipX} ${yPlusC} L ${cx + 19} ${yPlusC}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
    const b1 = (yN1 != null ? yN1 + 28 : yAtt + hAtt) + 9;   // on the segment entering attention sublayer
    const b2 = (yN2 != null ? yN2 + 28 : yMoE + hMoE) + 9;   // on the segment entering FFN sublayer
    skip(b1, yPlus1); skip(b2, yPlus2);

    // N× layer count: brace at purple bottom-left (Raschka style) when there's room below the
    // RoPE box; otherwise (short post-norm blocks) a label in the top-right gutter.
    const hasRope = /RoPE/i.test(m.pos_encoding || '');
    const bMid0 = purpleBot - 40;                          // brace label center if we draw the brace
    const ropeY0 = yAtt + hAtt / 2 - 15, ropeY1 = yAtt + hAtt / 2 + 15;
    const labelCollides = hasRope && (bMid0 + 18 > ropeY0) && (bMid0 - 18 < ropeY1);
    if (!labelCollides) {
      const bx = cx - 182, bTop = purpleBot - 74, bBot = purpleBot - 6, bMid = (bTop + bBot) / 2;
      P.push(`<path d="M ${bx + 8} ${bTop} Q ${bx} ${bTop} ${bx} ${bTop + 9} L ${bx} ${bMid - 9} Q ${bx} ${bMid} ${bx - 8} ${bMid} Q ${bx} ${bMid} ${bx} ${bMid + 9} L ${bx} ${bBot - 9} Q ${bx} ${bBot} ${bx + 8} ${bBot}" fill="none" stroke="${DIM2}" stroke-width="1.8"/>`);
      T(bx - 16, bMid - 2, `${num(m.n_layers ?? 'N')} ×`, { fs: 17, an: 'end', fw: 800 });
      T(bx - 16, bMid + 15, 'blocks', { fs: 10.5, an: 'end', fill: DIM, fw: 500 });
    } else {
      T(cx + 178, purpleTop + 20, `${num(m.n_layers ?? 'N')} ×`, { fs: 15, an: 'start', fw: 800 });
      T(cx + 178, purpleTop + 36, 'blocks', { fs: 10, an: 'start', fill: DIM, fw: 500 });
    }

    // RoPE side box (RoPE-family) or learned-pos callout
    const pe = m.pos_encoding || '';
    if (/RoPE/i.test(pe)) {
      const rY = yAtt + hAtt / 2 - 15;
      R(38, rY, 92, 30, { fill: '#0d1420', stroke: LINE });
      T(84, rY + 19, esc(pe.length > 12 ? 'MRoPE' : pe), { fs: 11.5 });
      P.push(`<line x1="130" y1="${rY + 15}" x2="${cx - 138}" y2="${rY + 15}" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
    } else if (pe === 'learned') {
      TL(24, yEmb - 32, wrap('Learned absolute positional embeddings', 130, 11), { fs: 11, fill: DIM, an: 'start', fw: 500 });
      dot(150, yEmb - 26, cx - 132, yEmb + 8);
    }

    // ---- callouts with dotted leaders ----
    // vocab → output layer (top right, above the right column modules)
    if (m.vocab_size) {
      T(RX, yOut + 6, `Vocabulary size of ${num(fmtNum(m.vocab_size))}`, { fs: 12.5, an: 'start', fill: DIM });
      dot(cx + 132, yOut + 16, RX - 8, yOut + 2);
    }
    // context length (top-left, above the model container — keeps the RoPE/brace zone clear)
    if (m.context_length) {
      TL(24, contTop - 26, ['Supported context', `length of ${num(fmtCtx(m.context_length))} tokens`], { fs: 11.5, an: 'start', fill: DIM });
      dot(122, contTop - 18, cx - 198, contTop + 10);
    }
    // attention-pattern callout for hybrid/sparse/linear (left, above RoPE; right-aligned so
    // lines never cross the container border; honest ellipsis when truncated)
    if (['hybrid', 'sparse', 'linear', 'MMDiT'].includes(m.attention) && m.attention_detail) {
      const full = String(m.attention_detail);
      let short = full.length > 170 ? full.slice(0, 168).replace(/[,;.\s]+\S*$/, '') : full;
      let ls = wrap(short, 134, 10.5);
      let trunc = short.length < full.length;
      if (ls.length > 7) { ls = ls.slice(0, 7); trunc = true; }
      if (trunc) ls[ls.length - 1] = ls[ls.length - 1].replace(/[,;.(]+$/, '') + ' …';
      TL(118, yAtt - 30 - ls.length * 13.5, ls, { fs: 10.5, lh: 13.5, an: 'end', fill: '#c8b273', fw: 500 });
      dot(122, yAtt - 32, cx - 132, yAtt + 6);
    }
    // dense-first / moe-interleave note (left column at the embedding row, leader to purple corner)
    let noteY = yEmb + 4;
    if (moe && (m.dense_first_layers || m.moe_every === 2)) {
      const msg = m.dense_first_layers
        ? `First ${m.dense_first_layers} block${m.dense_first_layers > 1 ? 's use' : ' uses'} a dense FeedForward (d_ff ${fmtNum(m.d_ff)}) instead of MoE`
        : `MoE alternates with dense FeedForward layers (every 2nd block; dense d_ff ${fmtNum(m.d_ff)})`;
      const ls = wrap(msg, 172, 11);
      TL(24, noteY, ls, { fs: 11, lh: 14, an: 'start', fill: DIM, fw: 500 });
      dot(112, noteY - 10, cx - 172, purpleBot - 2);
      noteY += ls.length * 14 + 12;
    }
    // vision encoder side box (multimodal LMs) — feeds the token sequence horizontally
    if (m.vision && !gen) {
      const vY = yTok - 6;
      const enc = (m.vision.encoder || 'Vision encoder').split('(')[0].trim();
      const encLines = wrap(esc(enc), 172, 10.5).slice(0, 2);
      const vH = encLines.length > 1 ? 54 : 40;
      R(30, vY, 190, vH, { fill: '#1c1530', stroke: '#bc8cff', dash: '5 4' });
      TL(125, vY + 16, encLines, { fs: 10.5, lh: 12.5, fill: '#d2a8ff' });
      T(125, vY + vH - 9, `${m.vision.encoder_params_B ? '~' + m.vision.encoder_params_B + 'B · ' : ''}${esc(m.vision.fusion || 'adapter')}`, { fs: 10, fill: DIM, fw: 500 });
      P.push(`<line x1="222" y1="${vY + vH / 2}" x2="${cx - 103}" y2="${vY + vH / 2}" stroke="#bc8cff" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#au)"/>`);
      T(125, vY + vH + 15, 'vision tokens', { fs: 10.5, fill: DIM2, fam: 'ui-monospace,Menlo,monospace', fw: 500 });
      mainBot = Math.max(mainBot, vY + vH + 26);
    }
    mainBot = Math.max(mainBot, noteY);

    // ============ RIGHT COLUMN: exploded modules ============
    let ry = Math.max(130, yOut + 38);
    // --- FeedForward module ---
    const gated = /GLU/i.test(m.activation || '');
    const actName = (m.activation === 'SwiGLU') ? 'SiLU' : (m.activation === 'GeGLU') ? 'GELU' : (m.activation || 'GELU');
    T(RX, ry, `FeedForward (${esc(m.activation || 'MLP')}) module`, { fs: 14.5, an: 'start', fw: 800 });
    ry += 12;
    const fH = gated ? 236 : 210;
    R(RX, ry, RW, fH, { fill: '#10161f', stroke: '#4a5568', rx: 14, dash: '6 5' });
    if (gated) {
      const lX = cxA - 105, rX2 = cxA + 105;
      // top output linear
      R(cxA - 85, ry + 22, 170, 34, {}); T(cxA, ry + 43, 'Linear layer', { fs: 12 });
      // ⊗
      const mY = ry + 92; otimes(cxA, mY);
      // SiLU/GELU (left) + up-proj Linear (right)
      R(lX - 80, mY + 26, 160, 34, {}); T(lX, mY + 47, `${actName} activation`, { fs: 12 });
      R(rX2 - 80, mY + 26, 160, 34, {}); T(rX2, mY + 47, 'Linear layer', { fs: 12 });
      // bottom gate linear (left)
      R(lX - 80, mY + 86, 160, 34, {}); T(lX, mY + 107, 'Linear layer', { fs: 12 });
      // arrows: input → gate linear & right linear; gate → act; act → ⊗; right → ⊗; ⊗ → out
      const inY = ry + fH - 8;
      P.push(`<path d="M ${cxA} ${inY} L ${cxA} ${inY - 6} L ${lX} ${inY - 6} L ${lX} ${mY + 128}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
      P.push(`<path d="M ${cxA} ${inY - 6} L ${rX2} ${inY - 6} L ${rX2} ${mY + 68}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
      up(lX, mY + 86, mY + 60);
      P.push(`<path d="M ${lX} ${mY + 26} L ${lX} ${mY} L ${cxA - 18} ${mY}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
      P.push(`<path d="M ${rX2} ${mY + 26} L ${rX2} ${mY} L ${cxA + 18} ${mY}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
      up(cxA, mY - 10, ry + 56);
    } else {
      // simple MLP: Linear → act → Linear
      R(cxA - 85, ry + 22, 170, 34, {}); T(cxA, ry + 43, 'Linear layer', { fs: 12 });
      R(cxA - 85, ry + 88, 170, 34, {}); T(cxA, ry + 109, `${actName} activation`, { fs: 12 });
      R(cxA - 85, ry + 154, 170, 34, {}); T(cxA, ry + 175, 'Linear layer', { fs: 12 });
      up(cxA, ry + 88, ry + 56); up(cxA, ry + 154, ry + 122); up(cxA, ry + fH - 6, ry + 188);
    }
    const ffDim = moe ? m.d_ff_moe : m.d_ff;
    // right-anchored so the panel connector on the left never crosses it
    T(RX + RW - 8, ry + fH + 22, `Input dim: ${num(fmtNum(m.d_model))}   ·   Intermediate dim: ${num(fmtNum(ffDim ?? '—'))}`, { fs: 12.5, an: 'end', fill: DIM });
    // leader from main FFN/MoE box to this module
    dot(cx + 132, yMoE + hMoE / 2, RX - 6, ry + fH / 2);
    let rBot = ry + fH + 40;

    // --- MoE layer module ---
    if (moe) {
      let by = rBot + 22;
      T(RX, by, 'MoE layer', { fs: 14.5, an: 'start', fw: 800 });
      by += 12;
      const bH = 250;
      R(RX, by, RW, bH, { fill: '#10161f', stroke: '#2f6feb', rx: 14, dash: '6 5' });
      // ⊕ at top, with its output stub
      const pY = by + 34; plus(cxA, pY);
      up(cxA, pY - 11, by + 2);
      // expert FF boxes
      const e1x = cxA - 128, e2x = cxA + 128, eY = by + 92;
      const ff = (x, label, badge, badgeFill) => {
        R(x - 78, eY, 156, 34, { fill: '#1a2130', stroke: '#d29922' });
        T(x, eY + 21, label, { fs: 12, fill: '#e3b341' });
        R(x + 52, eY + 22, 26, 18, { fill: badgeFill, stroke: 'none', rx: 4 });
        T(x + 65, eY + 35, badge, { fs: 10.5, fill: '#0d1117', fw: 800 });
      };
      ff(e1x, 'Feed forward', '1', '#e6edf3');
      ff(e2x, 'Feed forward', String(m.n_experts ?? 'E'), '#6cb2ff');
      T(cxA, eY + 22, '· · ·', { fs: 16, fill: DIM });
      // router
      const rtY = by + 176;
      R(cxA - 62, rtY, 124, 34, { fill: '#0d1420', stroke: '#2f6feb' }); T(cxA, rtY + 21, 'Router', { fs: 12.5, fill: '#79b8ff' });
      // arrows router → experts → ⊕
      P.push(`<line x1="${cxA - 20}" y1="${rtY + 2}" x2="${e1x + 10}" y2="${eY + 40}" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
      P.push(`<line x1="${cxA + 20}" y1="${rtY + 2}" x2="${e2x - 10}" y2="${eY + 40}" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
      P.push(`<line x1="${e1x + 10}" y1="${eY - 4}" x2="${cxA - 14}" y2="${pY + 12}" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
      P.push(`<line x1="${e2x - 10}" y1="${eY - 4}" x2="${cxA + 14}" y2="${pY + 12}" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
      up(cxA, by + bH - 8, rtY + 34);
      // shared expert (always-on) — level with ⊕ at far left, clear of the expert→⊕ arrows
      if (m.shared_experts) {
        R(RX + 16, pY - 15, 118, 30, { fill: 'rgba(63,185,80,.10)', stroke: '#3fb950' });
        T(RX + 75, pY - 2, 'Shared expert', { fs: 10.5, fill: '#7ee787' });
        T(RX + 75, pY + 10, 'always active', { fs: 9, fill: DIM, fw: 500 });
        P.push(`<line x1="${RX + 136}" y1="${pY}" x2="${cxA - 24}" y2="${pY}" stroke="#3fb950" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#au)"/>`);
      }
      // caption OUTSIDE the panel so the router input arrow never crosses it
      T(RX + 14, by + bH + 18, `each expert = the FeedForward module above (d_ff ${num(fmtNum(m.d_ff_moe))})`, { fs: 10.5, an: 'start', fill: DIM, fw: 500 });
      // panel-to-panel connector down the clear left corridor
      dot(RX + 44, ry + fH + 4, RX + 44, by - 4);
      rBot = by + bH + 30;
    }

    // --- resource / inference bullets ---
    let cy = rBot + 26;
    const bullet = (b) => { const ls = wrap(b, 392, 12); T(RX + 10, cy, '•', { fs: 12, an: 'start', fill: DIM }); TL(RX + 24, cy, ls, { fs: 12, lh: 16, an: 'start', fill: DIM, fw: 500 }); cy += ls.length * 16 + 5; };
    if (moe) {
      T(RX, cy, 'Resource savings:', { fs: 13.5, an: 'start', fw: 800, fill: AC }); cy += 20;
      const bullets = [
        `Model size is ${num(fmtParams(m.params_total_B))}`,
        `but only ${num(m.active_experts)} routed${m.shared_experts ? ` + ${num(m.shared_experts)} shared` : ''} of ${num(m.n_experts)} experts are active per token`,
        `→ only ${num(fmtParams(m.params_active_B))} parameters active per inference step`,
      ];
      bullets.forEach(bullet);
    } else if (!gen) {
      T(RX, cy, 'Inference notes:', { fs: 13.5, an: 'start', fw: 800, fill: AC }); cy += 20;
      const bl = [];
      if (m.attention === 'MLA') bl.push('MLA compresses K/V into low-rank latents → far smaller KV cache than MHA');
      else if (m.n_kv_heads && m.n_heads && m.n_kv_heads < m.n_heads) {
        bl.push(`${num(m.n_heads)} query heads share ${num(m.n_kv_heads)} KV heads → ${num(Math.round(m.n_heads / m.n_kv_heads) + '×')} smaller KV cache than MHA`);
        if (m.head_dim && m.n_layers) bl.push(`KV cache ≈ ${num(fmtNum(Math.round(2 * m.n_kv_heads * m.head_dim * m.n_layers * 2 / 1024)) + ' KB')} per token (bf16)`);
      } else bl.push('Full multi-head attention: KV cache grows with heads × layers × context');
      if (m.tie_embeddings) bl.push('Input/output embeddings tied (saves vocab × d_model params)');
      bl.forEach(bullet);
    } else {
      T(RX, cy, 'Design notes:', { fs: 13.5, an: 'start', fw: 800, fill: AC }); cy += 20;
      bullet(m.attention_detail || m.notes || '');
    }

    const H = Math.max(mainBot, cy) + 18;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <defs>
        <marker id="au" markerWidth="8" markerHeight="8" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="${DIM2}"/></marker>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.20"/><stop offset="1" stop-color="#6d28d9" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      ${P.join('\n')}
    </svg>`;
  }

  // ---------- themed diagrams ----------
  // archSVG emits the dark palette; for light mode we remap each dark color to a tuned light
  // equivalent (exact string substitution — every color below appears only with this meaning).
  const LIGHT_SVG_MAP = [
    ['#e6edf3', '#1f2328'],   // primary text (also flips the white expert badge to a dark chip)
    ['#0d1117', '#ffffff'],   // badge numerals (white on the now-dark chip)
    ['#0d1420', '#ffffff'],   // box fills
    ['#151b28', '#f6f8fa'],   // model-container fill
    ['#10161f', '#fafbfc'],   // module-panel fills
    ['#242b3d', '#eef1f6'],   // attention box fill
    ['#1c1530', '#faf5ff'],   // vision box fill
    ['#1a2130', '#fff8eb'],   // expert feed-forward box fill
    ['#2c3442', '#d0d7de'],   // container stroke
    ['#3a4352', '#c7cdd4'],   // box strokes
    ['#4a5568', '#afb8c1'],   // module dashed strokes
    ['#5f6975', '#8c959f'],   // dotted leaders
    ['#8b96a3', '#57606a'],   // arrows / secondary labels
    ['#9aa7b4', '#57606a'],   // dim text
    ['#6cb2ff', '#0550ae'],   // accent numbers
    ['#79b8ff', '#0550ae'],   // blue labels
    ['#e3b341', '#9a6700'],   // amber labels
    ['#c8b273', '#7d5a00'],   // attention-pattern callout
    ['#7ee787', '#1a7f37'],   // green labels
    ['#d2a8ff', '#8250df'],   // purple labels
    ['#bc8cff', '#8250df'],   // purple strokes
    ['#8b5cf6', '#8250df'],   // purple block stroke + gradient stop
    ['#6d28d9', '#a879f7'],   // gradient lower stop
  ];
  function themedSVG(m) {
    let s = archSVG(m);
    if (getTheme() === 'light') for (const [d, l] of LIGHT_SVG_MAP) s = s.split(d).join(l);
    return s;
  }

  // ---------- detail drawer ----------
  function openDetail(m) {
    state.detailId = m.id;
    const vis = m.vision ? `<div class="dsec"><h3>Vision / Multimodal</h3><div class="notes">
      <b>Encoder:</b> ${esc(m.vision.encoder)}${m.vision.encoder_params_B ? ' (~' + m.vision.encoder_params_B + 'B)' : ''} · <b>Fusion:</b> ${esc(m.vision.fusion)}<br>${esc(m.vision.notes)}</div></div>` : '';
    $('#drawer').innerHTML = `
      <div class="dh">
        <div><h2>${esc(m.name)}</h2><div class="org">${esc(m.org)} · ${esc(m.family)} · ${relDate(m.released)} · <span class="conf ${esc(m.confidence)}">${esc(m.confidence)}</span></div></div>
        <button class="xbtn" id="dx">×</button>
      </div>
      <div class="dbody">
        <div class="dsec"><h3>Architecture diagram</h3>
          <div class="arch" data-mid="${esc(m.id)}">${themedSVG(m)}<span class="zoomhint">⤢ click to enlarge</span></div>
          <div style="color:var(--dim2);font-size:11px;margin-top:6px">Schematic: one representative decoder block, repeated ×${m.n_layers ?? 'N'}. ${esc(m.attention_detail || '')}</div>
        </div>
        <div class="dsec"><h3>Specifications</h3><div class="spectbl">${specRows(m)}</div></div>
        ${vis}
        <div class="dsec"><h3>Notes</h3><div class="notes">${esc(m.notes)}</div></div>
        <div class="dsec"><h3>Sources</h3><div class="srcs">${(m.sources || []).map(s => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\//, '').replace(/\/raw\/main\/config\.json$/, ' · config.json').slice(0, 46))}</a>`).join('')}</div></div>
      </div>`;
    $('#dx').onclick = closeDetail;
    $('#scrim').classList.add('show');
    $('#drawer').classList.add('show');
  }
  function closeDetail() { $('#scrim').classList.remove('show'); $('#drawer').classList.remove('show'); }

  // ---------- compare ----------
  function renderCompare() {
    const ms = state.picked.map(id => MODELS.find(m => m.id === id)).filter(Boolean);
    if (ms.length < 2) return;
    const fields = [
      ['Org', m => esc(m.org)], ['Released', m => relDate(m.released)], ['Type', m => esc(m.decoder_type)],
      ['Modality', m => esc(m.modality)], ['Total', m => fmtParams(m.params_total_B)], ['Active', m => fmtParams(m.params_active_B)],
      ['Layers', m => m.n_layers], ['d_model', m => fmtNum(m.d_model)], ['FFN (dense)', m => fmtNum(m.d_ff)], ['FFN (expert)', m => fmtNum(m.d_ff_moe)],
      ['Attention', m => esc(m.attention)], ['Q / KV heads', m => (m.n_heads ?? '—') + ' / ' + (m.n_kv_heads ?? '—')], ['Head dim', m => m.head_dim ?? '—'],
      ['Experts', m => m.n_experts ?? '—'], ['Active experts', m => m.active_experts ?? '—'], ['Shared', m => m.shared_experts ?? '—'],
      ['Context', m => fmtCtx(m.context_length)], ['Vocab', m => fmtNum(m.vocab_size)],
      ['Norm', m => esc(m.norm) + ' (' + esc(m.norm_placement) + ')'], ['Positional', m => esc(m.pos_encoding)], ['Activation', m => esc(m.activation)],
    ];
    const n = ms.length;
    let rows = `<div class="cmp-cols" style="--n:${n}"><div class="rowlabel hdr"></div>${ms.map(m => `<div class="hdr">${esc(m.name)}</div>`).join('')}`;
    for (const [label, fn] of fields) {
      const vals = ms.map(fn);
      const diff = new Set(vals.map(String)).size > 1;
      rows += `<div class="rowlabel">${label}</div>` + vals.map(v => `<div style="${diff ? 'color:#e6edf3' : 'color:#9aa7b4'}">${v == null ? '—' : v}</div>`).join('');
    }
    rows += '</div>';
    const archs = `<div class="cmp-archrow" style="--n:${n}">${ms.map(m => `<div><div style="text-align:center;font-weight:640;margin-bottom:6px">${esc(m.name)}</div><div class="arch" data-mid="${esc(m.id)}">${themedSVG(m)}<span class="zoomhint">⤢ click to enlarge</span></div></div>`).join('')}</div>`;
    $('#cmpModal').innerHTML = `<div class="inner">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <h2 style="margin:0">Architecture comparison</h2><button class="btn" id="cmpClose">Close ×</button></div>
      ${rows}${archs}</div>`;
    $('#cmpClose').onclick = () => $('#cmpModal').classList.remove('show');
    $('#cmpModal').classList.add('show');
  }
  function renderPills() {
    $('#cmppills').innerHTML = state.picked.map(id => {
      const m = MODELS.find(x => x.id === id);
      return `<span class="pill">${esc(m.name)}<button data-id="${id}">×</button></span>`;
    }).join('');
    $$('#cmppills button').forEach(b => b.onclick = () => { togglePick(b.dataset.id); });
    $('#cmpGo').disabled = state.picked.length < 2;
  }
  function togglePick(id) {
    const i = state.picked.indexOf(id);
    if (i >= 0) state.picked.splice(i, 1);
    else if (state.picked.length < 4) state.picked.push(id);
    renderPills(); render();
  }

  // ---------- filtering + render ----------
  function passes(m) {
    if (state.org && m.org !== state.org) return false;
    if (state.types.size) {
      const t = m.decoder_type === 'MoE' ? 'MoE' : (m.decoder_type === 'Dense' ? 'Dense' : m.decoder_type);
      if (!state.types.has(t)) return false;
    }
    if (state.mods.size) {
      if (![...state.mods].some(md => m.modality === md)) return false;
    }
    if (state.q) {
      const hay = [m.name, m.org, m.family, m.attention, m.attention_detail, m.notes, m.decoder_type, m.pos_encoding, m.norm].join(' ').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every(t => hay.includes(t))) return false;
    }
    return true;
  }
  function sortModels(a, b) {
    switch (state.sort) {
      case 'date': return dateKey(b.released) - dateKey(a.released) || (b.params_total_B - a.params_total_B);
      case 'date-asc': return dateKey(a.released) - dateKey(b.released);
      case 'size': return (b.params_total_B || 0) - (a.params_total_B || 0);
      case 'active': return (b.params_active_B || 0) - (a.params_active_B || 0);
      case 'name': return a.name.localeCompare(b.name);
    }
    return 0;
  }
  function render() {
    const list = MODELS.filter(passes).sort(sortModels);
    $('#grid').innerHTML = list.map(cardHTML).join('');
    $('#empty').style.display = list.length ? 'none' : 'block';
    $('#count').textContent = list.length + ' of ' + MODELS.length + ' models';
    $$('#grid .card').forEach(c => {
      c.onclick = () => {
        const m = MODELS.find(x => x.id === c.dataset.id);
        if (state.cmp) togglePick(m.id); else openDetail(m);
      };
    });
  }

  // ---------- init ----------
  function init() {
    $('#mcount').textContent = MODELS.length;
    // last-updated: prefer the maintenance changelog's last run; fall back to newest model date
    const CLOG = window.ATLAS_CHANGELOG;
    if (CLOG && CLOG.last_run) $('#updated').textContent = CLOG.last_run;
    else $('#updated').textContent = relDate(MODELS.map(m => m.released).sort().pop());

    // what's-new modal from the changelog
    const wn = $('#whatsnew');
    if (CLOG && CLOG.entries && CLOG.entries.length) {
      $('#wnList').innerHTML = CLOG.entries.map(e => `
        <div class="wn-entry">
          <div class="d">${esc(e.date)}</div>
          <div>${(e.added || []).map(a => `<span class="wn-chip wn-add">+ ${esc(a)}</span>`).join('')}
               ${(e.upgraded || []).map(u => `<span class="wn-chip wn-up">↑ ${esc(u)}</span>`).join('')}</div>
          <div class="note">${esc(e.note)}</div>
        </div>`).join('');
      wn.onclick = (ev) => { ev.preventDefault(); $('#wnModal').classList.add('show'); };
      $('#wnClose').onclick = () => $('#wnModal').classList.remove('show');
      $('#wnModal').onclick = (ev) => { if (ev.target === $('#wnModal')) $('#wnModal').classList.remove('show'); };
    } else if (wn) wn.style.display = 'none';
    const orgs = [...new Set(MODELS.map(m => m.org))].sort();
    $('#org').innerHTML = '<option value="">All orgs</option>' + orgs.map(o => `<option>${esc(o)}</option>`).join('');

    $('#q').oninput = (e) => { state.q = e.target.value; render(); };
    $('#org').onchange = (e) => { state.org = e.target.value; render(); };
    $('#sort').onchange = (e) => { state.sort = e.target.value; render(); };
    $$('#typechips .fchip').forEach(ch => {
      ch.onclick = () => {
        const set = ch.dataset.f === 'type' ? state.types : state.mods;
        if (set.has(ch.dataset.v)) { set.delete(ch.dataset.v); ch.classList.remove('on'); }
        else { set.add(ch.dataset.v); ch.classList.add('on'); }
        render();
      };
    });
    $('#cmpToggle').onclick = () => {
      state.cmp = !state.cmp;
      document.body.classList.toggle('cmp', state.cmp);
      $('#cmpToggle').classList.toggle('active', state.cmp);
      if (!state.cmp) { state.picked = []; renderPills(); render(); }
    };
    $('#cmpGo').onclick = renderCompare;
    $('#cmpClear').onclick = () => { state.picked = []; renderPills(); render(); };
    $('#scrim').onclick = closeDetail;
    document.onkeydown = (e) => {
      if (e.key !== 'Escape') return;
      for (const id of ['#lightbox', '#wnModal']) {   // innermost layers first
        const el = $(id);
        if (el && el.classList.contains('show')) { el.classList.remove('show'); return; }
      }
      closeDetail(); $('#cmpModal').classList.remove('show');
    };

    // theme toggle — re-render any open diagram views so the SVG palette follows
    const tbtn = $('#themeToggle');
    const themeIcon = () => { tbtn.textContent = getTheme() === 'light' ? '🌙' : '☀️'; };
    themeIcon();
    tbtn.onclick = () => {
      const next = getTheme() === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('atlas-theme', next); } catch (e) {}
      themeIcon();
      $('#lightbox').classList.remove('show');
      if ($('#drawer').classList.contains('show') && state.detailId) {
        const m = MODELS.find(x => x.id === state.detailId); if (m) openDetail(m);
      }
      if ($('#cmpModal').classList.contains('show')) renderCompare();
    };

    // diagram lightbox — click any .arch (drawer or compare) to enlarge
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('.arch') : null;
      if (!a || !a.dataset.mid) return;
      const m = MODELS.find(x => x.id === a.dataset.mid);
      if (!m) return;
      $('#lbSvg').innerHTML = themedSVG(m);
      $('#lightbox').classList.add('show');
    });
    $('#lbClose').onclick = () => $('#lightbox').classList.remove('show');
    $('#lightbox').onclick = (e) => { if (e.target === $('#lightbox')) $('#lightbox').classList.remove('show'); };
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
