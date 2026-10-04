import { useQuery } from '@tanstack/react-query'
import { useCanvasRepository } from './canvasRepository'

export const canvasKeys = {
  detail: (canvasId: string) => ['canvas', canvasId] as const,
}

/**
 * 캔버스 한 개를 불러온다.
 * 편집 중인 문서를 서버 값으로 덮어쓰지 않도록 자동 재조회는 끈다 (저장은 Phase 3 자동저장이 맡는다).
 */
export function useCanvasQuery(canvasId: string) {
  const repository = useCanvasRepository()
  return useQuery({
    queryKey: canvasKeys.detail(canvasId),
    queryFn: () => repository.getCanvas(canvasId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
