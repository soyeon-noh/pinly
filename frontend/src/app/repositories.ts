import { createMockCanvasRepository } from '../features/canvas'
import { createMockCommentRepository } from '../features/comment'
import { createMockFeedbackRepository } from '../features/feedback'

/**
 * 앱이 쓰는 저장소 묶음. 백엔드 API 가 생기기 전까지 전부 localStorage 목이다.
 * HTTP 구현이 생기면 여기서만 바꾼다.
 */
export function createRepositories() {
  const options = { storage: window.localStorage }
  return {
    canvas: createMockCanvasRepository(options),
    comment: createMockCommentRepository(options),
    feedback: createMockFeedbackRepository(options),
  }
}
