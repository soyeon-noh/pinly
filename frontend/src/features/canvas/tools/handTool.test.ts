import type Konva from 'konva'
import { beforeEach, describe, expect, it } from 'vitest'
import { useViewportStore } from '../viewport/viewportStore'
import { createHandTool } from './handTool'
import type { ToolPointerEvent } from './types'

const at = (x: number, y: number): ToolPointerEvent => ({
  screen: { x, y },
  stage: { x, y },
  target: null,
  native: { button: 0, pointerId: 1 } as PointerEvent,
})
const context = { stage: {} as Konva.Stage }
const store = () => useViewportStore.getState()

describe('손 툴', () => {
  beforeEach(() => store().reset())

  it('드래그한 화면 거리만큼 뷰포트를 옮기고, 그동안 이동 중 상태가 된다', () => {
    // given
    const hand = createHandTool()

    // when
    hand.onPointerDown!(at(100, 100), context)
    hand.onPointerMove!(at(130, 90), context)
    hand.onPointerMove!(at(150, 70), context)

    // then
    expect(store().viewport).toMatchObject({ x: 50, y: -30 })
    expect(store().isNavigating).toBe(true)

    hand.onPointerUp!(at(150, 70), context)
    expect(store().isNavigating).toBe(false)
  })

  it('누르지 않은 상태의 이동은 무시한다', () => {
    // given
    const hand = createHandTool()

    // when
    hand.onPointerMove!(at(500, 500), context)

    // then
    expect(store().viewport).toMatchObject({ x: 0, y: 0 })
  })

  it('취소되면 이동 중 상태를 푼다', () => {
    // given
    const hand = createHandTool()
    hand.onPointerDown!(at(0, 0), context)

    // when
    hand.onPointerCancel!(context)

    // then
    expect(store().isNavigating).toBe(false)
  })
})
