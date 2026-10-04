import {
  createJsonStore,
  isoNow,
  newId,
  NotFoundError,
  type MockRepositoryOptions,
} from '../../../shared/api'
import type { Feedback, FeedbackLog } from '../model/types'
import type { FeedbackRepository } from './feedbackRepository'

const STORAGE_KEY = 'pinly:mock:feedback'

type LogRow = Omit<FeedbackLog, 'feedbacks'>

interface FeedbackTables {
  logs: LogRow[]
  feedbacks: Feedback[]
}

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt)

/** localStorage 에 피드백 로그와 항목을 저장하는 목 */
export function createMockFeedbackRepository({
  storage,
  now = isoNow,
}: MockRepositoryOptions): FeedbackRepository {
  const store = createJsonStore<FeedbackTables>(storage, STORAGE_KEY, () => ({
    logs: [],
    feedbacks: [],
  }))

  const requireLog = (tables: FeedbackTables, logId: string) => {
    const log = tables.logs.find((l) => l.id === logId)
    if (!log) throw new NotFoundError('feedback_log', logId)
    return log
  }

  const updateFeedback = (feedbackId: string, patch: Partial<Feedback>) => {
    const tables = store.read()
    if (!tables.feedbacks.some((f) => f.id === feedbackId)) {
      throw new NotFoundError('feedback', feedbackId)
    }
    store.write({
      ...tables,
      feedbacks: tables.feedbacks.map((f) =>
        f.id === feedbackId ? { ...f, ...patch, updatedAt: now() } : f,
      ),
    })
  }

  return {
    async listLogs(projectId) {
      const { logs, feedbacks } = store.read()
      return logs
        .filter((l) => l.projectId === projectId)
        .sort(byCreatedAt)
        .map((log) => ({
          ...log,
          feedbacks: feedbacks.filter((f) => f.logId === log.id).sort(byCreatedAt),
        }))
    },

    async createLog(projectId, name) {
      const at = now()
      const log: LogRow = { id: newId(), projectId, name, createdAt: at, updatedAt: at }
      const tables = store.read()
      store.write({ ...tables, logs: [...tables.logs, log] })
      return { ...log, feedbacks: [] }
    },

    async renameLog(logId, name) {
      const tables = store.read()
      requireLog(tables, logId)
      store.write({
        ...tables,
        logs: tables.logs.map((l) => (l.id === logId ? { ...l, name, updatedAt: now() } : l)),
      })
    },

    async createFeedback(logId, { content, commentId = null }) {
      const tables = store.read()
      requireLog(tables, logId)
      const at = now()
      const feedback: Feedback = {
        id: newId(), logId, commentId, content,
        status: 'PENDING_REVISION', createdAt: at, updatedAt: at,
      }
      store.write({ ...tables, feedbacks: [...tables.feedbacks, feedback] })
      return feedback
    },

    async editContent(feedbackId, content) {
      updateFeedback(feedbackId, { content })
    },

    async changeStatus(feedbackId, status) {
      updateFeedback(feedbackId, { status })
    },

    async removeFeedback(feedbackId) {
      const tables = store.read()
      if (!tables.feedbacks.some((f) => f.id === feedbackId)) {
        throw new NotFoundError('feedback', feedbackId)
      }
      store.write({ ...tables, feedbacks: tables.feedbacks.filter((f) => f.id !== feedbackId) })
    },
  }
}
