# MoneyBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `MB`), `js/money.js`(전역 `MN`).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 돈 공부를 처음 하는 성인(사회초년생, 대학생, 고등학생도 읽을 수 있게). 사전 지식을 가정하지 않는다. 금융 용어는 처음 나올 때 `<span class="term">복리</span><span class="en">(Compound interest)</span>`처럼 쓰고 한 문장으로 풀어 준다.
- 이 책의 뼈대는 **만져 보며 배우기**다(Bartosz Ciechanowski의 글이 본보기). 읽고 외우는 책이 아니라, 숫자를 직접 끌고 바꿔 보면서 "아, 그래서"를 얻는 책이다.
  - 개념 하나에 조작 가능한 그림 하나. 정적인 SVG는 조작으로 대신할 수 없을 때만 쓴다(장마다 2~4개: 구조도, 흐름도, 비교표 그림).
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개. 큰 종합 시뮬레이터는 장 끝에 하나.
  - 앞 시뮬레이터에서 만진 것 위에 다음 것을 쌓는다. 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 슬라이더뿐 아니라 캔버스 위 직접 끌기(`MB.drag`)를 적극적으로 쓴다(그래프의 점을 끌어 금리를 바꾸기, 막대를 끌어 예산을 옮기기). 끌 수 있는 것에는 손잡이를 그린다.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(빚이 눈덩이처럼 불어난다, 잔고가 바닥난다, 실질 가치가 녹는다). 한계가 배울 점이다.
  - 결과는 숫자(`.sim-readout`)로도 함께 보여 준다. 금액은 `MB.won()`으로 "1억 2,346만원"처럼 쓴다.
  - 애니메이션을 아끼지 않는다: 시간이 흐르며 쌓이는 잔고, 떨어지는 동전, 흘러가는 현금흐름(`MB.loop`). 단 화면 밖에서는 멈춘다(`MB.loop`가 자동 처리).
