import type Konva from 'konva'
import type { Point } from '../../../shared/lib/geometry'
import { EraserIcon } from '../../../shared/ui/icons'
import { useDocumentStore } from '../model/documentStore'
import type { Tool } from './types'

/**
 * 지우개 = 그린 선을 통째로 삭제한다 (스키마 §4-3). 픽셀을 지우지 않는다.
 * 누른 채 문지르면 지나가는 선을 모두 지운다. 텍스트·이미지는 지우지 않는다 (선택 후 Delete, Phase 4).
 */
export function createEraseTool(): Tool {
  let erasing = false

  const eraseAt = (stage: Konva.Stage, screen: Point) => {
    const shape = stage.getIntersection(screen)
    if (shape?.hasName('drawing')) useDocumentStore.getState().removeElement(shape.id())
  }

  return {
    id: 'erase',
    label: '지우개',
    shortcut: 'e',
    Icon: EraserIcon,
    cursor: 'cell',

    onPointerDown(event, { stage }) {
      erasing = true
      eraseAt(stage, event.screen)
    },

    onPointerMove(event, { stage }) {
      if (erasing) eraseAt(stage, event.screen)
    },

    onPointerUp() {
      erasing = false
    },

    onPointerCancel() {
      erasing = false
    },
  }
}
