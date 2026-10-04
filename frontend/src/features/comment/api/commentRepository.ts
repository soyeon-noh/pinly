import { createRepositoryContext } from '../../../shared/api'
import type { Pin, Reply } from '../model/types'

/**
 * 코멘트 저장소. 메서드는 백엔드 `Comment` 의 의도 메서드
 * (`pin`, `reply`, `editBody`, `moveTo`, `resolve`, `reopen`) 와 맞춘다.
 */
export interface CommentRepository {
  /** 캔버스의 핀 목록. 작성 순, 답글 포함 */
  listPins(canvasId: string): Promise<Pin[]>
  createPin(canvasId: string, input: { body: string; posX: number; posY: number }): Promise<Pin>
  addReply(pinId: string, input: { body: string }): Promise<Reply>
  /** 핀·답글 공통 */
  editBody(commentId: string, body: string): Promise<void>
  movePin(pinId: string, posX: number, posY: number): Promise<void>
  resolve(pinId: string): Promise<void>
  reopen(pinId: string): Promise<void>
  /** 핀을 지우면 답글도 함께 지워진다 (ON DELETE CASCADE) */
  remove(commentId: string): Promise<void>
}

export const [CommentRepositoryContext, useCommentRepository] =
  createRepositoryContext<CommentRepository>('CommentRepository')
