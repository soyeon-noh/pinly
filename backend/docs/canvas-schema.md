# pinly — 캔버스 JSONB 스키마 설계

캔버스 작업 공간의 상태를 PostgreSQL `JSONB`로 저장하기 위한 스키마 정의.
react-konva 렌더링 모델과 1:1로 대응하도록 설계함.

---

## 1. 설계 원칙 (먼저 읽기)

1. **JSONB에는 시각 요소만** — 이미지 / 텍스트 / 드로잉만 담는다. **핀(코멘트)은 JSONB에 넣지 않는다.**
   코멘트는 작성자·답글·해결 상태·피드백 로그 연동·"할 일로 열기" 쿼리가 필요 → 관계형 `comment` 테이블에 저장하고, 캔버스 위 위치는 `pos_x / pos_y` 컬럼으로 둔다(DOM 오버레이로 렌더).
2. **좌표는 캔버스(stage) 좌표계로 저장** — 줌/팬은 클라이언트의 *뷰 상태*일 뿐, 저장 데이터에 반영하지 않는다. 어떤 배율로 보든 저장값은 동일.
3. **이미지는 S3 key만 저장** — presigned URL은 만료되므로 절대 저장하지 않는다. 로드 시점에 key → presigned URL로 변환.
4. **ID는 클라이언트 생성**(nanoid/uuid) — 낙관적 업데이트가 가능하고, 훗날 동기화를 붙일 때도 안전.
5. **`schemaVersion` 필드 필수** — 요소 구조가 바뀌면 버전으로 마이그레이션.
6. **지우개 = drawing 요소 통째 삭제** — 드로잉을 벡터 선(객체)으로 만들었으므로 픽셀 지우기가 아니라 해당 요소를 배열에서 제거하면 끝.
7. **z-순서는 배열 순서로** — `elements` 배열의 인덱스가 그리기 순서(뒤 → 앞). 별도 zIndex 불필요.

---

## 2. 캔버스 문서 구조 (JSONB 최상위)

