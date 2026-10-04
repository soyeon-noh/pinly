import {
  createJsonStore,
  isoNow,
  MOCK_USER_ID,
  newId,
  NotFoundError,
  type MockRepositoryOptions,
} from '../../../shared/api'
import type { Pin, Reply } from '../model/types'
import type { CommentRepository } from './commentRepository'

const STORAGE_KEY = 'pinly:mock:comments'

/** 백엔드 comment 테이블 한 행. 핀과 답글이 같은 테이블에 있다 */
interface CommentRow {
  id: string
  canvasId: string
  parentId: string | null
  authorId: string
  body: string
  posX: number | null
  posY: number | null
  resolved: boolean
  createdAt: string
  updatedAt: string
}

const byCreatedAt = (a: CommentRow, b: CommentRow) => a.createdAt.localeCompare(b.createdAt)

const toReply = (row: CommentRow): Reply => ({
  id: row.id,
  parentId: row.parentId as string,
  authorId: row.authorId,
  body: row.body,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const toPin = (row: CommentRow, rows: CommentRow[]): Pin => ({
  id: row.id,
  canvasId: row.canvasId,
  authorId: row.authorId,
  body: row.body,
  posX: row.posX as number,
  posY: row.posY as number,
  resolved: row.resolved,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  replies: rows.filter((r) => r.parentId === row.id).sort(byCreatedAt).map(toReply),
})

/**
 * localStorage 에 코멘트를 저장하는 목.
 * 한계: 실제 DB 는 핀 삭제 시 연결된 피드백의 comment_id 를 NULL 로 바꾸지만(ON DELETE SET NULL),
 * 목은 피드백 저장소를 건드리지 않는다. 화면은 사라진 commentId 를 "삭제된 핀"으로 다룬다.
 */
export function createMockCommentRepository({
  storage,
  now = isoNow,
  currentUserId = MOCK_USER_ID,
}: MockRepositoryOptions): CommentRepository {
  const table = createJsonStore<CommentRow[]>(storage, STORAGE_KEY, () => [])

  const findRow = (rows: CommentRow[], id: string, kind: 'comment' | 'pin') => {
    const row = rows.find((r) => r.id === id && (kind === 'comment' || r.parentId === null))
    if (!row) throw new NotFoundError(kind, id)
    return row
  }

  const update = (id: string, kind: 'comment' | 'pin', patch: Partial<CommentRow>) => {
    const rows = table.read()
    findRow(rows, id, kind)
    table.write(rows.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)))
  }

  return {
    async listPins(canvasId) {
      const rows = table.read()
      return rows
        .filter((r) => r.canvasId === canvasId && r.parentId === null)
        .sort(byCreatedAt)
        .map((row) => toPin(row, rows))
    },

    async createPin(canvasId, { body, posX, posY }) {
      const at = now()
      const row: CommentRow = {
        id: newId(), canvasId, parentId: null, authorId: currentUserId, body,
        posX, posY, resolved: false, createdAt: at, updatedAt: at,
      }
      const rows = [...table.read(), row]
      table.write(rows)
      return toPin(row, rows)
    },

    async addReply(pinId, { body }) {
      const rows = table.read()
      const pin = findRow(rows, pinId, 'pin')
      const at = now()
      const row: CommentRow = {
        id: newId(), canvasId: pin.canvasId, parentId: pin.id, authorId: currentUserId, body,
        posX: null, posY: null, resolved: false, createdAt: at, updatedAt: at,
      }
      table.write([...rows, row])
      return toReply(row)
    },

    async editBody(commentId, body) {
      update(commentId, 'comment', { body })
    },

    async movePin(pinId, posX, posY) {
      update(pinId, 'pin', { posX, posY })
    },

    async resolve(pinId) {
      update(pinId, 'pin', { resolved: true })
    },

    async reopen(pinId) {
      update(pinId, 'pin', { resolved: false })
    },

    async remove(commentId) {
      const rows = table.read()
      findRow(rows, commentId, 'comment')
      table.write(rows.filter((r) => r.id !== commentId && r.parentId !== commentId))
    },
  }
}
