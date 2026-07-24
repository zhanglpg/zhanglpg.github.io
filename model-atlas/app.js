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
  const state = { q: '', org: '', sort: 'date', types: new Set(), mods: new Set(), cmp: false, picked: [] };

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
  const A_COL = { MHA: '#3fb950', GQA: '#3fb950', MQA: '#3fb950', MLA: '#bc8cff', sparse: '#f0883e', hybrid: '#58a6ff', linear: '#39c5cf', MMDiT: '#f778ba' };
  function attnColor(a) { return A_COL[a] || '#3fb950'; }

  function archSVG(m) {
    const W = 380, x = 44, w = 244, cx = x + w / 2; // main column
    let y = 14; const parts = [];
    const box = (h, fill, stroke, label, sub, opt = {}) => {
      const r = opt.r ?? 8, lc = opt.lc || '#e6edf3', fs = opt.fs || 12.5;
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`);
      parts.push(`<text x="${cx}" y="${y + (sub ? h / 2 - 3 : h / 2 + 1)}" text-anchor="middle" fill="${lc}" font-size="${fs}" font-weight="640">${esc(label)}</text>`);
      if (sub) parts.push(`<text x="${cx}" y="${y + h / 2 + 12}" text-anchor="middle" fill="#9aa7b4" font-size="10.5">${esc(sub)}</text>`);
      const top = y; y += h; return top;
    };
    const arrow = (gap = 13) => { parts.push(`<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + gap}" stroke="#39424f" stroke-width="1.6" marker-end="url(#ah)"/>`); y += gap; };
    const norm = (label) => { // thin norm bar
      parts.push(`<rect x="${x + 26}" y="${y}" width="${w - 52}" height="20" rx="5" fill="#161b22" stroke="#2a3240"/>`);
      parts.push(`<text x="${cx}" y="${y + 14}" text-anchor="middle" fill="#9aa7b4" font-size="10.5">${esc(label)}</text>`);
      y += 20;
    };
    const gen = isGen(m);

    // Input
    parts.push(`<text x="${cx}" y="${y + 4}" text-anchor="middle" fill="#6e7b89" font-size="11">${gen ? 'Noised latent patches + text/time cond.' : 'Input token IDs'}</text>`);
    y += 14; arrow(10);
    // Embedding
    box(40, '#1c2230', '#2a3240', gen ? 'Patchify + Embed' : 'Token Embedding', (m.vocab_size ? fmtNum(m.vocab_size) + ' vocab · ' : '') + 'd=' + fmtNum(m.d_model), { fs: 12 });
    arrow();

    // ---- decoder block container (with stacked-shadow to imply ×N) ----
    const blkTop = y;
    const sub = []; // sub-content drawn later; measure height first by drawing into y
    // draw shadow rects behind (offset) — we know block content height after building; do a two-pass: build inner, compute h.
    const innerStartY = y + 12;
    y = innerStartY;
    // sublayer 1: norm -> attention -> residual
    const sandwich = m.norm_placement === 'sandwich';
    norm((sandwich ? 'pre ' : '') + m.norm);
    const aTop = y;
    const aColor = attnColor(m.attention);
    const attnLabel = m.attention + (m.attention === 'hybrid' ? '' : ' attention');
    const attnSub = (m.n_heads ? m.n_heads + ' q' + (m.n_kv_heads && m.n_kv_heads !== m.n_heads ? ' / ' + m.n_kv_heads + ' kv' : '') + ' heads · d_h ' + (m.head_dim ?? '?') : m.attention_detail ? '' : '');
    box(46, aColor + '22', aColor, attnLabel, attnSub, { lc: aColor });
    if (sandwich) norm('post ' + m.norm);
    // residual arc 1 (right side)
    parts.push(`<path d="M ${x + w} ${aTop - 26} q 30 0 30 ${(y - (aTop - 26)) / 2} q 0 ${(y - (aTop - 26)) / 2} -30 ${(y - (aTop - 26)) / 2}" fill="none" stroke="#39424f" stroke-width="1.3" stroke-dasharray="3 3"/>`);
    parts.push(`<circle cx="${x + w}" cy="${y}" r="7" fill="#161b22" stroke="#39424f"/><text x="${x + w}" y="${y + 3.5}" text-anchor="middle" fill="#9aa7b4" font-size="11">+</text>`);
    arrow(12);
    // sublayer 2: norm -> FFN/MoE -> residual
    norm((sandwich ? 'pre ' : '') + m.norm);
    const fTop = y;
    if (isMoE(m)) {
      // MoE box with expert glyphs
      const bh = 62; parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="8" fill="#d2992218" stroke="#d29922" stroke-width="1.3"/>`);
      parts.push(`<text x="${cx}" y="${y + 15}" text-anchor="middle" fill="#e3b341" font-size="12.5" font-weight="640">MoE FFN · ${esc(m.activation)}</text>`);
      // router
      parts.push(`<text x="${x + 12}" y="${y + 34}" fill="#9aa7b4" font-size="9.5">router →</text>`);
      // expert squares
      const total = m.n_experts || 8, act = m.active_experts || 1, shared = m.shared_experts || 0;
      const show = Math.min(total, 11); const sq = 15, gap = 3; const startX = x + 56;
      for (let i = 0; i < show; i++) {
        const on = i < act; // first `act` shown as active (schematic)
        const ex = startX + i * (sq + gap);
        parts.push(`<rect x="${ex}" y="${y + 26}" width="${sq}" height="${sq}" rx="3" fill="${on ? '#d29922' : '#21262d'}" stroke="${on ? '#f0b429' : '#39424f'}"/>`);
      }
      if (total > show) parts.push(`<text x="${startX + show * (sq + gap) + 2}" y="${y + 38}" fill="#9aa7b4" font-size="12">…</text>`);
      if (shared) parts.push(`<rect x="${x + 18}" y="${y + 26}" width="${sq}" height="${sq}" rx="3" fill="#3fb95033" stroke="#3fb950"/><text x="${x + 25.5}" y="${y + 55}" text-anchor="middle" fill="#7ee787" font-size="8">shared</text>`);
      parts.push(`<text x="${cx}" y="${y + bh - 4}" text-anchor="middle" fill="#9aa7b4" font-size="10">${total} experts · top-${act}${shared ? ' + ' + shared + ' shared' : ''} · expert d_ff ${fmtNum(m.d_ff_moe)}</text>`);
      y += bh;
    } else {
      box(44, '#58a6ff1e', '#58a6ff', (gen ? 'MLP / AdaLN-mod' : 'FFN') + ' · ' + m.activation, (m.d_ff ? 'd_ff = ' + fmtNum(m.d_ff) : ''), { lc: '#79b8ff' });
    }
    if (sandwich) norm('post ' + m.norm);
    parts.push(`<path d="M ${x + w} ${fTop - 26} q 30 0 30 ${(y - (fTop - 26)) / 2} q 0 ${(y - (fTop - 26)) / 2} -30 ${(y - (fTop - 26)) / 2}" fill="none" stroke="#39424f" stroke-width="1.3" stroke-dasharray="3 3"/>`);
    parts.push(`<circle cx="${x + w}" cy="${y}" r="7" fill="#161b22" stroke="#39424f"/><text x="${x + w}" y="${y + 3.5}" text-anchor="middle" fill="#9aa7b4" font-size="11">+</text>`);
    y += 12;
    const blkBot = y;
    const blkH = blkBot - blkTop;
    // container outline + stacked shadow (drawn BEHIND: we insert at front)
    const shadow = `<rect x="${x - 8}" y="${blkTop + 8}" width="${w + 16}" height="${blkH}" rx="12" fill="#161b22" stroke="#2a3240"/>` +
                   `<rect x="${x - 4}" y="${blkTop + 4}" width="${w + 8}" height="${blkH}" rx="12" fill="#161b22" stroke="#2a3240"/>`;
    const container = `<rect x="${x - 12}" y="${blkTop}" width="${w + 24}" height="${blkH}" rx="12" fill="none" stroke="${accentColor(m)}" stroke-width="1.4"/>`;
    const nlabel = `<text x="${x + w + 16}" y="${blkTop + 16}" fill="${accentColor(m)}" font-size="12" font-weight="700">× ${m.n_layers ?? 'N'}</text>` +
                   `<text x="${x + w + 16}" y="${blkTop + 30}" fill="#6e7b89" font-size="9.5">layers</text>`;
    parts.unshift(shadow); parts.push(container, nlabel);

    arrow();
    // final norm + head
    box(30, '#161b22', '#2a3240', 'Final ' + m.norm, '', { fs: 11.5 });
    arrow();
    box(38, '#1c2230', '#2a3240', gen ? 'Unpatchify → denoised latent' : 'LM Head → logits', gen ? '' : ((m.tie_embeddings ? 'tied · ' : '') + fmtNum(m.vocab_size) + ' vocab'), { fs: 12 });
    y += 8;

    const H = y;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="ah" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="#39424f"/></marker></defs>
      ${parts.join('')}
    </svg>`;
  }

  // ---------- detail drawer ----------
  function openDetail(m) {
    const vis = m.vision ? `<div class="dsec"><h3>Vision / Multimodal</h3><div class="notes">
      <b>Encoder:</b> ${esc(m.vision.encoder)}${m.vision.encoder_params_B ? ' (~' + m.vision.encoder_params_B + 'B)' : ''} · <b>Fusion:</b> ${esc(m.vision.fusion)}<br>${esc(m.vision.notes)}</div></div>` : '';
    $('#drawer').innerHTML = `
      <div class="dh">
        <div><h2>${esc(m.name)}</h2><div class="org">${esc(m.org)} · ${esc(m.family)} · ${relDate(m.released)} · <span class="conf ${esc(m.confidence)}">${esc(m.confidence)}</span></div></div>
        <button class="xbtn" id="dx">×</button>
      </div>
      <div class="dbody">
        <div class="dsec"><h3>Architecture diagram</h3><div class="arch">${archSVG(m)}</div>
          <div style="color:#6e7b89;font-size:11px;margin-top:6px">Schematic: one representative decoder block, repeated ×${m.n_layers ?? 'N'}. ${esc(m.attention_detail || '')}</div>
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
    const archs = `<div class="cmp-archrow" style="--n:${n}">${ms.map(m => `<div><div style="text-align:center;font-weight:640;margin-bottom:6px">${esc(m.name)}</div><div class="arch">${archSVG(m)}</div></div>`).join('')}</div>`;
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
    const latest = MODELS.map(m => m.released).sort().pop();
    $('#updated').textContent = relDate(latest);
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
    document.onkeydown = (e) => { if (e.key === 'Escape') { closeDetail(); $('#cmpModal').classList.remove('show'); } };
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
