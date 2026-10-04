import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import { installDebugHook } from '../debug/installDebugHook'
import type { CanvasDocument } from '../model/types'
import { selectEffectiveToolId, useToolStore } from '../tools/toolStore'
import type { Tool } from '../tools/types'
import { useToolDispatcher } from '../tools/useToolDispatcher'
import { interpretWheel } from '../viewport/navigation'
import { useViewportStore } from '../viewport/viewportStore'
import styles from './CanvasStage.module.css'

interface CanvasStageProps {
  document: CanvasDocument
  tools: Tool[]
}

/**
 * 캔버스 스테이지. 레이어 4단 구성 (계획 §3-1):
 * - artboard-layer  배경(+ 이미지, Phase 5)
 * - content-layer   텍스트·드로잉. 팬·줌 중에는 히트 판정을 끈다 (F-3)
 * - draft-layer     그리는 중인 선 (Phase 2). 히트 판정 없음
 * - ui-layer        Transformer (Phase 4)
 */
export function CanvasStage({ document, tools }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const documentRef = useRef(document)
  const fittedRef = useRef(false)

  const containerSize = useViewportStore((state) => state.containerSize)
  const viewport = useViewportStore((state) => state.viewport)
  const isNavigating = useViewportStore((state) => state.isNavigating)
  const effectiveToolId = useToolStore(selectEffectiveToolId)
  const { handlers, activeTool } = useToolDispatcher(stageRef, tools)

  const { stage } = document

  // 마운트마다 뷰포트를 새로 시작한다. 아래 effect 들보다 먼저 선언해야 순서가 맞다
  useLayoutEffect(() => {
    fittedRef.current = false
    useViewportStore.getState().reset()
    return () => useViewportStore.getState().reset()
  }, [])

  useLayoutEffect(() => {
    documentRef.current = document
  })

  useLayoutEffect(() => {
    useViewportStore.getState().setArtboardSize({ width: stage.width, height: stage.height })
  }, [stage.width, stage.height])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { setContainerSize } = useViewportStore.getState()
    // 첫 크기는 바로 잰다. ResizeObserver 는 다음 그리기 때 불려 첫 화면이 한 프레임 비고,
    // 화면에 안 보이는 탭에서는 그리기 자체가 미뤄진다
    const { width, height } = container.getBoundingClientRect()
    setContainerSize({ width, height })

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // 처음 크기를 알았을 때 한 번만 화면에 맞춘다. 이후 창 크기가 바뀌어도 사용자가 정한 줌·위치를 유지한다
  useLayoutEffect(() => {
    if (!containerSize || fittedRef.current) return
    fittedRef.current = true
    useViewportStore.getState().fit()
  }, [containerSize])

  useEffect(
    () =>
      installDebugHook({
        getStage: () => stageRef.current,
        getDocument: () => documentRef.current,
        getViewport: () => useViewportStore.getState().viewport,
      }),
    [],
  )

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    // 막지 않으면 ⌘/Ctrl + 휠·핀치가 캔버스 대신 브라우저 페이지를 확대한다
    event.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return

    const store = useViewportStore.getState()
    const action = interpretWheel(event.evt)
    if (action.kind === 'zoom') store.zoomAt(pointer, action.factor)
    else store.panBy(action.dx, action.dy)
    store.pulseNavigating()
  }

  const effectiveTool = tools.find((tool) => tool.id === effectiveToolId)
  const cursor = activeTool
    ? (activeTool.activeCursor ?? activeTool.cursor)
    : (effectiveTool?.cursor ?? 'default')

  return (
    <div ref={containerRef} className={styles.container} style={{ cursor }} data-testid="canvas-stage">
      {containerSize && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onWheel={handleWheel}
          {...handlers}
        >
          <Layer name="artboard-layer" listening={false}>
            <Rect
              name="artboard"
              width={stage.width}
              height={stage.height}
              fill={stage.background}
              shadowColor="rgba(41, 44, 40, 0.18)"
              shadowBlur={24}
              shadowForStrokeEnabled={false}
            />
          </Layer>
          <Layer name="content-layer" listening={!isNavigating} />
          <Layer name="draft-layer" listening={false} />
          <Layer name="ui-layer" />
        </Stage>
      )}
    </div>
  )
}
