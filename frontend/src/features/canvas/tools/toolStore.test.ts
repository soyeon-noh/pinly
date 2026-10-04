import { describe, expect, it } from 'vitest'
import { selectEffectiveToolId } from './toolStore'

describe('selectEffectiveToolId', () => {
  it('Space 를 누르고 있는 동안은 어떤 툴이든 손 툴', () => {
    expect(selectEffectiveToolId({ activeToolId: 'select', spaceHeld: true })).toBe('hand')
    expect(selectEffectiveToolId({ activeToolId: 'draw', spaceHeld: true })).toBe('hand')
  })

  it('Space 를 떼면 고른 툴로 돌아간다', () => {
    expect(selectEffectiveToolId({ activeToolId: 'select', spaceHeld: false })).toBe('select')
  })
})
