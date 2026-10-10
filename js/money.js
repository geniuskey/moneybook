/* Copyright (c) 2026 geniuskey and MoneyBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   MoneyBook 돈 계산 엔진 — 전역 객체 MN
   모든 장이 같은 계산(급여·세금·복리·대출·채권·포트폴리오·은퇴)을 쓰게 한다.
   단위: 원, 비율은 소수(연 3.5% → 0.035). 브라우저와 node 양쪽에서 동작한다.
     node -e "const MN=require('./js/money.js'); console.log(MN.payroll(36e6))"
   ========================================================================== */
(function (root) {
  "use strict";
  const MN = {};

  /* ------------------------------------------------------------ 2026년 제도 값 (대표값, 해마다 바뀐다) */
  MN.KR = {
    year: 2026,
    minWage: 10320,              // 최저시급(원)
    workHoursMonth: 209,         // 주 40시간 + 주휴 → 월 환산 시간
    nps: 0.0475,                 // 국민연금 근로자 몫(총 9.5%, 2026~ 매년 0.5%p 인상해 13%까지)
    npsTotal: 0.095,
    npsCap: 6590000,             // 2026-07-01~2027-06-30 기준소득월액 상한
    npsFloor: 410000,            // 같은 기간 기준소득월액 하한
    npsCapFirstHalf: 6370000,    // 2026년 1~6월 상한
    npsFloorFirstHalf: 400000,   // 2026년 1~6월 하한
    npsA: 3190000,               // A값: 가입자 전체 평균소득월액(약)
    npsCoef: 1.29,               // 소득대체율 43% 기준 계수
    health: 0.03595,             // 건강보험 근로자 몫(총 7.19%)
    ltc: 0.1314,                 // 장기요양보험: 건강보험료의 13.14%
    emp: 0.009,                  // 고용보험 근로자 몫
    brackets: [                  // 종합소득세 과세표준 구간 [상한, 세율]
      [14e6, 0.06], [50e6, 0.15], [88e6, 0.24], [150e6, 0.35],
      [300e6, 0.38], [500e6, 0.40], [1e9, 0.42], [Infinity, 0.45],
    ],
    localTax: 0.1,               // 지방소득세 = 소득세의 10%
    personalDeduction: 1.5e6,    // 인적공제 1인당
    interestTax: 0.154,          // 이자·배당소득세(지방세 포함)
    finIncomeThreshold: 2e7,     // 금융소득 종합과세 기준
    depositProtect: 1e8,         // 예금자 보호 한도(1인·1금융회사, 원리금 합계)
    maxRate: 0.2,                // 법정 최고금리
    dsr: 0.4,                    // 은행권 DSR 한도
    isa: { free: 2e6, freeLow: 4e6, rate: 0.099, yearLimit: 2e7 },
    pensionCredit: { limit: 9e6, savingLimit: 6e6, high: 0.165, low: 0.132, cut: 55e6 },
    retireAge: 60, npsAge: 65,
    transfer: {                  // 증여세·상속세
      brackets: [[1e8, 0.1], [5e8, 0.2], [1e9, 0.3], [3e9, 0.4], [Infinity, 0.5]],
      filing: 0.03,              // 신고세액공제
      giftDed: 5e7,              // 직계존속 → 성년 자녀, 10년 합산
      giftDedMinor: 2e7,         // 미성년 자녀
      wedDed: 1e8,               // 혼인·출산 증여재산공제(평생 1억)
      lump: 5e8,                 // 상속 일괄공제
      basic: 2e8, perChild: 5e7, // 기초공제 + 자녀공제(일괄공제와 큰 쪽)
      spouse: 5e8,               // 배우자 상속공제 최소액
      finMax: 2e8,               // 금융재산 상속공제 한도
    },
  };

  /* ------------------------------------------------------------ 기본 수학 */
  MN.round = (x, unit = 1) => Math.round(x / unit) * unit;
  /** 10원 미만 절사(급여 공제액 관행) */
  MN.floor10 = (x) => {
    const scaled = x / 10, nearest = Math.round(scaled);
    const tolerance = 2 * Number.EPSILON * Math.max(1, Math.abs(scaled));
    // Only snap floating-point representation noise at an exact 10-won boundary.
    return Math.floor(Math.abs(scaled - nearest) <= tolerance ? nearest : scaled) * 10;
  };
  /** 연 → 월 실효 이율: (1+r)^(1/12)-1 */
  MN.monthly = (r) => Math.pow(1 + r, 1 / 12) - 1;
  /** 실질 이율 */
  MN.real = (nominal, inflation) => (1 + nominal) / (1 + inflation) - 1;
  /** 72의 법칙 근사와 정확값 */
  MN.doubling = (r) => ({ rule72: 72 / (r * 100), exact: Math.log(2) / Math.log(1 + r) });

  /** 미래가치. r: 기간 이율, n: 기간 수, pmt: 기간 말 적립액, pv: 시작 금액, due: 기초 납입이면 true */
  MN.fv = function (r, n, pmt = 0, pv = 0, due = false) {
    if (r === 0) return pv + pmt * n;
    const g = Math.pow(1 + r, n);
    return pv * g + pmt * ((g - 1) / r) * (due ? 1 + r : 1);
  };
  /** 현재가치. fv를 n기간 뒤에 받고, 매 기간 말 pmt를 받을 때 */
  MN.pv = function (r, n, pmt = 0, fv = 0) {
    if (r === 0) return fv + pmt * n;
    const g = Math.pow(1 + r, n);
    return fv / g + pmt * (1 - 1 / g) / r;
  };
  /** 원리금균등 상환액(기간 이율 r, 기간 n) */
  MN.pmt = function (P, r, n) {
    if (n <= 0) return P;
    if (r === 0) return P / n;
    return (P * r) / (1 - Math.pow(1 + r, -n));
  };
  /** 순현재가치. flows[0]은 지금(t=0) */
  MN.npv = (r, flows) => flows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  /** 내부수익률(이분법). 해가 없으면 NaN */
  MN.irr = function (flows, lo = -0.99, hi = 1) {
    let f = (r) => MN.npv(r, flows), a = f(lo), b = f(hi);
    while (!isFinite(a) && lo < -1e-6) { lo /= 2; a = f(lo); }   // 기간이 길면 −99%에서 할인 계수가 넘친다
    if (!isFinite(a) || !isFinite(b) || a * b > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2, v = f(m);
      if (Math.abs(v) < 1e-7) return m;
      if (a * v < 0) { hi = m; b = v; } else { lo = m; a = v; }
    }
    return (lo + hi) / 2;
  };

  /**
   * 해마다 적립하며 굴린 결과(월 복리, 월말 적립).
   *   MN.grow({ start, monthly, rate, years, inflation, raise(적립액 연 증가율), fee(연 보수) })
   *   → [{ year, contrib(누적 원금), value(명목), real(오늘 돈 가치), interest(누적 수익) }] (year 0 포함)
   */
  MN.grow = function (o) {
    const rm = MN.monthly((o.rate || 0) - (o.fee || 0)), out = [];
    let v = o.start || 0, c = o.start || 0, pay = o.monthly || 0;
    out.push({ year: 0, contrib: c, value: v, real: v, interest: 0 });
    for (let y = 1; y <= o.years; y++) {
      for (let m = 0; m < 12; m++) { v = v * (1 + rm) + pay; c += pay; }
      pay *= 1 + (o.raise || 0);
      const real = v / Math.pow(1 + (o.inflation || 0), y);
      out.push({ year: y, contrib: c, value: v, real, interest: v - c });
    }
    return out;
  };

  /* ------------------------------------------------------------ 소득세와 급여 */
  /** 과세표준 → { tax(산출세액), marginal(한계세율), steps:[{lo, hi, rate, amount}] } */
  MN.incomeTax = function (base) {
    let lo = 0, tax = 0, marginal = 0;
    const steps = [];
    for (const [hi, rate] of MN.KR.brackets) {
      if (base > lo) {
        const amt = (Math.min(base, hi) - lo) * rate;
        tax += amt; marginal = rate;
        steps.push({ lo, hi, rate, amount: amt });
      }
      lo = hi;
    }
    return { tax, marginal: base > 0 ? marginal : 0, steps };
  };
  /** 근로소득공제(총급여 기준, 한도 2,000만원) */
  MN.earnedDeduction = function (g) {
    let d;
    if (g <= 5e6) d = g * 0.7;
    else if (g <= 15e6) d = 3.5e6 + (g - 5e6) * 0.4;
    else if (g <= 45e6) d = 7.5e6 + (g - 15e6) * 0.15;
    else if (g <= 1e8) d = 12e6 + (g - 45e6) * 0.05;
    else d = 14.75e6 + (g - 1e8) * 0.02;
    return Math.min(d, 2e7);
  };
  /** 근로소득세액공제(산출세액, 총급여) */
  MN.earnedCredit = function (calcTax, g) {
    const c = calcTax <= 1.3e6 ? calcTax * 0.55 : 715000 + (calcTax - 1.3e6) * 0.3;
    let lim;
    if (g <= 33e6) lim = 740000;
    else if (g <= 7e7) lim = Math.max(660000, 740000 - (g - 33e6) * 0.008);
    else if (g <= 1.2e8) lim = Math.max(500000, 660000 - (g - 7e7) * 0.5);
    else lim = Math.max(200000, 500000 - (g - 1.2e8) * 0.5);
    return Math.min(c, lim);
  };
  /** 4대 보험(월, 근로자 몫). month: 2026년 적용 월, 기본값은 하반기(7월). */
  MN.insurance = function (base, { month = 7 } = {}) {
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be a month in 2026 (1–12)");
    const K = MN.KR;
    const floor = month <= 6 ? K.npsFloorFirstHalf : K.npsFloor;
    const cap = month <= 6 ? K.npsCapFirstHalf : K.npsCap;
    const nps = MN.floor10(Math.min(Math.max(base, floor), cap) * K.nps);
    const health = MN.floor10(base * K.health);
    const ltc = MN.floor10(health * K.ltc);
    const emp = MN.floor10(base * K.emp);
    return { nps, health, ltc, emp, total: nps + health + ltc + emp };
  };
  /**
   * 연봉 → 월 실수령액(단순화한 연간 정산 기준. 실제 원천징수는 간이세액표라 몇천 원 다르다).
   * month는 2026년 적용 월(기본 7월). 연간 금액은 해당 월 조건을 12개월로 환산한 근사다.
   *   MN.payroll(36e6, { nontax: 200000(월 비과세 식대), family: 1(본인 포함 공제 인원), extraDeduction(연 추가 소득공제), extraCredit(연 추가 세액공제) })
   *   → { monthly:{gross, nontax, nps, health, ltc, emp, tax, local, deductions, net},
   *       annual:{gross, taxable, earnedDed, earnedIncome, base, calcTax, credit, finalTax, local, net},
   *       marginal, effective(세금+보험 / 총급여) }
   */
  MN.payroll = function (salary, o = {}) {
    const nontax = o.nontax == null ? 200000 : o.nontax, family = o.family || 1;
    const grossM = salary / 12, baseM = Math.max(0, grossM - nontax);
    const ins = MN.insurance(baseM, { month: o.month == null ? 7 : o.month });
    const taxable = baseM * 12;
    const earnedDed = MN.earnedDeduction(taxable);
    const earnedIncome = taxable - earnedDed;
    const insDed = (ins.health + ins.ltc + ins.emp) * 12;
    const base = Math.max(0, earnedIncome - K().personalDeduction * family - ins.nps * 12 - insDed - (o.extraDeduction || 0));
    const it = MN.incomeTax(base);
    const credit = MN.earnedCredit(it.tax, taxable) + (o.extraCredit || 0);
    const finalTax = Math.max(0, it.tax - credit), local = finalTax * K().localTax;
    const taxM = MN.floor10(finalTax / 12), localM = MN.floor10(taxM * K().localTax);
    const deductions = ins.total + taxM + localM;
    return {
      monthly: { gross: grossM, nontax, nps: ins.nps, health: ins.health, ltc: ins.ltc, emp: ins.emp, tax: taxM, local: localM, deductions, net: grossM - deductions },
      annual: { gross: salary, taxable, earnedDed, earnedIncome, base, calcTax: it.tax, credit, finalTax, local, net: (grossM - deductions) * 12 },
      marginal: it.marginal * (1 + K().localTax),
      effective: (deductions * 12) / salary,
      steps: it.steps,
    };
  };
  function K() { return MN.KR; }
  /** 최저임금 월 환산 */
  MN.minMonthly = () => MN.KR.minWage * MN.KR.workHoursMonth;

  /* ------------------------------------------------------------ 저축 */
  /** 정기예금(단리, 만기 일시 지급). → { interest, tax, net, total } */
  MN.deposit = function (P, rate, months, o = {}) {
    const interest = o.compound ? P * (Math.pow(1 + rate / 12, months) - 1) : (P * rate * months) / 12;
    const tax = MN.floor10(interest * (o.tax == null ? MN.KR.interestTax : o.tax));
    return { principal: P, interest, tax, net: interest - tax, total: P + interest - tax };
  };
  /** 정기적금(월 납입, 단리). 첫 달 돈은 n개월, 마지막 달 돈은 1개월만 이자가 붙는다. → { principal, interest, tax, net, total, effective(같은 이자를 주는 예금 연이율) } */
  MN.installment = function (monthly, rate, months, o = {}) {
    const principal = monthly * months;
    const interest = (monthly * rate / 12) * (months * (months + 1)) / 2;
    const tax = MN.floor10(interest * (o.tax == null ? MN.KR.interestTax : o.tax));
    return { principal, interest, tax, net: interest - tax, total: principal + interest - tax, effective: interest / (principal * months / 12) };
  };

  /* ------------------------------------------------------------ 대출 */
  /**
   * 상환 스케줄(월 단위).
   *   MN.loan(P, 연이율, 개월, "annuity"(원리금균등) | "linear"(원금균등) | "bullet"(만기일시), { grace: 거치 개월, rates: m => 연이율(변동금리), extra: { 월: 중도상환액 } })
   *   → { rows:[{ m, pay, interest, principal, balance, rate }], totalPay, totalInterest, first, max }
   */
  MN.loan = function (P, rate, months, type = "annuity", o = {}) {
    const rows = [], grace = o.grace || 0;
    let bal = P, pay;
    for (let m = 1; m <= months + grace && bal > 0.5; m++) {
      const ra = o.rates ? o.rates(m) : rate, r = ra / 12;
      const interest = bal * r;
      let principal;
      if (m <= grace) principal = 0;
      else if (type === "linear") principal = P / months;
      else if (type === "bullet") principal = m === months + grace ? bal : 0;
      else principal = MN.pmt(bal, r, months + grace - m + 1) - interest;
      principal = Math.min(bal, principal + ((o.extra && o.extra[m]) || 0));
      pay = interest + principal;
      bal -= principal;
      rows.push({ m, pay, interest, principal, balance: Math.max(0, bal), rate: ra });
    }
    const totalPay = rows.reduce((s, r) => s + r.pay, 0);
    return { rows, totalPay, totalInterest: totalPay - P, first: rows[0] ? rows[0].pay : 0, max: Math.max(...rows.map((r) => r.pay)) };
  };
  /** DSR = 연간 원리금 상환액 합 / 연소득 */
  MN.dsr = (annualDebtService, income) => annualDebtService / income;
  /** 소득·금리·기간으로 빌릴 수 있는 최대 원금(원리금균등, DSR 한도) */
  MN.maxLoan = (income, rate, months, dsr = MN.KR.dsr, other = 0) => MN.pv(rate / 12, months, Math.max(0, (income * dsr - other) / 12));
  /** 신용카드 리볼빙: 잔액 B, 연이율, 매달 최소결제 비율 p(또는 고정액) → { months, totalInterest, rows } */
  MN.revolving = function (B, rate, minPct = 0.1, minFixed = 50000, spend = 0) {
    const rows = []; let bal = B, tot = 0;
    for (let m = 1; m <= 600 && bal > 1; m++) {
      const it = bal * rate / 12; tot += it; bal += it + spend;
      const pay = Math.min(bal, Math.max(bal * minPct, minFixed));
      bal -= pay;
      rows.push({ m, interest: it, pay, balance: bal });
      if (pay <= it + spend + 1 && m > 24) { rows.push({ m: Infinity }); break; }
    }
    return { months: rows.length, totalInterest: tot, rows };
  };

  /* ------------------------------------------------------------ 주거 */
  /** 전월세 전환: 보증금 차이 ΔD를 월세로 바꾸는 월 금액(전환율 rate, 연) */
  MN.jeonseToRent = (deltaDeposit, rate) => (deltaDeposit * rate) / 12;
  /**
   * 주거 비용 비교(연간 '실제로 사라지는 돈', 기회비용 포함).
   *   o: { price, jeonse, deposit, rent, rate(예금 등 기회비용 이율), loanRate, loanRatio(매매 대출 비율), holdTax(보유세율), upkeep(매매 유지비율), appreciation(집값 상승률) }
   */
  MN.housingCost = function (o) {
    const opp = o.rate, lr = o.loanRate;
    const rentCost = o.rent * 12 + o.deposit * opp;
    const jeonseLoan = o.jeonseLoan || 0;
    const jeonseCost = (o.jeonse - jeonseLoan) * opp + jeonseLoan * lr;
    const loan = o.price * (o.loanRatio || 0);
    const buyCost = (o.price - loan) * opp + loan * lr + o.price * ((o.holdTax || 0) + (o.upkeep || 0)) - o.price * (o.appreciation || 0);
    return { rent: rentCost, jeonse: jeonseCost, buy: buyCost };
  };

  /* ------------------------------------------------------------ 채권 */
  /**
   * 고정금리 채권. MN.bond({ face: 10000, coupon: 0.04, ytm: 0.035, years: 5, freq: 1 })
   *   → { price, flows:[{t, cf, pv}], duration(매콜리, 년), modDuration, convexity }
   */
  MN.bond = function (o) {
    const face = o.face || 10000, f = o.freq || 1, n = Math.round(o.years * f), y = o.ytm / f, c = (face * o.coupon) / f;
    let price = 0, dur = 0, conv = 0;
    const flows = [];
    for (let k = 1; k <= n; k++) {
      const cf = c + (k === n ? face : 0), df = Math.pow(1 + y, -k), pv = cf * df;
      price += pv; dur += (k / f) * pv; conv += k * (k + 1) * pv;
      flows.push({ t: k / f, cf, pv });
    }
    const duration = dur / price;
    return { price, flows, duration, modDuration: duration / (1 + y), convexity: conv / (price * Math.pow(1 + y, 2) * f * f) };
  };

  /* ------------------------------------------------------------ 위험과 포트폴리오 */
  /**
   * 교육용 장기 가정(연, 명목). 실제 과거값을 반올림한 대표값이며 미래를 보장하지 않는다.
   * mu: 기대수익률(산술), sigma: 변동성(표준편차)
   */
  MN.ASSETS = {
    cash:   { name: "예금·현금",   mu: 0.025, sigma: 0.01 },
    bond:   { name: "국채·채권",   mu: 0.035, sigma: 0.06 },
    stock:  { name: "세계 주식",   mu: 0.075, sigma: 0.16 },
    kr:     { name: "국내 주식",   mu: 0.065, sigma: 0.22 },
    single: { name: "개별 종목",   mu: 0.075, sigma: 0.40 },
    gold:   { name: "금",         mu: 0.045, sigma: 0.15 },
  };
  /** 자산 간 상관계수(교육용 가정) */
  MN.CORR = {
    "cash|bond": 0.2, "cash|stock": 0, "cash|kr": 0, "cash|gold": 0, "cash|single": 0,
    "bond|stock": 0.1, "bond|kr": 0.05, "bond|gold": 0.2, "bond|single": 0.05,
    "stock|kr": 0.75, "stock|gold": 0.05, "stock|single": 0.55,
    "kr|gold": 0.05, "kr|single": 0.6, "gold|single": 0.05,
  };
  MN.corr = (a, b) => (a === b ? 1 : MN.CORR[a + "|" + b] ?? MN.CORR[b + "|" + a] ?? 0);
  /** 포트폴리오 기대수익과 변동성. weights: { stock: 0.6, bond: 0.4 } */
  MN.portfolio = function (weights, assets = MN.ASSETS) {
    const ks = Object.keys(weights).filter((k) => weights[k]);
    let mu = 0, v = 0;
    ks.forEach((a) => {
      mu += weights[a] * assets[a].mu;
      ks.forEach((b) => { v += weights[a] * weights[b] * assets[a].sigma * assets[b].sigma * MN.corr(a, b); });
    });
    return { mu, sigma: Math.sqrt(Math.max(0, v)) };
  };
  /** 두 자산 조합 곡선: w를 0→1로 바꿀 때 [{w, mu, sigma}] */
  MN.frontier2 = function (a, b, rho, steps = 50) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const w = i / steps;
      const mu = w * a.mu + (1 - w) * b.mu;
      const s = Math.sqrt(w * w * a.sigma * a.sigma + (1 - w) * (1 - w) * b.sigma * b.sigma + 2 * w * (1 - w) * rho * a.sigma * b.sigma);
      out.push({ w, mu, sigma: s });
    }
    return out;
  };
  /** 시드 고정 난수(mulberry32)와 정규 난수 */
  MN.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  MN.gauss = function (seed) { const r = MN.rng(seed); return () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; };
  /**
   * 기하 브라운 운동 가격 경로. 연 기대수익 mu(산술), 변동성 sigma.
   *   MN.paths({ mu, sigma, years, steps: 12(연당), n: 경로 수, seed, start: 1 }) → Float64Array[] (각 길이 years*steps+1)
   */
  MN.paths = function (o) {
    const g = MN.gauss(o.seed || 1), st = o.steps || 12, N = Math.round(o.years * st), dt = 1 / st;
    const drift = (Math.log(1 + o.mu) - 0.5 * o.sigma * o.sigma) * dt, vol = o.sigma * Math.sqrt(dt);
    const out = [];
    for (let p = 0; p < (o.n || 1); p++) {
      const a = new Float64Array(N + 1); a[0] = o.start || 1;
      for (let k = 1; k <= N; k++) a[k] = a[k - 1] * Math.exp(drift + vol * g());
      out.push(a);
    }
    return out;
  };
  /** 최대 낙폭: 고점 대비 가장 크게 떨어진 비율(양수) */
  MN.maxDrawdown = function (a) { let peak = a[0], dd = 0; for (const v of a) { if (v > peak) peak = v; dd = Math.max(dd, 1 - v / peak); } return dd; };
  /** 경로 묶음의 시점별 백분위. → { p10:[], p50:[], p90:[] ... } */
  MN.bands = function (paths, ps = [10, 25, 50, 75, 90]) {
    const N = paths[0].length, out = {};
    ps.forEach((p) => (out["p" + p] = new Array(N)));
    const col = new Float64Array(paths.length);
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < paths.length; i++) col[i] = paths[i][k];
      col.sort();
      ps.forEach((p) => (out["p" + p][k] = col[Math.min(col.length - 1, Math.floor((p / 100) * col.length))]));
    }
    return out;
  };
  /** 수익률 배열의 평균·표준편차 */
  MN.stats = function (xs) { const n = xs.length, m = xs.reduce((s, x) => s + x, 0) / n; return { mean: m, sd: Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, n - 1)) }; };

  /**
   * 은퇴 몬테카를로(연 단위). 매년 초 인출(물가만큼 늘림), 남은 돈은 무작위 수익률로 굴린다.
   *   MN.retire({ balance, withdraw(첫해 연 인출액), years, mu, sigma, inflation, n: 1000, seed, income(연금 등 연 수입, 물가연동) })
   *   → { success(끝까지 바닥나지 않은 비율), bands(실질 잔액 백분위 경로), depletedAt[](바닥난 해, 없으면 null), sample[](경로 몇 개) }
   */
  MN.retire = function (o) {
    const g = MN.gauss(o.seed || 7), n = o.n || 1000, Y = o.years, inf = o.inflation || 0;
    const lm = Math.log(1 + o.mu) - 0.5 * o.sigma * o.sigma;
    const paths = [], depletedAt = [];
    let ok = 0;
    for (let p = 0; p < n; p++) {
      const a = new Float64Array(Y + 1); let b = o.balance, dead = null;
      a[0] = b;
      for (let y = 1; y <= Y; y++) {
        const need = Math.max(0, (o.withdraw - (o.income || 0)) * Math.pow(1 + inf, y - 1));
        b -= need;
        if (b <= 0) { b = 0; if (dead == null) dead = y; }
        b *= Math.exp(lm + o.sigma * g());
        a[y] = b / Math.pow(1 + inf, y);
      }
      if (dead == null) ok++;
      depletedAt.push(dead); paths.push(a);
    }
    return { success: ok / n, bands: MN.bands(paths), depletedAt, sample: paths.slice(0, 30) };
  };

  /* ------------------------------------------------------------ 연금 */
  /**
   * 국민연금 월 수령액 근사(오늘 돈 기준). 소득대체율 43% 계수만 쓰는 단순화 모델.
   *   MN.nps(B: 본인 평균 기준소득월액, years: 가입 연수) → 월 연금액
   * 40년 가입, B = A이면 A의 43%. 10년 미만은 0(반환일시금).
   */
  MN.nps = function (B, years, A = MN.KR.npsA) {
    if (years < 10) return 0;
    const b = Math.min(B, MN.KR.npsCap);
    return (MN.KR.npsCoef * (A + b) * (1 + 0.05 * (years - 20))) / 12;
  };
  /** 국민연금 수령 개시 연령을 당기거나(조기, 연 6% 감액) 늦출 때(연기, 연 7.2% 증액, 최대 5년) 배율 */
  MN.npsAgeFactor = (shift) => (shift < 0 ? Math.max(0.7, 1 + 0.06 * shift) : Math.min(1.36, 1 + 0.072 * shift));
  /**
   * 연금저축·IRP 세액공제(연 납입액 합계, 총급여, { saving: 그중 연금저축 납입액(600만원 한도), tax: 그해 낼 세금(지방세 포함) })
   * 계산상 공제액. tax를 주면 낼 세금을 넘지 못하게 자른다(세액공제는 환급의 상한이 내 세금이다).
   */
  MN.pensionCredit = function (paid, salary, o = {}) {
    const C = MN.KR.pensionCredit;
    const base = o.saving == null ? Math.min(paid, C.limit) : Math.min(Math.min(o.saving, C.savingLimit) + (paid - o.saving), C.limit);
    const credit = base * (salary <= C.cut ? C.high : C.low);
    return o.tax == null ? credit : Math.min(credit, o.tax);
  };
  /* ------------------------------------------------------------ 증여세·상속세 */
  /** 과세표준 → 증여세·상속세 산출세액(10~50% 누진) */
  MN.transferTax = function (base) {
    let lo = 0, tax = 0;
    for (const [hi, rate] of MN.KR.transfer.brackets) { if (base > lo) tax += (Math.min(base, hi) - lo) * rate; lo = hi; }
    return tax;
  };
  /**
   * 직계존속 → 자녀 증여세. 10년 안의 같은 증여(부모 합산)는 더해 계산하고 그때 낸 산출세액을 뺀다.
   *   MN.giftTax(amount, { prior: 10년 내 이전 증여 합, priorTax: 그때의 산출세액, wed: 혼인·출산 공제 적용액, minor })
   *   → { base(과세표준), calc(산출세액), tax(신고세액공제 3% 뒤 낼 세금) }
   */
  MN.giftTax = function (amount, o = {}) {
    const T = MN.KR.transfer;
    const ded = (o.minor ? T.giftDedMinor : T.giftDed) + Math.min(T.wedDed, o.wed || 0);
    const base = Math.max(0, amount + (o.prior || 0) - ded);
    const calc = Math.max(0, MN.transferTax(base) - (o.priorTax || 0));
    return { base, calc, tax: calc * (1 - T.filing) };
  };
  /**
   * 상속세(유산 전체에 매긴다).
   *   MN.inheritTax(estate, { kids: 자녀 수, fin: 순금융재산, spouse: 배우자 생존, prior: 10년 내 상속인에게 한 증여, priorTax: 그 증여세 산출세액 })
   *   → { base, ded(상속공제), calc, tax }
   * 공제 종합한도: 사전증여분에는 공제를 쓰지 못한다.
   */
  MN.inheritTax = function (estate, o = {}) {
    const T = MN.KR.transfer, fin = o.fin || 0, prior = o.prior || 0;
    const finDed = fin <= 2e7 ? Math.max(0, fin) : fin <= 1e8 ? 2e7 : Math.min(T.finMax, fin * 0.2);
    const personal = Math.max(T.lump, T.basic + T.perChild * (o.kids || 0)) + (o.spouse ? T.spouse : 0);
    const ded = Math.min(personal + finDed, Math.max(0, estate));
    const base = Math.max(0, estate + prior - ded);
    const calc = Math.max(0, MN.transferTax(base) - (o.priorTax || 0));
    return { base, ded, calc, tax: calc * (1 - T.filing) };
  };
  /** 2025.10.15 대책: 수도권·규제지역 주택담보대출 한도(집값 기준) */
  MN.mortgageCap = (price) => (price <= 15e8 ? 6e8 : price <= 25e8 ? 4e8 : 2e8);

  /** 퇴직금(근속 연수, 최근 3개월 평균 월급) ≈ 30일분 평균임금 × 근속연수 */
  MN.severance = (years, monthlyWage) => monthlyWage * years;

  /* ------------------------------------------------------------ 보험 */
  /** 기대손실: 확률 p로 손실 L이 날 때 → { expected, insured(보험료 premium을 낼 때 최악), uninsuredWorst } */
  MN.expectedLoss = (p, L, premium) => ({ expected: p * L, loadRatio: premium / (p * L), uninsuredWorst: L, insuredWorst: premium });

  /* ------------------------------------------------------------ 이어지는 케이스: 이한결 */
  /**
   * 책 전체가 따라가는 가상의 인물. 실제 인물과 무관하다.
   * 2026년 1월 입사한 27세 사회초년생. 서울 원룸 월세, 학자금 대출이 있다.
   */
  MN.HG = {
    name: "이한결", age: 27, year: 2026,
    salary: 36e6,           // 세전 연봉
    nontax: 200000,         // 월 비과세 식대
    raise: 0.03,            // 연봉 인상률(연)
    deposit: 1e7,           // 월세 보증금
    rent: 600000,           // 월세
    studentLoan: 1.2e7,     // 학자금 대출 잔액
    studentRate: 0.017,     // 학자금 대출 금리(연)
    studentMonths: 120,     // 남은 상환 기간(원리금균등)
    cash: 3e6,              // 입사 때 통장 잔고
    card: 0,                // 카드 할부 잔액
    budget: [               // 첫 달 지출(월). 7장에서 다시 짠다.
      { key: "rent",  name: "월세",          v: 600000, fixed: true },
      { key: "util",  name: "관리비·공과금", v: 120000, fixed: true },
      { key: "phone", name: "통신",          v: 70000,  fixed: true },
      { key: "subs",  name: "구독",          v: 45000,  fixed: true },
      { key: "trans", name: "교통",          v: 80000,  fixed: false },
      { key: "food",  name: "식비·카페",     v: 600000, fixed: false },
      { key: "shop",  name: "쇼핑·여가",     v: 400000, fixed: false },
      { key: "etc",   name: "경조사·기타",   v: 100000, fixed: false },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = MN;
  else root.MN = MN;
})(typeof window !== "undefined" ? window : globalThis);
