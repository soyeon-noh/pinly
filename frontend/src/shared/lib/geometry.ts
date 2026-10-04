/** 너비·높이 */
export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/**
 * Stage 에 거는 뷰 변환. 화면 좌표 = stage 좌표 × scale + (x, y).
 * 문서에는 저장하지 않는다 — 어떤 배율로 보든 저장값은 같아야 한다 (스키마 원칙 2).
 *
 * 여기서 "화면 좌표"는 페이지가 아니라 캔버스 컨테이너 기준 좌표다.
 */
export interface Viewport {
  x: number
  y: number
  scale: number
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function stageToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  }
}

export function screenToStage(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  }
}

/** 화면의 기준점(anchor) 아래 있던 stage 좌표가 그 자리에 남도록 배율만 바꾼다 */
export function zoomAround(viewport: Viewport, anchor: Point, nextScale: number): Viewport {
  const pinned = screenToStage(anchor, viewport)
  return {
    scale: nextScale,
    x: anchor.x - pinned.x * nextScale,
    y: anchor.y - pinned.y * nextScale,
  }
}
