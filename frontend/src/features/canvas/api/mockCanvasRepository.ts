import {
  ConflictError,
  createJsonStore,
  isoNow,
  NotFoundError,
  type MockRepositoryOptions,
} from '../../../shared/api'
import { createEmptyDocument } from '../model/types'
import type { CanvasRecord, CanvasRepository } from './canvasRepository'

export const DEMO_PROJECT_ID = 'demo'
export const DEMO_CANVAS_ID = 'demo'

const STORAGE_KEY = 'pinly:mock:canvases'
const SEED_UPDATED_AT = '2026-01-01T00:00:00.000Z'

type CanvasTable = Record<string, CanvasRecord>

const seed = (): CanvasTable => ({
  [DEMO_CANVAS_ID]: {
    id: DEMO_CANVAS_ID,
    projectId: DEMO_PROJECT_ID,
    name: '데모 캔버스',
    document: createEmptyDocument(),
    updatedAt: SEED_UPDATED_AT,
  },
})

/** localStorage 에 캔버스를 저장하는 목. 처음에는 빈 데모 캔버스 하나가 있다 */
export function createMockCanvasRepository({
  storage,
  now = isoNow,
}: MockRepositoryOptions): CanvasRepository {
  const table = createJsonStore<CanvasTable>(storage, STORAGE_KEY, seed)

  const find = (canvasId: string) => {
    const record = table.read()[canvasId]
    if (!record) throw new NotFoundError('canvas', canvasId)
    return record
  }

  return {
    async getCanvas(canvasId) {
      return find(canvasId)
    },

    async saveDocument(canvasId, document, baseUpdatedAt) {
      const record = find(canvasId)
      if (record.updatedAt !== baseUpdatedAt) throw new ConflictError(record.updatedAt)

      const updatedAt = now()
      table.write({ ...table.read(), [canvasId]: { ...record, document, updatedAt } })
      return { updatedAt }
    },
  }
}
