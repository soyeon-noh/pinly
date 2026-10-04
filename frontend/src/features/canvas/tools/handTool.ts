import type { Point } from '../../../shared/lib/geometry'
import { HandIcon } from '../../../shared/ui/icons'
import { useViewportStore } from '../viewport/viewportStore'
import type { Tool } from './types'

/** 손 툴 — 드래그한 만큼 화면을 옮긴다. Space·가운데 버튼으로도 임시로 쓴다 */
export function createHandTool(): Tool {
  let last: Point | null = null

  const end = () => {
    last = null
    useViewportStore.getState().setNavigating(false)
  }

  return {
    id: 'hand',
    label: '손',
    shortcut: 'h',
    Icon: HandIcon,
    cursor: 'grab',
    activeCursor: 'grabbing',

    onPointerDown(event) {
      last = event.screen
      useViewportStore.getState().setNavigating(true)
    },

    onPointerMove(event) {
      if (!last) return
      useViewportStore.getState().panBy(event.screen.x - last.x, event.screen.y - last.y)
      last = event.screen
    },

    onPointerUp: end,
    onPointerCancel: end,
  }
}
