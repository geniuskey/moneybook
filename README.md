# MoneyBook — 살아가는 데 필요한 돈 교과서

월급 명세서에서 은퇴 설계까지. 살아가는 데 필요한 돈의 지식을 직접 만지며 배우는 한국어 인터랙티브 교과서입니다.
23개 챕터, 200여 개의 시뮬레이터, 그리고 급여·세금·저축·대출·채권·포트폴리오·은퇴를 같은 방식으로 계산하는 돈 계산 엔진(`js/money.js`)으로 구성됩니다.
책 전체가 가상의 사회초년생 한 명(이한결, 27세, 연봉 3,600만원)의 돈을 벌기 → 쓰기 → 모으기 → 빌리기 → 불리기 → 지키기 → 노후 일곱 단계로 따라가고, 22장에서는 독자가 인생 전체를 직접 돌려 봅니다.

배포 주소: https://moneybook.euiyun.com/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 순자산과 현금흐름, 돈의 일곱 단계 |
| 02 | chapters/money.html | 화폐의 기능, 신용 창조, 중앙은행 |
| 03 | chapters/inflation.html | 물가지수, 명목과 실질, 72의 법칙 |
| 04 | chapters/interest.html | 단리와 복리, 현재가치와 미래가치 |
| 05 | chapters/economy.html | 기준금리, 경기 순환, 환율 |
| 06 | chapters/income.html | 월급 명세서, 4대 보험, 소득세 |
| 07 | chapters/budget.html | 고정비·변동비, 50·30·20, 기회비용 |
| 08 | chapters/saving.html | 비상금, 예금과 적금, 예금자 보호 |
| 09 | chapters/credit.html | 신용점수, 신용카드, 리볼빙 |
| 10 | chapters/loan.html | 상환 방식, 고정·변동금리, DSR |
| 11 | chapters/housing.html | 월세·전세·매매, 보증금 위험 |
| 12 | chapters/risk.html | 기대수익과 변동성, 분산, 낙폭 |
| 13 | chapters/stock.html | 주식의 가치, PER, 개별 종목 위험 |
| 14 | chapters/bond.html | 채권 가격과 금리, 듀레이션 |
| 15 | chapters/fund.html | 펀드·ETF, 인덱스, 보수, 적립식 |
| 16 | chapters/portfolio.html | 자산배분, 효율적 투자선, 리밸런싱 |
| 17 | chapters/behavior.html | 행동재무학, 폰지와 투자 사기 |
| 18 | chapters/tax.html | 누진세, 공제, 금융소득 과세, 절세 계좌 |
| 19 | chapters/insurance.html | 위험 관리, 기대손실, 보험의 종류 |
| 20 | chapters/pension.html | 국민연금, 퇴직연금, 개인연금 |
| 21 | chapters/retire.html | 4% 규칙, 순서 위험, 몬테카를로 |
| 22 | chapters/lab.html | 인생 시뮬레이터: 27세부터 90세까지 |
| 23 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 캔버스·차트·막대·도넛·끌기 헬퍼, 전역 `MB`
- `js/money.js` — 2026년 제도 값, 급여·세금, 복리, 저축, 대출, 주거, 채권, 포트폴리오, 몬테카를로 은퇴, 연금 계산, 전역 `MN`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
수치는 2026년 한국 제도를 바탕으로 한 교육용 근사이며 세법·요율은 해마다 바뀝니다. 투자 수익률은 교육용 가정입니다. 이 사이트는 특정 상품을 권하지 않으며 투자·세무 자문이 아닙니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `moneybook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 라이선스

Copyright (c) 2026 geniuskey and MoneyBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
