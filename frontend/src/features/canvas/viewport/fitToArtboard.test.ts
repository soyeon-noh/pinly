import { describe, expect, it } from 'vitest'
import { fitToArtboard } from './fitToArtboard'

describe('fitToArtboard', () => {
  it('가로로 넓은 컨테이너에서는 높이에 맞추고 가로 가운데에 둔다', () => {
    // when
    const viewport = fitToArtboard({ width: 2000, height: 1000 }, { width: 1920, height: 1080 }, 40)

    // then — 높이 920 / 1080
    expect(viewport.scale).toBeCloseTo(920 / 1080)
    expect(viewport.y).toBeCloseTo(40)
    expect(viewport.x).toBeCloseTo((2000 - 1920 * viewport.scale) / 2)
  })

  it('세로 원고(1200×4000)는 높이 기준으로 줄어 컨테이너 안에 다 들어온다', () => {
    // when
    const container = { width: 1400, height: 850 }
    const viewport = fitToArtboard(container, { width: 1200, height: 4000 })

    // then
    expect(4000 * viewport.scale).toBeLessThanOrEqual(container.height)
    expect(1200 * viewport.scale).toBeLessThanOrEqual(container.width)
  })

  it('컨테이너보다 작은 아트보드는 키우지 않는다', () => {
    // when
    const viewport = fitToArtboard({ width: 1400, height: 850 }, { width: 400, height: 300 })

    // then
    expect(viewport.scale).toBe(1)
    expect(viewport).toMatchObject({ x: 500, y: 275 })
  })

  it('컨테이너가 여백보다 작아도 배율이 0 이하로 떨어지지 않는다', () => {
    // when
    const viewport = fitToArtboard({ width: 50, height: 50 }, { width: 1920, height: 1080 })

    // then
    expect(viewport.scale).toBeGreaterThan(0)
  })
})
