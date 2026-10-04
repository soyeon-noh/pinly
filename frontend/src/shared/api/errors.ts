/** 요청한 리소스가 없다 (HTTP 404). 재시도해도 결과가 같다. */
export class NotFoundError extends Error {
  readonly resource: string
  readonly id: string

  constructor(resource: string, id: string) {
    super(`${resource} ${id} 을(를) 찾을 수 없습니다`)
    this.name = 'NotFoundError'
    this.resource = resource
    this.id = id
  }
}

/** 기준 버전이 서버와 다르다 — 다른 곳에서 먼저 저장했다 (HTTP 409). */
export class ConflictError extends Error {
  /** 서버에 있는 최신 updatedAt */
  readonly currentUpdatedAt: string

  constructor(currentUpdatedAt: string) {
    super('다른 곳에서 먼저 수정되었습니다')
    this.name = 'ConflictError'
    this.currentUpdatedAt = currentUpdatedAt
  }
}
