# 캔버스·그리기 툴 구현 계획 (frontend)

> 기준 문서
> - 스파이크 결과: [canvas-spike/README.md](canvas-spike/README.md) · 측정 절차: [canvas-spike/profiling.md](canvas-spike/profiling.md)
> - 캔버스 JSONB 스키마: `backend/docs/canvas-schema.md` · DB 스키마: `backend/docs/db-schema.md`
> - 백엔드 엔티티: `Canvas`, `Asset`, `Comment`, `Feedback`, `FeedbackStatus`

---

## 0. 전제

| 항목 | 결정 | 근거 |
|---|---|---|
| 범위 | 리소스 산정의 **권장 MVP** | 데스크톱 마우스·트랙패드, 단일 선택, 3색 × 2굵기, 스냅샷 undo |
| 제외 | 터치·스타일러스·필압, 다중 선택, 텍스트 서식 UI, 실시간 동기화 | 산정 보고서 §05 |
| 백엔드 API | **아직 없음** (엔티티·마이그레이션까지만 존재) | `backend/src` 에 controller/service 없음 |
| API 대응 | 저장소 인터페이스 + **목(mock) 구현으로 먼저 개발**, HTTP 구현은 API가 생기면 교체 | 프론트가 백엔드를 기다리지 않는다 |
| 인증 | 목 사용자로 진행. JWT 연동은 이 계획 범위 밖 | |

### 스파이크와 달라지는 도메인 모델

스파이크는 편의상 피드백 상태를 코멘트에 붙였지만, 실제 스키마는 다르다. **프론트 타입은 백엔드 엔티티를 따른다.**

- `Comment`(핀)는 `resolved` 만 가진다. 상태(`수정 대기/확인 대기/확인됨`)는 **`Feedback`** 에 있다.
- 핀 → "할 일로 열기" = `comment_id` 를 가진 `Feedback` 생성. 핀에 표시되는 상태 칩은 연결된 피드백의 상태다.
- 상태값은 enum 그대로: `PENDING_REVISION` / `PENDING_CONFIRM` / `CONFIRMED`.
- 답글은 좌표가 없고 `parentId` 만 가진다 (`Comment.reply`).

---

## 1. 기술 선택

| 영역 | 선택 | 이유 |
|---|---|---|
| 번들·언어 | Vite 8 + React 19 + TypeScript | 스캐폴드 완료 |
| 캔버스 | react-konva 19 / konva 10 | 설치 완료 |
| 편집 상태 | **zustand** | 셀렉터 구독으로 필요한 노드만 재렌더 — 스파이크 발견 F-4(전체 재렌더) 대응. React 밖(Konva 이벤트)에서 `getState()` 로 바로 읽고 쓸 수 있다 |
| 서버 상태 | **TanStack Query** | 코멘트·피드백은 서버 데이터. 낙관적 업데이트·재시도·캐시 무효화 |
| 라우팅 | react-router | `/projects/:projectId/canvases/:canvasId` |
| ID 생성 | nanoid | 스키마 원칙 4 — 클라이언트 생성 ID |
| 스타일 | CSS Modules | 의존성 추가 없음 |
| 단위 테스트 | Vitest + Testing Library | 순수 로직(좌표 변환, 직렬화, 단순화, 히스토리)과 DOM 오버레이. 소스 옆 `*.test.ts` |
| 캔버스 E2E | Playwright (시스템 Chrome) | Konva 는 jsdom 에서 제대로 안 그려진다. 그리기·팬/줌·성능 계측은 실제 브라우저로. `frontend/e2e/` |
| 린트 | oxlint (스캐폴드 기본) | |

---

## 2. 폴더 구조

백엔드의 도메인형 패키지와 같은 발상으로 **기능 단위**로 나눈다. 기능 이름은 백엔드 도메인과 맞춘다.

