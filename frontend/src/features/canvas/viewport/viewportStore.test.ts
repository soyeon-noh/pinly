import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screenToStage } from '../../../shared/lib/geometry'
import { MAX_SCALE, MIN_SCALE } from './navigation'
import { NAVIGATION_SETTLE_MS, useViewportStore } from './viewportStore'

const store = () => useViewportStore.getState()

describe('viewportStore', () => {
  beforeEach(() => store().reset())
  afterEach(() => vi.useRealTimers())

  it('panBy 는 뷰포트를 화면 픽셀만큼 옮긴다', () => {
    // when
    store().panBy(30, -12)
    store().panBy(5, 2)

    // then
    expect(store().viewport).toEqual({ x: 35, y: -10, scale: 1 })
  })

  it('zoomAt 은 기준점 아래 stage 좌표를 고정한 채 배율을 바꾼다', () => {
    // given
    const anchor = { x: 400, y: 300 }
    const pinned = screenToStage(anchor, store().viewport)

    // when
    store().zoomAt(anchor, 2)

    // then
    expect(store().viewport.scale).toBe(2)
    const after = screenToStage(anchor, store().viewport)
    expect(after.x).toBeCloseTo(pinned.x)
    expect(after.y).toBeCloseTo(pinned.y)
  })

  it('줌은 8% ~ 800% 를 벗어나지 않는다', () => {
    // when
    for (let i = 0; i < 50; i++) store().zoomAt({ x: 0, y: 0 }, 2)
    const max = store().viewport.scale
    for (let i = 0; i < 50; i++) store().zoomAt({ x: 0, y: 0 }, 0.5)
    const min = store().viewport.scale

    // then
    expect(max).toBe(MAX_SCALE)
    expect(min).toBe(MIN_SCALE)
  })

  it('zoomTo 는 기준점이 없으면 컨테이너 가운데를 고정한다', () => {
    // given
    store().setContainerSize({ width: 1000, height: 600 })
    const center = { x: 500, y: 300 }
    const pinned = screenToStage(center, store().viewport)

    // when
    store().zoomTo(0.5)

    // then
    const after = screenToStage(center, store().viewport)
    expect(after.x).toBeCloseTo(pinned.x)
    expect(after.y).toBeCloseTo(pinned.y)
  })

  it('stepZoom 은 정해진 배율 단계로 움직인다', () => {
    // given
    store().setContainerSize({ width: 1000, height: 600 })

    // when
    store().stepZoom(1)

    // then
    expect(store().viewport.scale).toBe(1.5)
  })

  it('fit 은 컨테이너와 아트보드 크기를 모두 알 때만 맞춘다', () => {
    // given
    store().setArtboardSize({ width: 1920, height: 1080 })

    // when — 컨테이너 크기를 모른다
    store().fit()

    // then
    expect(store().viewport).toEqual({ x: 0, y: 0, scale: 1 })

    // when
    store().setContainerSize({ width: 1400, height: 800 })
    store().fit()

    // then
    expect(store().viewport.scale).toBeLessThan(1)
  })

  it('휠 조작은 마지막 입력 후 일정 시간이 지나야 이동 중 상태가 풀린다', () => {
    // given
    vi.useFakeTimers()

    // when
    store().pulseNavigating()
    vi.advanceTimersByTime(NAVIGATION_SETTLE_MS - 10)
    store().pulseNavigating()
    vi.advanceTimersByTime(NAVIGATION_SETTLE_MS - 10)

    // then — 두 번째 입력이 해제를 미뤘다
    expect(store().isNavigating).toBe(true)

    vi.advanceTimersByTime(20)
    expect(store().isNavigating).toBe(false)
  })
})
