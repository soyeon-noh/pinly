import { useCallback, useRef, useState } from 'react'

export const EMPTY_DOC = {
  schemaVersion: 1,
  stage: { width: 1920, height: 1080, background: '#FFFFFF' },
  elements: [],
}

const MAX_HISTORY = 50

/**
 * 캔버스 문서 상태 + 되돌리기/다시하기.
 * 히스토리는 문서 스냅샷(구조적 복사) 스택으로 단순 구현 — MVP 단일 편집 기준.
 */
export function useCanvasDoc(initial = EMPTY_DOC) {
  const [doc, setDocState] = useState(initial)
  const past = useRef([])
  const future = useRef([])
  const [, forceRender] = useState(0)

  // commit=false 면 히스토리에 쌓지 않는다 (드래그 중 연속 갱신용)
  const setDoc = useCallback((updater, commit = true) => {
    setDocState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next === prev) return prev
      if (commit) {
        past.current.push(prev)
        if (past.current.length > MAX_HISTORY) past.current.shift()
        future.current = []
      }
      return next
    })
    if (commit) forceRender((n) => n + 1)
  }, [])

  const undo = useCallback(() => {
    if (!past.current.length) return
    setDocState((prev) => {
      future.current.push(prev)
      return past.current.pop()
    })
    forceRender((n) => n + 1)
  }, [])

  const redo = useCallback(() => {
    if (!future.current.length) return
    setDocState((prev) => {
      past.current.push(prev)
      return future.current.pop()
    })
    forceRender((n) => n + 1)
  }, [])

  return {
    doc,
    setDoc,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  }
}

let seq = 0
export const newId = (prefix) =>
  `el_${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`

/** 모든 요소가 공유하는 기본 필드 (docs/canvas-schema.md §3) */
export const baseElement = (type, x, y) => ({
  id: newId(type.slice(0, 3)),
  type,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  locked: false,
})