```
frontend/
├── e2e/                          # Playwright E2E
└── src/
    ├── app/                      # 라우터, QueryClient, 저장소 프로바이더. 조립만 한다
    ├── pages/
    │   └── CanvasPage.tsx        # 기능들을 끼워 맞추는 곳 — 여러 기능을 동시에 import 하는 유일한 층
    ├── shared/
    │   ├── api/                  # API 에러 타입, 목 저장소용 JSON 저장 헬퍼, (이후) fetch 클라이언트
    │   ├── lib/                  # geometry(좌표 변환), simplify(RDP), debounce
    │   └── ui/                   # Button, Chip 등 공통 컴포넌트
    └── features/
        ├── canvas/
        │   ├── model/            # types.ts(스키마 타입), documentStore, historyStore, serialize
        │   ├── api/              # CanvasRepository, 이미지 업로드(asset), mock / http 구현, 쿼리 훅
        │   ├── viewport/         # viewportStore, useWheelZoom, fitToArtboard
        │   ├── tools/            # Tool 인터페이스 + select / hand / draw / erase / text / image
        │   ├── stage/            # CanvasStage, 레이어 구성, ElementNode(image/text/drawing)
        │   ├── overlay/          # TextEditorOverlay
        │   └── debug/            # DEV 전용 window.__pinly 계측 훅
        ├── comment/
        │   ├── model/            # Pin / Reply 타입
        │   └── api/              # CommentRepository
        └── feedback/
            ├── model/            # FeedbackStatus, Feedback / FeedbackLog 타입
            └── api/              # FeedbackRepository
```

규칙:
- **의존 방향은 `feedback → comment → canvas → shared` 한 방향만.** `pages`·`app` 은 모두를 쓸 수 있고, 아무도 `pages`·`app` 을 import 하지 않는다.
  - 거꾸로 필요한 것은 아래쪽 기능이 **끼울 자리(슬롯)** 만 연다. 예) 캔버스 툴바의 댓글 툴 → canvas 가 툴 등록 자리를 열고 comment 의 툴을 `CanvasPage` 가 끼운다. 스레드 안의 "할 일로 열기"·상태 칩 → comment 의 `Thread` 가 render prop 을 열고 feedback 컴포넌트를 `CanvasPage` 가 끼운다.
  - 핀과 피드백의 연결은 피드백 쪽 데이터(`commentId`)로 찾는다. 핀 API 응답에 피드백 정보를 넣지 않는다.
- 기능 간 import 는 각 기능의 `index.ts` 공개 API 로만 한다 (백엔드의 "Service → Service 로만" 과 같은 의도).
- 이미지 업로드(asset)는 별도 기능으로 나누지 않고 canvas 안에 둔다. 백엔드 `Asset` 도 `domain/canvas` 에 있고, 지금 이미지를 쓰는 화면이 캔버스뿐이다.
- 단위 테스트는 소스 옆 `*.test.ts(x)`, 브라우저 E2E 는 `frontend/e2e/`.
- Konva 노드 참조와 진행 중 스트로크 같은 **고빈도 상태는 React state 에 넣지 않는다.**
- 빈 폴더를 미리 만들지 않는다. 위 트리는 최종 모습이고, 폴더는 필요해지는 Phase 에서 만든다.

---

## 3. 핵심 설계

### 3-1. 레이어 구성

```
Stage (뷰 변환: x / y / scale)
├── ArtboardLayer   배경 + 이미지          listening: 선택 툴일 때만
├── ContentLayer    텍스트 + 드로잉        팬·줌 중에는 listening(false)   ← F-3
├── DraftLayer      그리는 중인 선 1개     listening(false), ref 로 직접 갱신 ← F-4
└── UILayer         Transformer
DOM 오버레이 (Stage 형제)
├── PinLayer        핀 + 스레드 팝오버
└── TextEditorOverlay
```

### 3-2. 툴 = 포인터 이벤트 전략 객체

툴마다 흩어진 `if (tool === ...)` 분기가 스파이크 F-7(핀 클릭이 아래 요소를 선택) 같은 이벤트 순서 버그를 만들었다.
Stage 는 이벤트를 **현재 툴 하나에만** 넘기고, 툴 전환은 포인터 시퀀스가 끝난 뒤에 적용한다.

```ts
interface Tool {
  id: ToolId
  cursor: string
  onPointerDown?(ctx: ToolContext, e: KonvaPointerEvent): void
  onPointerMove?(ctx: ToolContext, e: KonvaPointerEvent): void
  onPointerUp?(ctx: ToolContext, e: KonvaPointerEvent): void
  onDeactivate?(ctx: ToolContext): void
}
// ToolContext: stage 좌표 포인터, documentStore 액션, draftLayer ref, requestToolChange()
```

### 3-3. 문서 변경은 커밋 경계로만

