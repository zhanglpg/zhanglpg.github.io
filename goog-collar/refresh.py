#!/usr/bin/env python3
"""Daily refresh of goog-collar/data.js.

Fetches GOOG spot + history (Yahoo) and full option chain (CBOE delayed),
recomputes snapshot stats, IV term structure, 5 collar candidates (A-E),
probabilities, scenario table, CVaR/EV, maintenance triggers/timeline,
and regenerates auto-narrative strings. Curated narrative fields
(timing.conclusion, disclaimer) are preserved from the previous data.js
for the agent to edit when structure changes.

State (structure strikes/expiry with hysteresis, prevSpot, earnings date,
lastQuoteDate) lives in state.json. Prints a KEY=VALUE summary to stdout.

Usage: python3 refresh.py [--force]
"""
import json, math, os, sys, urllib.request, datetime
from statistics import NormalDist
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
SHARES = 5800
CONTRACTS = SHARES // 100
R = 0.04
N = NormalDist().cdf
MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
ET = ZoneInfo('America/New_York')
BJ = ZoneInfo('Asia/Shanghai')

# moneyness targets per candidate (calibrated to the original 2026-09 build)
MOONEY = {'A': (0.873, 1.164), 'B': (0.917, 1.135), 'C': (0.844, 1.193),
          'D': (0.873, 1.107), 'E': (0.873, 1.164)}
REANCHOR_TOL = 0.025   # re-anchor a leg when it drifts >2.5% from target moneyness

FLAGS = []

def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=timeout))

def load_json(path, default):
    if os.path.exists(path):
        try:
            return json.load(open(path))
        except Exception:
            pass
    return default

def load_prev_data():
    p = os.path.join(HERE, 'data.js')
    if not os.path.exists(p):
        return {}
    txt = open(p).read()
    try:
        i = txt.index('{'); j = txt.rindex('}')
        return json.loads(txt[i:j+1])
    except Exception:
        return {}

def exp_fmt(e):  return f"{MON[e.month-1]} {e.day}, {e.year}"
def exp_short(e): return f"{MON[e.month-1]}{e.day:02d}'{str(e.year)[2:]}"
def cn_midmonth(e):
    d = e.day
    part = '上旬' if d <= 10 else ('中旬' if d <= 20 else '下旬')
    return f"{e.year}-{e.month:02d}{part}"

