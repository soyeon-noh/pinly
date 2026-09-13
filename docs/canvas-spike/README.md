# 캔버스 스파이크 — 기술적 상세

캔버스 + 그리기 툴의 **구현 난이도와 성능 한계를 실측**하기 위해 만든 일회성 프로토타입의 결과 기록.
프로토타입은 제품 코드가 아니라 측정 장치이며, 여기 적힌 결론만 `frontend/` 본 프로젝트 설계에 반영한다.

- 프로토타입 코드: `frontend/frontend-demo/` (Vite + React 18 + react-konva 18, JS)
- 프로파일링 방법: [profiling.md](profiling.md)
- 리소스 산정 보고서: https://claude.ai/code/artifact/128e6cbd-c4d5-4f4f-891f-ace6c18c9853
- 캔버스 JSONB 스키마: `backend/docs/canvas-schema.md`

> 버전 차이: 스파이크는 React 18 / react-konva 18 / konva 9 (JS),
> `frontend/` 본 프로젝트는 React 19 / react-konva 19 / konva 10 (TypeScript).
> 계측에 쓴 Konva API(`draw`, `drawScene`, `tension`, `getRelativePointerPosition`)는 동일하지만,
> 수치를 비교할 때는 본 프로젝트에서 [profiling.md](profiling.md) 절차로 다시 측정한다.

```bash
npm --prefix frontend/frontend-demo install
npm --prefix frontend/frontend-demo run dev   # http://localhost:5174
```

## 1. 구현 범위 (약 715줄)

| 기능 | 상태 | 비고 |
|---|---|---|
| Stage 팬/줌 (포인터 기준, 트랙패드 팬) | O | Figma 규칙: 두 손가락=팬, ⌘/Ctrl+휠=줌 |
| 툴바 (선택/이동/댓글/텍스트/그리기/선삭제) + 단축키 | O | `V H C T P E` |
| 자유선 그리기 → `drawing` 요소 | O | Konva `Line` + `tension` |
| 지우개 = 선 객체 삭제 | O | 스키마 §4-3 그대로 |
| 선택·이동·리사이즈·회전 (Transformer) | O | |
| 텍스트 추가 + DOM 인라인 편집 | O | Konva 위에 `textarea` 오버레이 |
| 이미지 첨부 (로컬 파일 / 샘플 원고 생성) | O | 데모는 objectURL, 실제는 presigned URL |
| 핀(코멘트) DOM 오버레이 + 스레드 + 답글 | O | Konva 아님. transform 으로 좌표만 동기화 |
| 피드백 상태 (수정 대기/확인 대기/확인됨) | O | 로그 패널 ↔ 캔버스 양방향 |
| 되돌리기/다시하기 | O | 문서 스냅샷 스택 (50) |
| JSONB 직렬화 + 크기 계측 | O | 저장 페이로드 그대로 |
| 부하 테스트 + FPS/노드 수/드로우 타임 | O | `window.__pinly.bench()` |

**일부러 뺀 것 (= 남은 일감)**: S3 presigned 업로드, 저장/로드 API 연동, 실시간 동기화,
모바일·터치·스타일러스, 색상/굵기 팔레트, 레이어 패널, 이미지 자르기, 다중 선택,
복사/붙여넣기, 텍스트 서식 UI, 접근성, 오프라인 복구.

## 2. 구조

```
src/
├── App.jsx            # 툴 상태, 단축키, 이미지 업로드, 부하 테스트, 계측 훅
├── CanvasStage.jsx    # Konva Stage — 팬/줌, 그리기, Transformer, 텍스트 인라인 편집
├── PinLayer.jsx       # 핀 DOM 오버레이 + 스레드 팝오버 + 상태 변경
├── Inspector.jsx      # 피드백 로그 / JSONB 미리보기 / 계측 패널
└── useCanvasDoc.js    # 캔버스 문서 상태 + 스냅샷 기반 undo/redo
```

핵심 설계 선택:

- **뷰 변환은 Stage 에 건다** (`x / y / scaleX / scaleY`). 요소 좌표는 항상 stage 좌표계로 저장되고,
  포인터 위치는 `stage.getRelativePointerPosition()` 으로 역변환한다.
