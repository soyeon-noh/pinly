import type Konva from 'konva'

/** 선을 집을 수 있는 폭 (화면 px). 선 양쪽으로 절반씩 — 선에서 6px 안쪽이면 집힌다 */
export const HIT_TOLERANCE_PX = 12

/**
 * 줌 배율에 맞춰 선의 히트 폭을 맞춘다. 히트 폭은 stage 단위라, 고정값이면 축소했을 때
 * 얇은 선을 거의 집을 수 없다. 팬·줌이 끝난 뒤 한 번 돌린다 — 매 휠 입력마다 돌리지 않는다.
 */
export function syncHitTolerance(layer: Konva.Layer, scale: number) {
  const minimum = HIT_TOLERANCE_PX / scale
  layer.find<Konva.Line>('.drawing').forEach((line) => {
    line.hitStrokeWidth(Math.max(line.strokeWidth(), minimum))
  })
  layer.batchDraw()
}
