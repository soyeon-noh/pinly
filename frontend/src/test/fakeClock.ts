/** 호출할 때마다 1초씩 앞으로 가는 고정 시계. 정렬·충돌 테스트를 결정적으로 만든다 */
export function fakeClock(start = '2026-02-01T00:00:00.000Z') {
  let t = Date.parse(start)
  return () => {
    t += 1000
    return new Date(t).toISOString()
  }
}
