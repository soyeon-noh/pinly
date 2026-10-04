# 캔버스 프로파일링 방법

스파이크에서 실제로 쓴 측정 절차. `frontend/` 본 프로젝트에서도 같은 방식으로 회귀를 확인할 수 있다.

## 0. 원칙

- **본 프로젝트(`frontend/`)는 레이어가 4개다** — `artboard-layer` / `content-layer` / `draft-layer` / `ui-layer`.
  드로잉·텍스트 렌더 비용은 `content-layer` 에서 잰다. 스파이크(`frontend-demo/`)는 레이어가 하나뿐이었다.
- **rAF 기반 FPS 카운터는 믿지 않는다.** 백그라운드 탭·임베디드 브라우저에서는 `requestAnimationFrame` 이
  스로틀링되어 1~6 fps 처럼 엉뚱한 값이 나온다. 대신 `layer.draw()` 를 **동기 호출해 시간을 잰다.**
- **워밍업 후 평균.** 첫 몇 번은 JIT·캐시 영향이 커서 버린다 (워밍업 5회 → 측정 20~30회).
- **렌더 시간은 추세, 크기는 절대값.** 드로우 ms 는 편차가 크지만 JSONB 바이트와 좌표 수는 결정적이다.
- 한 번에 **한 조건만** 바꿔 비교한다 (tension, hit graph, 좌표 정밀도…).

## 1. 계측 훅 노출

데모의 `App.jsx` 는 개발용으로 `window.__pinly` 를 노출한다. 본 프로젝트에서도 `import.meta.env.DEV` 일 때만 같은 훅을 두면 된다.

```js
window.__pinly = {
  stage:    () => stageRef.current,   // Konva.Stage
  doc:      () => doc,                // 현재 캔버스 JSONB 문서
  viewport: () => viewport,           // { x, y, scale } — 화면 좌표 = stage 좌표 × scale + x/y
  bench: (runs = 30) => { /* 모든 레이어 draw() 평균 ms */ },
}
```

본 프로젝트 구현: `frontend/src/features/canvas/debug/installDebugHook.ts`

기본 사용:

```js
window.__pinly.bench(30)   // { nodes, msPerDraw, theoreticalFps }
window.__pinly.doc()       // 현재 JSONB 문서
```

## 2. 부하 투입

상단의 `부하 +100선` / `+1000선` 버튼. 선 1개 = 시작점 + 40회 랜덤 이동 = **41점**.
콘솔에서 반복 투입하려면:

```js
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const add1000 = [...document.querySelectorAll('.btn')].find((b) => b.textContent.includes('+1000'))
for (let i = 0; i < 3; i++) { add1000.click(); await wait(500) }   // 3,000선
```

## 3. 공통 벤치 함수

```js
const bench = (fn, runs = 25) => {
  for (let i = 0; i < 5; i++) fn()              // 워밍업
  const t = performance.now()
  for (let i = 0; i < runs; i++) fn()
  return +((performance.now() - t) / runs).toFixed(1)
}
const stage = window.__pinly.stage()
// 본 프로젝트: 드로잉·텍스트가 있는 레이어. 스파이크(frontend-demo)에서는 stage.getLayers()[0]
const layer = stage.findOne('.content-layer')
```

## 4. 측정 레시피

### 4-1. 규모별 렌더 + 저장 비용

```js
const res = []
for (let step = 1; step <= 6; step++) {
  add1000.click(); await wait(500)
  const doc = window.__pinly.doc()
  const t0 = performance.now()
  const json = JSON.stringify(doc)
  res.push({
    strokes: doc.elements.length,
    drawMs: bench(() => layer.draw()),          // 씬 + 히트
    sceneMs: bench(() => layer.drawScene()),    // 화면만
    jsonKB: Math.round(new Blob([json]).size / 1024),
    stringifyMs: +(performance.now() - t0).toFixed(1),
  })
}
console.table(res)
```

### 4-2. 히트 그래프 비용

`draw()` 는 화면 캔버스와 클릭 판정용 히트 캔버스를 모두 그린다. 둘의 차이가 히트 비용이다.

```js
({ full: bench(() => layer.draw()), sceneOnly: bench(() => layer.drawScene()) })
```

### 4-3. tension(곡선 보정) 비용

```js
const lines = layer.find('Line')
const before = bench(() => layer.draw())
lines.forEach((l) => l.tension(0))
const after = bench(() => layer.draw())
;({ tension04: before, tension0: after })
```

### 4-4. 저장 페이로드 축소 효과

```js
const doc = window.__pinly.doc()
const kb = (o) => Math.round(new Blob([JSON.stringify(o)]).size / 1024)
const round = (d, p) => ({
  ...d,
  elements: d.elements.map((e) => e.points ? { ...e, points: e.points.map((v) => +v.toFixed(p)) } : e),
})
;({ raw: kb(doc), round1dp: kb(round(doc, 1)), round0dp: kb(round(doc, 0)) })
```

RDP(Ramer–Douglas–Peucker) 단순화 비교가 필요하면 평탄 배열 `[x1,y1,x2,y2,…]` 을 점 배열로 바꿔
재귀 단순화 후 다시 평탄화한다. **점이 수만 개인 선에서 재귀 구현은 콜스택을 넘길 수 있으니**
본 구현에서는 반복(스택) 방식으로 작성한다.

## 5. 결과 해석 기준

| 지표 | 목표 | 근거 |
|---|---|---|
| `drawScene()` | ≤ 8 ms | 60 fps 프레임 예산 16.7 ms 의 절반 — 나머지는 React·이벤트 몫 |
| `draw()` (히트 포함) | 팬/줌 중에는 히트를 끄므로 정지 상태에서만 의미 | F-3 |
| JSONB 크기 | 원고 1화 기준 ≤ 1 MB | 자동저장 PUT 을 가볍게 유지 |
| `JSON.stringify` | ≤ 16 ms | 한 프레임 안에서 끝나야 입력이 끊기지 않는다 |

## 6. 브라우저 도구와 함께 쓰기

- **Chrome DevTools → Performance**: 드래그·그리기 동작을 녹화해 `setState` 재렌더(F-4)와 Konva draw 비중을 나눠 본다.
- **React DevTools → Profiler**: 그리기 중 커밋 횟수·렌더된 컴포넌트 확인. 진행 중 스트로크가 React 밖으로 빠졌다면 커밋이 mouseup 1회여야 한다.
- **Memory 탭 → Heap snapshot**: 고해상도 원고 여러 장 투입 전후 비교 (§5 미지수 확인용).
