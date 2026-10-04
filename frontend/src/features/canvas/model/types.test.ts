import { describe, expect, it } from 'vitest'
import { createEmptyDocument } from './types'

describe('createEmptyDocument', () => {
  it('백엔드 Canvas.emptyDocument() 와 같은 모양의 빈 문서를 만든다', () => {
    // when
    const document = createEmptyDocument()

    // then
    expect(document).toEqual({
      schemaVersion: 1,
      stage: { width: 1920, height: 1080, background: '#FFFFFF' },
      elements: [],
    })
  })

  it('호출할 때마다 새 객체를 돌려줘 한쪽을 고쳐도 다른 문서에 번지지 않는다', () => {
    // given
    const first = createEmptyDocument()
    const second = createEmptyDocument()

    // when
    first.stage.width = 1200

    // then
    expect(second.stage.width).toBe(1920)
    expect(first.elements).not.toBe(second.elements)
  })
})
