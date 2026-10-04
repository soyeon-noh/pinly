import { clamp } from '../../../shared/lib/geometry'

/** 줌 범위 8% ~ 800% */
export const MIN_SCALE = 0.08
export const MAX_SCALE = 8

/** 확대·축소 버튼과 단축키가 멈추는 배율 */
export const ZOOM_STEPS = [0.08, 0.1, 0.125, 0.167, 0.25, 0.333, 0.5, 0.667, 1, 1.5, 2, 3, 4, 6, 8]

const WHEEL_ZOOM_SENSITIVITY = 0.0075
/** 마우스 휠 한 칸(≈100px)이 한 번에 너무 크게 확대되지 않도록 자른다 */
const MAX_WHEEL_ZOOM_DELTA = 50
const LINE_HEIGHT_PX = 16
const PAGE_HEIGHT_PX = 800
const STEP_EPSILON = 0.001

export const clampScale = (scale: number) => clamp(scale, MIN_SCALE, MAX_SCALE)

/** WheelEvent.deltaMode(픽셀·줄·페이지)를 픽셀로 맞춘다 */
export function wheelDeltaInPixels(delta: number, deltaMode: number) {
  if (deltaMode === 1) return delta * LINE_HEIGHT_PX
  if (deltaMode === 2) return delta * PAGE_HEIGHT_PX
  return delta
}

/** 휠·핀치 한 번의 배율 변화. 위로 굴리면(deltaY < 0) 확대 */
export function wheelZoomFactor(deltaY: number, deltaMode = 0) {
  const delta = clamp(wheelDeltaInPixels(deltaY, deltaMode), -MAX_WHEEL_ZOOM_DELTA, MAX_WHEEL_ZOOM_DELTA)
  return Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY)
}

export type WheelAction =
  | { kind: 'zoom'; factor: number }
  | { kind: 'pan'; dx: number; dy: number }

type WheelInput = Pick<
  WheelEvent,
  'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>

/**
 * Figma 규칙: ⌘/Ctrl + 휠 = 줌, 그냥 휠·트랙패드 두 손가락 = 이동.
 * Chrome·Firefox 는 트랙패드 핀치를 ctrlKey 가 켜진 휠로 보내므로 핀치도 줌이 된다.
 */
export function interpretWheel(event: WheelInput): WheelAction {
  if (event.ctrlKey || event.metaKey) {
    return { kind: 'zoom', factor: wheelZoomFactor(event.deltaY, event.deltaMode) }
  }
  const dx = wheelDeltaInPixels(event.deltaX, event.deltaMode)
  const dy = wheelDeltaInPixels(event.deltaY, event.deltaMode)
  // Shift + 마우스 휠 = 가로 이동 (브라우저가 deltaX 로 바꿔주지 않는 경우)
  if (event.shiftKey && dx === 0) return { kind: 'pan', dx: -dy, dy: 0 }
  return { kind: 'pan', dx: -dx, dy: -dy }
}

/** 현재 배율에서 한 단계 위(1)·아래(-1) 배율 */
export function nextZoomStep(scale: number, direction: 1 | -1) {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > scale + STEP_EPSILON) ?? MAX_SCALE
  return [...ZOOM_STEPS].reverse().find((step) => step < scale - STEP_EPSILON) ?? MIN_SCALE
}
