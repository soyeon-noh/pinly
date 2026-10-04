import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/api'
import { fakeClock } from '../../../test/fakeClock'
import { createMockCommentRepository } from './mockCommentRepository'

describe('목 코멘트 저장소', () => {
  beforeEach(() => localStorage.clear())

  const create = () =>
    createMockCommentRepository({ storage: localStorage, now: fakeClock(), currentUserId: 'u1' })

  it('핀을 만들면 해당 캔버스 목록에 작성 순으로 나온다', async () => {
    // given
    const repository = create()
    await repository.createPin('c1', { body: '첫 번째', posX: 10, posY: 20 })
    await repository.createPin('c2', { body: '다른 캔버스', posX: 0, posY: 0 })
    await repository.createPin('c1', { body: '두 번째', posX: 30, posY: 40 })

    // when
    const pins = await repository.listPins('c1')

    // then
    expect(pins.map((p) => p.body)).toEqual(['첫 번째', '두 번째'])
    expect(pins[0]).toMatchObject({ posX: 10, posY: 20, resolved: false, authorId: 'u1' })
  })

  it('답글은 좌표 없이 부모 핀에 작성 순으로 붙는다', async () => {
    // given
    const repository = create()
    const pin = await repository.createPin('c1', { body: '핀', posX: 1, posY: 2 })

    // when
    await repository.addReply(pin.id, { body: '답글 1' })
    await repository.addReply(pin.id, { body: '답글 2' })

    // then
    const [loaded] = await repository.listPins('c1')
    expect(loaded.replies.map((r) => r.body)).toEqual(['답글 1', '답글 2'])
    expect(loaded.replies[0].parentId).toBe(pin.id)
    expect(loaded.replies[0]).not.toHaveProperty('posX')
  })

  it('해결됨 표시와 되돌리기, 위치 이동, 본문 수정이 반영된다', async () => {
    // given
    const repository = create()
    const pin = await repository.createPin('c1', { body: '원래 본문', posX: 1, posY: 2 })

    // when
    await repository.resolve(pin.id)
    await repository.movePin(pin.id, 100, 200)
    await repository.editBody(pin.id, '고친 본문')

    // then
    const [resolved] = await repository.listPins('c1')
    expect(resolved).toMatchObject({ resolved: true, posX: 100, posY: 200, body: '고친 본문' })
    expect(resolved.updatedAt > pin.updatedAt).toBe(true)

    await repository.reopen(pin.id)
    const [reopened] = await repository.listPins('c1')
    expect(reopened.resolved).toBe(false)
  })

  it('핀을 지우면 답글도 함께 지워진다', async () => {
    // given
    const repository = create()
    const pin = await repository.createPin('c1', { body: '핀', posX: 1, posY: 2 })
    const reply = await repository.addReply(pin.id, { body: '답글' })

    // when
    await repository.remove(pin.id)

    // then
    expect(await repository.listPins('c1')).toEqual([])
    await expect(repository.editBody(reply.id, '남아 있나')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('답글만 지우면 핀은 남는다', async () => {
    // given
    const repository = create()
    const pin = await repository.createPin('c1', { body: '핀', posX: 1, posY: 2 })
    const reply = await repository.addReply(pin.id, { body: '답글' })

    // when
    await repository.remove(reply.id)

    // then
    const [loaded] = await repository.listPins('c1')
    expect(loaded.replies).toEqual([])
  })

  it('답글은 핀 전용 동작(이동·해결·답글 달기)의 대상이 아니다', async () => {
    // given
    const repository = create()
    const pin = await repository.createPin('c1', { body: '핀', posX: 1, posY: 2 })
    const reply = await repository.addReply(pin.id, { body: '답글' })

    // when / then
    await expect(repository.movePin(reply.id, 0, 0)).rejects.toBeInstanceOf(NotFoundError)
    await expect(repository.resolve(reply.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(repository.addReply(reply.id, { body: '답글의 답글' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
