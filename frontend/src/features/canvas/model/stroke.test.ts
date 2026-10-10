import { describe, expect, it } from 'vitest'
import { finalizeStroke, simplifyPoints } from './stroke'

const style = { stroke: '#F03E3E', strokeWidth: 4 }

/** 상대 좌표를 x/y 로 되돌린 절대 좌표 */
const absolute = (element: { x: number; y: number; points: number[] }) =>
  element.points.map((v, i) => (i % 2 === 0 ? v + element.x : v + element.y))

describe('simplifyPoints', () => {
  it('직선 위의 점은 양 끝만 남긴다', () => {
    expect(simplifyPoints([0, 0, 1, 1, 2, 2, 3, 3, 10, 10], 0.75)).toEqual([0, 0, 10, 10])
  })

  it('허용 오차보다 크게 꺾인 점은 남긴다', () => {
    expect(simplifyPoints([0, 0, 5, 0.2, 10, 0, 10, 10], 0.75)).toEqual([0, 0, 10, 0, 10, 10])
  })

  it('재귀였다면 콜스택을 넘길 깊이에서도 끝까지 처리한다', () => {
    // given — 지그재그: 매번 끝점 바로 옆에서 쪼개져 깊이가 점 개수만큼 깊어지는 최악의 경우.
    // 재귀 구현은 약 1만 단계에서 콜스택을 넘긴다 (스파이크에서 실제로 넘겼다)
    const points: number[] = []
    for (let i = 0; i < 20_000; i++) points.push(i, i % 2 === 0 ? 0 : 5)

    // when
    const simplified = simplifyPoints(points, 0.75)

    // then — 모든 점이 허용 오차 밖이라 다 남는다
    expect(simplified).toHaveLength(points.length)
  })
})

describe('finalizeStroke', () => {
  it('좌표를 정수로 반올림하고, x/y 를 최소 좌표로 두고 points 를 상대 좌표로 바꾼다', () => {
    // when
    const element = finalizeStroke([100.4, 200.6, 150.2, 260.9, 130.7, 300.1], style, 'el_test')!

    // then
    expect(element).toMatchObject({ id: 'el_test', type: 'drawing', x: 100, y: 201, ...style })
    expect(element.points.every(Number.isInteger)).toBe(true)
    expect(Math.min(...element.points.filter((_, i) => i % 2 === 0))).toBe(0)
    expect(Math.min(...element.points.filter((_, i) => i % 2 === 1))).toBe(0)
  })

  it('정규화해도 그린 위치는 1px 이내로 그대로다', () => {
    // given
    const drawn = [512.3, 88.8, 700.1, 140.4, 640.6, 400.2]

    // when
    const element = finalizeStroke(drawn, style)!

    // then
    absolute(element).forEach((value, i) => expect(Math.abs(value - drawn[i])).toBeLessThanOrEqual(0.5))
  })

  it('반올림 뒤 연속으로 같은 점은 하나로 합친다', () => {
    // when
    const element = finalizeStroke([10.1, 10.1, 10.2, 10.3, 30, 40], style)!

    // then
    expect(absolute(element)).toEqual([10, 10, 30, 40])
  })

  it('클릭만 했으면 같은 점 두 개로 점을 찍는다', () => {
    // when
    const element = finalizeStroke([42.4, 17.6], style)!

    // then
    expect(element).toMatchObject({ x: 42, y: 18, points: [0, 0, 0, 0] })
  })

  it('점이 없으면 만들지 않는다', () => {
    expect(finalizeStroke([], style)).toBeNull()
  })

  it('저장 형식은 스키마의 drawing 요소 모양을 따른다', () => {
    // when
    const element = finalizeStroke([0, 0, 10, 10], style)!

    // then
    expect(Object.keys(element).sort()).toEqual(
      [
        'id', 'type', 'x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'locked',
        'points', 'stroke', 'strokeWidth', 'lineCap', 'lineJoin', 'tension', 'closed',
      ].sort(),
    )
    expect(element.id).toMatch(/^el_/)
  })
})
