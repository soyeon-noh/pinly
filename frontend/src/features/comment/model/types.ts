/**
 * 백엔드 `Comment` 엔티티를 따른다. 부모가 없으면 핀, 있으면 답글.
 * 피드백 상태는 여기 없다 — `Feedback` 이 `commentId` 로 핀을 가리킨다.
 */

/** 캔버스(stage) 좌표에 붙은 핀 */
export interface Pin {
  id: string
  canvasId: string
  authorId: string
  body: string
  /** stage 좌표. 화면 좌표가 아니다 */
  posX: number
  posY: number
  resolved: boolean
  createdAt: string
  updatedAt: string
  /** 작성 순 */
  replies: Reply[]
}

/** 핀에 달린 답글. 좌표가 없다 */
export interface Reply {
  id: string
  parentId: string
  authorId: string
  body: string
  createdAt: string
  updatedAt: string
}
