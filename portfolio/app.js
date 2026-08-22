/* Portfolio dashboard — all rendering from window.FINANCIALS + window.PRICES.
 * Zero runtime network requests; works from file://. No frameworks, no build.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function fatal(msg) {
    var b = $('error-banner');
    b.textContent = 'Dashboard error: ' + msg;
    b.hidden = false;
  }

  // ---------- data guards ----------
  var F = window.FINANCIALS, P = window.PRICES;
  if (!F || !F.companies || !F.companies.BABA || !F.companies.GOOG ||
      !Array.isArray((F.companies.BABA.quarterly || 0)) ||
      !Array.isArray((F.companies.GOOG.quarterly || 0))) {
    fatal('financials.js missing or malformed (window.FINANCIALS).'); return;
  }
  if (!P || !P.series || !P.series.BABA || !P.series.GOOG || !P.stats ||
      !P.stats.BABA || !P.stats.GOOG) {
    fatal('prices.js missing or malformed (window.PRICES).'); return;
  }

  var TICKERS = ['BABA', 'GOOG'];
  var FXQ = P.fx_usdcny_quarterly || {};
  var FX_LATEST = (typeof P.fx_latest === 'number' && P.fx_latest > 0) ? P.fx_latest : 7.0;

  // ---------- state ----------
  var state = {
    currency: 'USD',                 // 'USD' | 'NATIVE'
    range: '1Y',
    revMode: { BABA: 'Q', GOOG: 'Q' } // per-company revenue sub-toggle
  };
  var charts = {}; // id -> Chart instance

  // ---------- small helpers ----------
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }

  // calendar-quarter key ("2025Q1") from an ISO date
  function qkey(iso) { return iso.slice(0, 4) + 'Q' + Math.ceil(+iso.slice(5, 7) / 3); }
  function fxFor(iso) { return num(FXQ[qkey(iso)]) || FX_LATEST; }

  function dispCcy(t) { // currency a company's financials are shown in
    return (state.currency === 'USD') ? 'USD' : F.companies[t].currency;
  }
  // convert a native-millions value for ticker t / period ending `iso`
  function conv(v, t, iso) {
    v = num(v);
    if (v === null) return null;
    if (state.currency === 'USD' && F.companies[t].currency === 'CNY') return v / fxFor(iso);
    return v;
  }
  function sym(ccy) { return ccy === 'CNY' ? '¥' : 'US$'; }

  var NDASH = '−'; // true minus sign
  function fmtB(m, ccy) { // m in millions -> "US$12.3B" / "¥241.5B" / "US$820M"
    m = num(m);
    if (m === null) return '—';
    var a = Math.abs(m);
    var s = a >= 1000 ? (a / 1000).toFixed(1) + 'B' : Math.round(a) + 'M';
    return (m < 0 ? NDASH : '') + sym(ccy) + s;
  }
  function fmtUsd(v, dp) { // plain dollar amount
    v = num(v); if (v === null) return '—';
    var a = Math.abs(v);
    var s = a.toLocaleString('en-US', { minimumFractionDigits: dp === undefined ? 2 : dp, maximumFractionDigits: dp === undefined ? 2 : dp });
    return (v < 0 ? NDASH : '') + '$' + s;
  }
  function fmtBigUsd(v) { // portfolio-scale dollars
    v = num(v); if (v === null) return '—';
    return (v < 0 ? NDASH : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function fmtPnlUsd(v) { // P&L dollars: explicit + on gains (blotter convention, sign-symmetric with −)
    v = num(v); if (v === null) return '—';
    return (v > 0 ? '+' : v < 0 ? NDASH : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function fmtBFix(m, ccy) { // earnings-table cells: always billions (1–2 dp) — one unit per column
    m = num(m); if (m === null) return '—';
    var b = Math.abs(m) / 1000;
    return (m < 0 ? NDASH : '') + sym(ccy) + b.toFixed(b >= 10 ? 1 : 2) + 'B';
  }
  function fmtPctFrac(f) { // fraction (0.034) -> "+3.4%"
    f = num(f); if (f === null) return '—';
    return (f >= 0 ? '+' : NDASH) + Math.abs(f * 100).toFixed(1) + '%';
  }
  function fmtPctPt(p) { // already-percent number (3.4) -> "+3.4%"
    p = num(p); if (p === null) return '—';
    return (p >= 0 ? '+' : NDASH) + Math.abs(p).toFixed(1) + '%';
  }
  function fmtEps(v, ccy) {
    v = num(v); if (v === null) return '—';
    return (v < 0 ? NDASH : '') + sym(ccy) + Math.abs(v).toFixed(2);
  }
  // exactly-zero values are neutral (muted), not green — green is earned, not default
  function signClass(v) { v = num(v); return v === null ? '' : (v === 0 ? 'zero' : (v > 0 ? 'pos' : 'neg')); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ---------- theme ----------
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('portfolio-theme', t); } catch (e) { /* storage blocked — ignore */ }
    renderDynamic(); // charts read CSS vars at build time -> rebuild
  }

  // ---------- holdings (localStorage only; privacy invariant) ----------
  var LS_KEY = 'portfolio-holdings';
  function loadHoldings() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var h = JSON.parse(raw), ok = true, out = {};
        TICKERS.forEach(function (t) {
          var p = h && h[t];
          if (!p || num(p.shares) === null || num(p.avgCost) === null || p.shares < 0 || p.avgCost < 0) ok = false;
          else out[t] = { shares: p.shares, avgCost: p.avgCost };
        });
        if (ok) return { placeholder: false, positions: out };
      }
    } catch (e) { /* corrupted/blocked -> placeholder */ }
    // Placeholder: 50/50 split of $5,000,000 at the latest close (cost == close, so P&L = 0)
    var pos = {};
    TICKERS.forEach(function (t) {
      var px = num(P.stats[t].latest) || 1;
      pos[t] = { shares: 2500000 / px, avgCost: px };
    });
    return { placeholder: true, positions: pos };
  }
  function saveHoldings(h) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(h)); } catch (e) { fatal('Could not write localStorage (holdings not saved).'); }
  }

  // ---------- chart plumbing ----------
  if (window.Chart) {
    Chart.defaults.animation = false; // synchronous-enough for headless screenshots
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.display = false; // legends are HTML chips
  } else {
    fatal('chart.umd.min.js failed to load.'); return;
  }

  function destroyCharts() {
    Object.keys(charts).forEach(function (k) { charts[k].destroy(); });
    charts = {};
  }
  function makeChart(id, cfg) {
    var el = $(id);
    if (!el) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(el.getContext('2d'), cfg);
  }
  function themedScales(opts) { // shared scale styling: y-grid only, themed ticks
    opts = opts || {};
    var tick = cssVar('--chart-tick'), grid = cssVar('--chart-grid');
    var scales = {
      x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkip: true, maxTicksLimit: opts.xMaxTicks || 8 }, border: { color: grid } },
      y: { grid: { color: grid }, ticks: { color: tick, callback: opts.yFmt, maxTicksLimit: opts.yMaxTicks || 6 }, border: { display: false } }
    };
    if (opts.y1Fmt) {
      scales.y1 = { position: 'right', grid: { display: false }, ticks: { color: tick, callback: opts.y1Fmt, maxTicksLimit: 5 }, border: { display: false } };
      if (opts.y1Min !== undefined) scales.y1.min = opts.y1Min;
      if (opts.y1SuggestedMax !== undefined) scales.y1.suggestedMax = opts.y1SuggestedMax;
    }
    if (opts.stacked) { scales.x.stacked = true; scales.y.stacked = true; }
    if (opts.xTime) { // linear ms-timestamp axis (no date adapter needed)
      scales.x.type = 'linear';
      scales.x.ticks.callback = function (v) {
        var d = new Date(v);
        return opts.shortDates
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
      if (opts.monthTicks) {
        // ticks pinned to month starts at a uniform "nice" cadence (1/2/3/6/12/24… months)
        scales.x.afterBuildTicks = function (axis) {
          var ms = [], d = new Date(axis.min);
          var y = d.getUTCFullYear(), m = d.getUTCMonth();
          for (var ts = Date.UTC(y, m, 1); ts <= axis.max; ) {
            if (ts >= axis.min) ms.push({ ts: ts, am: y * 12 + m }); // am = absolute month number
            m += 1; if (m > 11) { m = 0; y++; }
            ts = Date.UTC(y, m, 1);
          }
          var maxT = opts.xMaxTicks || 8;
          var steps = [1, 2, 3, 6, 12, 24, 36], step = steps[steps.length - 1];
          for (var i = 0; i < steps.length; i++) {
            if (Math.ceil(ms.length / steps[i]) <= maxT) { step = steps[i]; break; }
          }
          // phase-align to calendar boundaries (Jan/Mar/… for 2mo, Jan/Jul for 6mo, Jan for 12mo+)
          axis.ticks = ms.filter(function (x) { return x.am % step === 0; })
            .map(function (x) { return { value: x.ts }; });
        };
      }
      scales.x.min = opts.xMin; scales.x.max = opts.xMax;
    }
    if (opts.qIndexAxis) {
      // Linear axis in CMP_AXIS category-index units — pins ticks to the exact
      // grid the sibling comparative panels get from their category axes (same
      // positions, same labels, same skip cadence), so quarters align vertically.
      scales.x.type = 'linear';
      scales.x.min = 0; scales.x.max = CMP_AXIS.length - 1;
      scales.x.ticks.autoSkip = false; // ticks are set explicitly below
      scales.x.ticks.callback = function (v) { return CMP_AXIS[v] ? shortQ(CMP_AXIS[v]) : ''; };
      scales.x.afterBuildTicks = function (axis) {
        var n = CMP_AXIS.length, step = Math.max(1, Math.ceil(n / (opts.xMaxTicks || 8)));
        var t = [];
        for (var i = 0; i < n; i += step) t.push({ value: i });
        axis.ticks = t;
      };
    }
    return scales;
  }
  function tooltipBase() {
    return {
      backgroundColor: currentTheme() === 'light' ? 'rgba(31,35,40,0.92)' : 'rgba(22,27,34,0.95)',
      borderColor: cssVar('--border'), borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#e6edf3',
      padding: 8, boxPadding: 3
    };
  }
  function accent(t) { return cssVar(t === 'BABA' ? '--baba' : '--goog'); }
  function withAlpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; });
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ---------- calendar-quarter alignment (mixed fiscal calendars) ----------
  // Shared axes always use calendar quarters; fiscal labels only in tooltips.
  function calAxis() {
    var keys = {};
    TICKERS.forEach(function (t) {
      F.companies[t].quarterly.forEach(function (q) { keys[qkey(q.period_end)] = true; });
    });
    return Object.keys(keys).sort(); // "YYYYQn" sorts lexicographically
  }
  function byCalQ(t) {
    var m = {};
    F.companies[t].quarterly.forEach(function (q) { m[qkey(q.period_end)] = q; });
    return m;
  }
  var AXIS_Q = calAxis();
  var QMAP = { BABA: byCalQ('BABA'), GOOG: byCalQ('GOOG') };
  function shortQ(k) { return '’' + k.slice(2, 4) + k.slice(4); } // "’25Q1"

  // Shared x-domain for the comparative row: all four panels start at the first
  // quarter where every panel has data, so quarters align vertically across the
  // row and no panel carries a blank left gutter.
  function firstQWith(fn) { // earliest calendar quarter (across tickers) with a value
    var best = null;
    TICKERS.forEach(function (t) {
      var q = F.companies[t].quarterly.find(function (r) { return fn(r) !== null; });
      if (q) { var k = qkey(q.period_end); if (best === null || k < best) best = k; }
    });
    return best;
  }
  var CMP_START = [
    firstQWith(function (r) { return num(r.revenue_yoy); }),
    firstQWith(function (r) { return num(r.operating_margin); }),
    firstQWith(function (r) { return num(r.ttm_diluted_eps); }),
    firstQWith(function (r) { return num(r.ttm_free_cash_flow); })
  ].reduce(function (a, b) { return (b !== null && (a === null || b > a)) ? b : a; }, null);
  var CMP_AXIS = CMP_START ? AXIS_Q.filter(function (k) { return k >= CMP_START; }) : AXIS_Q;

  // Latest available TTM EPS in USD (for P/E); BABA per-ADS EPS converted at fx_latest.
  function ttmEpsUsdSeries(t) {
    var c = F.companies[t], out = [];
    c.quarterly.forEach(function (q) {
      var e = num(q.ttm_diluted_eps);
      if (e === null) return;
      if (c.currency === 'CNY') e = e / FX_LATEST;
      out.push({ ts: Date.parse(q.period_end + 'T00:00:00Z'), eps: e, label: q.label });
    });
    return out;
  }
  function latestTtmEpsUsd(t) {
    var s = ttmEpsUsdSeries(t);
    return s.length ? s[s.length - 1].eps : null;
  }

  // =====================================================================
  // 1. header
  // =====================================================================
  function renderHeader() {
    var lastB = F.companies.BABA.quarterly.slice(-1)[0];
    var lastG = F.companies.GOOG.quarterly.slice(-1)[0];
    $('freshness').textContent =
      'prices ' + fmtDate(P.stats.GOOG.latest_date) +
      ' · financials through ' + lastB.label.replace(/\s*\(.*\)/, '') + ' / ' + lastG.label;
  }

  // =====================================================================
  // 2. portfolio strip
  // =====================================================================
  // previous close from the actual price series (not back-solved from rounded chg_1d_pct)
  function prevClose(t) {
    var s = P.series[t];
    return (s.length > 1 && num(s[s.length - 2][1]) !== null) ? s[s.length - 2][1] : (num(P.stats[t].latest) || 0);
  }

  function renderPortfolio() {
    var h = loadHoldings();
    $('ph-badge').hidden = !h.placeholder;

    var totVal = 0, totCost = 0, totDay = 0, vals = {};
    TICKERS.forEach(function (t) {
      var st = P.stats[t], p = h.positions[t];
      var px = num(st.latest) || 0;
      var val = p.shares * px;
      vals[t] = val;
      totVal += val;
      totCost += p.shares * p.avgCost;
      totDay += p.shares * (px - prevClose(t));
    });
    var totPnl = totVal - totCost;
    var dayPct = (totVal - totDay) !== 0 ? totDay / (totVal - totDay) : 0;
    var pnlPct = totCost !== 0 ? totPnl / totCost : 0;

    $('pf-total').textContent = fmtBigUsd(totVal);
    var d = $('pf-day');
    d.textContent = fmtPnlUsd(totDay) + ' (' + fmtPctFrac(dayPct) + ')';
    d.className = signClass(totDay);
    var tp = $('pf-total-pnl');
    tp.textContent = fmtPnlUsd(totPnl) + ' (' + fmtPctFrac(pnlPct) + ')';
    tp.className = signClass(totPnl);

    var aPct = totVal > 0 ? vals.BABA / totVal * 100 : 50;
    $('alloc-a').style.width = aPct.toFixed(1) + '%';
    $('alloc-b').style.width = (100 - aPct).toFixed(1) + '%';
    $('alloc-a-lbl').textContent = 'BABA ' + aPct.toFixed(1) + '%';
    $('alloc-b-lbl').textContent = 'GOOG ' + (100 - aPct).toFixed(1) + '%';

    TICKERS.forEach(function (t) {
      var st = P.stats[t], p = h.positions[t];
      var px = num(st.latest) || 0;
      var val = p.shares * px, cost = p.shares * p.avgCost;
      var ret = val - cost, retPct = cost !== 0 ? ret / cost : 0;
      var hi = num(st.hi_52w), lo = num(st.lo_52w);
      var rangePos = (hi !== null && lo !== null && hi > lo) ? (px - lo) / (hi - lo) : null;
      var eps = latestTtmEpsUsd(t);
      var pe = (eps && eps > 0) ? px / eps : null;
      var dayPnl = p.shares * (px - prevClose(t));
      var weight = totVal > 0 ? val / totVal * 100 : null;
      var card = $('pcard-' + t);
      card.innerHTML =
        '<div class="pcard-head"><span class="ticker" style="color:var(--' + t.toLowerCase() + ')">' + t + '</span>' +
        '<span class="px">' + fmtUsd(px) + ' <span class="' + signClass(st.chg_1d_pct) + '" style="font-size:12px">' + fmtPctPt(st.chg_1d_pct) + '</span></span></div>' +
        '<div class="pcard-sub">' + p.shares.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' shares · avg cost ' + fmtUsd(p.avgCost) + '</div>' +
        '<div class="kv"><span class="k">Market value</span><span>' + fmtBigUsd(val) +
        (weight !== null ? ' <span style="color:var(--muted)">(' + weight.toFixed(1) + '%)</span>' : '') + '</span></div>' +
        '<div class="kv"><span class="k">Today’s P&amp;L</span><span class="' + signClass(dayPnl) + '">' + fmtPnlUsd(dayPnl) + '</span></div>' +
        '<div class="kv"><span class="k">Total return</span><span class="' + signClass(ret) + '">' + fmtPnlUsd(ret) + ' (' + fmtPctFrac(retPct) + ')</span></div>' +
        '<div class="stat-row">52w ' + fmtUsd(lo, 2) + '–' + fmtUsd(hi, 2) +
        (rangePos !== null ? ' (' + Math.round(rangePos * 100) + '% of range)' : '') +
        ' · P/E TTM ' + (pe !== null ? pe.toFixed(1) + '×' : '—') + '</div>';
    });
  }

  // ----- edit-holdings modal -----
  function openModal() {
    var h = loadHoldings();
    TICKERS.forEach(function (t) {
      var p = h.positions[t];
      var sh = $('in-' + t + '-shares'), co = $('in-' + t + '-cost');
      if (h.placeholder) {
        // show the seeded placeholder values as ghost text, not real values —
        // saving the seed silently would masquerade as user data
        sh.value = ''; co.value = '';
        sh.placeholder = Math.round(p.shares).toString();
        co.placeholder = p.avgCost.toFixed(2);
      } else {
        sh.value = p.shares; co.value = p.avgCost;
        sh.placeholder = ''; co.placeholder = '';
      }
    });
    // make ghost-vs-saved explicit: gray hints are suggestions, not saved values
    var mn = $('modal-mode-note');
    if (mn) mn.hidden = !h.placeholder;
    $('modal-overlay').hidden = false;
  }
  function closeModal() { $('modal-overlay').hidden = true; }
  function wireModal() {
    $('edit-holdings').addEventListener('click', openModal);
    $('modal-cancel').addEventListener('click', closeModal);
    $('modal-overlay').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    $('modal-save').addEventListener('click', function () {
      var h = {}, ok = true;
      TICKERS.forEach(function (t) {
        var s = parseFloat($('in-' + t + '-shares').value);
        var c = parseFloat($('in-' + t + '-cost').value);
        if (!isFinite(s) || !isFinite(c) || s < 0 || c < 0) ok = false;
        h[t] = { shares: s, avgCost: c };
      });
      if (!ok) { alert('Enter non-negative numbers for all four fields.'); return; }
      saveHoldings(h);
      closeModal();
      renderPortfolio();
    });
    $('modal-clear').addEventListener('click', function () {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      closeModal();
      renderPortfolio();
    });
  }

  // =====================================================================
  // 3. price performance
  // =====================================================================
  function rangeStartTs(range, lastTs) {
    var d = new Date(lastTs);
    switch (range) {
      case '1M': d.setMonth(d.getMonth() - 1); return d.getTime();
      case '6M': d.setMonth(d.getMonth() - 6); return d.getTime();
      case 'YTD': return Date.parse(new Date(lastTs).getUTCFullYear() + '-01-01T00:00:00Z');
      case '1Y': d.setFullYear(d.getFullYear() - 1); return d.getTime();
      case '3Y': d.setFullYear(d.getFullYear() - 3); return d.getTime();
      case '5Y': d.setFullYear(d.getFullYear() - 5); return d.getTime();
      default: return 0; // MAX
    }
  }
  function renderPriceChart() {
    var lastTs = Date.parse(P.stats.GOOG.latest_date + 'T00:00:00Z');
    var startTs = rangeStartTs(state.range, lastTs);
    var shortDates = (lastTs - startTs) < 100 * 864e5 && startTs > 0;
    var dataMin = null;
    var datasets = TICKERS.map(function (t) {
      var pts = [], base = null;
      P.series[t].forEach(function (row) {
        var ts = Date.parse(row[0] + 'T00:00:00Z');
        if (ts < startTs) return;
        if (base === null) base = row[1];
        pts.push({ x: ts, y: row[1] / base * 100 });
      });
      if (pts.length && (dataMin === null || pts[0].x < dataMin)) dataMin = pts[0].x;
      return {
        label: t, data: pts, borderColor: accent(t), borderWidth: 2,
        pointRadius: 0, pointHoverRadius: 3, tension: 0.1
      };
    });
    makeChart('priceChart', {
      type: 'line',
      data: { datasets: datasets },
      options: {
        parsing: false, normalized: true,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        // clamp the domain to the data (no dead space before the first point);
        // month-start ticks keep a uniform cadence instead of auto "nice" drift
        scales: themedScales({
          xTime: true, shortDates: shortDates, monthTicks: !shortDates,
          xMin: dataMin === null ? undefined : dataMin, xMax: lastTs,
          xMaxTicks: 9, yMaxTicks: 8, yFmt: function (v) { return v; }
        }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: function (items) { return items.length ? fmtDate(new Date(items[0].parsed.x).toISOString().slice(0, 10)) : ''; },
              label: function (c) { return c.dataset.label + ': ' + c.parsed.y.toFixed(1) + ' (indexed)'; }
            }
          })
        }
      }
    });

    // stat chips
    TICKERS.forEach(function (t) {
      var st = P.stats[t];
      var cagr5 = num(st.chg_5y_pct) !== null ? (Math.pow(1 + st.chg_5y_pct / 100, 1 / 5) - 1) * 100 : null;
      function span(v) { return '<span class="' + signClass(v) + '">' + fmtPctPt(v) + '</span>'; }
      $('chip-' + t).innerHTML =
        '<b style="color:var(--' + t.toLowerCase() + ')">' + t + '</b> ' + fmtUsd(st.latest) +
        '<div class="row">' +
        '<span>1D ' + span(st.chg_1d_pct) + '</span>' +
        '<span>YTD ' + span(st.chg_ytd_pct) + '</span>' +
        '<span>1Y ' + span(st.chg_1y_pct) + '</span>' +
        '<span>5Y CAGR ' + (cagr5 !== null ? span(cagr5) : '—') + '</span>' +
        '<span>52w ' + fmtUsd(st.lo_52w) + '–' + fmtUsd(st.hi_52w) + '</span>' +
        '<span>max DD (10Y) <span class="neg">' + fmtPctPt(st.max_drawdown_pct) + '</span></span>' + // full-history window, not the selected range
        '</div>';
    });
  }
  function wireRangePills() {
    var pills = $('range-pills');
    pills.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-range]');
      if (!b) return;
      state.range = b.dataset.range;
      pills.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderPriceChart();
    });
  }

  // =====================================================================
  // 4. comparative fundamentals
  // =====================================================================
  // Common quarterly comparative line chart on the shared calendar-quarter axis.
  function cmpLineChart(id, valueFn, yFmt, tipFmt, extraDatasets) {
    var datasets = TICKERS.map(function (t) {
      return {
        label: t,
        data: CMP_AXIS.map(function (k) { var q = QMAP[t][k]; return q ? valueFn(q, t) : null; }),
        qlabels: CMP_AXIS.map(function (k) { var q = QMAP[t][k]; return q ? q.label : null; }),
        borderColor: accent(t), borderWidth: 2, pointRadius: 0, pointHoverRadius: 3,
        spanGaps: false, tension: 0.1
      };
    }).concat(extraDatasets || []);
    makeChart(id, {
      type: 'line',
      data: { labels: CMP_AXIS.map(shortQ), datasets: datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: themedScales({ yFmt: yFmt, xMaxTicks: 8 }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              label: function (c) {
                var fis = c.dataset.qlabels ? c.dataset.qlabels[c.dataIndex] : null;
                return c.dataset.label + (fis ? ' [' + fis + ']' : '') + ': ' + tipFmt(c.parsed.y, c.dataset.label);
              }
            }
          })
        }
      }
    });
  }
  function pctTick(v) { return v + '%'; }

  function renderComparatives() {
    // Revenue YoY (as reported, native currency — a ratio, so FX-invariant per period)
    cmpLineChart('cmpRevYoy',
      function (q) { var v = num(q.revenue_yoy); return v === null ? null : v * 100; },
      pctTick, function (v) { return fmtPctPt(v); });

    // Operating margin
    cmpLineChart('cmpOpMargin',
      function (q) { var v = num(q.operating_margin); return v === null ? null : v * 100; },
      pctTick, function (v) { return fmtPctPt(v); });

    // TTM P/E over price dates (price ÷ TTM EPS of most recent quarter ended on/before date)
    renderPEChart();

    // TTM FCF + capex (dashed, lighter)
    $('cmpFCF-note').textContent = state.currency === 'USD' ? 'US$B · BABA conv. @ qtr-avg FX' : 'native ccy, B';
    // capex dashed at near-full strength with wide gaps so solid-vs-dashed still
    // reads at small panel size (pale dashes hug the FCF line illegibly)
    var capexSets = TICKERS.map(function (t) {
      return {
        label: t + ' capex',
        data: CMP_AXIS.map(function (k) { var q = QMAP[t][k]; return q ? conv(q.ttm_capex, t, q.period_end) : null; }),
        qlabels: CMP_AXIS.map(function (k) { var q = QMAP[t][k]; return q ? q.label : null; }),
        borderColor: withAlpha(accent(t), 0.85), borderWidth: 1.5, borderDash: [3, 4],
        pointRadius: 0, pointHoverRadius: 3, spanGaps: false, tension: 0.1
      };
    });
    cmpLineChart('cmpFCF',
      function (q, t) { return conv(q.ttm_free_cash_flow, t, q.period_end); },
      function (v) { return (v / 1000).toFixed(0) + 'B'; },
      function (v, lbl) { return fmtB(v, lbl.indexOf('BABA') === 0 && state.currency !== 'USD' ? 'CNY' : 'USD'); },
      capexSets);
  }

  function renderPEChart() {
    // Same x-grid as the other three comparative panels: map each daily price
    // date into CMP_AXIS category-index units (a quarter-end lands exactly on
    // its quarter's index, matching the siblings' as-of-quarter-end points) and
    // clamp to the shared quarterly domain — no odd tick phase, no extra
    // trailing quarter.
    var N = CMP_AXIS.length;
    var aq0 = +CMP_AXIS[0].slice(0, 4) * 4 + (+CMP_AXIS[0].slice(5) - 1); // absolute quarter # of axis[0]
    function qx(iso, ts) { // fractional CMP_AXIS index for a date
      var y = +iso.slice(0, 4), qi = Math.floor((+iso.slice(5, 7) - 1) / 3);
      var qs = Date.UTC(y, qi * 3, 1);
      var qe = Date.UTC(qi === 3 ? y + 1 : y, qi === 3 ? 0 : qi * 3 + 3, 1);
      return (y * 4 + qi - aq0 - 1) + (ts - qs) / (qe - qs);
    }
    var datasets = TICKERS.map(function (t) {
      var eps = ttmEpsUsdSeries(t);
      if (!eps.length) return { label: t, data: [] };
      var pts = [], i = -1;
      P.series[t].forEach(function (row) {
        var ts = Date.parse(row[0] + 'T00:00:00Z');
        var x = qx(row[0], ts);
        if (x < 0 || x > N - 1) return; // shared comparative-row domain
        while (i + 1 < eps.length && eps[i + 1].ts <= ts) i++;
        if (i < 0) return; // before first TTM quarter
        if (eps[i].eps <= 0) return; // negative earnings -> P/E undefined
        pts.push({ x: x, y: row[1] / eps[i].eps, ts: ts, d: row[0] });
      });
      // resample daily P/E to ~weekly at sparkline size (avoids overdraw)
      var thin = [], last = -Infinity;
      pts.forEach(function (p) { if (p.ts - last >= 6 * 864e5) { thin.push(p); last = p.ts; } });
      if (pts.length && thin[thin.length - 1].ts !== pts[pts.length - 1].ts) thin.push(pts[pts.length - 1]);
      return {
        label: t, data: thin, borderColor: accent(t), borderWidth: 2,
        pointRadius: 0, pointHoverRadius: 3, tension: 0.1
      };
    });
    makeChart('cmpPE', {
      type: 'line',
      data: { datasets: datasets },
      options: {
        parsing: false, normalized: true,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: themedScales({
          qIndexAxis: true, xMaxTicks: 8, // identical tick cadence to the sibling category axes
          yFmt: function (v) { return v + '×'; }
        }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: function (items) { return items.length ? fmtDate(items[0].raw.d) : ''; },
              label: function (c) { return c.dataset.label + ': ' + c.parsed.y.toFixed(1) + '× TTM'; }
            }
          })
        }
      }
    });
  }

  // =====================================================================
  // 5. per-company panels
  // =====================================================================
  function fiscalTip(rows) { // tooltip title = the period's own fiscal label
    return function (items) { return items.length ? rows[items[0].dataIndex].label : ''; };
  }

  function renderRevenue(t) {
    var c = F.companies[t], ccy = dispCcy(t);
    var annual = state.revMode[t] === 'A';
    var rows = annual ? c.annual.slice(-10) : c.quarterly;
    var labels = annual
      ? rows.map(function (r) { return r.label.replace(/\s*\(.*\)/, ''); })
      : rows.map(function (r) { return shortQ(qkey(r.period_end)); });
    $(t + '-ttm-chip').style.display = annual ? 'none' : '';

    var datasets = [{
      type: 'bar', label: 'Revenue',
      data: rows.map(function (r) { return conv(r.revenue, t, r.period_end); }),
      backgroundColor: withAlpha(accent(t), 0.75), borderWidth: 0, order: 2
    }];
    if (!annual) {
      datasets.push({
        type: 'line', label: 'TTM revenue',
        data: rows.map(function (r) { return conv(r.ttm_revenue, t, r.period_end); }),
        borderColor: cssVar('--text'), borderWidth: 2, pointRadius: 0, pointHoverRadius: 3,
        spanGaps: false, tension: 0.1, order: 1
      });
    }
    makeChart(t + 'Rev', {
      data: { labels: labels, datasets: datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: themedScales({ yFmt: function (v) { return (v / 1000).toFixed(0) + 'B'; }, xMaxTicks: annual ? 10 : 8 }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: fiscalTip(rows),
              label: function (x) { return x.dataset.label + ': ' + fmtB(x.parsed.y, ccy); }
            }
          })
        }
      }
    });
  }

  function renderMargins(t) {
    var c = F.companies[t], rows = c.quarterly;
    // identical encoding in both panels: Gross = company hue solid,
    // Operating = company hue dashed, Net = neutral gray
    var colors = [accent(t), accent(t), '#8b949e'];
    var dashes = [null, [5, 3], null];
    var fields = ['gross_margin', 'operating_margin', 'net_margin'];
    var names = ['Gross', 'Operating', 'Net'];
    // Clamp the axis when a single outlier quarter (e.g. net margin spiked by
    // non-operating gains) would compress the whole history.
    var CAP = 70, over = [];
    rows.forEach(function (r) {
      var v = num(r.net_margin);
      if (v !== null && v * 100 > CAP) over.push(shortQ(qkey(r.period_end)) + ' ' + (v * 100).toFixed(1) + '%');
    });
    // short header note; the full explanation lives in the hover title, the
    // on-chart value label at the clipped point, and the earnings-table footnote
    var noteEl = $(t + '-margins-note');
    if (noteEl) {
      noteEl.textContent = over.length ? 'y capped at ' + CAP + '%' : '';
      noteEl.title = over.length
        ? 'net margin ' + over.join(', ') + ' — incl. non-operating gains (net inc > op inc); true value labeled at the top edge'
        : '';
    }
    var scales = themedScales({ yFmt: pctTick });
    if (over.length) scales.y.max = CAP;
    // annotate clipped points at the top edge with their true value — the cap
    // must not silently truncate the most anomalous datum
    var capLabelPlugin = {
      id: 'capLabel',
      afterDatasetsDraw: function (chart) {
        if (!over.length) return;
        var ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 10px ' + Chart.defaults.font.family;
        chart.data.datasets.forEach(function (ds, di) {
          if (!ds.trueVals) return;
          var meta = chart.getDatasetMeta(di);
          ds.trueVals.forEach(function (tv, idx) {
            if (tv === null || tv <= CAP) return;
            var pt = meta.data[idx];
            if (!pt) return;
            var flip = pt.x < chart.chartArea.left + 48; // keep the label inside near either edge
            ctx.fillStyle = ds.borderColor;
            ctx.textAlign = flip ? 'left' : 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(tv.toFixed(1) + '%', pt.x + (flip ? 7 : -7), pt.y + 4);
          });
        });
        ctx.restore();
      }
    };
    makeChart(t + 'Margins', {
      plugins: [capLabelPlugin],
      type: 'line',
      data: {
        labels: rows.map(function (r) { return shortQ(qkey(r.period_end)); }),
        datasets: fields.map(function (f, i) {
          var trueVals = rows.map(function (r) { var v = num(r[f]); return v === null ? null : v * 100; });
          // clamp capped outliers to the ceiling and mark them with a hollow
          // point — an explicit truncation cue instead of a line exiting the plot
          var clamped = trueVals.map(function (v) { return (over.length && v !== null && v > CAP) ? CAP : v; });
          var radii = trueVals.map(function (v) { return (over.length && v !== null && v > CAP) ? 4 : 0; });
          return {
            label: names[i], trueVals: trueVals,
            data: clamped,
            borderColor: colors[i], borderWidth: 2, borderDash: dashes[i] || undefined,
            pointRadius: radii, pointHoverRadius: 4, pointStyle: 'rectRot',
            pointBackgroundColor: cssVar('--panel'), pointBorderColor: colors[i], pointBorderWidth: 1.5,
            tension: 0.1
          };
        })
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: scales,
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: fiscalTip(rows),
              label: function (x) { // report the true (unclamped) value
                var tv = x.dataset.trueVals ? x.dataset.trueVals[x.dataIndex] : x.parsed.y;
                var capped = tv !== null && over.length && tv > CAP;
                return x.dataset.label + ': ' + fmtPctPt(tv) + (capped ? ' (beyond y-cap)' : '');
              }
            }
          })
        }
      }
    });
  }

  // Mechanical flag: every quarter where net income exceeds operating income
  // (non-operating items lifting the bottom line). The same rule drives the
  // table daggers and the EPS-panel note, so the flags always match the
  // footnote's stated criterion — no judgment threshold.
  function netAnomaly(r) {
    var net = num(r.net_income), op = num(r.operating_income);
    return net !== null && op !== null && net > op;
  }

  function renderEPS(t) {
    var c = F.companies[t], rows = c.quarterly, ccy = dispCcy(t);
    // BABA subtitle is currency-aware: plotted values follow the USD/Native toggle
    if (t === 'BABA') {
      var ccyEl = $('BABA-eps-ccy');
      if (ccyEl) ccyEl.textContent = (ccy === 'CNY' ? 'CNY' : 'US$') + ' per ADS, diluted';
    }
    // echo the non-operating-items caveat on the EPS panel — same mechanical
    // net inc > op inc rule as the † daggers in the earnings table
    var flagged = rows.filter(netAnomaly).map(function (r) { return shortQ(qkey(r.period_end)); });
    var noteEl = $(t + '-eps-note');
    if (noteEl) {
      noteEl.textContent = flagged.length
        ? 'net inc > op inc (non-operating items) in ' + flagged.join(', ')
        : '';
    }
    var datasets = [{
      type: 'bar', label: 'GAAP diluted',
      data: rows.map(function (r) { return conv(r.diluted_eps, t, r.period_end); }),
      backgroundColor: withAlpha(accent(t), 0.75), borderWidth: 0, order: 2
    }];
    if (t === 'BABA') {
      datasets.push({
        type: 'line', label: 'Non-GAAP diluted',
        data: rows.map(function (r) { return conv(r.non_gaap_diluted_eps, t, r.period_end); }),
        borderColor: cssVar('--text'), borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, tension: 0.1, order: 1
      });
    }
    makeChart(t + 'EPS', {
      data: { labels: rows.map(function (r) { return shortQ(qkey(r.period_end)); }), datasets: datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: themedScales({ yFmt: function (v) { return v; } }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: { title: fiscalTip(rows), label: function (x) { return x.dataset.label + ': ' + fmtEps(x.parsed.y, ccy); } }
          })
        }
      }
    });
  }

  // Segment colors keyed by reported name. Convention: neutral gray is
  // reserved for the catch-all residual bucket; every real reported segment
  // gets a distinct hue (BABA = orange family, GOOG = blue family plus
  // teal/steel/mustard/purple so no two stacked neighbors are near-blues).
  var SEG_COLOR = {
    BABA: {
      'Alibaba China E-commerce Group': '#ff6f3c',
      'Alibaba International Digital Commerce Group': '#a2431b',
      'Cloud Intelligence Group': '#ffc078',
      // FY2027 Q1 reorg (announced 2026-08-20): E-commerce absorbs the old
      // China group + AIDC (+Freshippo); AI Cloud absorbs Cloud + T-Head;
      // AI Labs is the new model/app bucket carved out of All others.
      'Alibaba E-commerce Group': '#ff6f3c',
      'AI Cloud and Compute Services': '#ffc078',
      'AI Labs and Applications': '#e64980',
      'All others': '#8b949e'
    },
    GOOG: {
      'Google Search & other': '#4c8bf5',
      'Google Cloud': '#2bb3a3',
      'Google subscriptions, platforms, and devices': '#82b1ff',
      'YouTube ads': '#d4a72c',
      'Google Network': '#5a7d9a',
      'Other Bets': '#7a86c9'
    }
  };
  var SEG_FALLBACK = ['#c9553f', '#7a6a58', '#a3c2f0', '#1a5fd0']; // future/renamed segments
  function segColor(t, n, i) { return SEG_COLOR[t][n] || SEG_FALLBACK[i % SEG_FALLBACK.length]; }
  function renderSegments(t) {
    var c = F.companies[t], era = c.segment_era || {};
    var rows = c.quarterly.filter(function (q) { return era.start && q.period_end >= era.start && Array.isArray(q.segments); });
    var names = (era.names || []).slice();
    // GOOG reports both "Google Services" and its sub-components — stacking both
    // double-counts, so stack only the non-overlapping granular set.
    if (t === 'GOOG') names = names.filter(function (n) { return n !== 'Google Services'; });
    if (!rows.length || !names.length) return;
    // Stack order: biggest segments at the bottom, the catch-all "All others"
    // always on top (residual sits on the pile, not inside it). The legend
    // renders in the same bottom-to-top order, so chips map to bands directly.
    var lastRow = rows[rows.length - 1];
    function segRev(n) {
      var s = (lastRow.segments || []).find(function (x) { return x.name === n; });
      return (s && num(s.revenue) !== null) ? s.revenue : 0;
    }
    names.sort(function (a, b) {
      var ca = a === 'All others' ? 1 : 0, cb = b === 'All others' ? 1 : 0;
      return (ca !== cb) ? ca - cb : segRev(b) - segRev(a);
    });

    $(t + '-seg-note').textContent = 'segment structure as reported since ' + rows[0].label;
    var chipsEl = $(t + '-seg-chips');
    // >4 legend items: balanced grid rows (3+3) instead of a ragged wrap with an orphan
    chipsEl.classList.toggle('grid3', names.length > 4);
    chipsEl.innerHTML = names.map(function (n, i) {
      return '<span class="chip"><i class="sq" style="background:' + segColor(t, n, i) + '"></i>' + esc(n) + '</span>';
    }).join('');

    var ccy = dispCcy(t);
    makeChart(t + 'Segments', {
      type: 'bar',
      data: {
        labels: rows.map(function (r) { return shortQ(qkey(r.period_end)); }),
        datasets: names.map(function (n, i) {
          return {
            label: n,
            data: rows.map(function (r) {
              var s = r.segments.find(function (x) { return x.name === n; });
              return s ? conv(s.revenue, t, r.period_end) : null;
            }),
            backgroundColor: segColor(t, n, i), borderWidth: 0
          };
        })
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: themedScales({ stacked: true, yFmt: function (v) { return (v / 1000).toFixed(0) + 'B'; } }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: fiscalTip(rows),
              label: function (x) {
                var r = rows[x.dataIndex];
                var s = r.segments.find(function (g) { return g.name === x.dataset.label; });
                var line = x.dataset.label + ': ' + fmtB(x.parsed.y, ccy);
                if (s && num(s.profit) !== null && s.profit_metric) {
                  line += ' · ' + s.profit_metric + ' ' + fmtB(conv(s.profit, t, r.period_end), ccy);
                }
                return line;
              }
            }
          })
        }
      }
    });
  }

  function renderCapret(t) {
    var c = F.companies[t], rows = c.quarterly;
    // buybacks are reported in US$ millions for both companies; dividends in US$ per unit
    // Dividends are discrete declarations (GOOG quarterly since 2024 initiation,
    // BABA annual at fiscal Q4) — markers only in both panels: a connecting
    // line, or pre-initiation zeros, would fabricate a payout trajectory.
    var divVals = rows.map(function (r) { return num(r.dividend_per_unit); });
    var firstPay = -1;
    divVals.forEach(function (v, i) { if (firstPay === -1 && v !== null && v > 0) firstPay = i; });
    divVals = divVals.map(function (v, i) { return (firstPay !== -1 && i >= firstPay) ? v : null; });
    var divMax = divVals.reduce(function (a, v) { return (v !== null && v > a) ? v : a; }, 0);
    makeChart(t + 'Capret', {
      data: {
        labels: rows.map(function (r) { return shortQ(qkey(r.period_end)); }),
        datasets: [
          {
            type: 'bar', label: 'Buybacks',
            data: rows.map(function (r) { return num(r.buyback_usd_m); }),
            backgroundColor: withAlpha(accent(t), 0.75), borderWidth: 0, yAxisID: 'y', order: 2
          },
          {
            type: 'line', label: 'Dividend / unit',
            data: divVals,
            borderColor: cssVar('--pos'), borderWidth: 2, showLine: false,
            pointRadius: 4, pointHoverRadius: 5,
            pointBackgroundColor: cssVar('--pos'),
            spanGaps: false, tension: 0, yAxisID: 'y1', order: 1 // drawn above the bars
          }
        ]
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: themedScales({
          yFmt: function (v) { return (v / 1000).toFixed(0) + 'B'; },
          // dividend axis: zero-based with headroom so low points don't read as
          // zero and the peak doesn't touch the top gridline
          y1Min: 0, y1SuggestedMax: divMax > 0 ? divMax * 1.25 : 1,
          y1Fmt: function (v) { return '$' + (Math.round(v * 100) / 100); }
        }),
        plugins: {
          tooltip: Object.assign(tooltipBase(), {
            callbacks: {
              title: fiscalTip(rows),
              label: function (x) {
                return x.dataset.label === 'Buybacks'
                  ? 'Buybacks: ' + fmtB(x.parsed.y, 'USD')
                  : 'Dividend: ' + fmtUsd(x.parsed.y) + ' per unit';
              }
            }
          })
        }
      }
    });
  }

  function renderTable(t) {
    var c = F.companies[t], ccy = dispCcy(t);
    var rows = c.quarterly.slice(-8).reverse(); // newest first
    var isB = t === 'BABA';
    // negative values red (same treatment as the portfolio strip / stat chips);
    // cells use fmtBFix so every monetary column holds one unit (billions)
    function tdB(v, extra) {
      var cls = (num(v) !== null && v < 0) ? 'neg' : '';
      return '<td class="' + cls + '">' + fmtBFix(v, ccy) + (extra || '') + '</td>';
    }
    function tdEps(v) {
      var cls = (num(v) !== null && v < 0) ? 'neg' : '';
      return '<td class="' + cls + '">' + fmtEps(v, ccy) + '</td>';
    }
    var anyAnom = false;
    var html = '<table class="earn"><thead><tr>' +
      '<th>Period</th><th>Revenue</th><th>YoY</th><th>Op inc</th><th>Net inc</th>' +
      '<th>EPS</th>' + (isB ? '<th>EPS (adj)</th>' : '') +
      '<th>FCF</th><th>Capex</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var yoy = num(r.revenue_yoy);
      var yoyCls = yoy === null ? '' : (yoy >= 0 ? 'yoy-pos' : 'yoy-neg');
      // mechanical †: every row where net income exceeds operating income
      var anom = netAnomaly(r);
      if (anom) anyAnom = true;
      html += '<tr>' +
        '<td>' + esc(r.label.replace(/\s*\(.*\)/, '')) + '</td>' +
        tdB(conv(r.revenue, t, r.period_end)) +
        '<td class="' + yoyCls + '">' + fmtPctFrac(yoy) + '</td>' +
        tdB(conv(r.operating_income, t, r.period_end)) +
        tdB(conv(r.net_income, t, r.period_end), anom ? '<sup title="Net income exceeds operating income — non-operating items; see source filing">†</sup>' : '') +
        tdEps(conv(r.diluted_eps, t, r.period_end)) +
        (isB ? tdEps(conv(r.non_gaap_diluted_eps, t, r.period_end)) : '') +
        tdB(conv(r.free_cash_flow, t, r.period_end)) +
        tdB(conv(r.capex, t, r.period_end)) +
        '<td>' + (r.source_url ? '<a class="src" href="' + esc(r.source_url) + '" target="_blank" rel="noopener" title="Source filing">↗</a>' : '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    var notes = [];
    if (isB && state.currency === 'USD') {
      notes.push('YoY as reported in native CNY; US$ figures converted @ qtr-avg FX, so US$-implied growth differs.');
    }
    if (anyAnom) {
      notes.push('† net income exceeds operating income (non-operating items) — see source filing.');
    }
    if (notes.length) html += '<div class="tbl-note">' + notes.join(' ') + '</div>';
    $(t + 'Table').innerHTML = html;
  }

  function wireRevToggles() {
    document.querySelectorAll('.seg[data-revmode]').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-mode]');
        if (!b) return;
        var t = seg.dataset.revmode;
        state.revMode[t] = b.dataset.mode;
        seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        renderRevenue(t);
      });
    });
  }

  // =====================================================================
  // 6. footer
  // =====================================================================
  function renderFooter() {
    $('footer').innerHTML =
      '<p><b>Sources:</b> SEC EDGAR filings and company investor-relations releases (per-quarter links in the earnings tables). ' +
      'Prices: daily closes (weekly beyond 2y).</p>' +
      '<p><b>FX:</b> BABA figures converted CNY→USD at the quarterly-average USD/CNY rate for each period’s calendar quarter ' +
      '(latest rate ' + FX_LATEST.toFixed(4) + ' used where a quarterly average is unavailable, incl. TTM EPS for P/E).</p>' +
      '<p><b>Fiscal calendars:</b> Alibaba’s fiscal year ends Mar 31 (FY2026 Q4 = quarter ended Mar 2026); Alphabet reports on calendar quarters. ' +
      'Shared chart axes use calendar quarters; tooltips show each company’s own fiscal label.</p>' +
      '<p>Financial data curated from primary filings; verify before trading. Not investment advice.</p>' +
      '<p>financials.js generated ' + esc(F.generated || '—') + ' · prices.js generated ' + esc(P.generated || '—') +
      ' · dashboard assisted by Claude Code (Fable 5)</p>';
  }

  // =====================================================================
  // orchestration
  // =====================================================================
  function renderDynamic() { // everything that depends on theme or currency
    destroyCharts();
    renderPriceChart();
    renderComparatives();
    TICKERS.forEach(function (t) {
      renderRevenue(t);
      renderMargins(t);
      renderEPS(t);
      renderSegments(t);
      renderCapret(t);
      renderTable(t);
    });
  }

  function wireHeaderToggles() {
    // theme is a Dark|Light segmented control so the active theme reads as a
    // selected state (same grammar as USD|Native), not a mystery-action button
    var th = $('theme-toggle');
    function syncThemeSeg() {
      var cur = currentTheme();
      th.querySelectorAll('button[data-theme-opt]').forEach(function (x) {
        x.setAttribute('aria-pressed', x.dataset.themeOpt === cur ? 'true' : 'false');
      });
    }
    th.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-theme-opt]');
      if (!b || b.dataset.themeOpt === currentTheme()) return;
      setTheme(b.dataset.themeOpt);
      syncThemeSeg();
    });
    syncThemeSeg(); // initial state may be light via URL/localStorage/OS
    var ccy = $('ccy-toggle');
    ccy.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ccy]');
      if (!b || b.dataset.ccy === state.currency) return;
      state.currency = b.dataset.ccy;
      ccy.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderDynamic();
    });
  }

  try {
    renderHeader();
    renderPortfolio();
    renderFooter();
    wireHeaderToggles();
    wireRangePills();
    wireRevToggles();
    wireModal();
    renderDynamic();
    // QA hook: ?demo=holdings opens the edit-holdings modal on load
    if (new URLSearchParams(location.search).get('demo') === 'holdings') openModal();
  } catch (err) {
    fatal(err && err.message ? err.message : String(err));
    if (window.console) console.error(err);
  }
})();