- 모든 요소 변경은 `documentStore` 의 액션(`addElement`, `updateElement`, `removeElement`, `reorder`)을 거친다.
- 드래그·변형 중에는 Konva 노드만 움직이고, **`dragend` / `transformend` / `pointerup` 에서 한 번 커밋**한다.
- 커밋 1회 = 히스토리 1칸 = 자동저장 트리거 1회.
- 히스토리는 불변 문서 스냅샷 스택(최대 100). 요소 배열은 구조적 공유라 스냅샷 비용이 작다.

### 3-4. 스트로크 확정 파이프라인

```
pointermove → DraftLayer Line.points() 직접 추가 (React 렌더 없음)
pointerup   → RDP 단순화(ε = 0.75 stage px, 반복 구현)
            → 좌표 정수 반올림                       ← F-1 (JSONB −67%)
            → x/y 오프셋 정규화 (points 는 상대 좌표, 스키마 §4-3)
            → addElement 커밋 → DraftLayer 비움
```

`tension` 은 우선 0.4 로 두고, Phase 8 성능 게이트에서 예산을 넘으면 0 으로 굳힌다 (F-5).

### 3-5. 좌표 투영 한 곳에서

```ts
stageToScreen(p, viewport) = { x: p.x * scale + vx, y: p.y * scale + vy }
screenToStage(p, viewport) = { x: (p.x - vx) / scale, y: (p.y - vy) / scale }
```
`shared/lib/geometry` 에 두고 핀, 텍스트 편집기, 스레드 팝오버가 모두 이 함수만 쓴다 (F-6). Vitest 로 왕복 변환을 검증한다.

### 3-6. 저장

- 커밋 후 **1.5초 디바운스** + 탭 이탈(`visibilitychange`, `pagehide`) 시 즉시 저장.
- 백엔드 `Canvas.replaceDocument` 는 문서 통째 교체 → MVP 는 전체 PUT. 좌표 정수화로 페이로드를 줄인다.
- 요청에 기준 `updatedAt` 을 실어 보내 충돌 시 409 → "다른 곳에서 수정됨" 안내 후 새로고침 선택지.
- 저장 상태 표시: `저장됨 / 저장 중 / 저장 실패(재시도)`.
- 직렬화 시 **1 MB 초과면 콘솔 경고 + 계측 로그.** 넘는 사례가 실제로 나오면 그때 변경분 전송을 설계한다.

### 3-7. 아트보드 크기 = 원고 크기 (F-2)

| 상황 | 동작 |
|---|---|
| 빈 캔버스 | 1920×1080 (백엔드 기본값 그대로) |
| **첫 이미지(원고) 업로드** | `stage.width/height` 를 원고 원본 크기로 맞추고 원고를 (0, 0)·배율 1에 둔다. **한 번만** |
| 두 번째 이후 이미지(참고 자료) | 판 크기 변경 없음. 판 밖에 놓여도 된다 |
| 다른 요소가 판 밖으로 나감 | 판을 늘리지 않는다 |

- 핀 좌표가 곧 원고 픽셀 좌표가 된다 → 같은 크기의 수정본으로 바꿔 끼워도 핀이 같은 지점을 가리킨다. 수정 대기 → 확인 대기 흐름의 핵심.
- 판 밖으로 나갈 때마다 확장하는 규칙은 넣지 않는다. 원고 좌표 기준이 흔들리고, 판이 왜 커졌는지 사용자가 알기 어렵다.
- 사용자가 직접 크기를 바꾸는 UI 는 이후 과제. 문서 필드 값만 바뀌므로 스키마 버전·마이그레이션 변경은 필요 없다.

---

## 4. 단계별 계획

순서가 의미를 가진다. 저장·히스토리를 앞에 두는 이유는 이후 모든 툴이 같은 커밋 경로를 쓰기 때문이다.
일수는 1인 기준 person-day.

### Phase 0 — 기반 (2일)
- [x] 라우터, QueryClient, zustand, nanoid, Vitest, Playwright 설치·설정 (Playwright 는 시스템 Chrome 사용, 데모 폴더는 린트 제외)
- [x] `features/canvas/model/types.ts` — 스키마 타입 (`CanvasDocument`, `ImageElement`, `TextElement`, `DrawingElement`)
- [x] `CanvasRepository` / `CommentRepository` / `FeedbackRepository` 인터페이스 + localStorage 목 구현 + 기능별 프로바이더
- [x] DEV 전용 `window.__pinly` 계측 훅 (profiling.md 레시피가 그대로 돌아야 함)
- [x] 스캐폴드 샘플 코드 제거, `CanvasPage` 뼈대

