import { expect, test, type Page } from '@playwright/test'

/** src/features/canvas/debug/installDebugHook.ts 가 붙이는 개발용 API 중 여기서 쓰는 부분 */
interface DrawingElement {
  id: string
  type: 'drawing'
  x: number
  y: number
  points: number[]
  stroke: string
  strokeWidth: number
}
interface PinlyDebugWindow {
  __pinly?: {
    doc(): { elements: DrawingElement[] } | null
    viewport(): { x: number; y: number; scale: number } | null
    commits(): number
    stage(): {
      findOne(selector: string):
        | { listening(): boolean; getChildren(): unknown[]; hitStrokeWidth(): number }
        | undefined
    } | null
  }
}

const elements = (page: Page) =>
  page.evaluate(() => (window as PinlyDebugWindow).__pinly!.doc()!.elements)
const commits = (page: Page) => page.evaluate(() => (window as PinlyDebugWindow).__pinly!.commits())
const viewport = (page: Page) =>
  page.evaluate(() => (window as PinlyDebugWindow).__pinly!.viewport()!)
const draftLineCount = (page: Page) =>
  page.evaluate(
    () => (window as PinlyDebugWindow).__pinly!.stage()!.findOne('.draft-layer')!.getChildren().length,
  )

/** 캔버스 안의 한 점 (컨테이너 기준 비율 → 페이지 좌표) */
async function at(page: Page, rx: number, ry: number) {
  const box = (await page.getByTestId('canvas-stage').boundingBox())!
  return { x: box.x + box.width * rx, y: box.y + box.height * ry }
}

/** 페이지 좌표 → stage 좌표 */
async function toStage(page: Page, point: { x: number; y: number }) {
  const box = (await page.getByTestId('canvas-stage').boundingBox())!
  const v = await viewport(page)
  return { x: (point.x - box.x - v.x) / v.scale, y: (point.y - box.y - v.y) / v.scale }
}

/** stage 좌표 → 페이지 좌표 */
async function toPage(page: Page, point: { x: number; y: number }) {
  const box = (await page.getByTestId('canvas-stage').boundingBox())!
  const v = await viewport(page)
  return { x: box.x + v.x + point.x * v.scale, y: box.y + v.y + point.y * v.scale }
}

