import { elementBase, newElementId } from './elementFactory'
import type { DrawingElement } from './types'

/** 그리는 중인 선과 확정된 선이 같은 모양으로 보이도록 공유하는 값 */
export const STROKE_SHAPE = {
  lineCap: 'round',
  lineJoin: 'round',
  tension: 0.4,
  closed: false,
} as const satisfies Pick<DrawingElement, 'lineCap' | 'lineJoin' | 'tension' | 'closed'>

/** 단순화 허용 오차 (stage px). 이보다 덜 벗어나는 점은 버린다 */
export const SIMPLIFY_EPSILON = 0.75

/** 점 i 에서 선분 a–b 까지 거리의 제곱. points 는 평탄 배열 */
function distanceToSegmentSquared(points: number[], i: number, a: number, b: number) {
  const px = points[i * 2], py = points[i * 2 + 1]
  const ax = points[a * 2], ay = points[a * 2 + 1]
  const bx = points[b * 2], by = points[b * 2 + 1]
  const dx = bx - ax, dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  const ex = px - (ax + t * dx), ey = py - (ay + t * dy)
  return ex * ex + ey * ey
}

/**
 * Ramer–Douglas–Peucker 선 단순화. 평탄 배열 `[x1, y1, x2, y2, …]` 을 받는다.
 * 재귀 대신 스택으로 구현한다 — 점이 수만 개인 선에서 콜스택을 넘기지 않도록 (스파이크에서 실제로 넘겼다).
 */
export function simplifyPoints(points: number[], epsilon: number): number[] {
  const count = points.length / 2
  if (count <= 2) return points.slice()

  const keep = new Uint8Array(count)
  keep[0] = 1
  keep[count - 1] = 1
  const epsilonSquared = epsilon * epsilon
  const stack: Array<[number, number]> = [[0, count - 1]]

  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let farthest = -1
    let farthestDistance = epsilonSquared
    for (let i = start + 1; i < end; i++) {
      const distance = distanceToSegmentSquared(points, i, start, end)
      if (distance > farthestDistance) {
        farthest = i
        farthestDistance = distance
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1
      stack.push([start, farthest], [farthest, end])
    }
  }

  const simplified: number[] = []
  for (let i = 0; i < count; i++) {
    if (keep[i]) simplified.push(points[i * 2], points[i * 2 + 1])
  }
  return simplified
}

/**
 * 그리기를 마친 점들을 저장할 drawing 요소로 만든다 (계획 §3-4).
 * 단순화 → 정수 반올림(스파이크 F-1, JSONB −67%) → 연속 중복 제거 → x/y 오프셋 정규화.
 * 클릭만 했으면 같은 점 두 개로 만들어 둥근 끝 모양으로 점이 찍히게 한다.
 */
export function finalizeStroke(
  stagePoints: number[],
  style: { stroke: string; strokeWidth: number },
  id = newElementId(),
): DrawingElement | null {
  if (stagePoints.length < 2) return null

  const rounded = simplifyPoints(stagePoints, SIMPLIFY_EPSILON).map(Math.round)
  const points: number[] = []
  for (let i = 0; i < rounded.length; i += 2) {
    const x = rounded[i], y = rounded[i + 1]
    const n = points.length
    if (n > 0 && points[n - 2] === x && points[n - 1] === y) continue
    points.push(x, y)
  }
  if (points.length === 2) points.push(points[0], points[1])

  let minX = Infinity
  let minY = Infinity
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i])
    minY = Math.min(minY, points[i + 1])
  }

  return {
    ...elementBase(minX, minY, id),
    type: 'drawing',
    points: points.map((value, i) => (i % 2 === 0 ? value - minX : value - minY)),
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    ...STROKE_SHAPE,
  }
}
