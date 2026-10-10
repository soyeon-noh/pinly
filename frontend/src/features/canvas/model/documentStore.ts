import { create } from 'zustand'
import type { CanvasDocument, CanvasElement } from './types'

/**
 * 편집 중인 캔버스 문서.
 * Phase 2 는 불러오기·추가·삭제만 둔다. 되돌리기(히스토리)·자동저장은 Phase 3 에서 이 액션들 위에 붙는다.
 * 모든 요소 변경은 이 액션을 거친다 — 커밋 1회 = 히스토리 1칸 = 자동저장 1회가 되도록 (계획 §3-3).
 */
interface DocumentState {
  document: CanvasDocument | null
  load(document: CanvasDocument): void
  /** 맨 앞(배열 끝)에 추가한다. 배열 순서 = z-order */
  addElement(element: CanvasElement): void
  removeElement(id: string): void
  reset(): void
}

export const useDocumentStore = create<DocumentState>()((set) => ({
  document: null,

  load: (document) => set({ document }),

  addElement: (element) =>
    set(({ document }) =>
      document ? { document: { ...document, elements: [...document.elements, element] } } : {},
    ),

  removeElement: (id) =>
    set(({ document }) => {
      if (!document || !document.elements.some((element) => element.id === id)) return {}
      return {
        document: { ...document, elements: document.elements.filter((element) => element.id !== id) },
      }
    }),

  reset: () => set({ document: null }),
}))
