/**
 * 캔버스 JSONB 문서 타입. `backend/docs/canvas-schema.md` 와 1:1 로 대응한다.
 *
 * 핀(코멘트)은 여기 없다 — 관계형 `comment` 테이블에 저장되고 `features/comment` 가 다룬다.
 */

/** 문서 구조가 바뀌면 올린다. 백엔드 `Canvas.CURRENT_SCHEMA_VERSION` 과 같아야 한다. */
export const CURRENT_SCHEMA_VERSION = 1

export interface StageSpec {
  /** 아트보드 논리 크기. 첫 원고 업로드 시 원고 원본 크기로 한 번 맞춘다 */
  width: number
  height: number
  background: string
}

/** 모든 요소가 공유하는 필드 (스키마 §3). 좌표는 stage 좌표계 */
interface ElementBase {
  /** 클라이언트 생성 ID */
  id: string
  x: number
  y: number
  /** 도(degree) */
  rotation: number
  scaleX: number
  scaleY: number
  /** 0~1 */
  opacity: number
  /** true 면 선택은 되지만 이동·변형 불가 */
  locked: boolean
}

export interface ImageElement extends ElementBase {
  type: 'image'
  /** S3 오브젝트 키. URL 이 아니다 — presigned URL 은 만료되므로 저장하지 않는다 */
  s3Key: string
  naturalWidth: number
  naturalHeight: number
  /** 캔버스에 표시되는 크기 */
  width: number
  height: number
}

export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold italic'
export type TextAlign = 'left' | 'center' | 'right'

export interface TextElement extends ElementBase {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontStyle: FontStyle
  fill: string
  align: TextAlign
  /** 자동 줄바꿈 폭. 없으면 한 줄 */
  width?: number
}

export interface DrawingElement extends ElementBase {
  type: 'drawing'
  /** Konva.Line 평탄 배열 `[x1, y1, x2, y2, …]`. x/y 기준 상대 좌표 */
  points: number[]
  stroke: string
  strokeWidth: number
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'miter' | 'round' | 'bevel'
  /** 곡선 부드러움. 0 이면 직선 연결 */
  tension: number
  closed: boolean
}

export type CanvasElement = ImageElement | TextElement | DrawingElement
export type ElementType = CanvasElement['type']

export interface CanvasDocument {
  schemaVersion: number
  stage: StageSpec
  /** 배열 순서 = z-order (뒤 → 앞) */
  elements: CanvasElement[]
}

/** 백엔드 `Canvas.emptyDocument()` 의 stage 와 같은 값 */
export const DEFAULT_STAGE: Readonly<StageSpec> = {
  width: 1920,
  height: 1080,
  background: '#FFFFFF',
}

/** 빈 캔버스 문서. 백엔드 마이그레이션의 컬럼 기본값과 같은 모양이다. */
export function createEmptyDocument(): CanvasDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    stage: { ...DEFAULT_STAGE },
    elements: [],
  }
}