- 순서: 일상의 질문 → 조작 가능한 그림 → 원리(필요하면 수식, KaTeX) → 시뮬레이터 → 실제 제도·수치 → 한결의 가계부 → 핵심 정리/퀴즈.
- 수치: **2026년 한국 제도 기준 대표값**. 엔진의 `MN.KR`에 모아 두었다. 제도 수치를 본문에 쓸 때는 "2026년 기준", 확실하지 않으면 '약', '~'을 붙인다. 세법·요율은 해마다 바뀐다는 점을 장마다 한 번은 말한다(`.callout.warn`).
- **투자 권유를 하지 않는다.** 특정 종목·상품·회사 이름을 추천하지 않는다(설명에 필요한 지수·제도명 KOSPI, S&P 500, ISA, IRP 등은 괜찮다). 과거 수익률은 미래를 보장하지 않는다는 점을 투자 장에서 분명히 한다. 수익률 가정은 `MN.ASSETS`(교육용 가정)를 쓴다.
- 외부 라이브러리는 KaTeX만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `MB.palette()`를 쓴다. 들어오는 돈·이익은 `--ok`, 나가는 돈·손실은 `--bad`, 주의는 `--warn`, 주제색은 `--accent`(녹색), 보조는 `--accent-2`(금색).
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="interest.html">4장</a>`처럼 링크한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python tools/head.py <slug>`를 실행한다(인자 없이 실행하면 전체 장 + 사이트맵 + `index.html`의 JSON-LD를 갱신한다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다. `js/money.js`는 항상 함께 불러온다.
```html
<!doctype html>
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명"}-->
<!--head:end-->
</head>
```

## 페이지 골격
```html
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
  </header>
  <section id="영문-id"><h2>절 제목</h2> … </section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
상단바·챕터 목록·돈의 흐름 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-ok`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-ok`, `.f-warn`, `.f-bad`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
  컨트롤이 없거나 캔버스를 직접 끄는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">끌어서 움직인다</span>`를 둔다.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`. 수식은 꼭 필요한 곳에만(장마다 0~3개). 수식보다 그림과 숫자가 먼저다.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 명세서·영수증: `<div class="slip"><div class="row"><span>기본급</span><span>3,000,000</span></div>…<div class="row total"><span>실수령</span><span>2,655,840</span></div></div>`.
- 금액 색: `<span class="won plus">+50만원</span>`, `<span class="won minus">−12만원</span>`.
- 범례: `<div class="legend"><span><i style="background:var(--bad)"></i>이자</span></div>`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4문항, 정답 위치를 섞는다).
- 한결의 가계부(아래 참조):
```html
<div class="casefile">
  <div class="tag"><b>LEDGER 한결</b><span>한결의 가계부 · 6장</span></div>
  <h4>첫 월급 300만원, 통장에는 265만원</h4>
  <p>…이 장의 방법을 한결에게 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 케이스: 한결의 가계부
모든 장은 같은 가상의 인물 한 명의 돈을 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `MN.HG`와 엔진으로 직접 계산해서 쓴다(`node -e "const MN=require('./js/money.js'); …"`로 확인).

- 인물: 이한결(가상, 실제 인물과 무관). 27세, 2026년 1월 입사, 세전 연봉 3,600만원(월 300만원, 비과세 식대 20만원 포함), 연봉 인상 연 3% 가정. 서울 원룸 월세(보증금 1,000만원, 월 60만원). 학자금 대출 1,200만원(연 1.7%, 10년 원리금균등 → 월 약 10.9만원). 통장 잔고 300만원.
- 첫 달 숫자(엔진 값): 월 실수령 2,655,840원(`MN.payroll(36e6)`), 공제 합계 344,160원. 첫 달 지출 `MN.HG.budget` 합계 201.5만원 + 학자금 상환 10.9만원 → 남는 돈 약 53만원.
- 첫 달 재무상태표: 자산 1,300만원(보증금 1,000 + 현금 300), 부채 1,200만원(학자금), 순자산 100만원.

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 돈의 지도 | 한결 소개. 첫 달 재무상태표(순자산 100만원)와 현금흐름(들어오는 265.6만, 나가는 212.4만). 질문: 이 흐름 그대로면 10년 뒤, 60세에 어디에 있는가. 책 전체가 한결의 돈을 일곱 단계로 따라간다는 안내. |
| 02 돈의 탄생 | 한결의 월급은 회사 통장에서 한결 통장으로 옮겨진 장부 숫자다. 한결이 맡긴 300만원 중 지급준비금을 뺀 돈이 다시 대출로 나가 예금이 늘어나는 신용 창조. |
| 03 물가 | 통장의 300만원은 물가 연 2.5%면 10년 뒤 구매력 약 234만원. 연봉 인상 3%는 실질로 약 0.5%. 이자 0%짜리 입출금 통장에 두는 비용. |
| 04 복리 | 매달 50만원을 연 5%로 27세부터 60세까지(33년) vs 37세부터(23년). 10년 늦게 시작한 대가가 원금 차이보다 훨씬 크다는 것을 `MN.grow`로. |
| 05 경제 | 기준금리가 1%p 오르면: 한결의 학자금(고정 1.7%)은 그대로, 예금 금리는 오르고, 변동금리 대출을 가진 친구의 이자는 는다. 환율 1,300→1,450원이면 해외 직구·여행 비용. |
| 06 월급 명세서 | 연봉 3,600만원 → 월 실수령 265.6만원. 국민연금 133,000, 건강 100,660, 장기요양 13,220, 고용 25,190, 소득세 65,540, 지방세 6,550. 한계세율 16.5%, 공제율 약 11.5%. 연봉 4,000만원 협상의 실수령 증가분. |
| 07 예산 | 첫 달: 남는 돈 약 53만원. 고정비·변동비 분해, 구독·카페 줄이기, 50·30·20 기준으로 다시 짜서 **월 저축 100만원** 목표. 한 잔 5천원 커피의 30년 기회비용. |
| 08 저축 | 비상금 목표 = 필수지출 3~6개월(약 600만원). 적금 월 50만원·연 3.5%·12개월 → 세후 이자 96,240원(`MN.installment`), 체감 이율 약 1.9%. 파킹통장과 예금자 보호 1억원. |
| 09 신용 | 첫 신용카드. 체크카드와의 차이, 리볼빙 300만원을 연 18%로 최소결제하면 이자가 얼마나 붙는지(`MN.revolving`). 신용점수를 지키는 습관. |
| 10 대출 | 학자금 1,200만원 원리금균등 월 108,811원, 총이자 약 105.7만원. 원금균등·만기일시와 비교. 금리 1.7%라 서둘러 갚기보다 비상금·저축이 먼저. DSR로 본 한결의 대출 한도. |
| 11 집 | 30세(2029년) 이사 결정: 월세 유지 vs 전세(보증금 2억, 대출 1.6억) vs 매매는 아직. 전월세 전환율, 전세 보증금 위험과 보증보험. 결정과 그 이유. |
| 12 위험 | 월 100만원 저축을 예금·채권·주식에 넣었을 때 30년 뒤 분포. 기대값과 흔들림, 최대 낙폭. 한결이 견딜 수 있는 낙폭을 정한다. |
| 13 주식 | 동료가 권한 한 종목 몰빵 vs 지수. 개별 종목의 변동성 40% vs 지수 16%. PER로 본 '비싸다'의 의미. |
| 14 채권 | 금리가 오를 때 장기채 가격이 떨어지는 것을 듀레이션으로. 한결 포트폴리오의 안전판 역할. |
| 15 펀드·ETF | 보수 1.5% 액티브 펀드 vs 0.1% 인덱스 ETF, 월 70만원 30년 차이. 적립식과 평균 매입 단가. |
| 16 자산배분 | 한결의 결정: 주식 70 / 채권 30(나이·감내 낙폭 기준), 연 1회 리밸런싱. 효율적 투자선 위에 한결을 찍는다. |
| 17 심리·사기 | 코인 급등 뉴스에 흔들림(FOMO), 하락장에서 팔고 싶은 마음. "월 3% 보장" 리딩방 제안을 폰지 구조로 해부한다. |
| 18 세금 | 연말정산: 연금저축 600만 + IRP 300만 → 계산상 세액공제 148.5만원(16.5%, `MN.pensionCredit`), 실제로는 낼 세금(결정세액+지방세 약 86.5만원)까지만 돌려받는다. ISA 비과세 200만원. 한계세율과 실효세율. |
| 19 보험 | 미혼·부양가족 없음 → 사망보장은 작게, 실손·상해·소득 상실이 우선. 매달 보험료 15만원 제안을 기대손실로 따져 본다. |
| 20 연금 | 국민연금 예상액(평균소득 400만원, 38년 가입 가정 `MN.nps`), 퇴직연금 DC, 연금저축·IRP. 세 겹을 합친 65세 월 소득. |
| 21 은퇴 | 60세 은퇴 목표. 필요 자금(연 생활비 3,600만원, 오늘 돈), 4% 규칙, 연금 공백기 60~65세. 몬테카를로 성공 확률(`MN.retire`). |
| 22 인생 시뮬레이터 | 독자가 한결의 인생 전체를 직접 돌린다. 자기 숫자로도 넣어 본다. |
| 23 용어집 | 한결 없이 용어와 종합 퀴즈. |

## JS 헬퍼 (`MB`, `js/common.js`)
- `MB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `MB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`MB.range`, `MB.seg`)을 먼저 만든다. 폭에 따라 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `MB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 끌기(마우스·터치, CSS px). draw에서 계산한 배치(상자, 축 변환)를 바깥 변수에 저장해 두고 move에서 역변환한다.
- `MB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 금액 축은 `yFmt: MB.wonAxis`. box를 생략하면 왼쪽 여백 58px이다. 축 글자가 길면 box를 직접 준다.
- `MB.bars(ctx, box|null, {labels, stacks:[{label, color, data}], y, yFmt, yLabel, gap, hlines, highlight, valueFmt})` → `{X(i), Y, box, bw}` 누적 막대(음수는 아래로).
- `MB.donut(ctx, cx, cy, R, [{label, value, color}], {inner, center:{big, small}, labels, highlight})` → `{hit(x, y)}` 도넛. hover로 조각을 강조할 때 `hit`을 쓴다.
- `MB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `MB.seg(id, onChange)` → `get()`, `get.set(v)`. `MB.stat(id, html)`.
- `MB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `.stop()`, `.start()`, `.toggle()`.
- `MB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `MB.color(name)`, `MB.isDark()`, `MB.onTheme(cb)`.
- `MB.won(x, {digits, short})` "1억 2,346만원"(10만원 미만은 "45,000원"처럼 원 단위), `MB.wonAxis(x)` "1.2억", "1.5만", `MB.pct(x, digits)` "3.45%", `MB.fmt(x, digits)`.
- `MB.canvas`는 만들면서 draw를 바로 부른다. draw 안에서 자기 반환값을 참조하지 않는다(초기화 전 접근 오류).
- SVG 그림의 viewBox 폭은 420~480 정도로 잡는다. 640~720이면 360px 화면에서 글자가 6px까지 작아진다.
- 고정폭 글꼴(`MB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `MB.font(px, mono, weight)`, `MB.erf`, `MB.rng(seed)`(0~1 난수 함수), `MB.randn()`, `MB.randnSeeded(seed)`, `MB.poisson(λ)`, `MB.debounce`, `MB.clamp/lerp/map`.
- `MB.CHAPTERS`, `MB.STAGES`.

