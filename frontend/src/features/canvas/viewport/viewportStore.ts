import { create } from 'zustand'
import { zoomAround, type Point, type Size, type Viewport } from '../../../shared/lib/geometry'
import { fitToArtboard } from './fitToArtboard'
import { clampScale, nextZoomStep } from './navigation'

/** 휠처럼 끝을 알 수 없는 조작은 마지막 입력 후 이 시간이 지나면 끝난 것으로 본다 */
export const NAVIGATION_SETTLE_MS = 150

interface ViewportState {
  viewport: Viewport
  containerSize: Size | null
  artboardSize: Size | null
  /** 팬·줌 중. 이 동안 ContentLayer 히트 판정을 끈다 (스파이크 F-3) */
  isNavigating: boolean

  setContainerSize(size: Size): void
  setArtboardSize(size: Size): void
  panBy(dx: number, dy: number): void
  /** anchor(컨테이너 기준 화면 좌표) 아래 지점을 고정하고 배율을 factor 배 */
  zoomAt(anchor: Point, factor: number): void
  /** anchor 를 고정하고 배율을 scale 로. anchor 가 없으면 컨테이너 가운데 */
  zoomTo(scale: number, anchor?: Point): void
  stepZoom(direction: 1 | -1): void
  /** 아트보드 전체가 보이도록 맞춘다 */
  fit(): void
  /** 드래그 팬처럼 시작·끝이 분명한 조작 */
  setNavigating(isNavigating: boolean): void
  /** 휠처럼 끝이 없는 조작. 호출마다 해제 시점을 미룬다 */
  pulseNavigating(): void
  reset(): void
}

const INITIAL = {
  viewport: { x: 0, y: 0, scale: 1 },
  containerSize: null,
  artboardSize: null,
  isNavigating: false,
} satisfies Partial<ViewportState>

let settleTimer: ReturnType<typeof setTimeout> | undefined

const centerOf = (size: Size | null): Point =>
  size ? { x: size.width / 2, y: size.height / 2 } : { x: 0, y: 0 }

/** 캔버스는 한 번에 하나만 열리므로 전역 스토어 하나를 쓰고, CanvasStage 가 마운트될 때 초기화한다 */
export const useViewportStore = create<ViewportState>()((set, get) => ({
  ...INITIAL,

  setContainerSize: (containerSize) => set({ containerSize }),
  setArtboardSize: (artboardSize) => set({ artboardSize }),

  panBy: (dx, dy) =>
    set(({ viewport }) => ({ viewport: { ...viewport, x: viewport.x + dx, y: viewport.y + dy } })),

  zoomAt: (anchor, factor) =>
    set(({ viewport }) => ({
      viewport: zoomAround(viewport, anchor, clampScale(viewport.scale * factor)),
    })),

  zoomTo: (scale, anchor) =>
    set(({ viewport, containerSize }) => ({
      viewport: zoomAround(viewport, anchor ?? centerOf(containerSize), clampScale(scale)),
    })),

  stepZoom: (direction) => get().zoomTo(nextZoomStep(get().viewport.scale, direction)),

  fit: () => {
    const { containerSize, artboardSize } = get()
    if (!containerSize || !artboardSize) return
    set({ viewport: fitToArtboard(containerSize, artboardSize) })
  },

  setNavigating: (isNavigating) => {
    clearTimeout(settleTimer)
    set({ isNavigating })
  },

  pulseNavigating: () => {
    clearTimeout(settleTimer)
    if (!get().isNavigating) set({ isNavigating: true })
    settleTimer = setTimeout(() => set({ isNavigating: false }), NAVIGATION_SETTLE_MS)
  },

  reset: () => {
    clearTimeout(settleTimer)
    set(INITIAL)
  },
}))
