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
| 단위 테스트 | Vitest + Testing Library | 순수 로직(좌표 변환, 직렬화, 단순화, 히스토리)과 DOM 오버레이 |
| 캔버스 E2E | Playwright | Konva 는 jsdom 에서 제대로 안 그려진다. 그리기·팬/줌·성능 계측은 실제 브라우저로 |
| 린트 | oxlint (스캐폴드 기본) | |

---

## 2. 폴더 구조

백엔드의 도메인형 패키지와 같은 발상으로 **기능 단위**로 나눈다.

```
frontend/src/
├── app/                      # 라우터, QueryClient, 전역 프로바이더
├── pages/
│   └── CanvasPage.tsx        # 스테이지 + 툴바 + 사이드 패널 조립
├── shared/
│   ├── api/                  # fetch 클라이언트, 에러 타입
│   ├── lib/                  # geometry(좌표 변환), simplify(RDP), debounce
│   └── ui/                   # Button, Chip 등 공통 컴포넌트
└── features/
    ├── canvas/
    │   ├── model/            # types.ts(스키마 타입), documentStore, historyStore, serialize
    │   ├── viewport/         # viewportStore, useWheelZoom, fitToArtboard
    │   ├── tools/            # Tool 인터페이스 + select / hand / draw / erase / text / image
    │   ├── stage/            # CanvasStage, 레이어 구성, ElementNode(image/text/drawing)
    │   ├── overlay/          # stage↔screen 투영, TextEditorOverlay
    │   ├── persistence/      # CanvasRepository 인터페이스, mock / http 구현, useAutosave
    │   └── debug/            # DEV 전용 window.__pinly 계측 훅
    ├── asset/                # presigned 업로드, 다운로드 URL 캐시
    ├── comment/              # PinLayer, Thread, CommentRepository
    └── feedback/             # StatusChip, 할 일로 열기, FeedbackPanel, FeedbackRepository
```

규칙:
- 기능 간 import 는 각 기능의 `index.ts` 공개 API 로만 한다 (백엔드의 "Service → Service 로만" 과 같은 의도).
- Konva 노드 참조와 진행 중 스트로크 같은 **고빈도 상태는 React state 에 넣지 않는다.**
- 빈 폴더를 미리 만들지 않는다.

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
핀, 텍스트 편집기, 스레드 팝오버가 모두 이 함수만 쓴다 (F-6). Vitest 로 왕복 변환을 검증한다.

### 3-6. 저장

- 커밋 후 **1.5초 디바운스** + 탭 이탈(`visibilitychange`, `pagehide`) 시 즉시 저장.
- 백엔드 `Canvas.replaceDocument` 는 문서 통째 교체 → MVP 는 전체 PUT. 좌표 정수화로 페이로드를 줄인다.
- 요청에 기준 `updatedAt` 을 실어 보내 충돌 시 409 → "다른 곳에서 수정됨" 안내 후 새로고침 선택지.
- 저장 상태 표시: `저장됨 / 저장 중 / 저장 실패(재시도)`.
- 직렬화 시 **1 MB 초과면 콘솔 경고 + 계측 로그.** 넘는 사례가 실제로 나오면 그때 변경분 전송을 설계한다.

### 3-7. 아트보드 크기 (F-2)

백엔드 기본값 1920×1080 은 웹툰 세로 원고와 맞지 않는다.
**첫 이미지를 올리면 `stage.width/height` 를 이미지 크기(+여백)로 맞추고**, 이후 이미지가 바깥으로 나가면 확장한다.
문서 필드 값만 바뀌므로 스키마 버전·마이그레이션 변경은 필요 없다.

---

## 4. 단계별 계획

순서가 의미를 가진다. 저장·히스토리를 앞에 두는 이유는 이후 모든 툴이 같은 커밋 경로를 쓰기 때문이다.
일수는 1인 기준 person-day.

### Phase 0 — 기반 (2일)
- [ ] 라우터, QueryClient, zustand, nanoid, Vitest, Playwright 설치·설정
- [ ] `features/canvas/model/types.ts` — 스키마 타입 (`CanvasDocument`, `ImageElement`, `TextElement`, `DrawingElement`)
- [ ] `CanvasRepository` / `CommentRepository` / `FeedbackRepository` 인터페이스 + localStorage 목 구현
- [ ] DEV 전용 `window.__pinly` 계측 훅 (profiling.md 레시피가 그대로 돌아야 함)
- [ ] 스캐폴드 샘플 코드 제거, `CanvasPage` 뼈대

**완료 기준**: `npm run build` · `npm run lint` · `npm test` 통과, `/projects/demo/canvases/demo` 진입 시 빈 아트보드 표시

### Phase 1 — 캔버스 셸 (3일)
- [ ] 컨테이너 크기 추적 Stage, 레이어 4단 구성
- [ ] `viewportStore` — 포인터 기준 ⌘/Ctrl+휠 줌, 트랙패드 두 손가락 팬, 줌 범위 8%~800%
- [ ] 손 툴 + `Space` 누른 동안 임시 손 툴, 팬·줌 중 ContentLayer `listening(false)`
- [ ] 줌 컨트롤: 아트보드에 맞추기 / 100% / 확대·축소
- [ ] `Tool` 인터페이스 + 디스패처, 툴바, 단축키 `V H P E T C`
- [ ] Vitest: 좌표 투영 왕복, 줌 기준점 유지

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
- [ ] 첫 이미지 기준 아트보드 크기 조정 (3-7)
- [ ] 드래그 앤 드롭 / 붙여넣기 업로드
- [ ] 큰 이미지 방어: 한 변이 브라우저 캔버스 한계(16,384px)를 넘으면 업로드 거부 + 안내
- [ ] 계측: 실제 원고 10장 투입 후 탭 메모리 (산정 보고서 미지수 1)

**완료 기준**: 세로 원고 업로드 → 아트보드가 원고에 맞춰짐 → 새로고침 후 복원

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
| 6 | GET | `/api/canvases/{canvasId}/comments` | | 핀 목록 (답글·연결 피드백 요약 포함) |
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
2. **아트보드 크기 정책** (첫 이미지 기준 자동 조정. 백엔드 기본값 1920×1080 은 그대로 둔다)
3. **"할 일로 열기" 시 어느 피드백 로그에 넣을지** (프로젝트의 첫 번째 로그, 없으면 "기본 로그" 자동 생성)
4. **해결됨과 피드백 상태의 관계** (독립. `CONFIRMED` 로 바꿔도 핀은 자동 해결되지 않는다 — conventions.md 예시의 동기화는 Phase 7 에서 백엔드와 함께 결정)
5. **실시간 동기화 제외** 유지 여부 (유지. 바뀌면 이 계획 전체를 다시 산정)

---

## 7. 작업 규칙

- 커밋은 백엔드와 같은 Conventional Commits + 한국어. scope 는 `canvas` / `asset` / `comment` / `feedback` / `shared`.
- 한 Phase 안에서도 체크리스트 항목 단위로 커밋한다.
- 각 Phase 완료 기준에는 항상 `npm run build` · `npm run lint` · `npm test` 통과가 포함된다.
- `frontend/` 는 아직 git 저장소가 아니다. **Phase 0 시작 전에 `git init`** 한다.
