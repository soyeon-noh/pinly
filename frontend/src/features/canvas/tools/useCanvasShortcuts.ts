import { useEffect, useLayoutEffect, useRef } from 'react'
import { useViewportStore } from '../viewport/viewportStore'
import { isTypingTarget, resolveShortcut } from './shortcuts'
import { useToolStore } from './toolStore'
import type { Tool } from './types'

/** 캔버스 단축키 — 툴 전환, Space 임시 손 툴, 확대·축소 */
export function useCanvasShortcuts(tools: Tool[]) {
  const toolsRef = useRef(tools)
  useLayoutEffect(() => {
    toolsRef.current = tools
  })

  useEffect(() => {
    const { setSpaceHeld, setActiveTool } = useToolStore.getState()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || isTypingTarget(event.target)) return

      if (event.code === 'Space') {
        // 페이지 스크롤·포커스된 버튼 누르기를 막는다
        event.preventDefault()
        if (!event.repeat) setSpaceHeld(true)
        return
      }

      const command = resolveShortcut(event, toolsRef.current)
      if (!command) return
      event.preventDefault()

      const viewport = useViewportStore.getState()
      switch (command.kind) {
        case 'tool':
          setActiveTool(command.id)
          break
        case 'zoom-in':
          viewport.stepZoom(1)
          break
        case 'zoom-out':
          viewport.stepZoom(-1)
          break
        case 'zoom-fit':
          viewport.fit()
          break
        case 'zoom-100':
          viewport.zoomTo(1)
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return
      event.preventDefault()
      setSpaceHeld(false)
    }

    // Space 를 누른 채 창을 벗어나면 keyup 이 오지 않는다
    const onBlur = () => setSpaceHeld(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      setSpaceHeld(false)
    }
  }, [])
}