**완료 기준**: `npm run build` · `npm run lint` · `npm test` 통과, `/projects/demo/canvases/demo` 진입 시 빈 아트보드 표시

### Phase 1 — 캔버스 셸 (3일)
- [x] 컨테이너 크기 추적 Stage, 레이어 4단 구성
- [x] `viewportStore` — 포인터 기준 ⌘/Ctrl+휠 줌, 트랙패드 두 손가락 팬, 줌 범위 8%~800%
- [x] 손 툴 + `Space` 누른 동안 임시 손 툴, 팬·줌 중 ContentLayer `listening(false)`
- [x] 줌 컨트롤: 아트보드에 맞추기 / 100% / 확대·축소
- [x] `Tool` 인터페이스 + 디스패처, 툴바, 단축키 — **단축키는 각 툴이 선언한다.** Phase 1 은 `V`(선택)·`H`(손), 나머지(`P E T C`)는 해당 툴이 생기는 Phase 에서 함께 붙는다
- [x] Vitest: 좌표 투영 왕복, 줌 기준점 유지

구현하며 정한 것:
- 처음 열 때 한 번만 화면에 맞추고, 이후 창 크기가 바뀌어도 사용자가 정한 줌·위치를 유지한다
- 단축키는 물리 키 위치(`KeyboardEvent.code`)로 판별 — 한글 입력 상태에서 `V` 는 `key` 가 `ㅍ` 이다
- 줌 단축키: `⌘/Ctrl +`·`⌘/Ctrl −` 확대·축소, `Shift 1` 화면에 맞추기, `Shift 0` 100%. 가운데 버튼 드래그는 어떤 툴이든 이동
- 드래그가 캔버스 밖으로 나가도 끊기지 않도록 포인터를 누를 때 DOM 포인터 캡처를 건다 (Konva 는 캔버스 요소에만 리스너를 건다)
- 툴 분배기는 포인터를 누른 순간의 툴에 시퀀스를 고정한다 → 스파이크 F-7 을 구조로 막음

**완료 기준**: 줌 전후로 포인터 아래 stage 좌표가 1px 이내로 유지된다

### Phase 2 — 그리기 (3일)
- [ ] DraftLayer 직접 갱신 방식의 그리기 툴
- [ ] 확정 파이프라인: RDP(반복 구현) → 정수 반올림 → 오프셋 정규화 → 커밋
- [ ] 3색 × 2굵기 선택 UI (브랜드 민트 포함)
- [ ] 지우개 = 선 클릭 시 요소 삭제, `hitStrokeWidth` 로 얇은 선도 잘 잡히게
- [ ] Vitest: RDP 결과, 반올림, 오프셋 정규화 / Playwright: 드래그로 선 1개 생성 → 문서에 `drawing` 1개

**완료 기준**: 그리는 중 React 커밋 0회(React Profiler 확인), 손을 떼면 1회

### Phase 3 — 문서·히스토리·저장 (5일)
- [ ] `documentStore` 액션 + 커밋 경계
- [ ] `historyStore` — undo/redo (`⌘Z` / `⇧⌘Z`), 텍스트 편집 중에는 브라우저 기본 동작에 양보
- [ ] `serialize` / `parse` — `schemaVersion` 확인, 모르는 버전이면 읽기 전용으로 열기
- [ ] `useAutosave` — 디바운스, 이탈 시 저장, 409 충돌 처리, 저장 상태 표시
- [ ] 로드: 문서 + 코멘트 병렬 조회, 로딩·오류 화면
- [ ] Vitest: 히스토리 경계(드래그 1회 = 1칸), 직렬화 왕복, 1 MB 경고

**완료 기준**: 선 그리기 → 새로고침 → 그대로 복원 (목 저장소 기준), undo 가 드래그 단위로 되돌린다

### Phase 4 — 선택·변형·텍스트 (4일)
- [ ] 단일 선택 + Transformer (리사이즈·회전), `locked` 요소는 선택만 되고 이동 불가
- [ ] 삭제(`Delete`/`Backspace`), 복제(`⌘D`), 맨 앞/맨 뒤로 (배열 순서 = z-order)
- [ ] 텍스트 툴: 클릭 → 요소 생성 → 즉시 편집 모드
- [ ] `TextEditorOverlay` — 줌 배율 반영한 위치·폰트 크기, `Enter` 확정 / `Shift+Enter` 줄바꿈 / `Esc` 취소
- [ ] **한글 IME**: `compositionstart/end` 동안 `Enter`·blur 커밋을 막는다
- [ ] Playwright: 텍스트 생성 → 한글 입력 → 확정 → 문서 반영

