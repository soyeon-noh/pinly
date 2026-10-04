import { createContext, useContext } from 'react'

/**
 * 저장소 주입용 컨텍스트와 훅을 만든다.
 * 앱은 `app/AppProviders` 에서 목 또는 HTTP 구현을 넣고, 테스트는 원하는 구현을 직접 넣는다.
 */
export function createRepositoryContext<T>(name: string) {
  const Context = createContext<T | null>(null)
  Context.displayName = name

  function useRepository(): T {
    const repository = useContext(Context)
    if (repository === null) {
      throw new Error(`${name} 가 주입되지 않았습니다. app/AppProviders 를 확인하세요`)
    }
    return repository
  }

  return [Context, useRepository] as const
}
