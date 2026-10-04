import { describe, expect, it } from 'vitest'
import { screenToStage, stageToScreen, zoomAround, type Viewport } from './geometry'

describe('좌표 투영', () => {
  const viewport: Viewport = { x: 120, y: -40, scale: 0.37 }

  it('stage → screen → stage 왕복하면 원래 좌표로 돌아온다', () => {
    // given
    const point = { x: 812.5, y: 3999 }

    // when
    const roundTrip = screenToStage(stageToScreen(point, viewport), viewport)

    // then
    expect(roundTrip.x).toBeCloseTo(point.x, 9)
    expect(roundTrip.y).toBeCloseTo(point.y, 9)
  })

  it('stage 원점은 화면에서 뷰포트 이동량 위치에 있다', () => {
    expect(stageToScreen({ x: 0, y: 0 }, viewport)).toEqual({ x: 120, y: -40 })
  })
})

describe('zoomAround', () => {
  it('확대·축소 전후로 기준점 아래 stage 좌표가 1px 이내로 같다', () => {
    // given
    const before: Viewport = { x: 73, y: 41, scale: 0.42 }
    const anchor = { x: 640, y: 380 }
    const pinnedBefore = screenToStage(anchor, before)

    for (const nextScale of [0.08, 0.5, 1, 2.75, 8]) {
      // when
      const after = zoomAround(before, anchor, nextScale)

      // then
      const pinnedAfter = screenToStage(anchor, after)
      expect(Math.abs(pinnedAfter.x - pinnedBefore.x)).toBeLessThan(1)
      expect(Math.abs(pinnedAfter.y - pinnedBefore.y)).toBeLessThan(1)
      expect(after.scale).toBe(nextScale)
    }
  })
})