- **핀은 DOM 오버레이.** 화면 좌표 = `stage좌표 × scale + view.x/y`. 말풍선·입력은 일반 React 컴포넌트.
- **텍스트 편집도 같은 오버레이 패턴.** `node.getClientRect()` 로 화면 박스를 얻어 `textarea` 를 얹는다.
- **undo/redo 는 불변 문서 스냅샷 스택.** 드래그 중 연속 갱신은 `commit=false` 로 히스토리에서 제외.
- **`_src` 필드는 데모 전용.** 직렬화 시 제거되고 실제 저장값은 `s3Key` 뿐이다.

## 3. 실측 결과

측정 환경: M-series Mac, Chromium, 뷰포트 1400×850. 선 1개 = 41점.

| 선 개수 | 좌표 수 | `layer.draw()` | 씬만 (`drawScene`) | JSONB | `JSON.stringify` |
|---|---|---|---|---|---|
| 1,000 | 41,000 | 15~35 ms | 8~16 ms | 1.7 MB | 20 ms |
| 3,000 | 123,000 | 20~110 ms | 7~51 ms | 5.1 MB | 26 ms |
| 6,000 | 246,000 | 200 ms+ | 85~130 ms | **10.2 MB** | 94 ms |

같은 문서에서 조건만 바꾼 비교 (3,000선, 워밍업 후 25회 평균):

| 조건 | 결과 |
|---|---|
| `draw()` (씬 + 히트) vs `drawScene()` | 22.6 ms vs 10.6 ms |
| `tension: 0.4` vs `tension: 0` | 22.6 ms vs 16.1 ms |

좌표 축소 비교 (6,000선, 원본 10,165 KB):

| 방법 | JSONB |
|---|---|
| 원본 (부동소수) | 10,165 KB |
| 소수 1자리 반올림 | 4,242 KB |
| **정수 반올림** | **3,378 KB (−67%)** |
| RDP 단순화 ε=1 + 소수 1자리 | 4,035 KB |
| RDP 단순화 ε=2 + 소수 1자리 | 3,832 KB |

> 렌더 시간은 브라우저 스로틀링으로 편차가 크다. **절대값이 아니라 추세로 읽는다.**
> JSONB 크기와 좌표 수는 결정적인 값이다.
> RDP 는 부하 테스트의 난수 데이터라 효과가 작게 나왔다. 실제 손그림 스트로크에서는 더 크게 줄어든다.

## 4. 설계에 반영해야 할 발견

| # | 발견 | 영향 | 대응 |
|---|---|---|---|
| F-1 | 문서 통째 저장은 그대로 못 쓴다. 6,000선에서 `stringify` 94 ms + 10 MB PUT | 높음 | 디바운스 자동저장 + 변경분 전송. 좌표 정수화를 스키마 규칙으로 |
| F-2 | 아트보드 기본값 1920×1080 이 웹툰 세로 원고와 안 맞는다 | 높음 | `stage.width/height` 를 첫 이미지 기준 또는 가변으로 |
| F-3 | 히트 그래프가 렌더 비용의 절반 | 중간 | 팬/줌 중 드로잉 레이어 `listening(false)`, 또는 레이어 분리 |
| F-4 | 그리는 중 `setState` 로 React 전체 재렌더 → 선이 길수록 느려짐 | 중간 | 진행 중 스트로크는 Konva 노드에 `points()` 직접 갱신, 손 뗄 때 한 번 커밋 |
| F-5 | `tension` 곡선이 매 프레임 재계산되어 +30% | 중간 | 그리는 동안만 곡선, 확정 시 점 단순화 후 `tension: 0` 검토 |
| F-6 | Konva 위 DOM 오버레이 패턴이 핀·텍스트 편집 양쪽에 재사용됨 | 낮음 | 공통 오버레이 유틸로 먼저 만든다 |
| F-7 | 핀을 찍은 클릭이 아래 요소까지 선택 (mousedown → 툴 전환 → click) | 낮음 | 툴 전환을 다음 tick 으로. 툴 조합마다 이벤트 순서 점검 필요 |

## 5. 아직 확인하지 못한 것

| 미지수 | 확인 방법 | 틀리면 |
|---|---|---|
| 고해상도 원고 여러 장의 메모리 | 실제 원고 10장을 한 캔버스에 올려 탭 메모리 측정 | +5일 |
| 한글 IME 조합 중 커밋 | 인라인 편집기에서 조합 중 blur·Enter 케이스 테스트 | +2일 |
| 실시간 동기화 제외 결정 | 작가 팀이 동시 편집을 요구하는지 확인 | +20일 |