```json
{
  "schemaVersion": 1,
  "stage": {
    "width": 1920,
    "height": 1080,
    "background": "#FFFFFF"
  },
  "elements": [
    { "...": "아래 요소 타입 참고" }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `schemaVersion` | int | 스키마 버전. 구조 변경 시 증가 |
| `stage.width/height` | number | 캔버스 논리 크기(좌표 기준) |
| `stage.background` | string | 배경색 (hex) |
| `elements` | array | 시각 요소 목록. **순서 = z-order** |

---

## 3. 요소 공통 필드

모든 `elements[]` 항목이 공유하는 필드:

```json
{
  "id": "el_v1StGXR8",
  "type": "image | text | drawing",
  "x": 120,
  "y": 340,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1,
  "opacity": 1,
  "locked": false
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 클라이언트 생성 고유 ID |
| `type` | string | 요소 타입 판별자 |
| `x`, `y` | number | 캔버스 좌표계 기준 위치 (요소의 기준점) |
| `rotation` | number | 회전각(도) |
| `scaleX`, `scaleY` | number | 배율 |
| `opacity` | number | 0~1 |
| `locked` | boolean | true면 선택/이동 불가 (`draggable=false`) |

---

## 4. 요소 타입별 스펙

### 4-1. image (이미지 업로드 / 첨부파일)

```json
{
  "id": "el_img_a1",
  "type": "image",
  "x": 0, "y": 0,
  "rotation": 0, "scaleX": 1, "scaleY": 1, "opacity": 1, "locked": false,
  "s3Key": "projects/{projectId}/canvas/{uuid}.png",
  "naturalWidth": 2000,
  "naturalHeight": 3000,
  "width": 400,
  "height": 600
}
```

- `s3Key` : S3 오브젝트 키. **URL 아님.** 로드 시 presigned로 변환
- `naturalWidth/Height` : 원본 해상도(비율 유지·리셋용)
- `width/height` : 캔버스에 표시되는 크기

### 4-2. text (텍스트 추가)

```json
{
  "id": "el_txt_b2",
  "type": "text",
  "x": 200, "y": 150,
  "rotation": 0, "scaleX": 1, "scaleY": 1, "opacity": 1, "locked": false,
  "text": "여기 명암 수정 필요",
  "fontSize": 18,
  "fontFamily": "Pretendard",
  "fontStyle": "normal",
  "fill": "#292C28",
  "align": "left",
  "width": 240
}
```

- `fontStyle` : `normal | bold | italic | bold italic`
- `width` : 자동 줄바꿈 폭(없으면 한 줄)

### 4-3. drawing (그리기 — 벡터 자유선)

```json
{
  "id": "el_draw_c3",
  "type": "drawing",
  "x": 0, "y": 0,
  "rotation": 0, "scaleX": 1, "scaleY": 1, "opacity": 1, "locked": false,
  "points": [10, 20, 15, 40, 30, 55, 48, 60],
  "stroke": "#1AE46E",
  "strokeWidth": 3,
  "lineCap": "round",
  "lineJoin": "round",
  "tension": 0.4,
  "closed": false
}
```

- `points` : Konva.Line 형식의 **평탄 배열** `[x1,y1, x2,y2, ...]` (좌표는 x/y 오프셋 기준의 상대값). 렌더링에 그대로 투입 가능
- **`x`, `y`, `points` 는 정수** — 프론트가 저장 전에 반올림한다. 캔버스 좌표의 소수점 이하는 눈에 보이는 의미가 없고, 반올림만으로 JSONB 크기가 약 67% 줄어든다 (근거: `docs/canvas-spike/README.md` 실측). 값 타입은 그대로 number 라 `schemaVersion` 은 올리지 않는다
- 저장 시 `x`, `y` 는 선이 지나는 최소 좌표, `points` 는 그 기준 상대 좌표(모두 0 이상)로 정규화한다
- `tension` : 곡선 부드러움(0=직선 연결)
- **지우개** : 이 요소를 `elements` 배열에서 제거 = 삭제 (부분 지우기 없이 선 단위 삭제)

---

## 5. DB 테이블

캔버스 문서를 담는 관계형 골격. (프로젝트 1 : N 캔버스 — 여러 페이지 대비)

```sql
CREATE TABLE canvas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        VARCHAR(255),
  document    JSONB NOT NULL DEFAULT
              '{"schemaVersion":1,"stage":{"width":1920,"height":1080,"background":"#FFFFFF"},"elements":[]}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 필요 시: 요소 내부 조회/집계용 GIN 인덱스
CREATE INDEX idx_canvas_document ON canvas USING GIN (document jsonb_path_ops);
```

핀(코멘트)은 별도 테이블 — 참고용 최소 형태:

```sql
CREATE TABLE comment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id   UUID NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comment(id) ON DELETE CASCADE,  -- 답글
  author_id   UUID NOT NULL REFERENCES app_user(id),
  body        TEXT NOT NULL,
  pos_x       DOUBLE PRECISION,   -- 캔버스 좌표 (답글은 NULL)
  pos_y       DOUBLE PRECISION,
  resolved    BOOLEAN NOT NULL DEFAULT false,  -- 해결됨 표시
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> 코멘트 ↔ 피드백 로그(수정 대기/확인 대기/확인됨) 연동은 별도 `feedback` 테이블에서 `comment_id`를 참조하는 방식으로 확장.

---

## 6. 왜 이렇게 설계했나 (핵심 근거)

- **캔버스 요소를 개별 테이블로 안 쪼갠 이유** : 요소는 편집 중 대량으로 추가/이동/삭제되고(드래그 한 번에 수십 개 갱신), 타입마다 필드가 다르며, 조회는 "캔버스 통째 로드"가 대부분. → 행 단위 관계형보다 JSONB 한 덩어리 읽기/쓰기가 단순하고 빠르다. Konva `toJSON()` 결과와도 맞물린다.
- **코멘트를 JSONB에서 뺀 이유** : 반대로 코멘트는 작성자·시간·상태·답글·검색·상태 전이 쿼리가 필요 → 관계형이 정답. 시각 데이터와 협업 데이터의 성격이 다르므로 저장소를 분리.
- **좌표를 stage 기준으로 저장** : 줌/팬을 저장하면 사용자마다 다르게 보여 데이터가 오염됨. 뷰 변환은 클라이언트 렌더링 단계에만 적용.
- **S3 key 저장** : presigned URL을 저장하면 만료 후 깨진 이미지가 됨. key만 두고 요청 시마다 서명.

---

## 7. 예시 쿼리

```sql
-- 특정 캔버스 문서 로드
SELECT document FROM canvas WHERE id = $1;

-- 문서 통째 저장(덮어쓰기) — MVP 단일 편집 기준
UPDATE canvas SET document = $2::jsonb, updated_at = now() WHERE id = $1;

-- 요소 개수 집계
SELECT jsonb_array_length(document->'elements') FROM canvas WHERE id = $1;

-- 특정 타입 요소만 추출 (예: 이미지 목록 → S3 정리용)
SELECT el->>'s3Key'
FROM canvas, jsonb_array_elements(document->'elements') AS el
WHERE canvas.id = $1 AND el->>'type' = 'image';
```

---

_이 스키마는 MVP(단일 편집, 실시간 동기화 제외) 기준. 요소 타입 추가 시 `schemaVersion`을 올리고 마이그레이션한다._