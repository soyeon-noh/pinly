import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/api'
import { fakeClock } from '../../../test/fakeClock'
import { createMockFeedbackRepository } from './mockFeedbackRepository'

describe('목 피드백 저장소', () => {
  beforeEach(() => localStorage.clear())

  const create = () => createMockFeedbackRepository({ storage: localStorage, now: fakeClock() })

  it('로그는 프로젝트별로 나뉘고 작성 순으로 나온다', async () => {
    // given
    const repository = create()
    await repository.createLog('p1', '1화')
    await repository.createLog('p2', '다른 프로젝트')
    await repository.createLog('p1', '2화')

    // when
    const logs = await repository.listLogs('p1')

    // then
    expect(logs.map((l) => l.name)).toEqual(['1화', '2화'])
  })

  it('로그 이름을 바꿀 수 있다', async () => {
    // given
    const repository = create()
    const log = await repository.createLog('p1', '1화')

    // when
    await repository.renameLog(log.id, '1화 최종')

    // then
    const [renamed] = await repository.listLogs('p1')
    expect(renamed.name).toBe('1화 최종')
  })

  it('새 피드백은 수정 대기로 시작하고 연결한 핀을 기억한다', async () => {
    // given
    const repository = create()
    const log = await repository.createLog('p1', '1화')

    // when
    const linked = await repository.createFeedback(log.id, { content: '명암 수정', commentId: 'pin-1' })
    const standalone = await repository.createFeedback(log.id, { content: '전체 톤 확인' })

    // then
    expect(linked).toMatchObject({ status: 'PENDING_REVISION', commentId: 'pin-1' })
    expect(standalone.commentId).toBeNull()
    const [loaded] = await repository.listLogs('p1')
    expect(loaded.feedbacks.map((f) => f.content)).toEqual(['명암 수정', '전체 톤 확인'])
  })

  it('상태를 바꾸고 내용을 고치고 지울 수 있다', async () => {
    // given
    const repository = create()
    const log = await repository.createLog('p1', '1화')
    const feedback = await repository.createFeedback(log.id, { content: '원래 내용' })

    // when
    await repository.changeStatus(feedback.id, 'PENDING_CONFIRM')
    await repository.editContent(feedback.id, '고친 내용')

    // then
    const [changed] = (await repository.listLogs('p1'))[0].feedbacks
    expect(changed).toMatchObject({ status: 'PENDING_CONFIRM', content: '고친 내용' })

    await repository.removeFeedback(feedback.id)
    expect((await repository.listLogs('p1'))[0].feedbacks).toEqual([])
  })

  it('없는 로그에 피드백을 만들거나 없는 피드백을 바꾸면 NotFoundError', async () => {
    const repository = create()
    await expect(repository.createFeedback('nope', { content: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(repository.changeStatus('nope', 'CONFIRMED')).rejects.toBeInstanceOf(NotFoundError)
  })
})
