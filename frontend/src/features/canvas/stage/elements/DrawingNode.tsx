import { memo } from 'react'
import { Line } from 'react-konva'
import type { DrawingElement } from '../../model/types'

/**
 * 그린 선 하나. 요소 객체가 바뀌지 않으면 다시 그리지 않는다 (요소는 불변 객체).
 * hitStrokeWidth 는 줌 배율에 따라 syncHitTolerance 가 직접 맞추므로 여기서 넘기지 않는다.
 */
export const DrawingNode = memo(function DrawingNode({ element }: { element: DrawingElement }) {
  return (
    <Line
      id={element.id}
      name="element drawing"
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      scaleX={element.scaleX}
      scaleY={element.scaleY}
      opacity={element.opacity}
      points={element.points}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      lineCap={element.lineCap}
      lineJoin={element.lineJoin}
      tension={element.tension}
      closed={element.closed}
      perfectDrawEnabled={false}
    />
  )
})
