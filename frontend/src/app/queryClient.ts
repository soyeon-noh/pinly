import { QueryClient } from '@tanstack/react-query'
import { NotFoundError } from '../shared/api'

const MAX_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 없는 리소스는 다시 물어봐도 없다
        retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < MAX_RETRIES,
      },
    },
  })
}
