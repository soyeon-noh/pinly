import type Konva from 'konva'
import { describe, expect, it, vi } from 'vitest'
import { createToolDispatcher, MIDDLE_BUTTON, toolIdForButton } from './toolDispatcher'
import type { Tool, ToolId, ToolPointerEvent } from './types'

const fakeTool = (id: ToolId): Tool => ({
  id, label: id, shortcut: id[0], Icon: () => null, cursor: 'default',
  onPointerDown: vi.fn(), onPointerMove: vi.fn(), onPointerUp: vi.fn(), onPointerCancel: vi.fn(),
})

const pointer = (overrides: Partial<PointerEvent> = {}): ToolPointerEvent => ({
  screen: { x: 0, y: 0 },
  stage: { x: 0, y: 0 },
  target: null,
  native: { button: 0, pointerId: 1, ...overrides } as PointerEvent,
})

const context = { stage: {} as Konva.Stage }

describe('툴 이벤트 분배', () => {
  it('시퀀스 도중 툴이 바뀌어도 move·up 은 누를 때의 툴로 간다 (F-7)', () => {
    // given — 댓글 툴로 누른다. 이후 툴이 무엇으로 바뀌든 분배기는 묻지 않는다
    const comment = fakeTool('comment')
    const dispatcher = createToolDispatcher()
    dispatcher.pointerDown(pointer(), comment, context)

    // when
    dispatcher.pointerMove(pointer())
    dispatcher.pointerUp(pointer())

    // then
    expect(comment.onPointerMove).toHaveBeenCalledOnce()
    expect(comment.onPointerUp).toHaveBeenCalledOnce()
  })

  it('가운데 버튼은 어떤 툴이 골라져 있든 손 툴로 간다', () => {
    expect(toolIdForButton(MIDDLE_BUTTON, 'comment')).toBe('hand')
    expect(toolIdForButton(0, 'comment')).toBe('comment')
  })

  it('오른쪽 버튼과 두 번째 포인터는 무시한다', () => {
    // given
    const comment = fakeTool('comment')
    const dispatcher = createToolDispatcher()

    // when
    dispatcher.pointerDown(pointer({ button: 2 }), comment, context)
    dispatcher.pointerDown(pointer({ pointerId: 1 }), comment, context)
    dispatcher.pointerDown(pointer({ pointerId: 2 }), comment, context)
    dispatcher.pointerMove(pointer({ pointerId: 2 }))

    // then
    expect(comment.onPointerDown).toHaveBeenCalledOnce()
    expect(comment.onPointerMove).not.toHaveBeenCalled()
  })

  it('툴이나 Stage 가 없으면 시퀀스를 시작하지 않는다', () => {
    // given
    const dispatcher = createToolDispatcher()

    // when
    dispatcher.pointerDown(pointer(), undefined, context)
    dispatcher.pointerDown(pointer(), fakeTool('select'), null)

    // then
    expect(dispatcher.activeTool).toBeNull()
  })

  it('취소되면 진행 중인 툴에 알리고 다음 시퀀스를 받을 수 있다', () => {
    // given
    const comment = fakeTool('comment')
    const onSequenceChange = vi.fn()
    const dispatcher = createToolDispatcher({ onSequenceChange })
    dispatcher.pointerDown(pointer(), comment, context)

    // when
    dispatcher.cancel()
    dispatcher.pointerDown(pointer(), comment, context)

    // then
    expect(comment.onPointerCancel).toHaveBeenCalledOnce()
    expect(comment.onPointerDown).toHaveBeenCalledTimes(2)
    expect(onSequenceChange).toHaveBeenNthCalledWith(1, comment)
    expect(onSequenceChange).toHaveBeenNthCalledWith(2, null)
  })
})