## 돈 계산 엔진 (`MN`, `js/money.js`)
모든 장이 같은 계산을 쓰게 하는 공통 엔진이다. 급여·세금·저축·대출·채권·포트폴리오·은퇴 계산은 직접 만들지 말고 이것을 쓴다(장 고유의 작은 계산은 직접 해도 된다). 단위는 원, 비율은 소수.
- 제도 값: `MN.KR` (최저시급 10,320원, 국민연금 4.75%, 건강 3.595%, 장기요양 13.14%, 고용 0.9%, 세율 구간 `brackets`, 이자소득세 15.4%, 예금자 보호 1억원, 법정 최고금리 20%, DSR 40%, ISA, 연금저축 세액공제…). `MN.minMonthly()` 최저임금 월 환산.
- 기본: `MN.fv(r, n, pmt, pv, due)`, `MN.pv(r, n, pmt, fv)`, `MN.pmt(P, r, n)`, `MN.npv(r, flows)`, `MN.irr(flows)`, `MN.monthly(연이율)`, `MN.real(명목, 물가)`, `MN.doubling(r)` → `{rule72, exact}`.
- `MN.grow({start, monthly, rate, years, inflation, raise, fee})` → 해마다 `[{year, contrib, value, real, interest}]` (월 복리, 월말 적립).
- 급여·세금: `MN.payroll(연봉, {nontax, family, extraDeduction, extraCredit})` → `{monthly:{gross, nontax, nps, health, ltc, emp, tax, local, deductions, net}, annual:{…, base, calcTax, credit, finalTax}, marginal, effective, steps}`. `MN.incomeTax(과세표준)` → `{tax, marginal, steps}`. `MN.earnedDeduction(총급여)`, `MN.earnedCredit(산출세액, 총급여)`, `MN.insurance(월 보수)`.
- 저축: `MN.deposit(P, rate, months, {compound, tax})`, `MN.installment(월납, rate, months)` → `{principal, interest, tax, net, total, effective}`.
- 대출: `MN.loan(P, 연이율, 개월, "annuity"|"linear"|"bullet", {grace, rates: m => 연이율, extra: {월: 금액}})` → `{rows:[{m, pay, interest, principal, balance, rate}], totalPay, totalInterest, first, max}`. `MN.maxLoan(연소득, 금리, 개월, dsr, 기존 연상환)`, `MN.dsr(연상환, 연소득)`, `MN.revolving(잔액, 연이율, 최소결제비율, 최소액, 매달 추가 사용)` → `{months, totalInterest, rows}`.
- 주거: `MN.jeonseToRent(보증금 차이, 전환율)`, `MN.housingCost({price, jeonse, deposit, rent, rate, loanRate, loanRatio, jeonseLoan, holdTax, upkeep, appreciation})` → `{rent, jeonse, buy}` 연간 비용.
- 채권: `MN.bond({face, coupon, ytm, years, freq})` → `{price, flows, duration, modDuration, convexity}`.
- 위험: `MN.ASSETS` (cash, bond, stock, kr, single, gold: `{name, mu, sigma}` 교육용 가정), `MN.corr(a, b)`, `MN.portfolio({stock: 0.6, bond: 0.4})` → `{mu, sigma}`, `MN.frontier2(a, b, rho)`, `MN.paths({mu, sigma, years, steps, n, seed, start})` → 경로 배열, `MN.bands(paths)` → `{p10, p25, p50, p75, p90}`, `MN.maxDrawdown(path)`, `MN.stats(xs)`, `MN.rng(seed)`, `MN.gauss(seed)`.
- 은퇴: `MN.retire({balance, withdraw, years, mu, sigma, inflation, n, seed, income})` → `{success, bands(실질), depletedAt, sample}`. 1,000경로 30년은 수 ms. 슬라이더에 바로 묶어도 된다(n은 500~1000).
- 연금: `MN.nps(평균소득월액, 가입연수)` 월 연금(오늘 돈), `MN.npsAgeFactor(당김/늦춤 연수)`, `MN.pensionCredit(연 납입, 총급여, {saving: 연금저축분, tax: 그해 세금 한도})`, `MN.severance(근속연수, 월급)`.
- 보험: `MN.expectedLoss(p, L, premium)`.
- 케이스: `MN.HG` (위 표의 인물 값과 첫 달 예산 `budget`).

## 점검
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `MB.font()`로, 색은 `MB.palette()`로.
