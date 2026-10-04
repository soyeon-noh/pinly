import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { CanvasRepositoryContext } from '../features/canvas'
import { CommentRepositoryContext } from '../features/comment'
import { FeedbackRepositoryContext } from '../features/feedback'
import { createQueryClient } from './queryClient'
import { createRepositories } from './repositories'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const [repositories] = useState(createRepositories)

  return (
    <QueryClientProvider client={queryClient}>
      <CanvasRepositoryContext value={repositories.canvas}>
        <CommentRepositoryContext value={repositories.comment}>
          <FeedbackRepositoryContext value={repositories.feedback}>{children}</FeedbackRepositoryContext>
        </CommentRepositoryContext>
      </CanvasRepositoryContext>
    </QueryClientProvider>
  )
}