def main():
    state = load_json(os.path.join(HERE, 'state.json'), {})
    prev = load_prev_data()

    # ---------- market data ----------
    try:
        y = fetch('https://query1.finance.yahoo.com/v8/finance/chart/GOOG?interval=1d&range=2y')['chart']['result'][0]
    except Exception as e:
        print(f"ERROR=yahoo_fetch detail={type(e).__name__}:{e}")
        sys.exit(1)
    try:
        cb = fetch('https://cdn.cboe.com/api/global/delayed_quotes/options/GOOG.json')['data']
    except Exception as e:
        print(f"ERROR=cboe_fetch detail={type(e).__name__}:{e}")
        sys.exit(1)

    meta = y['meta']
    spot = float(meta['regularMarketPrice'])
    qdt = datetime.datetime.fromtimestamp(meta['regularMarketTime'], ET)
    qdate = qdt.date()
    qdate_s = qdate.isoformat()
    # intraday detection: ET weekday 09:30-16:00 and quote time is today
    et_now = datetime.datetime.now(ET)
    mkt_open = (et_now.weekday() < 5 and
                (9*60+30) <= et_now.hour*60+et_now.minute < 16*60 and
                qdate == et_now.date())

    if qdate_s == state.get('lastQuoteDate') and '--force' not in sys.argv:
        print(f"NO_CHANGE quoteDate={qdate_s} spot={spot:.2f}")
        sys.exit(0)

    hi52 = float(meta['fiftyTwoWeekHigh']); lo52 = float(meta['fiftyTwoWeekLow'])
    prev_close = float(meta.get('previousClose') or 0)

    # price history + HV
    ts = y['timestamp']; closes_raw = y['indicators']['quote'][0]['close']
    pairs = [(t, c) for t, c in zip(ts, closes_raw) if c is not None]
    if not prev_close or abs(prev_close - spot) / spot > 0.15:
        # pairs[-1] is today's bar (live intraday or settled close); pairs[-2] is prior session
        prev_close = pairs[-2][1] if len(pairs) >= 2 else spot
    rets = [math.log(pairs[i][1]/pairs[i-1][1]) for i in range(1, len(pairs))]
    dates = [datetime.datetime.fromtimestamp(p[0], ET).date() for p in pairs[1:]]
    def hv(win, upto=None):
        r = rets[:upto][-win:] if upto else rets[-win:]
        if len(r) < win: return None
        m = sum(r)/win
        var = sum((x-m)**2 for x in r)/(win-1)
        return math.sqrt(var*252)*100
    hv21, hv63, hv126, hv252 = hv(21), hv(63), hv(126), hv(252)
    if hv21 is None or hv252 is None:
        print("ERROR=insufficient_history_for_HV"); sys.exit(1)
    hv63 = hv63 or hv21; hv126 = hv126 or hv21
    hv_series_all = []
    for i in range(21, len(rets)+1):
        hv_series_all.append(hv(21, upto=i))
    hv_1y = hv_series_all[-252:] if len(hv_series_all) >= 252 else hv_series_all
    hv21_pctile = sum(1 for x in hv_1y if x <= hv21)/len(hv_1y)*100
    hv_min, hv_max = min(hv_1y), max(hv_1y)
    last252 = pairs[-252:]
    peak, mdd, mdd_date = -1, 0, None
    for dd, p in zip(dates[-252:], [x[1] for x in last252]):
        if p > peak: peak = p
        cur = p/peak - 1
        if cur < mdd: mdd, mdd_date = cur, dd
    var95_1d = -1.645 * (hv21/100) / math.sqrt(252) * spot * SHARES

    chart = {
        'dates': [d.isoformat() for d in dates[-252:]],
        'closes': [round(p[1], 2) for p in last252],
        'hv21': [round(v, 1) for v in hv_series_all[-252:]],
    }

    # ---------- option chain ----------
    def parse(sym):
        b = sym[4:]; ymd = b[:6]
        return (datetime.date(2000+int(ymd[:2]), int(ymd[2:4]), int(ymd[4:6])), b[6], int(b[7:])/1000.0)
    by = {}
    for o in cb['options']:
        try:
            e, cp, k = parse(o['option'])
            by[(e, cp, k)] = o
        except Exception:
            continue
    exps = sorted(set(e for e, _, _ in by))
    iv30 = cb.get('iv30')

    def dte(e): return (e - qdate).days

    def usable(o):
        return o and o['bid'] > 0 and o['ask'] > 0 and o['ask'] >= o['bid']

    def price(o):
        if usable(o): return (o['bid']+o['ask'])/2
        if o and o.get('last_trade_price', 0) > 0: return o['last_trade_price']
        return o.get('theo', 0) if o else 0

    def nearest_strike(exp, cp, target, min_oi=300):
        rows = [(k, o) for (e, c, k), o in by.items() if e == exp and c == cp]
        rows = [(k, o) for k, o in rows if o.get('bid', 0) > 0 and o.get('ask', 0) > 0] or rows
        liquid = [(k, o) for k, o in rows if (o.get('open_interest') or 0) >= min_oi] or rows
        return min(liquid, key=lambda ko: (abs(ko[0]-target), -(ko[1].get('open_interest') or 0)))[0]

    def pick_expiry(lo, hi, target, from_date=None):
        base = from_date or qdate
        cands = [e for e in exps if lo <= (e-base).days <= hi]
        return min(cands, key=lambda e: abs((e-base).days - target)) if cands else None

    # ---------- earnings ----------
    earnings_s = state.get('earnings', '2026-10-28')
    try:
        earnings_d = datetime.date.fromisoformat(earnings_s)
    except Exception:
        earnings_d = None
    if earnings_d and earnings_d <= qdate:
        FLAGS.append('WARN_EARNINGS_PASSED')

    # ---------- structure A (sticky, with hysteresis) ----------
    st = state.get('structure', {})
    exp_a = None
    if st.get('expiry'):
        e = datetime.date.fromisoformat(st['expiry'])
        if e in exps and dte(e) >= 45:
            exp_a = e
    rolled = False
    if exp_a is None:
        exp_a = pick_expiry(90, 150, 120)
        if exp_a is None:
            print("ERROR=no_expiry_in_90_150_window"); sys.exit(1)
        rolled = bool(st.get('expiry'))
        if rolled: FLAGS.append('WARN_ROLL')
    tA = dte(exp_a)/365

    pm, cm = MOONEY['A']
    pk = st.get('put'); ck = st.get('call')
    reanchored = []
    tgt_p, tgt_c = spot*pm, spot*cm
    if rolled or pk is None or abs(pk - tgt_p)/tgt_p > REANCHOR_TOL or (exp_a, 'P', pk) not in by:
        new_pk = nearest_strike(exp_a, 'P', tgt_p)
        if pk and new_pk != pk: reanchored.append(f"put {pk}->{new_pk:g}")
        pk = new_pk
    if rolled or ck is None or abs(ck - tgt_c)/tgt_c > REANCHOR_TOL or (exp_a, 'C', ck) not in by:
        new_ck = nearest_strike(exp_a, 'C', tgt_c)
        if ck and new_ck != ck: reanchored.append(f"call {ck}->{new_ck:g}")
        ck = new_ck
    if reanchored: FLAGS.append('INFO_REANCHORED ' + ','.join(reanchored))

    # ---------- candidates ----------
    def build_cand(letter, exp, put_k, call_k, name, note_fn):
        p = by.get((exp, 'P', put_k)); c = by.get((exp, 'C', call_k))
        if p is None or c is None:
            put_k = nearest_strike(exp, 'P', put_k); call_k = nearest_strike(exp, 'C', call_k)
            p = by.get((exp, 'P', put_k)); c = by.get((exp, 'C', call_k))
        if p is None or c is None:
            FLAGS.append(f'ERROR=candidate_{letter}_missing_legs'); return None
        if not usable(p) or not usable(c):
            FLAGS.append(f'WARN_QUOTE_{letter}')
        pmid, cmid = price(p), price(c)
        net_mid = cmid - pmid
        net_worst = (c['bid'] - p['ask']) if usable(p) and usable(c) else net_mid
        d_ = dte(exp)
        max_loss = (spot - put_k)*SHARES - net_mid*SHARES
        max_gain = (call_k - spot)*SHARES + net_mid*SHARES
        piv, civ = (p.get('iv') or 0.32), (c.get('iv') or 0.32)
        r = {
            'letter': letter, 'name': name, 'exp': exp.isoformat(), 'expFmt': exp_fmt(exp),
            'expShort': exp_short(exp), 'dte': d_, 'pk': put_k, 'ck': call_k,
            'pmid': round(pmid, 2), 'cmid': round(cmid, 2),
            'net_mid': round(net_mid, 2), 'net_worst': round(net_worst, 2),
            'psprd': round(p['ask']-p['bid'], 2), 'csprd': round(c['ask']-c['bid'], 2),
            'pOI': int(p.get('open_interest') or 0), 'cOI': int(c.get('open_interest') or 0),
            'pIV': round(piv*100, 1), 'cIV': round(civ*100, 1),
            'pD': round(p.get('delta') or 0, 2), 'cD': round(c.get('delta') or 0, 2),
            'max_loss': round(max_loss), 'max_gain': round(max_gain),
            'ann_yield': round(net_mid/spot*365/d_*100, 1),
            'floor_pct': round((put_k/spot-1)*100, 1), 'cap_pct': round((call_k/spot-1)*100, 1),
            'putSym': f"GOOG {exp_short(exp)} ${put_k:g} Put", 'callSym': f"GOOG {exp_short(exp)} ${call_k:g} Call",
        }
        r['note'] = note_fn(r)
        return r

    exp_d = pick_expiry(50, 80, 64) or exp_a
    exp_e = pick_expiry(160, 210, 183) or exp_a
    def mk(letter, exp, pmn, cmn):
        return (exp, nearest_strike(exp, 'P', spot*pmn), nearest_strike(exp, 'C', spot*cmn))

    eA = (exp_a, pk, ck)
    eB = mk('B', exp_a, *MOONEY['B'])
    eC = mk('C', exp_a, *MOONEY['C'])
    eD = mk('D', exp_d, *MOONEY['D'])
    eE = mk('E', exp_e, *MOONEY['E'])

    netA = price(by[(eA[0],'C',eA[2])]) - price(by[(eA[0],'P',eA[1])])
    A_name = f"A. 推荐·{'净贷记' if netA >= 0 else '净借记'} ({exp_short(exp_a)} {pk:g}P/{ck:g}C)"
    cands = [
        build_cand('A', *eA, A_name,
            lambda r: f"主结构: 覆盖{'财报+' if earnings_d and qdate < earnings_d <= exp_a else ''}年末, cap{'≈52周高点' + format(hi52, '.0f') + '下方' if r['ck'] < hi52 else '在52周高点上方'}, 流动性最优"),
        build_cand('B', *eB, f"B. 紧保护 ({exp_short(eB[0])} {eB[1]:g}P/{eB[2]:g}C)",
            lambda r: f"floor仅{r['floor_pct']:.1f}%, 保护更近, 代价是cap +{r['cap_pct']:.1f}%"),
        build_cand('C', *eC, f"C. 宽上行 ({exp_short(eC[0])} {eC[1]:g}P/{eC[2]:g}C)",
            lambda r: f"让出更少上行(cap +{r['cap_pct']:.1f}%), floor更远({r['floor_pct']:.1f}%)"),
        build_cand('D', *eD, f"D. 短周期 ({exp_short(eD[0])} {eD[1]:g}P/{eD[2]:g}C)",
            lambda r: f"{r['dte']}DTE, 年化成本效率最高, 需频繁滚动"),
        build_cand('E', *eE, f"E. 长周期 ({exp_short(eE[0])} {eE[1]:g}P/{eE[2]:g}C)",
            lambda r: f"{r['dte']}DTE, 一次锁定约{r['dte']//30}个月, 维护次数最少"),
    ]
    cands = [c for c in cands if c]
    if not cands or cands[0]['letter'] != 'A':
        print("ERROR=candidate_A_build_failed"); sys.exit(1)
    A = cands[0]
    get = lambda L: next((c for c in cands if c['letter'] == L), None)
    B, C, D, E = get('B'), get('C'), get('D'), get('E')

    if A['net_worst'] < 0:
        FLAGS.append('WARN_CREDIT_NEG')

    # ---------- probabilities / EV / CVaR ----------
    def d2(K, sig, T): return (math.log(spot/K) + (R - sig**2/2)*T)/(sig*math.sqrt(T))
    def probs(c):
        T = c['dte']/365
        pb = N(-d2(c['pk'], c['pIV']/100, T))
        pa = N(d2(c['ck'], c['cIV']/100, T))
        return [round(pb*100, 1), round(max(0.0, (1-pb-pa))*100, 1), round(pa*100, 1)]
    A_probs, B_probs = probs(A), (probs(B) if B else [0, 0, 0])

    ks = sorted(set(k for (e, c, k) in by if e == exp_a and c == 'C'), key=lambda k: abs(k-spot))
    atm_o = by.get((exp_a, 'C', ks[0])) if ks else None
    sig_ev = (atm_o['iv'] if atm_o and atm_o.get('iv', 0) > 0 else 0.32)
    TA = dte(exp_a)/365
    def integrate(fn, n=6000):
        pdf = lambda x: math.exp(-x*x/2)/math.sqrt(2*math.pi)
        tot, step = 0, 10/n
        for i in range(n+1):
            z = -5 + i*step
            S = spot*math.exp((R - sig_ev**2/2)*TA + sig_ev*math.sqrt(TA)*z)
            tot += pdf(z)*step*fn(S)
        return tot
    collar_pnl = lambda S: (min(max(S, A['pk']), A['ck']) - spot)*SHARES + A['net_mid']*SHARES
    ev_u = integrate(lambda S: (S-spot)*SHARES)
    ev_a = integrate(collar_pnl)
    ev_b = integrate(lambda S: (min(max(S, B['pk']), B['ck']) - spot)*SHARES + B['net_mid']*SHARES) if B else 0
    pl_u = integrate(lambda S: 1 if (S-spot)*SHARES < -100000 else 0)
    pl_a = integrate(lambda S: 1 if collar_pnl(S) < -100000 else 0)
    def cvar(fn, q=0.05, n=40000):
        vals = []
        inv = NormalDist().inv_cdf
        for i in range(n):
            z = inv((i+0.5)/n)
            S = spot*math.exp((R - sig_ev**2/2)*TA + sig_ev*math.sqrt(TA)*z)
            vals.append(fn(S))
        vals.sort(); k = int(q*n)
        return sum(vals[:k])/k
    cvar_u = cvar(lambda S: (S-spot)*SHARES)
    cvar_a = cvar(collar_pnl)

    # ---------- scenario table ----------
    grid = set()
    lo_g, hi_g = A['pk']*0.855, A['ck']*1.105
    step = (hi_g-lo_g)/16
    for i in range(17):
        grid.add(round((lo_g + i*step)/10)*10)
    grid |= {round(spot, 2), A['pk'], A['ck']}
    scenarios = []
    for S in sorted(grid):
        unh = (S-spot)*SHARES
        hed = (min(max(S, A['pk']), A['ck']) - spot)*SHARES + A['net_mid']*SHARES
        scenarios.append([S, round(unh), round(hed), round(hed-unh)])

    # ---------- IV term structure ----------
    term = []
    for e in exps:
        if dte(e) < 5: continue
        ks_c = sorted(set(k for (ee, c, k) in by if ee == e and c == 'C'), key=lambda k: abs(k-spot))
        atm = by.get((e, 'C', ks_c[0])) if ks_c else None
        atm_iv = atm.get('iv') if atm and atm.get('iv', 0) > 0 else None
        if atm_iv is None: continue
        pk_e = nearest_strike(e, 'P', spot*MOONEY['A'][0], min_oi=1)
        ck_e = nearest_strike(e, 'C', spot*MOONEY['A'][1], min_oi=1)
        po, co = by.get((e, 'P', pk_e)), by.get((e, 'C', ck_e))
        skew = round((po['iv'] - co['iv'])*100, 1) if po and co and po.get('iv') and co.get('iv') else 0
        term.append({'exp': e.isoformat(), 'dte': dte(e), 'iv': round(atm_iv*100, 1), 'skew': skew})
        if len(term) >= 11: break
    term_e_idx = -1
    if earnings_d:
        for i, t in enumerate(term):
            if datetime.date.fromisoformat(t['exp']) >= earnings_d:
                term_e_idx = i; break
    pre = [t['iv'] for i, t in enumerate(term) if term_e_idx < 0 or i < term_e_idx]
    post = [t['iv'] for i, t in enumerate(term) if term_e_idx >= 0 and i >= term_e_idx]
    pre_rng = f"{min(pre):.1f}–{max(pre):.1f}%" if pre else "n/a"
    post_rng = f"{min(post):.1f}–{max(post):.1f}%" if post else "n/a"
    prem_lo = round(min(post) - hv21) if post else 0
    prem_hi = round(max(post) - hv21) if post else 0
    term_note = (f"ATM 隐含波动率期限结构（%）。财报（{earnings_s}）前到期约 {pre_rng}；"
                 f"覆盖财报及以后的到期 {post_rng}。") if term_e_idx >= 0 else \
                f"ATM 隐含波动率期限结构（%），当前区间 {pre_rng}。"

    # ---------- maintenance bits ----------
    trig_up = round(A['ck']*0.97); trig_down = round(A['pk']*1.03)
    roll_start = exp_a - datetime.timedelta(days=30)
    next_roll_e = pick_expiry(60, 165, 95, from_date=exp_a)
    next_roll = exp_short(next_roll_e) if next_roll_e else '下一月度到期'
    sp_up = round(spot*1.11/5)*5; sp_dn = round(spot*0.87/5)*5
    up_ex = f"若股价涨至 {sp_up:g}，新 collar 变为 {round(sp_up*MOONEY['A'][0]/10)*10:g}P/{round(sp_up*MOONEY['A'][1]/10)*10:g}C"
    dn_ex = f"若跌至 {sp_dn:g}，变为 {round(sp_dn*MOONEY['A'][0]/10)*10:g}P/{round(sp_dn*MOONEY['A'][1]/10)*10:g}C"
    leaps_e = next((e for e in exps if e.month == 1 and e.year >= qdate.year+1 and dte(e) > 300), None)
    leaps_sym = f"{exp_short(leaps_e)} {round(spot*0.85/5)*5:g}P" if leaps_e else '长期 LEAPS Put'
    timeline = [
        {'t': f"T+0 · {qdate_s}", 'cls': 'blue',
         'd': f"当前评估结构：{exp_short(exp_a)} {A['pk']:g}P/{A['ck']:g}C ×{CONTRACTS}，净贷记(mid) {A['net_mid']:+.2f}/股"},
    ]
    if earnings_d and qdate < earnings_d <= exp_a:
        timeline.append({'t': earnings_s, 'cls': 'gold',
                         'd': '财报日：不做任何操作，让 collar 工作；财报后次日复盘 delta 与触发价'})
    timeline.append({'t': cn_midmonth(roll_start), 'cls': 'orange',
                     'd': f"剩余 ~30 DTE（{roll_start.isoformat()} 前后）：启动滚动评估"})
    timeline.append({'t': exp_a.isoformat(), 'cls': 'green',
                     'd': f"到期：两腿大概率作废；同日或次日建立新一轮 collar（推荐滚动到 {next_roll}）"})

    # ---------- auto narratives ----------
    off_high = (spot/hi52 - 1)*100
    sd = A['pIV']/100*math.sqrt(A['dte']/365)
    sd_mult = abs(math.log(A['pk']/spot))/sd if sd else 1.3
    bull = [
        {'b': '已实现波动率处低位' if hv21_pctile < 40 else '已实现波动率状态',
         't': f"：HV21 为 {hv21:.1f}%，处近一年 {hv21_pctile:.0f}% 分位（1年区间 {hv_min:.1f}–{hv_max:.1f}%）。市场平静期买 Put 最便宜。" if hv21_pctile < 40
              else f"：HV21 为 {hv21:.1f}%，处近一年 {hv21_pctile:.0f}% 分位（1年区间 {hv_min:.1f}–{hv_max:.1f}%），波动率不再便宜，保护成本上升。"},
        {'b': f"股价距高点 {off_high:+.1f}%",
         't': f"：{A['pk']:g} 一线（{A['floor_pct']:.1f}%）作保护位，{A['ck']:g}（{'52周高点 ' + format(hi52, '.1f') + ' 下方' if A['ck'] < hi52 else '已越过52周高点 ' + format(hi52, '.1f')}）作卖 Call 位，均为自然技术位。"},
    ]
    if term_e_idx >= 0 and post and pre and (min(post) - max(pre)) >= 1.5:
        bull.append({'b': '财报前 IV 台阶',
                     't': f"：卖跨财报的 Call（{post_rng} IV）收的是\"贵\"的权利金；财报前到期只有 {pre_rng}。用高 IV 的 Call 补贴 Put，是零成本 collar 的窗口。"})
    skew_jan = term[term_e_idx]['skew'] if term_e_idx >= 0 and term_e_idx < len(term) else (term[-1]['skew'] if term else 0)
    bull.append({'b': '偏度温和' if abs(skew_jan) < 4 else '偏度偏高',
                 't': f"：{A['pk']:g}P 相对 {A['ck']:g}C 的 IV 差约 {skew_jan:+.1f} 个百分点，下行保护{'没有被市场抢贵' if abs(skew_jan) < 4 else '已被市场买贵，Put 一侧成本偏高'}。"})
    bear = []
    iv_mid = (min(post)+max(post))/2 if post else (sum(t['iv'] for t in term)/len(term) if term else 30)
    if hv21 < iv_mid:
        bear.append({'b': f"HV21 ({hv21:.0f}%) 低于 IV (~{iv_mid:.0f}%)",
                     't': f"：期权绝对价格不算便宜，隐含波动率存在 ~{prem_lo if prem_lo > 0 else int(iv_mid-hv21)}–{max(prem_hi, int(iv_mid-hv21)+2)} pts 的风险溢价。若后续行情继续平静，买 Put 一侧会亏时间价值。"})
    else:
        bear.append({'b': f"IV (~{iv_mid:.0f}%) 不高于 HV21 ({hv21:.0f}%)",
                     't': '：风险溢价已被压缩，卖 Call 一侧的补贴变薄，零成本更难达成；但反过来说买保护相对便宜，可考虑收紧 collar。'})
    if earnings_d and qdate < earnings_d <= exp_a:
        bear.append({'b': f"{earnings_s} 财报在窗口内",
                     't': '：事件双向跳空风险大（GOOG 财报日单日波幅历史上常达 ±5–9%）。Collar 恰好覆盖它——这是功能而非缺陷，但入场后不久就会经受大波动考验。'})
    if D:
        bear.append({'b': '近月更便宜',
                     't': f"：若只为扛过近期事件，{D['expShort']} 短周期 collar 年化成本效率更高（{D['ann_yield']:+.1f}%），但需更频繁滚动，IV 上行周期里摩擦成本累积。"})

    why = [
        {'b': f"{A['pk']:g} Put（{A['floor_pct']:+.1f}%）",
         't': f"≈ {sd_mult:.1f}σ 下行（按 {A['pIV']:.0f}% IV × {A['dte']}天），OI {A['pOI']:,}，价差 ${A['psprd']:.2f}，流动性充足。"},
        {'b': f"{A['ck']:g} Call（{A['cap_pct']:+.1f}%）",
         't': f"OI {A['cOI']:,}，价差 ${A['csprd']:.2f}。{'压在 52 周高点 ' + format(hi52, '.1f') + ' 之下——只有创新高式逼空行情才会真正牺牲上行。' if A['ck'] < hi52 else '位于 52 周高点 ' + format(hi52, '.1f') + ' 上方，保留全部已知区间内的上行。'}"},
        {'b': f"净{'贷记' if A['net_mid'] >= 0 else '借记'} {A['net_mid']:+.2f}/股",
         't': (f"Call 卖在 {A['cIV']:.1f}% IV 上，补贴了 {A['pIV']:.1f}% IV 的 Put。最坏成交口径 {A['net_worst']:+.2f}/股（{A['net_worst']*SHARES:+,.0f} 美元），"
               + ('不需要贴钱。' if A['net_worst'] >= 0 else '需要小幅贴钱，挂限价单可改善。'))},
    ]

    def fmtD(v): return ('-' if v < 0 else '+') + '$' + format(abs(round(v)), ',')
    takeaway = []
    if B:
        takeaway.append(f"B（{B['expShort']} {B['pk']:g}P/{B['ck']:g}C）净成本 {fmtD(B['net_mid']*SHARES)}，把 floor 从 {A['floor_pct']:.1f}% 收紧到 {B['floor_pct']:.1f}%——若你的真实底线是\"回撤不超过 10%\"，选 B；若是\"防黑天鹅、平时不碍事\"，选 A。")
    if D:
        takeaway.append(f"D（{D['expShort']}）净贷记 {fmtD(D['net_mid']*SHARES)}（年化 {D['ann_yield']:+.1f}%）最高，但 cap 只有 +{D['cap_pct']:.1f}%，短周期滚动在 IV 上行周期里每次都卖得便宜、买得贵，摩擦成本累积。")
    if E:
        takeaway.append(f"E（{E['expShort']}）一次锁定 {E['dte']} 天、维护最省，但 {exp_short(exp_a)} 本就该按新情况重估，提前支付时间价值。")
    takeaway.append(f"A 的 {A['dte']} 天期限在\"事件覆盖 × 流动性 × 滚动频率\"三者间平衡最好。")

    opp_price = round(spot*1.31/5)*5
    opp_cost = (opp_price-spot)*SHARES - A['max_gain']
    div_q = state.get('divQ', 0.22)
    risk = {
        'oppPrice': opp_price, 'oppCost': round(opp_cost),
        'taxLabel': f"{exp_fmt(exp_a)} 前后", 'taxYear': exp_a.year,
        'divAnnual': round(div_q*4*SHARES),
    }
    cvar_cut = round((1 - abs(cvar_a)/abs(cvar_u))*100) if cvar_u else 0
    hv_desc = 'HV 低位 + 财报前 IV 台阶' if hv21_pctile < 40 and term_e_idx >= 0 else ('当前波动率环境' )
    summary = (f"以 {exp_short(exp_a)} {A['pk']:g}P/{A['ck']:g}C ×{CONTRACTS} 的{'净贷记' if A['net_mid'] >= 0 else '净借记'} collar，"
               f"把 ${spot*SHARES:,.0f} 持仓的最大亏损锁定在 -${A['max_loss']:,.0f}（{A['floor_pct']:.1f}% 处封底，约 {-A['max_loss']/(spot*SHARES)*100:.1f}%）、"
               f"上行保留到 +${A['max_gain']:,.0f}（+{A['cap_pct']:.1f}%）；5% 尾部损失从 {fmtD(cvar_u)} 削减到 {fmtD(cvar_a)}（-{cvar_cut}%）。"
               f"之后按\"剩余30天滚动 + 触发规则 + 年度仓位重估\"维持。")

    exec_limit = math.floor((A['net_mid'] + A['net_worst'])/2*20)/20 if A['net_mid'] >= 0 else None

    # ---------- assemble ----------
    now_bj = datetime.datetime.now(BJ).strftime('%Y-%m-%d %H:%M')
    data = {
        'meta': {
            'generated': prev.get('meta', {}).get('generated', '2026-09-18 (北京时间)'),
            'updated': f"最后更新 {now_bj} 北京时间 · 数据截至 {qdate_s} 美股{'盘中（实时价，未收盘）' if mkt_open else '收盘'}",
            'quoteDate': qdate_s,
            'intraday': mkt_open,
            'quoteTs': 'CBOE delayed quotes + Yahoo Finance chart API',
            'ticker': 'GOOG',
            'disclaimer': prev.get('meta', {}).get('disclaimer',
                '本报告基于公开延时行情数据自动分析生成，仅供个人研究参考，不构成投资建议。期权交易有风险，执行前请与券商/税务顾问确认细节。'),
        },
        'position': {
            'shares': SHARES, 'contracts': CONTRACTS, 'spot': round(spot, 2),
            'value': round(spot*SHARES), 'prevSpot': round(prev_close, 2),
            'chgPct': round((spot/prev_close - 1)*100, 2),
            'cboeSpot': cb.get('current_price'),
        },
        'snapshot': {
            'low52': round(lo52, 2), 'high52': round(hi52, 2),
            'offHigh': round(off_high, 1), 'aboveLow': round((spot/lo52 - 1)*100, 1),
            'mdd1y': round(mdd*100, 1), 'mddDate': mdd_date.isoformat() if mdd_date else '',
            'hv21': round(hv21, 1), 'hv21Pctile': round(hv21_pctile), 'hv63': round(hv63, 1),
            'hv126': round(hv126, 1), 'hv252': round(hv252, 1),
            'hvMin': round(hv_min, 1), 'hvMax': round(hv_max, 1),
            'iv30': round(iv30, 1) if iv30 else None,
            'earnings': earnings_s,
            'earningsNote': state.get('earningsNote', '周三盘后（未经公司确认，华尔街预期口径）'),
            'divYield': state.get('divYield', 0.25), 'divQ': div_q,
            'var95_1d': round(var95_1d), 'hv21r': round(hv21),
        },
        'chart': chart,
        'term': term, 'termNote': term_note, 'termEarningsIdx': term_e_idx,
        'candidates': cands,
        'scenarios': scenarios,
        'probs': {'A_probs': A_probs, 'B_probs': B_probs,
                  'ev': {'unhedged': round(ev_u), 'A': round(ev_a), 'B': round(ev_b)},
                  'p_loss100k': {'unhedged': round(pl_u*100, 1), 'A': round(pl_a*100, 1)}},
        'cvar': {'unhedged': round(cvar_u), 'A': round(cvar_a), 'cut': cvar_cut},
        'recommended': 'A',
        'timing': {
            'preRange': pre_rng, 'postRange': post_rng,
            'premium': f"{prem_lo}–{prem_hi}",
            'bull': bull, 'bear': bear,
            'marketContext': prev.get('timing', {}).get('marketContext', []),
            'marketContextAsOf': prev.get('timing', {}).get('marketContextAsOf', ''),
            'conclusion': prev.get('timing', {}).get('conclusion', {
                'title': '结论：当前是可评估的构建窗口',
                'body': '（首次自动生成，待复核）结合 HV 分位、IV 期限结构与财报日历判断构建时机。',
                'note': '若股价在入场前大幅变动，优先按维持章节的规则重设行权价。',
            }),
        },
        'build': {'why': why, 'execLimit': exec_limit},
        'alts': {'takeaway': ' '.join(takeaway)},
        'maint': {
            'timeline': timeline, 'triggers': {'up': trig_up, 'down': trig_down},
            'upExample': up_ex, 'downExample': dn_ex,
            'nextRoll': next_roll, 'leapsSym': leaps_sym,
        },
        'risk': risk,
        'summary': summary,
    }

    with open(os.path.join(HERE, 'data.js'), 'w') as f:
        f.write('// Auto-generated by refresh.py — GOOG collar report data (CBOE delayed + Yahoo Finance)\n')
        f.write('const DATA = ')
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write(';\n')

    state.update({
        'prevSpot': spot,
        'structure': {'expiry': exp_a.isoformat(), 'put': pk, 'call': ck},
        'earnings': earnings_s,
    })
    if not mkt_open:
        # only record settled closes; intraday runs must not suppress tomorrow's settled-close refresh
        state['lastQuoteDate'] = qdate_s
    state.setdefault('buildDate', qdate_s)
    json.dump(state, open(os.path.join(HERE, 'state.json'), 'w'), indent=1)

    hit = 'none'
    if spot >= trig_up: hit = f"CALL侧: 股价≥{trig_up}(cap-3%) → 评估 roll up"
    elif spot <= trig_down: hit = f"PUT侧: 股价≤{trig_down}(floor+3%) → 检查 roll down"
    if iv30 and iv30 > 40: hit += f"; IV30={iv30:.0f}%>40% 事件溢价高"
    earn_in = 'yes' if earnings_d and qdate < earnings_d <= exp_a else 'no'

    print(f"DATE={now_bj} quoteDate={qdate_s} intraday={'yes' if mkt_open else 'no'}")
    print(f"SPOT={spot:.2f} chg={(spot/prev_close-1)*100:+.2f}% prevClose={prev_close:.2f} posValue=${spot*SHARES:,.0f}")
    print(f"STRUCTURE={exp_short(exp_a)} {pk:g}P/{ck:g}C DTE={dte(exp_a)} rolled={rolled} reanchored={','.join(reanchored) if reanchored else 'none'}")
    print(f"CREDIT mid={A['net_mid']:+.2f}/sh (${A['net_mid']*SHARES:+,.0f}) worst={A['net_worst']:+.2f}/sh ann={A['ann_yield']:+.1f}%")
    print(f"RANGE floor={A['floor_pct']:.1f}% cap=+{A['cap_pct']:.1f}% maxLoss=-${A['max_loss']:,.0f} maxGain=+${A['max_gain']:,.0f}")
    print(f"PROBS belowFloor={A_probs[0]}% between={A_probs[1]}% aboveCap={A_probs[2]}%")
    print(f"VOL HV21={hv21:.1f}(pctile {hv21_pctile:.0f}) IV30={iv30:.1f} preEarningsIV={pre_rng} postEarningsIV={post_rng} skew={skew_jan:+.1f}")
    print(f"TRIGGERS up={trig_up} down={trig_down} hit={hit}")
    print(f"EARNINGS={earnings_s} inWindow={earn_in}")
    print(f"CVAR5 unhedged=${cvar_u:,.0f} collar=${cvar_a:,.0f} cut={cvar_cut}%")
    print(f"FLAGS={';'.join(FLAGS) if FLAGS else 'OK'}")

if __name__ == '__main__':
    main()