**완료 기준**: 한글 조합 중 Enter 로 글자가 잘리거나 중복되지 않는다

### Phase 5 — 이미지 (4일)
- [ ] 업로드 흐름: presigned 요청 → S3 PUT(진행률) → asset 등록 → `image` 요소 추가 (목에서는 objectURL)
- [ ] 로드 시 문서의 `s3Key` 들을 모아 **다운로드 URL 일괄 요청**, 만료 전 갱신 캐시
- [ ] 첫 이미지(원고) 업로드 시 한 번만 아트보드를 원고 크기로 맞추고 (0, 0)·배율 1 배치 (3-7)
- [ ] 드래그 앤 드롭 / 붙여넣기 업로드
- [ ] 큰 이미지 방어: 한 변이 브라우저 캔버스 한계(16,384px)를 넘으면 업로드 거부 + 안내
- [ ] 계측: 실제 원고 10장 투입 후 탭 메모리 (산정 보고서 미지수 1)

**완료 기준**: 원고 업로드 → 아트보드가 원고 크기와 같아짐 → 참고 이미지를 판 밖에 추가해도 판 크기 유지 → 새로고침 후 복원

### Phase 6 — 핀 코멘트 (4일)
- [ ] `PinLayer` — 투영 함수로 위치 계산, 팬·줌에 즉시 추종
- [ ] 댓글 툴: 클릭 → 입력 팝오버 → 전송 시 핀 생성 (낙관적 업데이트)
- [ ] 스레드: 답글 목록·작성, 본문 수정, 삭제, 해결됨 / 다시 열기
- [ ] 핀 드래그로 위치 이동 (`Comment.moveTo`)
- [ ] 해결된 핀 숨기기 토글
- [ ] Testing Library: 스레드 상호작용 / Playwright: 줌 후에도 핀이 같은 컷 위에 있는지

**완료 기준**: 핀 생성·답글·해결이 새로고침 후 유지, 줌 50%·200%에서 핀 위치 오차 1px 이내

### Phase 7 — 피드백 연동 (3일)
- [ ] 스레드의 "할 일로 열기" → 연결된 `Feedback` 생성 (`PENDING_REVISION`)
- [ ] 핀에 상태 칩 표시 (연결된 피드백이 있을 때만)
- [ ] 사이드 패널: 피드백 목록, 상태별 필터, 상태 변경
- [ ] 목록 항목 클릭 → 캔버스가 해당 핀으로 이동·확대하고 스레드 열기
- [ ] 상태 변경이 핀 칩과 패널 양쪽에 즉시 반영 (Query 캐시 공유)

**완료 기준**: 핀 → 할 일 → 상태 3단계 전환 → 캔버스에서 확인까지 한 흐름으로 동작

### Phase 8 — 성능·QA (6일)
- [ ] profiling.md 레시피를 Playwright 스크립트로 자동화 (`npm run perf`)
- [ ] Safari 트랙패드 핀치 줌 — Safari 는 핀치를 ⌘/Ctrl 휠이 아니라 `gesturestart/change` 로 보낸다 (Phase 1 은 Chrome·Firefox 방식만 지원)
- [ ] 번들 코드 분할 — Phase 0 부터 빌드가 500 kB 초과 경고
- [ ] 성능 게이트 확인 → 넘으면 대응 (tension 0, 뷰포트 밖 요소 `visible(false)`, 이미지 캐싱)
- [ ] 브라우저 확인: Chrome, Safari, Edge (Firefox 는 트랙패드 제스처만 점검)
- [ ] 이벤트 순서 점검표: 툴 × 동작 조합 (핀 클릭, 텍스트 편집 중 단축키, 드래그 중 툴 전환 등)
- [ ] 버그 수정, 빈 상태·오류 문구 다듬기

**성능 게이트** (1,000선 + 이미지 3장 문서):

| 지표 | 목표 |
|---|---|
| `drawScene()` | ≤ 8 ms |
| 팬·줌 중 프레임 | 체감 끊김 없음 (Performance 탭에서 50 ms 초과 태스크 없음) |
| 저장 JSONB | ≤ 1 MB |
| `JSON.stringify` | ≤ 16 ms |

### 합계

