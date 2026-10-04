export {
  createEmptyDocument,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_STAGE,
  type CanvasDocument,
  type CanvasElement,
  type DrawingElement,
  type ElementType,
  type ImageElement,
  type StageSpec,
  type TextElement,
} from './model/types'
export {
  CanvasRepositoryContext,
  useCanvasRepository,
  type CanvasRecord,
  type CanvasRepository,
  type SaveDocumentResult,
} from './api/canvasRepository'
export {
  createMockCanvasRepository,
  DEMO_CANVAS_ID,
  DEMO_PROJECT_ID,
} from './api/mockCanvasRepository'
export { canvasKeys, useCanvasQuery } from './api/queries'
