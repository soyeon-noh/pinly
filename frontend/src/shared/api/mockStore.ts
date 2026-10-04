/**
 * 목(mock) 저장소 공용 도구.
 * 백엔드 API 가 생기기 전까지 각 기능의 목 구현이 쓰고, HTTP 구현으로 바뀌면 함께 사라진다.
 */

export interface MockRepositoryOptions {
  /** 보통 window.localStorage. 테스트에서는 jsdom 의 localStorage */
  storage: Storage
  /** ISO-8601 시각. 테스트에서 고정 시계를 넣는다 */
  now?: () => string
  /** 작성자로 기록할 사용자. 인증이 붙기 전까지 쓰는 가짜 값 */
  currentUserId?: string
}

export const MOCK_USER_ID = 'mock-user'

export const isoNow = () => new Date().toISOString()

/** 백엔드 PK 와 같은 UUID */
export const newId = () => crypto.randomUUID()

export interface JsonStore<T> {
  read(): T
  write(value: T): void
}

/** storage 의 키 하나에 JSON 으로 테이블을 통째 읽고 쓴다. 키가 없으면 initial() 값 */
export function createJsonStore<T>(storage: Storage, key: string, initial: () => T): JsonStore<T> {
  return {
    read() {
      const raw = storage.getItem(key)
      return raw === null ? initial() : (JSON.parse(raw) as T)
    },
    write(value) {
      storage.setItem(key, JSON.stringify(value))
    },
  }
}