| Phase | 일수 |
|---|---|
| 0 기반 | 2 |
| 1 캔버스 셸 | 3 |
| 2 그리기 | 3 |
| 3 문서·히스토리·저장 | 5 |
| 4 선택·변형·텍스트 | 4 |
| 5 이미지 | 4 |
| 6 핀 코멘트 | 4 |
| 7 피드백 연동 | 3 |
| 8 성능·QA | 6 |
| **합계** | **34** |

> 리소스 산정 보고서의 권장 MVP 는 32일이었다. **Phase 0 기반 세팅(2일)이 그 표에 빠져 있어 34일로 정정한다.**
> 버퍼 20% 포함 약 8~9주.

---

## 5. 백엔드에 필요한 API (초안)

프론트는 이 계약으로 목 구현을 만들고, 백엔드가 같은 모양으로 구현하면 HTTP 구현으로 교체한다.
필요 시점은 목 → 실제 전환이 필요한 Phase 기준.

| 필요 Phase | 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|---|
| 3 | GET | `/api/canvases/{canvasId}` | | `{ id, projectId, name, document, updatedAt }` |
| 3 | PUT | `/api/canvases/{canvasId}/document` | `{ document, baseUpdatedAt }` | `{ updatedAt }` · 충돌 시 409 |
| 5 | POST | `/api/projects/{projectId}/assets/upload-url` | `{ fileName, contentType, byteSize }` | `{ s3Key, uploadUrl, expiresAt }` |
| 5 | POST | `/api/projects/{projectId}/assets` | `{ s3Key, contentType, byteSize }` | `{ id, s3Key }` |
| 5 | POST | `/api/projects/{projectId}/assets/download-urls` | `{ s3Keys: [] }` | `{ urls: { [s3Key]: url }, expiresAt }` |
| 6 | GET | `/api/canvases/{canvasId}/comments` | | 핀 목록 (답글 포함. 연결된 피드백은 피드백 API 의 `commentId` 로 찾는다) |
| 6 | POST | `/api/canvases/{canvasId}/comments` | `{ body, posX, posY }` | 핀 |
| 6 | POST | `/api/comments/{commentId}/replies` | `{ body }` | 답글 |
| 6 | PATCH | `/api/comments/{commentId}` | `{ body?, posX?, posY? }` | 코멘트 |
| 6 | POST | `/api/comments/{commentId}/resolve` · `/reopen` | | 코멘트 |
| 6 | DELETE | `/api/comments/{commentId}` | | 204 |
| 7 | GET | `/api/projects/{projectId}/feedback-logs` | | 로그 + 피드백 목록 |
| 7 | POST | `/api/feedback-logs/{logId}/feedbacks` | `{ content, commentId? }` | 피드백 |
| 7 | PATCH | `/api/feedbacks/{feedbackId}/status` | `{ status }` | 피드백 |

---

## 6. 결정이 필요한 것

진행을 막지는 않는다. 괄호 안 기본값으로 진행하고, 다르게 정하면 해당 Phase 에서 반영한다.

1. **좌표 정수화를 스키마 규칙으로 확정할지** (확정 → `backend/docs/canvas-schema.md` §4-3 에 "points 는 정수" 추가. 값 타입은 그대로 number 라 schemaVersion 은 1 유지)
2. ~~아트보드 크기 정책~~ → **확정**: 첫 원고 업로드 시 한 번만 원고 크기로 맞춘다 (3-7). 백엔드 기본값 1920×1080 은 그대로
3. **"할 일로 열기" 시 어느 피드백 로그에 넣을지** (프로젝트의 첫 번째 로그, 없으면 "기본 로그" 자동 생성)
4. **해결됨과 피드백 상태의 관계** (독립. `CONFIRMED` 로 바꿔도 핀은 자동 해결되지 않는다 — conventions.md 예시의 동기화는 Phase 7 에서 백엔드와 함께 결정)
5. **실시간 동기화 제외** 유지 여부 (유지. 바뀌면 이 계획 전체를 다시 산정)

---

## 7. 작업 규칙

- 커밋은 백엔드와 같은 Conventional Commits + 한국어. scope 는 루트 `CLAUDE.md` 대로 `frontend`.
- 한 Phase 안에서도 체크리스트 항목 단위로 커밋한다.
- 각 Phase 완료 기준에는 항상 `npm run build` · `npm run lint` · `npm test` 통과가 포함된다.
- 저장소는 `pinly/` 루트의 모노레포 하나다. Phase 단위로 브랜치를 따서 작업한다.
