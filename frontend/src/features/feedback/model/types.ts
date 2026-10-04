/**
 * 백엔드 `Feedback` / `FeedbackLog` / `FeedbackStatus` 를 따른다.
 * 상태값은 DB CHECK 제약(`ck_feedback_status`) 과 같아야 한다.
 */

/** 진행 순서: 수정 대기 → 확인 대기 → 확인됨 */
export const FEEDBACK_STATUSES = ['PENDING_REVISION', 'PENDING_CONFIRM', 'CONFIRMED'] as const

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  PENDING_REVISION: '수정 대기',
  PENDING_CONFIRM: '확인 대기',
  CONFIRMED: '확인됨',
}

export interface Feedback {
  id: string
  logId: string
  /** "할 일로 열기"로 만들었으면 연결된 핀. 핀이 지워지면 null (ON DELETE SET NULL) */
  commentId: string | null
  content: string
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
}

export interface FeedbackLog {
  id: string
  projectId: string
  /** 수정 가능 */
  name: string
  createdAt: string
  updatedAt: string
  /** 작성 순 */
  feedbacks: Feedback[]
}
