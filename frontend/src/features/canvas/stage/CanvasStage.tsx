import type Konva from 'konva'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import type { Size } from '../../../shared/lib/geometry'
import { installDebugHook } from '../debug/installDebugHook'
import type { CanvasDocument } from '../model/types'
import { fitToArtboard } from '../viewport/fitToArtboard'
import styles from './CanvasStage.module.css'

interface CanvasStageProps {
  document: CanvasDocument
}

/**
 * 캔버스 스테이지 뼈대 (Phase 0). 컨테이너를 꽉 채우고 아트보드를 화면에 맞춰 그린다.
 * Phase 1 에서 뷰포트를 viewportStore 로 옮기고 팬·줌·레이어 4단 구성으로 확장한다.
 */
export function CanvasStage({ document }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const documentRef = useRef(document)
  const [size, setSize] = useState<Size | null>(null)

  useLayoutEffect(() => {
    documentRef.current = document
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () =>
      installDebugHook({
        getStage: () => stageRef.current,
        getDocument: () => documentRef.current,
      }),
    [],
  )

  const { stage } = document
  // 지금은 크기가 바뀔 때마다 다시 맞춘다. 사용자가 줌을 조작하게 되면(Phase 1) 처음 한 번만 맞춘다
  const viewport = size ? fitToArtboard(size, stage) : null

  return (
    <div ref={containerRef} className={styles.container} data-testid="canvas-stage">
      {size && viewport && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
        >
          <Layer listening={false}>
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
        </Stage>
      )}
    </div>
  )
}
