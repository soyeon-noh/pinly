import { describe, expect, it } from 'vitest'
import { isTypingTarget, resolveShortcut } from './shortcuts'
import type { Tool } from './types'

const tools = [
  { id: 'select', shortcut: 'v' },
  { id: 'hand', shortcut: 'h' },
] as Tool[]

const key = (overrides: Partial<KeyboardEvent>) => ({
  key: '', code: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
  ...overrides,
})

describe('resolveShortcut', () => {
  it('영문 입력 상태에서 툴 단축키를 고른다', () => {
    expect(resolveShortcut(key({ key: 'h', code: 'KeyH' }), tools)).toEqual({ kind: 'tool', id: 'hand' })
  })

  it('한글 입력 상태(V → ㅍ)에서도 같은 툴을 고른다', () => {
    expect(resolveShortcut(key({ key: 'ㅍ', code: 'KeyV' }), tools)).toEqual({ kind: 'tool', id: 'select' })
  })

  it('⌘/Ctrl 과 함께 누른 툴 키는 브라우저 단축키(⌘V 붙여넣기 등)에 양보한다', () => {
    expect(resolveShortcut(key({ key: 'v', code: 'KeyV', metaKey: true }), tools)).toBeNull()
  })

  it('⌘/Ctrl + = / - 는 확대·축소', () => {
    expect(resolveShortcut(key({ key: '=', code: 'Equal', metaKey: true }), tools)).toEqual({ kind: 'zoom-in' })
    expect(resolveShortcut(key({ key: '-', code: 'Minus', ctrlKey: true }), tools)).toEqual({ kind: 'zoom-out' })
  })

  it('Shift+1 은 화면에 맞추기, Shift+0 은 100% — key 가 기호여도 동작한다', () => {
    expect(resolveShortcut(key({ key: '!', code: 'Digit1', shiftKey: true }), tools)).toEqual({ kind: 'zoom-fit' })
    expect(resolveShortcut(key({ key: ')', code: 'Digit0', shiftKey: true }), tools)).toEqual({ kind: 'zoom-100' })
  })

  it('등록되지 않은 키는 무시한다', () => {
    expect(resolveShortcut(key({ key: 'q', code: 'KeyQ' }), tools)).toBeNull()
  })
})

describe('isTypingTarget', () => {
  it('입력창·편집 가능한 요소와 그 안쪽 자식에서는 단축키를 쓰지 않는다', () => {
    // given
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const child = document.createElement('span')
    editable.append(child)
    const readOnly = document.createElement('div')
    readOnly.setAttribute('contenteditable', 'false')

    // then
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(editable)).toBe(true)
    expect(isTypingTarget(child)).toBe(true)
    expect(isTypingTarget(readOnly)).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
