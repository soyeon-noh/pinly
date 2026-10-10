import Konva from 'konva'
import { PenIcon } from '../../../shared/ui/icons'
import { useDocumentStore } from '../model/documentStore'
import { finalizeStroke, STROKE_SHAPE } from '../model/stroke'
import { useDrawStyleStore } from './drawStyleStore'
import type { Tool } from './types'

/** 이보다 짧게 움직인 점은 버린다 (화면 px). 점 수를 줄여 저장 크기·렌더 비용을 낮춘다 */
const MIN_SCREEN_STEP_PX = 1

/**
 * 그리기 툴. 그리는 동안은 draft-layer 의 Konva 선에 점을 직접 붙이고 React 는 건드리지 않는다
 * (스파이크 F-4: 매 이동마다 setState 하면 선이 길수록 느려진다). 손을 뗄 때 한 번만 문서에 커밋한다.
 */
export function createDrawTool(): Tool {
  let line: Konva.Line | null = null
  let points: number[] = []
  let style = { stroke: '', strokeWidth: 0 }

  const discard = () => {
    const layer = line?.getLayer()
    line?.destroy()
    layer?.batchDraw()
    line = null
    points = []
  }

  return {
    id: 'draw',
    label: '그리기',
    shortcut: 'p',
    Icon: PenIcon,
    cursor: 'crosshair',

    onPointerDown(event, { stage }) {
      const layer = stage.findOne<Konva.Layer>('.draft-layer')
      if (!layer) return
      const { color, width } = useDrawStyleStore.getState()
      style = { stroke: color, strokeWidth: width }
      points = [event.stage.x, event.stage.y]
      line = new Konva.Line({
        ...style,
        ...STROKE_SHAPE,
        points,
        listening: false,
        perfectDrawEnabled: false,
      })
      layer.add(line)
      layer.batchDraw()
    },

    onPointerMove(event, { stage }) {
      if (!line) return
      const lastX = points[points.length - 2]
      const lastY = points[points.length - 1]
      const minStep = MIN_SCREEN_STEP_PX / stage.scaleX()
      if (Math.hypot(event.stage.x - lastX, event.stage.y - lastY) < minStep) return

      // 새 배열로 넘겨야 Konva 가 곡선(tension) 캐시를 다시 계산한다
      points = points.concat(event.stage.x, event.stage.y)
      line.points(points)
      line.getLayer()?.batchDraw()
    },

    onPointerUp() {
      const element = finalizeStroke(points, style)
      if (element) useDocumentStore.getState().addElement(element)
      discard()
    },

    onPointerCancel: discard,
  }
}
