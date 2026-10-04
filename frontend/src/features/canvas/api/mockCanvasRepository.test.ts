import { beforeEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../../../shared/api'
import { fakeClock } from '../../../test/fakeClock'
import { createEmptyDocument } from '../model/types'
import { createMockCanvasRepository, DEMO_CANVAS_ID } from './mockCanvasRepository'

describe('목 캔버스 저장소', () => {
  beforeEach(() => localStorage.clear())

  const create = () => createMockCanvasRepository({ storage: localStorage, now: fakeClock() })

  it('처음에는 빈 데모 캔버스를 돌려준다', async () => {
    // when
    const canvas = await create().getCanvas(DEMO_CANVAS_ID)

    // then
    expect(canvas.document).toEqual(createEmptyDocument())
    expect(canvas.projectId).toBe('demo')
  })

  it('없는 캔버스는 NotFoundError', async () => {
    await expect(create().getCanvas('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('저장한 문서와 새 updatedAt 이 저장소를 다시 만들어도 남아 있다', async () => {
    // given
    const repository = create()
    const { updatedAt: base } = await repository.getCanvas(DEMO_CANVAS_ID)
    const document = createEmptyDocument()
    document.stage.width = 1200

    // when
    const { updatedAt } = await repository.saveDocument(DEMO_CANVAS_ID, document, base)

    // then
    const reloaded = await create().getCanvas(DEMO_CANVAS_ID)
    expect(reloaded.document.stage.width).toBe(1200)
    expect(reloaded.updatedAt).toBe(updatedAt)
    expect(updatedAt).not.toBe(base)
  })

  it('기준 updatedAt 이 서버 값과 다르면 ConflictError 를 던지고 덮어쓰지 않는다', async () => {
    // given — 같은 기준값으로 두 곳에서 저장한다
    const repository = create()
    const { updatedAt: base } = await repository.getCanvas(DEMO_CANVAS_ID)
    const first = createEmptyDocument()
    first.stage.background = '#000000'
    const { updatedAt: latest } = await repository.saveDocument(DEMO_CANVAS_ID, first, base)

    // when
    const stale = repository.saveDocument(DEMO_CANVAS_ID, createEmptyDocument(), base)

    // then
    await expect(stale).rejects.toBeInstanceOf(ConflictError)
    await expect(stale).rejects.toMatchObject({ currentUpdatedAt: latest })
    const current = await repository.getCanvas(DEMO_CANVAS_ID)
    expect(current.document.stage.background).toBe('#000000')
  })
})
