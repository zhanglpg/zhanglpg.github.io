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
  let standalone = false;   // ?model=<id> — render one model's detail as its own page

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
  const A_COL = { MHA: '#3fb950', GQA: '#3fb950', MQA: '#3fb950', MLA: '#bc8cff', sparse: '#f0883e', hybrid: '#58a6ff', linear: '#39c5cf', sliding: '#f0883e', global: '#3fb950', CSA: '#f0883e', HCA: '#f778ba', SW: '#9aa7b4', MMDiT: '#f778ba' };
  const A_NAME = { MHA: 'Multi-Head Attention', GQA: 'Grouped-Query Attention', MQA: 'Multi-Query Attention', MLA: 'Multi-head Latent Attention', sparse: 'Sparse Attention', hybrid: 'Hybrid Attention', linear: 'Linear Attention', sliding: 'Sliding-Window Attention', global: 'Global Attention', CSA: 'Compressed Sparse Attention', HCA: 'Heavily Compressed Attention', SW: 'Sliding Window', MMDiT: 'Joint Attention (MMDiT)' };
  function attnColor(a) { return A_COL[a] || '#3fb950'; }

  function archSVG(m) {
    const gen = isGen(m), moe = isMoE(m);
    const AC = '#6cb2ff', FG = '#e6edf3', DIM = '#9aa7b4', DIM2 = '#8b96a3', LINE = '#3a4352';
    const W = 1080, cx = 340, skipX = cx + (m.attention_split ? 152 : 142), RX = 612, cxA = 828, RW = 436;
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
    // attention box — single, or an N-type split (e.g. Kimi K3 KDA+MLA, gpt-oss sliding+full,
    // DeepSeek-V4 CSA+HCA). Split boxes label each attention type; the strip below shows the
    // true per-layer interleave order.
    if (m.attention_split) {
      const sp = m.attention_split;
      const parts = sp.parts || [];
      const total = parts.reduce((s, p) => s + p.n, 0) || 1;
      const rowY = yAtt + 10, rowH = 42, sW = 300, x0 = cx - 168;
      // proportional widths with a per-part minimum so labels stay legible; any space taken
      // by the minimums is redistributed across the larger parts so relative order stays honest
      const minW = parts.length >= 3 ? 60 : 118;
      let widths = parts.map(p => sW * p.n / total);
      for (let it = 0; it < 6; it++) {
        const deficit = widths.reduce((s, w) => s + (w < minW ? minW - w : 0), 0);
        const above = widths.filter(w => w >= minW).length;
        if (deficit <= 0.01 || above === 0) break;
        widths = widths.map(w => (w < minW ? minW : w - deficit / above));
      }
      widths = widths.map(w => Math.round(w));
      const wSum = widths.reduce((a, b) => a + b, 0);
      if (wSum !== sW) widths[widths.indexOf(Math.max(...widths))] += sW - wSum;
      let xCur = x0;
      parts.forEach((p, i) => {
        const w = widths[i], col = attnColor(p.type);
        R(xCur, rowY, w, rowH, { fill: '#242b3d', stroke: col });
        T(xCur + w / 2, rowY + 17, `${p.n}× ${esc(p.name)}`, { fs: 11.5, fill: col, fw: 700 });
        if (p.sub) T(xCur + w / 2, rowY + 32, esc(p.sub), { fs: 9, fill: DIM, fw: 500 });
        xCur += w;
      });
      // layer-pattern strip: one tick per layer, in true interleaved order
      const pat = sp.pattern || '';
      const map = sp.pattern_map || {};
      const sY = yAtt + 60, sH = 14;
      R(x0, sY, sW, sH, { fill: '#0d1420', stroke: LINE, rx: 5 });
      if (pat) {
        const tw = sW / pat.length;
        for (let i = 0; i < pat.length; i++) {
          const col = attnColor(map[pat[i]] || 'hybrid');
          P.push(`<rect x="${(x0 + i * tw + 0.35).toFixed(1)}" y="${sY + 2.5}" width="${(tw - 0.7).toFixed(2)}" height="${sH - 5}" rx="1" fill="${col}" opacity="0.9"/>`);
        }
      }
      T(x0, sY + sH + 13, 'layer order · left = first', { fs: 9, an: 'start', fill: DIM2, fw: 500 });
      T(x0 + sW, sY + sH + 13, `${num(parts.map(p => p.n).join(' + '))} = ${num(m.n_layers ?? total)} layers`, { fs: 9, an: 'end', fill: DIM2, fw: 500 });
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

    // residual skip lines (right side, into ⊕ from the right). mHC replaces the single skip
    // with a 4-line stream bundle + mixing chip; AttnRes gets a snapshot-bank rail.
    const resKind = m.residual && m.residual.kind;
    const skip = (yBranch, yPlusC) => {
      if (resKind === 'mhc') {
        P.push(`<line x1="${cx}" y1="${yBranch}" x2="${skipX + 6}" y2="${yBranch}" stroke="${DIM2}" stroke-width="1.5"/>`);
        for (const o of [-6, -2, 2, 6]) P.push(`<line x1="${skipX + o}" y1="${yBranch}" x2="${skipX + o}" y2="${yPlusC}" stroke="#bc8cff" stroke-width="1.1" opacity="0.9"/>`);
        P.push(`<path d="M ${skipX - 6} ${yPlusC} L ${cx + 19} ${yPlusC}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
        const mid = (yBranch + yPlusC) / 2;
        R(skipX - 14, mid - 9, 28, 18, { fill: '#0d1420', stroke: '#bc8cff', rx: 4, sw: 1.1 });
        T(skipX, mid + 3.5, '×4', { fs: 9.5, fill: '#d2a8ff', fw: 800 });
      } else {
        P.push(`<path d="M ${cx} ${yBranch} L ${skipX} ${yBranch} L ${skipX} ${yPlusC} L ${cx + 19} ${yPlusC}" fill="none" stroke="${DIM2}" stroke-width="1.5" marker-end="url(#au)"/>`);
      }
    };
    const b1 = (yN1 != null ? yN1 + 28 : yAtt + hAtt) + 9;   // on the segment entering attention sublayer
    const b2 = (yN2 != null ? yN2 + 28 : yMoE + hMoE) + 9;   // on the segment entering FFN sublayer
    skip(b1, yPlus1); skip(b2, yPlus2);
    if (resKind === 'attnres') {
      const rlX = skipX + 16;
      P.push(`<line x1="${rlX}" y1="${purpleBot - 10}" x2="${rlX}" y2="${purpleTop + 10}" stroke="#d29922" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.9"/>`);
      for (const yy of [purpleTop + 24, (purpleTop + purpleBot) / 2, purpleBot - 24]) R(rlX - 4, yy - 4, 8, 8, { fill: 'rgba(210,153,34,.25)', stroke: '#d29922', rx: 2, sw: 1 });
      T(rlX, purpleTop - 6, 'bank', { fs: 8.5, fill: '#e3b341', fw: 700 });
    }

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
    // residual-stream callout (mHC / AttnRes / DeepNorm) in the left gutter — the exploded
    // panel carries the detail, this flags the deviation next to the block itself
    if (m.residual && m.residual.note) {
      const ls = wrap(esc(m.residual.note), 134, 10.5);
      TL(118, yAtt - 30 - ls.length * 13.5, ls, { fs: 10.5, lh: 13.5, an: 'end', fill: '#d2a8ff', fw: 500 });
      dot(122, yAtt - 32, cx + 160, yPlus1 + 2);
    }
    // attention-pattern callout for hybrid/sparse/linear (left, above RoPE; right-aligned so
    // lines never cross the container border; honest ellipsis when truncated). Suppressed when
    // exploded attention panels carry the full detail.
    if (!m.attn_modules && !(m.residual && m.residual.note) && ['hybrid', 'sparse', 'linear', 'MMDiT'].includes(m.attention) && m.attention_detail) {
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

    // ============ ATTENTION MODULE PANELS ============
    // Exploded per-mechanism internals (MLA latents, CSA/HCA compressed-sparse stacks, DSA
    // lightning indexer, delta-rule linear attention, MSA block-sparse, sliding/chunk/full
    // spans, MMDiT joint attention) plus residual-stream panels (mHC, AttnRes). Data comes
    // from attn_modules / residual in research/arch-details.json — every number verified
    // against HF configs and tech reports. Templates draw a dashed panel at (RX, y) of
    // width RW and return the consumed height; data flows bottom-up like the main stack.
    const panel = (y, h, stroke) => R(RX, y, RW, h, { fill: '#10161f', stroke: stroke || '#4a5568', rx: 14, dash: '6 5' });
    const pbox = (x, y, w, h, l1, l2, o = {}) => { R(x, y, w, h, o); if (l2) { T(x + w / 2, y + h / 2 - 1.5, l1, { fs: o.fs1 || 11, fill: o.c1 || FG }); T(x + w / 2, y + h / 2 + 11, l2, { fs: 8.8, fill: o.c2 || DIM, fw: 500 }); } else T(x + w / 2, y + h / 2 + 3.8, l1, { fs: o.fs1 || 11, fill: o.c1 || FG }); };
    const cacheTag = (x, y, s) => { const lb = s || 'cache'; const w = estW(lb, 8.5) + 10; R(x, y, w, 13, { fill: 'rgba(210,153,34,.16)', stroke: '#d29922', rx: 6.5, sw: 1 }); T(x + w / 2, y + 10, lb, { fs: 8.5, fill: '#e3b341', fw: 800 }); };
    const aline = (x1, y1, x2, y2) => P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
    const apath = (d) => P.push(`<path d="${d}" fill="none" stroke="${DIM2}" stroke-width="1.4" marker-end="url(#au)"/>`);
    // feed several box bottoms from a source label below them: a plain horizontal bus, then
    // one UPWARD arrow into each box bottom (data flows up, so arrowheads point into the boxes).
    const feedUp = (srcX, srcTopY, targets) => {
      const xs = targets.map(t => t.x);
      const busY = srcTopY - 8, lo = Math.min(srcX, ...xs), hi = Math.max(srcX, ...xs);
      P.push(`<line x1="${lo}" y1="${busY}" x2="${hi}" y2="${busY}" stroke="${DIM2}" stroke-width="1.4"/>`);
      if (srcTopY - busY > 1) P.push(`<line x1="${srcX}" y1="${srcTopY}" x2="${srcX}" y2="${busY}" stroke="${DIM2}" stroke-width="1.4"/>`);
      for (const t of targets) up(t.x, busY, t.bottom - 8);
    };
    // recurrent-state self-loop whose arrowhead curls back INTO the box's top-right corner
    const selfLoop = (x, y) => P.push(`<path d="M ${x - 4} ${y} q 20 -4 20 -16 q 0 -12 -14 -12" fill="none" stroke="#39c5cf" stroke-width="1.5" marker-end="url(#au)"/>`);
    const chipsRow = (x0, y, items) => { let x = x0; for (let s of items) { while (estW(s, 9.5) + 14 > RW - 8 && s.length > 8) s = s.replace(/\s*\S+\s*…?$/, '') + ' …'; const w = estW(s, 9.5) + 14; if (x + w > RX + RW && x > x0) { x = x0; y += 21; } R(x, y, w, 17, { fill: '#0d1420', stroke: LINE, rx: 8.5, sw: 1 }); T(x + w / 2, y + 12, esc(s), { fs: 9.5, fill: DIM, fw: 600 }); x += w + 8; } return y + 24; };
    const caption = (y, s, col) => { const ls = wrap(esc(s), RW - 20, 10.5); TL(RX + 10, y + 16, ls, { fs: 10.5, lh: 14, an: 'start', fill: col || '#e3b341', fw: 600 }); return ls.length * 14 + 10; };
    const tokStrip = (x, y, w, mode, opts = {}) => {
      const n = 22, cw = w / n;
      R(x, y, w, 16, { fill: '#0d1420', stroke: LINE, rx: 4, sw: 1 });
      const att = mode === 'full' ? n : Math.max(2, Math.round(n * (opts.frac || 0.3)));
      const start = n - att;
      for (let i = 0; i < n; i++) {
        const cur = i === n - 1, on = i >= start;
        P.push(`<rect x="${(x + i * cw + 1).toFixed(1)}" y="${y + 2.5}" width="${(cw - 2).toFixed(1)}" height="11" rx="1.5" fill="${cur ? '#6cb2ff' : on ? (mode === 'full' ? '#3fb950' : '#f0883e') : '#242b3d'}" opacity="${cur ? 1 : on ? 0.9 : 0.6}"/>`);
      }
      if (mode === 'chunk') P.push(`<line x1="${(x + start * cw).toFixed(1)}" y1="${y - 3}" x2="${(x + start * cw).toFixed(1)}" y2="${y + 19}" stroke="#f778ba" stroke-width="1.6"/>`);
      if (opts.sink) { P.push(`<rect x="${x - 15}" y="${y + 2.5}" width="${(cw - 2).toFixed(1)}" height="11" rx="1.5" fill="#bc8cff"/>`); T(x - 15 + cw / 2 - 1, y - 3.5, 'sink', { fs: 7.5, fill: '#d2a8ff', fw: 700 }); }
    };

    // --- GQA / MQA / MHA: query-head grouping over shared K/V heads ---
    const tplGQA = (p, y0) => {
      const hP = p.gate ? 296 : 272;
      panel(y0, hP);
      const g = p.nkv ? Math.round(p.nq / p.nkv) : 1;
      const x1 = RX + 18, x2 = RX + 156, x3 = RX + 294, bw = 124;
      const c1 = x1 + bw / 2, c2 = x2 + bw / 2, c3 = x3 + bw / 2;
      const inY = y0 + hP - 14, brY = inY - 16, pjY = inY - 72;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      apath(`M ${cxA} ${inY - 10} L ${cxA} ${brY} L ${c1} ${brY} L ${c1} ${pjY + 46}`);
      aline(cxA, brY, cxA, pjY + 46);
      apath(`M ${cxA} ${brY} L ${c3} ${brY} L ${c3} ${pjY + 46}`);
      pbox(x1, pjY, bw, 40, 'W_Q', `${num(p.nq)} heads × ${num(p.dh)}`);
      pbox(x2, pjY, bw, 40, 'W_K', `${num(p.nkv)} heads × ${num(p.dh)}`);
      pbox(x3, pjY, bw, 40, 'W_V', `${num(p.nkv)} heads × ${num(p.dh)}`);
      cacheTag(x2 + bw - 46, pjY - 6); cacheTag(x3 + bw - 46, pjY - 6);
      const coreY = p.gate ? y0 + 122 : y0 + 96, cc = x1 + 131;
      aline(c1, pjY, c1, coreY + 52); aline(c2, pjY, c2, coreY + 52);
      // W_V steps left into the gutter (x=RX+288) so its vertical run misses the head-group inset
      apath(`M ${c3} ${pjY} L ${c3} ${pjY + 12} L ${RX + 288} ${pjY + 12} L ${RX + 288} ${coreY + 23} L ${x1 + 260} ${coreY + 23}`);
      if (p.rope) T((c1 + c2) / 2, coreY + 63, esc(p.rope), { fs: 8.5, fill: '#79b8ff', fw: 700 });
      if (p.qknorm) T((c1 + c2) / 2, coreY + 75, esc(p.qknorm), { fs: 8.2, fill: '#7ee787', fw: 600 });
      pbox(x1, coreY, 262, 46, `softmax(QKᵀ / √${esc(String(p.scale || p.dh))}) · V`, g > 1 ? `${num(g)} query heads share each K/V head` : 'every head has its own K / V', { fill: '#242b3d', stroke: aColor });
      // head-group inset
      const ix = RX + 300, iy = coreY - 4;
      if (g > 1) {
        const qn = Math.min(g, 6), qs = 15;
        const qw = qn * qs + (g > 6 ? 14 : 0), qx = ix + (132 - qw) / 2;
        T(ix + 66, iy - 8, `${num(g)} Q heads`, { fs: 8.8, fill: DIM, fw: 600 });
        for (let i = 0; i < qn; i++) R(qx + i * qs, iy, 11, 11, { fill: 'rgba(63,185,80,.15)', stroke: '#3fb950', rx: 2, sw: 1 });
        if (g > 6) T(qx + qn * qs + 7, iy + 9, '…', { fs: 10, fill: DIM });
        aline(ix + 66, iy + 16, ix + 66, iy + 24);
        R(ix + 53, iy + 30, 11, 11, { fill: 'rgba(210,153,34,.2)', stroke: '#d29922', rx: 2, sw: 1 });
        R(ix + 68, iy + 30, 11, 11, { fill: 'rgba(210,153,34,.2)', stroke: '#d29922', rx: 2, sw: 1 });
        T(ix + 66, iy + 56, 'share 1 K/V pair', { fs: 8.8, fill: DIM, fw: 500 });
        T(ix + 66, iy + 69, `× ${num(p.nkv)} groups`, { fs: 8.8, fill: '#e3b341', fw: 700 });
      }
      const woY = y0 + 30;
      if (p.gate) { otimes(cc, y0 + 92); T(cc + 16, y0 + 96, esc(p.gate), { fs: 8.8, an: 'start', fill: '#7ee787', fw: 600 }); aline(cc, coreY, cc, y0 + 110); aline(cc, y0 + 82, cc, woY + 42); }
      else aline(cc, coreY, cc, woY + 42);
      pbox(cc - 100, woY, 200, 34, 'concat → W_O', `${num(p.nq)}·${num(p.dh)} → ${num(fmtNum(p.d))}`);
      return hP + (p.cache ? caption(y0 + hP, `KV cache: ${p.cache}`) : 0);
    };

    // --- MLA: low-rank latent compression with decoupled RoPE ---
    const tplMLA = (p, y0) => {
      const hP = p.gate ? 398 : 372, dTot = (p.nope || 128) + (p.rope || 64);
      panel(y0, hP);
      const inY = y0 + hP - 14;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      const rA = y0 + hP - 72, rB = y0 + hP - 134, rC = y0 + hP - 196;
      // lower row: query down-proj + fused kv projection
      if (p.qlora) pbox(RX + 18, rA, 150, 40, 'W_DQ → c_Q', `rank ${num(fmtNum(p.qlora))} · RMSNorm`);
      else pbox(RX + 18, rA, 150, 40, 'W_Q (full-rank)', 'no c_Q latent (V2-Lite style)');
      pbox(RX + 188, rA, 170, 40, 'kv_a_proj (fused)', `${num(fmtNum(p.d))} → ${num(p.kvlora + p.rope)}`);
      feedUp(cxA, inY - 12, [{ x: RX + 93, bottom: rA + 40 }, { x: RX + 273, bottom: rA + 40 }]);
      // latent row
      pbox(RX + 18, rB, 150, 44, p.qlora ? 'W_UQ' : 'split heads', `→ ${num(p.nh)} heads × ${num(dTot)}`);
      pbox(RX + 188, rB, 118, 44, `c_KV (${num(p.kvlora)})`, 'RMSNorm', { stroke: '#d29922' });
      pbox(RX + 320, rB, 100, 44, `k_R (${num(p.rope)})`, p.nope_mode ? 'unrotated slot' : 'RoPE · shared', { stroke: '#d29922' });
      cacheTag(RX + 252, rB - 6); cacheTag(RX + 376, rB - 6);
      aline(RX + 93, rA, RX + 93, rB + 50);
      aline(RX + 247, rA, RX + 247, rB + 50);
      apath(`M ${RX + 313} ${rA + 8} L ${RX + 370} ${rA + 8} L ${RX + 370} ${rB + 50}`);
      // heads row
      pbox(RX + 6, rC, 108, 40, `q_nope ${num(p.nope)}`, `${num(p.nh)} heads`);
      pbox(RX + 126, rC, 92, 40, `q_rope ${num(p.rope)}`, p.nope_mode ? 'NoPE' : 'RoPE', { c2: p.nope_mode ? '#f778ba' : '#79b8ff' });
      pbox(RX + 228, rC, 108, 40, 'W_UK → k_nope', `${num(p.nh)} × ${num(p.nope)}`);
      pbox(RX + 348, rC, 84, 40, 'W_UV → v', `${num(p.nh)} × ${num(p.v)}`);
      apath(`M ${RX + 73} ${rB} L ${RX + 60} ${rB - 8} L ${RX + 60} ${rC + 46}`);
      apath(`M ${RX + 113} ${rB} L ${RX + 172} ${rB - 8} L ${RX + 172} ${rC + 46}`);
      aline(RX + 268, rB, RX + 282, rC + 46);
      apath(`M ${RX + 296} ${rB} L ${RX + 390} ${rB - 8} L ${RX + 390} ${rC + 46}`);
      // score + softmax
      const sY = p.gate ? y0 + 138 : y0 + 112;
      pbox(RX + 38, sY, 356, 44, 'score = q_nope·k_nope + q_rope·k_R', `softmax( · / √${num(dTot)}${p.yarn ? ` × ${esc(p.yarn)}` : ''}) → Σ · v`, { fill: '#242b3d', stroke: aColor });
      for (const xx of [RX + 60, RX + 172, RX + 282, RX + 390]) aline(xx, rC, xx, sY + 50);
      const woY = y0 + 30;
      if (p.gate) { otimes(cxA, y0 + 104); T(cxA + 16, y0 + 108, esc(p.gate), { fs: 8.8, an: 'start', fill: '#7ee787', fw: 600 }); aline(cxA, sY, cxA, y0 + 122); aline(cxA, y0 + 94, cxA, woY + 42); }
      else aline(cxA, sY, cxA, woY + 42);
      pbox(cxA - 125, woY, 250, 34, `concat ${num(p.nh)}·${num(p.v)} → W_O`, `→ ${num(fmtNum(p.d))}`);
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- delta-rule / linear attention (Gated DeltaNet, KDA, Lightning) ---
    const tplDelta = (p, y0) => {
      const hasConv = !!p.conv, hP = hasConv ? 330 : 296;
      panel(y0, hP);
      const inY = y0 + hP - 14;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      const prY = y0 + hP - 68;
      pbox(cxA - 160, prY, 320, 40, esc(p.proj || 'in_proj → q | k | v | z'), esc(p.projSub || ''));
      feedUp(cxA, inY - 12, [{ x: cxA, bottom: prY + 40 }]);
      let qy = y0 + hP - 124, fanSrcTop;
      if (hasConv) {
        pbox(cxA - 140, qy, 280, 38, `depthwise causal conv (k=${num(p.conv)}) + SiLU`, null, { fs1: 10.5 });
        aline(cxA, prY, cxA, qy + 44);   // in_proj → conv
        fanSrcTop = qy;                  // conv box top feeds q/k/v above it
        qy = y0 + hP - 180;
      } else {
        fanSrcTop = prY;                 // in_proj box top feeds q/k/v directly
      }
      // fan out to q, k, v with UPWARD arrows into the box bottoms (bottom-up dataflow)
      feedUp(cxA, fanSrcTop, [{ x: RX + 74, bottom: qy + 40 }, { x: cxA, bottom: qy + 40 }, { x: RX + 354, bottom: qy + 40 }]);
      pbox(RX + 10, qy, 128, 40, `q ${num(p.kh)}×${num(p.dh)}`, esc(p.qsub || 'L2 norm'));
      pbox(RX + 150, qy, 128, 40, `k ${num(p.kh)}×${num(p.dh)}`, esc(p.qsub || 'L2 norm'));
      pbox(RX + 290, qy, 128, 40, `v ${num(p.vh)}×${num(p.dh)}`, esc(p.vsub || ''));
      // recurrent state (teal) with self-loop
      const stY = y0 + 64;
      pbox(RX + 184, stY, 236, 54, `S — ${num(p.vh)} × ${num(p.dh)} × ${num(p.dh)}`, esc(p.update || ''), { stroke: '#39c5cf', c1: '#39c5cf' });
      selfLoop(RX + 414, stY);
      pbox(RX + 12, stY, 158, 40, esc(p.decayName || 'decay'), esc(p.decaySub || ''), { c1: '#39c5cf', fs1: 10 });
      if (p.beta) { T(RX + 91, stY + 54, esc(p.beta), { fs: 8.8, fill: DIM, fw: 600 }); }
      aline(RX + 170, stY + 20, RX + 180, stY + 20);
      for (const xx of [RX + 214, RX + 302, RX + 354]) aline(xx, qy, xx, stY + 60);
      // gated output; q feeds the readout o = qᵀS via the left corridor
      const woY = y0 + 14;
      pbox(cxA - 160, woY, 320, 38, esc(p.out || 'o = qᵀS → RMSNorm ⊗ gate'), esc(p.outSub || '→ o_proj'), { fs1: 10.5 });
      aline(RX + 302, stY, RX + 302, woY + 44);
      apath(`M ${RX + 74} ${qy} L ${RX + 74} ${qy - 8} L ${RX + 6} ${qy - 8} L ${RX + 6} ${woY + 19} L ${cxA - 164} ${woY + 19}`);
      return hP + (p.cacheline ? caption(y0 + hP, p.cacheline) : 0);
    };

    // --- DSA lightning indexer (token top-k for MLA) ---
    const tplDSA = (p, y0) => {
      const hP = p.share ? 344 : 272;
      panel(y0, hP, '#f0883e');
      const inY = y0 + hP - 14;
      T(RX + 300, inY, 'h', { fs: 10.5, fill: DIM, fw: 600 });
      T(RX + 90, inY, 'c_Q (MLA query latent)', { fs: 9.5, fill: DIM, fw: 600 });
      const rA = y0 + hP - 66;
      pbox(RX + 10, rA, 140, 40, 'wq_b → q^I', `${num(p.iheads)} × ${num(p.idim)}`);
      pbox(RX + 164, rA, 150, 40, `wk → ${esc(p.keynorm || 'LN')} → k^I`, `${num(p.idim)} — 1 shared / token`);
      pbox(RX + 328, rA, 100, 40, `w (${num(p.iheads)})`, 'head weights');
      cacheTag(RX + 268, rA - 6);
      feedUp(RX + 90, inY - 12, [{ x: RX + 80, bottom: rA + 40 }]);
      feedUp(RX + 300, inY - 12, [{ x: RX + 239, bottom: rA + 40 }, { x: RX + 378, bottom: rA + 40 }]);
      const sY = y0 + hP - 128;
      pbox(RX + 48, sY, 340, 44, 'I(t,s) = Σ_h w_h · ReLU( q^I_h · k^I_s )', esc(p.note || ''), { fill: '#242b3d', stroke: '#f0883e', c1: '#f0883e' });
      for (const xx of [RX + 90, RX + 239, RX + 378]) aline(xx, rA, xx, sY + 50);
      const tY = y0 + hP - 186;
      pbox(cxA - 95, tY, 190, 40, `top-${num(fmtNum(p.topk))} tokens`, 'per query', { stroke: '#f0883e', c1: '#f0883e' });
      aline(cxA, sY, cxA, tY + 46);
      aline(cxA, tY, cxA, tY - 22);
      T(cxA, tY - 32, 'mask → MLA attends only the selected latents', { fs: 10, fill: '#f0883e', fw: 700 });
      if (p.share) {
        const ticksY = y0 + 42, tx = RX + 60, tw = 316, nL = p.share.total || 78;
        T(RX + 14, y0 + 26, `IndexShare: ${num(p.share.full)} indexer layers, ${num(p.share.shared)} reuse the last top-k`, { fs: 10.5, an: 'start', fill: '#e3b341', fw: 700 });
        R(tx, ticksY, tw, 13, { fill: '#0d1420', stroke: LINE, rx: 4, sw: 1 });
        const fullSet = new Set(p.share.layers || []);
        for (let i = 0; i < nL; i++) {
          const on = fullSet.has(i);
          P.push(`<rect x="${(tx + i * tw / nL + 0.3).toFixed(1)}" y="${ticksY + 2}" width="${(tw / nL - 0.6).toFixed(2)}" height="9" rx="1" fill="${on ? '#f0883e' : '#242b3d'}" opacity="${on ? 0.95 : 0.7}"/>`);
        }
        T(tx, ticksY + 26, 'orange = indexer layers · others reuse the nearest one to their left', { fs: 8.5, an: 'start', fill: DIM2, fw: 500 });
      }
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- CSA: compressed KV + lightning indexer + sliding window over a shared K=V MQA backbone ---
    const tplCSA = (p, y0) => {
      const hP = 440;
      panel(y0, hP, '#f0883e');
      const inY = y0 + hP - 12;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      const rA = y0 + hP - 66, rB = y0 + hP - 128, rC = y0 + hP - 192;
      pbox(RX + 18, rA, 180, 40, `W_DQ → c_Q (${num(fmtNum(p.qlora))})`, 'query latent — also feeds indexer');
      pbox(RX + 218, rA, 190, 40, 'W_KVᵃ·ᵇ → K=V (512)', 'MQA — single shared head');
      feedUp(cxA, inY - 10, [{ x: RX + 108, bottom: rA + 40 }, { x: RX + 313, bottom: rA + 40 }]);
      pbox(RX + 18, rB, 180, 44, 'Lightning Indexer', `Σ w·ReLU(q^I·k^I) — k^I compressed`, { stroke: '#f0883e', c1: '#f0883e' });
      cacheTag(RX + 148, rB - 6, 'idx cache');
      pbox(RX + 218, rB, 190, 44, `compress ${num(p.m)}:1 overlapped`, 'learned softmax-pool × 2 series');
      aline(RX + 108, rA, RX + 108, rB + 50); aline(RX + 313, rA, RX + 313, rB + 50);
      pbox(RX + 18, rC, 180, 44, `W_UQ → Q ${num(p.nh)} × 512`, 'partial RoPE — last 64 of 512');
      pbox(RX + 218, rC, 190, 44, `C_comp — n/${num(p.m)} × 512`, 'compressed K=V entries', { stroke: '#d29922' });
      cacheTag(RX + 358, rC - 6);
      apath(`M ${RX + 18} ${rA + 8} L ${RX + 8} ${rA + 8} L ${RX + 8} ${rC + 22} L ${RX + 14} ${rC + 22}`);
      aline(RX + 313, rB, RX + 313, rC + 50);
      // sliding-window ring, fed from the raw K=V path up a clear right-margin lane
      const wY = y0 + hP - 242;
      pbox(RX + 300, wY, 118, 36, 'raw window', `last ${num(p.win)} K=V`, { stroke: '#d29922', fs1: 10.5 });
      cacheTag(RX + 380, wY - 6, 'ring');
      apath(`M ${RX + 408} ${rA} L ${RX + 408} ${rA - 10} L ${RX + 428} ${rA - 10} L ${RX + 428} ${wY + 18} L ${RX + 418} ${wY + 18}`);
      // core
      const coreY = y0 + 140;
      pbox(RX + 20, coreY, 396, 50, `MQA softmax over [ top-${num(fmtNum(p.topk))} C_comp ∪ ${num(p.win)}-token window ]`, '+ learnable per-head sink logit in denominator', { fill: '#242b3d', stroke: '#f0883e', c1: '#f0883e', fs1: 10.8 });
      apath(`M ${RX + 198} ${rB + 22} L ${RX + 208} ${rB + 22} L ${RX + 208} ${coreY + 56}`);
      T(RX + 216, rC + 58, 'select', { fs: 8.5, an: 'start', fill: '#f0883e', fw: 700 });
      aline(RX + 108, rC, RX + 108, coreY + 56);
      aline(RX + 290, rC, RX + 290, coreY + 56);
      aline(RX + 359, wY, RX + 359, coreY + 56);
      // output
      const woY = y0 + 30;
      pbox(cxA - 170, woY, 340, 44, 'RoPE(−i) → grouped W_O', `${num(p.og)} groups × (8·512 → ${num(fmtNum(p.olora))}) → ${num(fmtNum(p.d))}`);
      aline(cxA, coreY, cxA, woY + 50);
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- HCA: heavy 128:1 compression, dense over all compressed entries, no indexer ---
    const tplHCA = (p, y0) => {
      const hP = 396;
      panel(y0, hP, '#f778ba');
      const inY = y0 + hP - 12;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      const rA = y0 + hP - 66, rB = y0 + hP - 128, rC = y0 + hP - 190;
      pbox(RX + 18, rA, 180, 40, `W_DQ → c_Q (${num(fmtNum(p.qlora))})`, 'same query path as CSA');
      pbox(RX + 218, rA, 190, 40, 'W_KV → K=V (512)', 'MQA — single shared head');
      feedUp(cxA, inY - 10, [{ x: RX + 108, bottom: rA + 40 }, { x: RX + 313, bottom: rA + 40 }]);
      pbox(RX + 18, rB, 180, 44, `W_UQ → Q ${num(p.nh)} × 512`, 'partial RoPE — last 64 of 512');
      pbox(RX + 218, rB, 190, 44, `compress ${num(p.m)}:1`, 'non-overlapped · learned softmax-pool');
      aline(RX + 108, rA, RX + 108, rB + 50); aline(RX + 313, rA, RX + 313, rB + 50);
      pbox(RX + 218, rC, 190, 44, `C_comp — n/${num(p.m)} × 512`, '~4 dims / token amortized', { stroke: '#d29922' });
      cacheTag(RX + 358, rC - 6);
      aline(RX + 313, rB, RX + 313, rC + 50);
      const wY = y0 + hP - 242;
      pbox(RX + 300, wY, 118, 36, 'raw window', `last ${num(p.win)} K=V`, { stroke: '#d29922', fs1: 10.5 });
      cacheTag(RX + 380, wY - 6, 'ring');
      apath(`M ${RX + 408} ${rA} L ${RX + 408} ${rA - 10} L ${RX + 428} ${rA - 10} L ${RX + 428} ${wY + 18} L ${RX + 418} ${wY + 18}`);
      const coreY = y0 + 88;
      pbox(RX + 20, coreY, 396, 50, `dense MQA over [ ALL C_comp (n/${num(p.m)}) ∪ ${num(p.win)}-token window ]`, 'no indexer, no top-k · + per-head sink', { fill: '#242b3d', stroke: '#f778ba', c1: '#f778ba', fs1: 10.8 });
      aline(RX + 108, rB, RX + 108, coreY + 56);
      aline(RX + 290, rC, RX + 290, coreY + 56);
      aline(RX + 359, wY, RX + 359, coreY + 56);
      const woY = y0 + 26;
      pbox(cxA - 170, woY, 340, 40, 'RoPE(−i) → grouped W_O', `${num(p.og)} groups × (8·512 → ${num(fmtNum(p.olora))}) → ${num(fmtNum(p.d))}`, { fs1: 10.5 });
      aline(cxA, coreY, cxA, woY + 46);
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- MSA: block-sparse top-k with index heads (MiniMax M3) ---
    const tplMSA = (p, y0) => {
      const hP = 372;
      panel(y0, hP, '#f0883e');
      const inY = y0 + hP - 14;
      T(cxA, inY, `h (${num(fmtNum(p.d))})`, { fs: 10.5, fill: DIM, fw: 600 });
      const rA = y0 + hP - 76;
      pbox(RX + 10, rA, 200, 44, `W_Q ${num(p.nq)}×${num(p.dh)} · W_K/V ${num(p.nkv)}×${num(p.dh)}`, esc(p.qsub || 'per-head QK-norm · RoPE first 64'), { fs1: 10 });
      cacheTag(RX + 130, rA - 6, 'full KV cache');
      pbox(RX + 226, rA, 202, 44, `q_idx ${num(p.iheads)}×${num(p.idim)} · k_idx 1×${num(p.idim)}`, 'same norm + RoPE', { fs1: 10, stroke: '#f0883e' });
      cacheTag(RX + 366, rA - 6, 'idx keys');
      apath(`M ${cxA} ${inY - 12} L ${cxA} ${inY - 18} L ${RX + 110} ${inY - 18} L ${RX + 110} ${rA + 50}`);
      apath(`M ${cxA} ${inY - 18} L ${RX + 327} ${inY - 18} L ${RX + 327} ${rA + 50}`);
      const sY = y0 + hP - 136;
      pbox(RX + 226, sY, 202, 40, 'scores (fp32, causal)', `max-pool per ${num(p.block)}-token block`, { fs1: 10 });
      aline(RX + 327, rA, RX + 327, sY + 46);
      // block strip: 16 blocks, top-k orange, local green
      const bx = RX + 226, bw2 = 202, by = sY - 26, nB = 16;
      R(bx, by, bw2, 16, { fill: '#0d1420', stroke: LINE, rx: 4, sw: 1 });
      const sel = new Set([2, 7, 11, 14]);
      for (let i = 0; i < nB; i++) {
        const cw = bw2 / nB, on = sel.has(i), loc = i === nB - 1;
        P.push(`<rect x="${(bx + i * cw + 1).toFixed(1)}" y="${by + 2.5}" width="${(cw - 2).toFixed(1)}" height="11" rx="1.5" fill="${loc ? '#3fb950' : on ? '#f0883e' : '#242b3d'}" opacity="${on || loc ? 0.95 : 0.65}"/>`);
      }
      T(bx + bw2 + 4, by + 12, 'local', { fs: 7.5, an: 'start', fill: '#7ee787', fw: 700 });
      const tY = y0 + 150;
      pbox(RX + 226, tY, 202, 44, `top-${num(p.topk)} blocks / group`, `+ local always · ≤ ${num(fmtNum(p.budget))} tokens`, { stroke: '#f0883e', c1: '#f0883e', fs1: 10.5 });
      aline(RX + 327, by, RX + 327, tY + 50);
      const coreY = y0 + 88;
      pbox(RX + 18, coreY, 400, 48, `GQA softmax — ${num(p.nq)} Q / ${num(p.nkv)} KV over selected blocks`, 'each group of 16 Q heads shares its block selection', { fill: '#242b3d', stroke: '#f0883e', c1: '#f0883e', fs1: 10.8 });
      aline(RX + 110, rA, RX + 110, coreY + 54);
      aline(RX + 327, tY, RX + 327, coreY + 54);
      const woY = y0 + 28;
      pbox(cxA - 110, woY, 220, 34, 'concat → W_O', `${num(p.nq)}·${num(p.dh)} → ${num(fmtNum(p.d))}`);
      aline(cxA, coreY, cxA, woY + 40);
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- sliding / chunked / full attention spans (windowed hybrids) ---
    const tplSWA = (p, y0) => {
      const rows = p.variants || [];
      const common = p.common || [];
      // measure how many rows the common chips wrap into so the panel + cache footnote clear them
      let measRows = common.length ? 1 : 0, mx = RX + 16;
      for (let s of common) {
        while (estW(s, 9.5) + 14 > RW - 8 && s.length > 8) s = s.replace(/\s*\S+\s*…?$/, '') + ' …';
        const w = estW(s, 9.5) + 14;
        if (mx + w > RX + RW && mx > RX + 16) { measRows++; mx = RX + 16; }
        mx += w + 8;
      }
      const chipsH = measRows ? measRows * 21 + 8 : 0;
      const hP = 20 + rows.length * 68 + chipsH;
      panel(y0, hP);
      rows.forEach((v, i) => {
        const yv = y0 + 18 + i * 68;
        tokStrip(RX + 24, yv + 12, 196, v.span, { frac: v.frac, sink: !!p.sink });
        if (v.spanLabel) T(RX + 122, yv + 44, esc(v.spanLabel), { fs: 8.5, fill: DIM2, fw: 500 });
        T(RX + 246, yv + 14, `${num(v.n)}× ${esc(v.name)}`, { fs: 11.5, an: 'start', fill: attnColor(v.type || 'sliding'), fw: 700 });
        if (v.sub1) T(RX + 246, yv + 29, esc(v.sub1), { fs: 9, an: 'start', fill: DIM, fw: 500 });
        if (v.sub2) T(RX + 246, yv + 41, esc(v.sub2), { fs: 9, an: 'start', fill: DIM, fw: 500 });
        if (v.sub3) T(RX + 246, yv + 53, esc(v.sub3), { fs: 9, an: 'start', fill: DIM, fw: 500 });
      });
      if (common.length) chipsRow(RX + 16, y0 + 18 + rows.length * 68, common);
      return hP + (p.cache ? caption(y0 + hP, p.cache) : 0);
    };

    // --- MMDiT: two streams, joint attention ---
    const tplMMDiT = (p, y0) => {
      const hP = 392;
      panel(y0, hP, '#f778ba');
      const tc = RX + 113, ic = RX + 323; // stream centers
      T(cxA, y0 + hP - 12, esc(p.cond || 'timestep emb + pooled text → SiLU · Linear → mods'), { fs: 9.5, fill: DIM, fw: 600 });
      T(tc, y0 + hP - 34, 'text tokens (L_t × d)', { fs: 9.5, fill: '#d2a8ff', fw: 600 });
      T(ic, y0 + hP - 34, 'image patches (L_i × d)', { fs: 9.5, fill: '#79b8ff', fw: 600 });
      const mY = y0 + hP - 96;
      pbox(tc - 90, mY, 180, 40, `AdaLN mod ×${num(p.mods)}`, 'separate weights per stream');
      pbox(ic - 90, mY, 180, 40, `AdaLN mod ×${num(p.mods)}`, 'shift · scale · gate');
      up(tc, y0 + hP - 44, mY + 32); up(ic, y0 + hP - 44, mY + 32);
      const qY = y0 + hP - 152;
      pbox(tc - 90, qY, 180, 40, `QKV ${num(fmtNum(p.d))} → ${num(fmtNum(3 * p.d))}`, '+bias · QK-RMSNorm per head', { fs1: 10.5 });
      pbox(ic - 90, qY, 180, 40, `QKV ${num(fmtNum(p.d))} → ${num(fmtNum(3 * p.d))}`, '+bias · QK-RMSNorm per head', { fs1: 10.5 });
      aline(tc, mY, tc, qY + 46); aline(ic, mY, ic, qY + 46);
      const jY = y0 + 168;
      pbox(RX + 20, jY, 396, 48, `joint bidirectional SDPA — concat [ text ; image ]`, esc(p.pos || ''), { fill: '#242b3d', stroke: '#f778ba', c1: '#f778ba' });
      aline(tc, qY, tc, jY + 54); aline(ic, qY, ic, jY + 54);
      const oY = y0 + 104;
      pbox(tc - 80, oY, 160, 36, 'split → proj ⊗ gate', '+ residual', { fs1: 10 });
      pbox(ic - 80, oY, 160, 36, 'split → proj ⊗ gate', '+ residual', { fs1: 10 });
      aline(tc, jY, tc, oY + 42); aline(ic, jY, ic, oY + 42);
      const fY = y0 + 48;
      pbox(tc - 80, fY, 160, 36, 'MLP ×4 ⊗ gate', esc(p.mlpact || 'GELU(tanh)'), { fs1: 10 });
      pbox(ic - 80, fY, 160, 36, 'MLP ×4 ⊗ gate', esc(p.mlpact || 'GELU(tanh)'), { fs1: 10 });
      aline(tc, oY, tc, fY + 42); aline(ic, oY, ic, fY + 42);
      return hP + (p.cap ? caption(y0 + hP, p.cap, DIM) : 0);
    };

    // --- FLUX single-stream parallel block ---
    const tplSStream = (p, y0) => {
      const hP = 280;
      panel(y0, hP, '#f778ba');
      T(cxA, y0 + hP - 14, `x = [ text ; image ] — one stream (L × ${num(fmtNum(p.d))})`, { fs: 10, fill: DIM, fw: 600 });
      const lY = y0 + hP - 66;
      pbox(cxA - 110, lY, 220, 34, 'LN · AdaLN mod ×3', null, { fs1: 10.5 });
      aline(cxA, y0 + hP - 20, cxA, lY + 40);
      const l1Y = y0 + hP - 116;
      pbox(cxA - 130, l1Y, 260, 38, `linear1 ${num(fmtNum(p.d))} → ${num(fmtNum(p.l1))}`, `fused qkv ${num(fmtNum(p.qkv))} + mlp ${num(fmtNum(p.mlp))}`, { fs1: 10.5 });
      aline(cxA, lY, cxA, l1Y + 44);
      const pY = y0 + 96;
      pbox(RX + 14, pY, 196, 44, 'QK-norm → RoPE → SDPA', `${num(p.nh)} heads × ${num(p.dh)}`, { fs1: 10.5 });
      pbox(RX + 226, pY, 196, 44, `GELU(tanh)`, `mlp ${num(fmtNum(p.mlp))}`, { fs1: 10.5 });
      apath(`M ${cxA - 60} ${l1Y} L ${RX + 112} ${l1Y - 8} L ${RX + 112} ${pY + 50}`);
      apath(`M ${cxA + 60} ${l1Y} L ${RX + 324} ${l1Y - 8} L ${RX + 324} ${pY + 50}`);
      const cY = y0 + 34;
      pbox(cxA - 150, cY, 300, 40, `concat ${num(fmtNum(p.l1 - p.qkv + p.d))} → linear2 → ${num(fmtNum(p.d))}`, '⊗ gate → + residual', { fs1: 10.5 });
      aline(RX + 112, pY, RX + 112, cY + 46); aline(RX + 324, pY, RX + 324, cY + 46);
      return hP + (p.cap ? caption(y0 + hP, p.cap, DIM) : 0);
    };

    // --- mHC: manifold-constrained hyper-connections (residual stream) ---
    const tplMHC = (p, y0) => {
      const hP = 312;
      panel(y0, hP, '#bc8cff');
      const xs = [RX + 88, RX + 144, RX + 200, RX + 256];
      T((xs[0] + xs[3]) / 2, y0 + hP - 12, `x_l ∈ R^{4 × d} — 4 residual streams`, { fs: 10, fill: '#d2a8ff', fw: 600 });
      for (const x of xs) P.push(`<line x1="${x}" y1="${y0 + hP - 26}" x2="${x}" y2="${y0 + 34}" stroke="#bc8cff" stroke-width="1.4" opacity="0.85"/>`);
      T((xs[0] + xs[3]) / 2, y0 + 26, 'x_{l+1}', { fs: 10, fill: '#d2a8ff', fw: 700 });
      // read → sublayer → write column on the right
      const hpY = y0 + 226;
      pbox(RX + 306, hpY, 118, 38, 'H_pre (σ)', '1×4 read → u');
      for (const x of xs) dot(x, hpY + 19, RX + 302, hpY + 19);
      const fY = y0 + 164;
      pbox(RX + 306, fY, 118, 40, 'sublayer F', 'attention / MoE', { fill: '#242b3d', stroke: '#8b5cf6' });
      aline(RX + 365, hpY, RX + 365, fY + 46);
      const hoY = y0 + 102;
      pbox(RX + 306, hoY, 118, 38, 'H_post (2σ)', '4×1 write');
      aline(RX + 365, fY, RX + 365, hoY + 44);
      for (const x of xs) { apath(`M ${RX + 302} ${hoY + 10} L ${x + 5} ${y0 + 86}`); P.push(`<circle cx="${x}" cy="${y0 + 80}" r="6.5" fill="#0d1420" stroke="#bc8cff" stroke-width="1.3"/>`); T(x, y0 + 83.5, '+', { fs: 10, fill: '#d2a8ff' }); }
      // stream-mixing box across the 4 lines
      pbox(RX + 42, y0 + 140, 228, 44, 'H_res 4×4 — doubly-stochastic', `Birkhoff projection · Sinkhorn ×${num(p.sinkhorn)}`, { stroke: '#bc8cff', c1: '#d2a8ff' });
      return hP + caption(y0 + hP, p.cap || 'x_{l+1} = H_res·x_l + H_postᵀ·F(H_pre·x_l) — each mapping = static + input-dynamic part', '#d2a8ff');
    };

    // --- AttnRes: residual-stream snapshot bank + softmax mixing (Kimi K3) ---
    const tplAttnRes = (p, y0) => {
      const hP = 320;
      panel(y0, hP, '#bc8cff');
      const sx = RX + 78;
      T(sx, y0 + hP - 12, `running stream P (${num(fmtNum(p.d))})`, { fs: 9.5, fill: '#d2a8ff', fw: 600 });
      P.push(`<line x1="${sx}" y1="${y0 + hP - 26}" x2="${sx}" y2="${y0 + 36}" stroke="#bc8cff" stroke-width="1.6" opacity="0.9"/>`);
      // reset + accumulate markers
      R(sx - 5, y0 + 258, 10, 10, { fill: '#0d1420', stroke: '#f778ba', rx: 2, sw: 1.3 });
      T(sx + 14, y0 + 252, `restarts every ${num(p.block)} layers`, { fs: 8.5, an: 'start', fill: '#f778ba', fw: 600 });
      for (const [yy, lb] of [[y0 + 216, '+ attn out'], [y0 + 168, '+ MLP out']]) {
        P.push(`<circle cx="${sx}" cy="${yy}" r="8" fill="#0d1420" stroke="${DIM2}" stroke-width="1.4"/>`); T(sx, yy + 3.8, '+', { fs: 11 });
        T(sx + 14, yy + 3.5, lb, { fs: 8.5, an: 'start', fill: DIM, fw: 600 });
      }
      // snapshot bank
      const bx = RX + 330;
      T(bx + 50, y0 + 44, `bank B — ${num(p.snapshots)} snapshots`, { fs: 9.5, fill: '#e3b341', fw: 700 });
      const banks = ['P @ L1', 'P @ L13', 'P @ L25', '⋮', `P @ L${num(85)}`];
      banks.forEach((b, i) => {
        if (b === '⋮') { T(bx + 50, y0 + 66 + i * 26 + 14, '⋮', { fs: 12, fill: DIM }); return; }
        R(bx, y0 + 66 + i * 26, 100, 20, { fill: 'rgba(210,153,34,.1)', stroke: '#d29922', rx: 5, sw: 1.1 });
        T(bx + 50, y0 + 66 + i * 26 + 14, b, { fs: 9, fill: '#e3b341', fw: 600 });
      });
      apath(`M ${sx} ${y0 + 263} L ${bx + 50} ${y0 + 263} L ${bx + 50} ${y0 + 66 + 4 * 26 + 26}`);
      T((sx + bx) / 2 + 20, y0 + 276, `checkpoint: append P to B, reset P`, { fs: 8.5, fill: DIM2, fw: 500 });
      // mix node
      pbox(RX + 128, y0 + 100, 180, 52, 'Mix — 1-head softmax', 'over { B ∪ P } · learned scalar score', { fill: '#242b3d', stroke: '#bc8cff', c1: '#d2a8ff', fs1: 10.5 });
      dot(sx, y0 + 126, RX + 124, y0 + 126);
      dot(bx, y0 + 126, RX + 312, y0 + 126);
      aline(RX + 218, y0 + 100, RX + 218, y0 + 78);
      T(RX + 218, y0 + 66, '→ attention input · MLP input · output head', { fs: 9, fill: '#7ee787', fw: 700 });
      return hP + caption(y0 + hP, p.cap || `2 mix points / layer + output head = ${p.mixes} total · raw P still accumulates sublayer outputs`, '#d2a8ff');
    };

    const ATTN_TPL = { gqa: tplGQA, mla: tplMLA, deltanet: tplDelta, dsaidx: tplDSA, csa: tplCSA, hca: tplHCA, msa: tplMSA, swa: tplSWA, mmdit: tplMMDiT, sstream: tplSStream, mhc: tplMHC, attnres: tplAttnRes };
    if (m.attn_modules && m.attn_modules.length) {
      let firstMid = null;
      for (const mod of m.attn_modules) {
        const tpl = ATTN_TPL[mod.kind]; if (!tpl) continue;
        T(RX, ry, esc(mod.title || mod.kind), { fs: 14.5, an: 'start', fw: 800 });
        ry += 12;
        const h = tpl(mod.p || {}, ry);
        if (firstMid == null) firstMid = ry + Math.min(h, 220) / 2;
        ry += h;
        if (mod.notes && mod.notes.length) { ry += 10; ry = chipsRow(RX + 2, ry, mod.notes); }
        ry += 26;
      }
      if (firstMid != null) dot(cx + 132, yAtt + Math.min(hAtt, 48) / 2, RX - 6, firstMid);
    }

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
      if (m.attn_bullets && m.attn_bullets.length) {
        cy += 8; T(RX, cy, 'Attention / KV-cache notes:', { fs: 13.5, an: 'start', fw: 800, fill: AC }); cy += 20;
        m.attn_bullets.forEach(bullet);
      }
    } else if (!gen) {
      T(RX, cy, 'Inference notes:', { fs: 13.5, an: 'start', fw: 800, fill: AC }); cy += 20;
      const bl = m.attn_bullets ? m.attn_bullets.slice() : [];
      if (!bl.length) {
        if (m.attention === 'MLA') bl.push('MLA compresses K/V into low-rank latents → far smaller KV cache than MHA');
        else if (m.n_kv_heads && m.n_heads && m.n_kv_heads < m.n_heads) {
          bl.push(`${num(m.n_heads)} query heads share ${num(m.n_kv_heads)} KV heads → ${num(Math.round(m.n_heads / m.n_kv_heads) + '×')} smaller KV cache than MHA`);
          if (m.head_dim && m.n_layers) bl.push(`KV cache ≈ ${num(fmtNum(Math.round(2 * m.n_kv_heads * m.head_dim * m.n_layers * 2 / 1024)) + ' KB')} per token (bf16)`);
        } else bl.push('Full multi-head attention: KV cache grows with heads × layers × context');
      }
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
    ['#d29922', '#8a6100'],   // amber strokes (cache tags, MoE experts)
    ['#f0883e', '#a04100'],   // orange mechanism accent (CSA / DSA / MSA / sliding)
    ['#f778ba', '#a21b6f'],   // pink mechanism accent (HCA / MMDiT)
    ['#39c5cf', '#0b6e79'],   // teal mechanism accent (linear / delta-rule state)
    ['#3fb950', '#1a7f37'],   // green mechanism accent (GQA / MHA / global)
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
    const hbtns = standalone
      ? `<a class="btn backbtn" href="./">← All models</a>`
      : `<span class="dhbtns"><a class="xbtn ntbtn" href="?model=${encodeURIComponent(m.id)}" target="_blank" rel="noopener" title="Open in a separate tab">⧉</a><button class="xbtn" id="dx" title="Close">×</button></span>`;
    $('#drawer').innerHTML = `
      <div class="dh">
        <div><h2>${esc(m.name)}</h2><div class="org">${esc(m.org)} · ${esc(m.family)} · ${relDate(m.released)} · <span class="conf ${esc(m.confidence)}">${esc(m.confidence)}</span></div></div>
        ${hbtns}
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
    const dx = $('#dx'); if (dx) dx.onclick = closeDetail;
    if (!standalone) $('#scrim').classList.add('show');
    $('#drawer').classList.add('show');
  }
  function closeDetail() {
    if (standalone) return;   // the drawer IS the page; nothing to close
    $('#scrim').classList.remove('show'); $('#drawer').classList.remove('show');
  }

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

    // standalone model page — reached via the drawer's ⧉ open-in-tab button
    try {
      const mid = new URLSearchParams(location.search).get('model');
      const m = mid && MODELS.find(x => x.id === mid);
      if (m) {
        standalone = true;
        document.body.classList.add('standalone');
        document.body.insertBefore($('#drawer'), $('footer'));   // static drawer reads top-to-bottom: header → model → footer
        document.title = m.name + ' — LLM & Multimodal Architecture Atlas';
        openDetail(m);
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
