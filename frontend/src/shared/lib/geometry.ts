/** 너비·높이 */
export interface Size {
  width: number
  height: number
}

/**
 * Stage 에 거는 뷰 변환. 화면 좌표 = stage 좌표 × scale + (x, y).
 * 문서에는 저장하지 않는다 — 어떤 배율로 보든 저장값은 같아야 한다 (스키마 원칙 2).
 */
export interface Viewport {
  x: number
  y: number
  scale: number
}
