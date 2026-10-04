import { describe, expect, it } from 'vitest'
import { interpretWheel, MAX_SCALE, MIN_SCALE, nextZoomStep, wheelZoomFactor } from './navigation'

const wheel = (overrides: Partial<WheelEvent>) => ({
  deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false,
  ...overrides,
})

describe('wheelZoomFactor', () => {
  it('위로 굴리면 확대, 아래로 굴리면 축소', () => {
    expect(wheelZoomFactor(-10)).toBeGreaterThan(1)
    expect(wheelZoomFactor(10)).toBeLessThan(1)
  })

  it('마우스 휠 한 칸처럼 큰 값은 잘라서 한 번에 1.5배를 넘지 않는다', () => {
    expect(wheelZoomFactor(-100)).toBeLessThan(1.5)
    expect(wheelZoomFactor(-100)).toBe(wheelZoomFactor(-1000))
  })

  it('줄 단위(deltaMode=1) 휠은 픽셀로 바꿔 계산한다', () => {
    expect(wheelZoomFactor(-1, 1)).toBe(wheelZoomFactor(-16, 0))
  })
})

describe('interpretWheel', () => {
  it('⌘ 또는 Ctrl 이 눌려 있으면 줌 (트랙패드 핀치 포함)', () => {
    expect(interpretWheel(wheel({ deltaY: -5, ctrlKey: true })).kind).toBe('zoom')
    expect(interpretWheel(wheel({ deltaY: -5, metaKey: true })).kind).toBe('zoom')
  })

  it('수정키 없는 휠·두 손가락 스크롤은 반대 방향으로 이동', () => {
    expect(interpretWheel(wheel({ deltaX: 12, deltaY: -30 }))).toEqual({ kind: 'pan', dx: -12, dy: 30 })
  })

  it('Shift + 세로 휠은 가로 이동', () => {
    expect(interpretWheel(wheel({ deltaY: 40, shiftKey: true }))).toEqual({ kind: 'pan', dx: -40, dy: 0 })
  })
})

describe('nextZoomStep', () => {
  it('단계 사이의 배율에서는 가장 가까운 다음 단계로 간다', () => {
    expect(nextZoomStep(0.42, 1)).toBe(0.5)
    expect(nextZoomStep(0.42, -1)).toBe(0.333)
  })

  it('정확히 단계 위에 있으면 그 단계를 건너뛴다', () => {
    expect(nextZoomStep(1, 1)).toBe(1.5)
    expect(nextZoomStep(1, -1)).toBe(0.667)
  })

  it('범위 끝에서는 더 가지 않는다', () => {
    expect(nextZoomStep(MAX_SCALE, 1)).toBe(MAX_SCALE)
    expect(nextZoomStep(MIN_SCALE, -1)).toBe(MIN_SCALE)
  })
})
