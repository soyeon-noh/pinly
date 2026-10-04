import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createToolDispatcher, MIDDLE_BUTTON, toolIdForButton } from './toolDispatcher'
import { selectEffectiveToolId, useToolStore } from './toolStore'
import type { Tool, ToolPointerEvent } from './types'

type PointerHandler = (event: KonvaEventObject<PointerEvent>) => void

/**
 * Stage 의 포인터 이벤트를 툴에 연결한다. 반환한 handlers 를 Stage 에 펼쳐 넣는다.
 * activeTool 은 포인터를 누르고 있는 동안의 툴 (커서 표시용).
 */
export function useToolDispatcher(stageRef: RefObject<Konva.Stage | null>, tools: Tool[]) {
  const toolsRef = useRef(tools)
  useLayoutEffect(() => {
    toolsRef.current = tools
  })

  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  // 분배기는 ref 를 붙잡지 않는다 — 툴과 Stage 는 이벤트 핸들러에서 구해 넘긴다
  const [dispatcher] = useState(() => createToolDispatcher({ onSequenceChange: setActiveTool }))

  const toToolEvent = (event: KonvaEventObject<PointerEvent>): ToolPointerEvent | null => {
    const stage = stageRef.current
    const screen = stage?.getPointerPosition()
    const point = stage?.getRelativePointerPosition()
    if (!screen || !point) return null
    return { screen, stage: point, target: event.target, native: event.evt }
  }

  const onPointerDown: PointerHandler = (event) => {
    const toolEvent = toToolEvent(event)
    if (!toolEvent) return
    // 가운데 버튼의 자동 스크롤(Windows) 같은 브라우저 기본 동작을 막는다
    if (event.evt.button === MIDDLE_BUTTON) event.evt.preventDefault()

    const toolId = toolIdForButton(event.evt.button, selectEffectiveToolId(useToolStore.getState()))
    const tool = toolsRef.current.find((candidate) => candidate.id === toolId)
    const stage = stageRef.current
    dispatcher.pointerDown(toolEvent, tool, stage ? { stage } : null)
    // Konva 는 캔버스 요소에만 리스너를 건다. 드래그가 캔버스 밖으로 나가도 이벤트가 오도록 캡처한다
    if (dispatcher.activeTool) stageRef.current?.content.setPointerCapture(event.evt.pointerId)
  }

  const onPointerMove: PointerHandler = (event) => {
    const toolEvent = toToolEvent(event)
    if (toolEvent) dispatcher.pointerMove(toolEvent)
  }

  const onPointerUp: PointerHandler = (event) => {
    const toolEvent = toToolEvent(event)
    if (toolEvent) dispatcher.pointerUp(toolEvent)
  }

  const onPointerCancel = () => dispatcher.cancel()

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, activeTool }
}
