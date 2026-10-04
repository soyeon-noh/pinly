import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyDocument } from '../model/types'
import { installDebugHook } from './installDebugHook'

describe('installDebugHook', () => {
  afterEach(() => {
    delete window.__pinly
  })

  it('개발 환경에서 window.__pinly 로 현재 문서를 읽을 수 있다', () => {
    // given
    const document = createEmptyDocument()

    // when
    installDebugHook({ getStage: () => null, getDocument: () => document })

    // then
    expect(window.__pinly?.doc()).toBe(document)
  })

  it('뷰포트를 넘겨주면 window.__pinly.viewport() 로 읽을 수 있다', () => {
    // when
    installDebugHook({
      getStage: () => null,
      getDocument: () => null,
      getViewport: () => ({ x: 10, y: 20, scale: 0.5 }),
    })

    // then
    expect(window.__pinly?.viewport()).toEqual({ x: 10, y: 20, scale: 0.5 })
  })

  it('Stage 가 아직 없으면 bench 는 null', () => {
    // when
    installDebugHook({ getStage: () => null, getDocument: () => null })

    // then
    expect(window.__pinly?.bench()).toBeNull()
  })

  it('해제하면 자기 훅만 지우고 나중에 붙은 훅은 남긴다', () => {
    // given — StrictMode 처럼 붙였다 떼고 다시 붙인다
    const releaseFirst = installDebugHook({ getStage: () => null, getDocument: () => null })
    const second = createEmptyDocument()
    installDebugHook({ getStage: () => null, getDocument: () => second })

    // when
    releaseFirst()

    // then
    expect(window.__pinly?.doc()).toBe(second)
  })
})
