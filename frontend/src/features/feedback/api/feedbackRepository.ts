import { createRepositoryContext } from '../../../shared/api'
import type { Feedback, FeedbackLog, FeedbackStatus } from '../model/types'

/** 피드백 로그·항목 저장소. 메서드는 백엔드 `Feedback` 의 의도 메서드와 맞춘다 */
export interface FeedbackRepository {
  /** 프로젝트의 로그 목록. 작성 순, 항목 포함 */
  listLogs(projectId: string): Promise<FeedbackLog[]>
  createLog(projectId: string, name: string): Promise<FeedbackLog>
  renameLog(logId: string, name: string): Promise<void>
  /** 새 항목은 항상 수정 대기(`PENDING_REVISION`)로 시작한다 */
  createFeedback(logId: string, input: { content: string; commentId?: string | null }): Promise<Feedback>
  editContent(feedbackId: string, content: string): Promise<void>
  changeStatus(feedbackId: string, status: FeedbackStatus): Promise<void>
  removeFeedback(feedbackId: string): Promise<void>
}

export const [FeedbackRepositoryContext, useFeedbackRepository] =
  createRepositoryContext<FeedbackRepository>('FeedbackRepository')
