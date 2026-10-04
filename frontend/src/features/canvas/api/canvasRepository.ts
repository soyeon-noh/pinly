import { createRepositoryContext } from '../../../shared/api'
import type { CanvasDocument } from '../model/types'

/** `GET /api/canvases/{canvasId}` 응답 */
export interface CanvasRecord {
  id: string
  projectId: string
  name: string | null
  document: CanvasDocument
  updatedAt: string
}

export interface SaveDocumentResult {
  updatedAt: string
}

/**
 * 캔버스 저장소. 계약은 `docs/canvas-frontend-plan.md` §5.
 * 백엔드 API 가 생기기 전까지 목 구현을 쓰고, 같은 인터페이스로 HTTP 구현을 붙인다.
 */
export interface CanvasRepository {
  /** 없으면 `NotFoundError` */
  getCanvas(canvasId: string): Promise<CanvasRecord>

  /**
   * 문서를 통째 교체한다 (`Canvas.replaceDocument`).
   * `baseUpdatedAt` 이 서버 값과 다르면 `ConflictError` — 다른 곳에서 먼저 저장했다.
   */
  saveDocument(
    canvasId: string,
    document: CanvasDocument,
    baseUpdatedAt: string,
  ): Promise<SaveDocumentResult>
}

export const [CanvasRepositoryContext, useCanvasRepository] =
  createRepositoryContext<CanvasRepository>('CanvasRepository')
