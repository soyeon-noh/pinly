import type { Tool, ToolContext, ToolId, ToolPointerEvent } from './types'

export const MIDDLE_BUTTON = 1
const RIGHT_BUTTON = 2

/** 이번 시퀀스를 맡을 툴. 가운데 버튼은 어떤 툴이든 손 툴 */
export function toolIdForButton(button: number, effectiveToolId: ToolId): ToolId {
  return button === MIDDLE_BUTTON ? 'hand' : effectiveToolId
}

/**
 * 포인터 시퀀스를 툴 하나에 고정해 넘긴다. React·Konva 와 무관한 순수 로직이라 단위 테스트한다.
 * - 툴과 컨텍스트는 호출하는 쪽(이벤트 핸들러)이 pointerDown 에 넘긴다
 * - 시퀀스 도중 툴이 바뀌어도 move/up 은 처음 툴로 간다
 * - 두 번째 포인터(멀티 터치 등)와 오른쪽 버튼은 무시한다
 */
export function createToolDispatcher(options: {
  /** 시퀀스가 시작·끝날 때 (커서 갱신용) */
  onSequenceChange?(tool: Tool | null): void
} = {}) {
  let current: { tool: Tool; pointerId: number; context: ToolContext } | null = null

  const finish = () => {
    const finished = current
    current = null
    options.onSequenceChange?.(null)
    return finished
  }

  return {
    get activeTool() {
      return current?.tool ?? null
    },

    pointerDown(event: ToolPointerEvent, tool: Tool | undefined, context: ToolContext | null) {
      if (current || event.native.button === RIGHT_BUTTON || !tool || !context) return
      current = { tool, pointerId: event.native.pointerId, context }
      options.onSequenceChange?.(tool)
      tool.onPointerDown?.(event, context)
    },

    pointerMove(event: ToolPointerEvent) {
      if (!current || event.native.pointerId !== current.pointerId) return
      current.tool.onPointerMove?.(event, current.context)
    },

    pointerUp(event: ToolPointerEvent) {
      if (!current || event.native.pointerId !== current.pointerId) return
      // 툴이 up 처리 중에 툴 전환을 요청해도 안전하도록 먼저 시퀀스를 닫는다
      const { tool, context } = finish()!
      tool.onPointerUp?.(event, context)
    },

    cancel() {
      if (!current) return
      const { tool, context } = finish()!
      tool.onPointerCancel?.(context)
    },
  }
}
