import { useDocumentStore } from '../model/documentStore'
import type { CanvasElement } from '../model/types'
import { DrawingNode } from './elements/DrawingNode'

const NO_ELEMENTS: CanvasElement[] = []

/** content-layer 의 요소들. 텍스트는 Phase 4, 이미지는 Phase 5(artboard-layer) 에서 붙는다 */
export function ContentElements() {
  const elements = useDocumentStore((state) => state.document?.elements ?? NO_ELEMENTS)
  return elements.map((element) =>
    element.type === 'drawing' ? <DrawingNode key={element.id} element={element} /> : null,
  )
}
