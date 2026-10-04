import type { Tool, ToolId } from './types'

export type ShortcutCommand =
  | { kind: 'tool'; id: ToolId }
  | { kind: 'zoom-in' }
  | { kind: 'zoom-out' }
  | { kind: 'zoom-fit' }
  | { kind: 'zoom-100' }

type KeyInput = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/** 글자를 입력하는 중이면 단축키를 쓰지 않는다. 편집 영역 안쪽 자식에서 눌러도 해당된다 */
export function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null
}

/**
 * 키 입력 → 캔버스 명령.
 * 툴·Shift+숫자는 물리 키 위치(code)로 판별한다 — 한글 입력 상태에서 V 는 key 가 'ㅍ' 이고,
 * Shift+1 은 key 가 '!' 이기 때문이다.
 */
export function resolveShortcut(event: KeyInput, tools: Tool[]): ShortcutCommand | null {
  const command = event.metaKey || event.ctrlKey
  if (command && !event.altKey) {
    if (event.code === 'Equal' || event.key === '+' || event.key === '=') return { kind: 'zoom-in' }
    if (event.code === 'Minus' || event.key === '-') return { kind: 'zoom-out' }
    return null
  }
  if (command || event.altKey) return null

  if (event.shiftKey) {
    if (event.code === 'Digit1') return { kind: 'zoom-fit' }
    if (event.code === 'Digit0') return { kind: 'zoom-100' }
    return null
  }

  const tool = tools.find((t) => event.code === `Key${t.shortcut.toUpperCase()}`)
  return tool ? { kind: 'tool', id: tool.id } : null
}
