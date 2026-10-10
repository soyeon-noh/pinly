import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentStore } from './documentStore'
import { finalizeStroke } from './stroke'
import { createEmptyDocument } from './types'

const store = () => useDocumentStore.getState()
const line = (id: string) => finalizeStroke([0, 0, 10, 10], { stroke: '#000', strokeWidth: 4 }, id)!

describe('documentStore', () => {
  beforeEach(() => store().reset())

  it('추가한 요소는 배열 끝(맨 앞 z-order)에 쌓인다', () => {
    // given
    store().load(createEmptyDocument())

    // when
    store().addElement(line('a'))
    store().addElement(line('b'))

    // then
    expect(store().document!.elements.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('id 로 요소를 지운다', () => {
    // given
    store().load(createEmptyDocument())
    store().addElement(line('a'))
    store().addElement(line('b'))

    // when
    store().removeElement('a')

    // then
    expect(store().document!.elements.map((e) => e.id)).toEqual(['b'])
  })

  it('없는 id 를 지우면 문서 객체를 바꾸지 않는다 — 구독자가 다시 그리지 않도록', () => {
    // given
    store().load(createEmptyDocument())
    store().addElement(line('a'))
    const before = store().document

    // when
    store().removeElement('nope')

    // then
    expect(store().document).toBe(before)
  })

  it('문서를 불러오기 전에는 추가를 무시한다', () => {
    // when
    store().addElement(line('a'))

    // then
    expect(store().document).toBeNull()
  })
})