async function drawLine(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

const tool = (page: Page, name: string) =>
  page.getByRole('toolbar', { name: '캔버스 도구' }).getByRole('button', { name, exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/projects/demo/canvases/demo')
  await page.waitForFunction(() => (window as PinlyDebugWindow).__pinly?.stage() != null)
})

test('펜으로 드래그하면 정수 좌표의 선 하나가 문서에 생기고, 그린 자리에 놓인다', async ({ page }) => {
  // given
  await tool(page, '그리기').click()
  const from = await at(page, 0.3, 0.3)
  const to = await at(page, 0.6, 0.55)
  const expectedStart = await toStage(page, from)

  // when
  await drawLine(page, from, to)

  // then
  const [line, ...rest] = await elements(page)
  expect(rest).toHaveLength(0)
  expect(line).toMatchObject({ type: 'drawing', stroke: '#F03E3E', strokeWidth: 4 })
  expect([line.x, line.y, ...line.points].every(Number.isInteger)).toBe(true)
  expect(Math.abs(line.x + line.points[0] - expectedStart.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(line.y + line.points[1] - expectedStart.y)).toBeLessThanOrEqual(1)
  expect(await draftLineCount(page)).toBe(0)
})

test('그리는 중에는 React 커밋이 0회, 손을 떼면 1회 (Phase 2 완료 기준)', async ({ page }) => {
  // given
  await tool(page, '그리기').click()
  const from = await at(page, 0.2, 0.5)
  const to = await at(page, 0.7, 0.4)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const afterDown = await commits(page)

  // when — 그리는 중
  await page.mouse.move(to.x, to.y, { steps: 40 })
  const afterMoves = await commits(page)
  await page.mouse.up()
  await expect.poll(async () => (await elements(page)).length).toBe(1)
  const afterUp = await commits(page)

  // then
  expect(afterMoves - afterDown).toBe(0)
  expect(afterUp - afterMoves).toBe(1)
})

test('펜 설정은 그리기 툴일 때만 보이고, 고른 색·굵기로 그린다', async ({ page }) => {
  // given
  const picker = page.getByRole('group', { name: '펜 설정' })
  await expect(picker).toBeHidden()
  await page.keyboard.press('p')
  await expect(picker).toBeVisible()

  // when
  await picker.getByRole('button', { name: '민트' }).click()
  await picker.getByRole('button', { name: '굵은 선' }).click()
  await drawLine(page, await at(page, 0.3, 0.3), await at(page, 0.5, 0.6))

  // then
  await expect(picker.getByRole('button', { name: '민트' })).toHaveAttribute('aria-pressed', 'true')
  const [line] = await elements(page)
  expect(line).toMatchObject({ stroke: '#1AE46E', strokeWidth: 12 })

  await page.keyboard.press('v')
  await expect(picker).toBeHidden()
})

test('클릭만 하면 점이 찍힌다', async ({ page }) => {
  // given
  await page.keyboard.press('p')
  const point = await at(page, 0.5, 0.5)

  // when
  await page.mouse.click(point.x, point.y)

  // then
  const [dot] = await elements(page)
  expect(dot.points).toEqual([0, 0, 0, 0])
})

test('지우개는 클릭한 선, 문지르며 지나간 선을 통째로 지우고 빈 곳은 그대로 둔다', async ({ page }) => {
  // given — 가로선 두 개
  await page.keyboard.press('p')
  await drawLine(page, await at(page, 0.3, 0.4), await at(page, 0.6, 0.4))
  await drawLine(page, await at(page, 0.3, 0.55), await at(page, 0.6, 0.55))
  expect(await elements(page)).toHaveLength(2)
  await page.keyboard.press('e')

  // when — 빈 곳 클릭
  const empty = await at(page, 0.8, 0.2)
  await page.mouse.click(empty.x, empty.y)

  // then
  expect(await elements(page)).toHaveLength(2)

  // when — 첫 선 클릭
  const onFirst = await at(page, 0.45, 0.4)
  await page.mouse.click(onFirst.x, onFirst.y)

  // then
  await expect.poll(async () => (await elements(page)).length).toBe(1)

  // when — 두 번째 선을 세로로 문질러 지나간다
  const above = await at(page, 0.45, 0.5)
  const below = await at(page, 0.45, 0.6)
  await page.mouse.move(above.x, above.y)
  await page.mouse.down()
  await page.mouse.move(below.x, below.y, { steps: 20 })
  await page.mouse.up()

  // then
  await expect.poll(async () => (await elements(page)).length).toBe(0)
})

test('10% 로 축소해도 얇은 선을 지울 수 있다 — 히트 폭을 화면 기준으로 맞춘다', async ({ page }) => {
  // given — 가는 선(4px) 하나
  await page.keyboard.press('p')
  await drawLine(page, await at(page, 0.3, 0.5), await at(page, 0.7, 0.5))
  const [line] = await elements(page)

  // 10% 근처까지 축소하고 줌이 끝나기를 기다린다
  const center = await at(page, 0.5, 0.5)
  await page.mouse.move(center.x, center.y)
  await page.keyboard.down('Control')
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 120)
  await page.keyboard.up('Control')
  await expect.poll(async () => (await viewport(page)).scale).toBeLessThan(0.15)
  await page.waitForFunction(
    () => (window as PinlyDebugWindow).__pinly!.stage()!.findOne('.content-layer')!.listening(),
  )

  // then — 히트 폭이 화면 12px(선 양쪽 6px) 에 해당하도록 커졌다
  const scale = (await viewport(page)).scale
  await expect
    .poll(() =>
      page.evaluate(() => (window as PinlyDebugWindow).__pinly!.stage()!.findOne('.drawing')!.hitStrokeWidth()),
    )
    .toBeCloseTo(12 / scale, 3)

  // when — 선 중간에서 화면 4px 아래를 클릭 (선 자체는 화면에서 0.5px 남짓)
  await page.keyboard.press('e')
  const mid = await toPage(page, { x: line.x + line.points[2] / 2, y: line.y + line.points[1] })
  await page.mouse.click(mid.x, mid.y + 4)

  // then
  await expect.poll(async () => (await elements(page)).length).toBe(0)
})

test('P·E 단축키로 그리기·지우개 툴을 고른다', async ({ page }) => {
  await page.keyboard.press('p')
  await expect(tool(page, '그리기')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('e')
  await expect(tool(page, '지우개')).toHaveAttribute('aria-pressed', 'true')
})
