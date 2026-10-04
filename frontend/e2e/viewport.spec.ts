import { expect, test, type Page } from '@playwright/test'

/** src/features/canvas/debug/installDebugHook.ts 가 붙이는 개발용 API 중 여기서 쓰는 부분 */
interface PinlyDebugWindow {
  __pinly?: {
    viewport(): { x: number; y: number; scale: number } | null
    stage(): { findOne(selector: string): { listening(): boolean } | undefined } | null
  }
}

const viewport = (page: Page) =>
  page.evaluate(() => (window as PinlyDebugWindow).__pinly!.viewport()!)

const contentLayerListening = (page: Page) =>
  page.evaluate(() => (window as PinlyDebugWindow).__pinly!.stage()!.findOne('.content-layer')!.listening())

/** 페이지 좌표 → 캔버스 컨테이너 기준 좌표 → stage 좌표 */
async function stagePointAt(page: Page, pageX: number, pageY: number) {
  const box = (await page.getByTestId('canvas-stage').boundingBox())!
  const v = await viewport(page)
  return { x: (pageX - box.x - v.x) / v.scale, y: (pageY - box.y - v.y) / v.scale }
}

/** 캔버스 안의 한 점 (컨테이너 왼쪽 위 기준 비율) */
async function canvasPoint(page: Page, rx: number, ry: number) {
  const box = (await page.getByTestId('canvas-stage').boundingBox())!
  return { x: box.x + box.width * rx, y: box.y + box.height * ry }
}

const toolButton = (page: Page, name: string) =>
  page.getByRole('toolbar', { name: '캔버스 도구' }).getByRole('button', { name, exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/projects/demo/canvases/demo')
  await expect(page.getByTestId('canvas-stage').locator('canvas').first()).toBeVisible()
  await page.waitForFunction(() => (window as PinlyDebugWindow).__pinly?.stage() != null)
})

test('처음 열면 아트보드 전체가 보이도록 맞춰진다', async ({ page }) => {
  // then — 1920×1080 아트보드가 1400px 폭 컨테이너에 들어가려면 100% 보다 작아야 한다
  const v = await viewport(page)
  expect(v.scale).toBeLessThan(1)
  await expect(page.getByTestId('zoom-level')).toHaveText(`${Math.round(v.scale * 100)}%`)
})

test('⌘/Ctrl + 휠로 줌하면 포인터 아래 stage 좌표가 1px 이내로 유지된다 (Phase 1 완료 기준)', async ({ page }) => {
  // given
  const point = await canvasPoint(page, 0.3, 0.6)
  await page.mouse.move(point.x, point.y)
  const before = await stagePointAt(page, point.x, point.y)
  const scaleBefore = (await viewport(page)).scale

  // when — 확대했다가 일부 축소
  await page.keyboard.down('Control')
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120)
  for (let i = 0; i < 2; i++) await page.mouse.wheel(0, 80)
  await page.keyboard.up('Control')

  // then
  await expect.poll(async () => (await viewport(page)).scale).toBeGreaterThan(scaleBefore)
  const after = await stagePointAt(page, point.x, point.y)
  expect(Math.abs(after.x - before.x)).toBeLessThan(1)
  expect(Math.abs(after.y - before.y)).toBeLessThan(1)
})

test('수정키 없는 휠은 화면을 이동한다', async ({ page }) => {
  // given
  const point = await canvasPoint(page, 0.5, 0.5)
  await page.mouse.move(point.x, point.y)
  const before = await viewport(page)

  // when
  await page.mouse.wheel(30, 50)

  // then
  await expect.poll(async () => (await viewport(page)).y).toBeCloseTo(before.y - 50)
  const after = await viewport(page)
  expect(after.x).toBeCloseTo(before.x - 30)
  expect(after.scale).toBe(before.scale)
})

test('손 툴로 드래그하면 그만큼 이동하고, 드래그 중에는 콘텐츠 히트 판정이 꺼진다', async ({ page }) => {
  // given
  await toolButton(page, '손').click()
  await expect(toolButton(page, '손')).toHaveAttribute('aria-pressed', 'true')
  const start = await canvasPoint(page, 0.5, 0.5)
  const before = await viewport(page)

  // when
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 120, start.y - 60, { steps: 6 })

  // then — 드래그 중
  expect(await contentLayerListening(page)).toBe(false)

  await page.mouse.up()
  const after = await viewport(page)
  expect(after.x - before.x).toBeCloseTo(120)
  expect(after.y - before.y).toBeCloseTo(-60)
  expect(await contentLayerListening(page)).toBe(true)
})

test('드래그가 캔버스 밖으로 나가도 끝까지 따라간다', async ({ page }) => {
  // given
  await toolButton(page, '손').click()
  const start = await canvasPoint(page, 0.5, 0.5)
  const before = await viewport(page)

  // when — 헤더 위(캔버스 밖)까지 끌어올렸다가 놓는다
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x, 10, { steps: 8 })
  await page.mouse.up()

  // then
  const after = await viewport(page)
  expect(after.y - before.y).toBeCloseTo(10 - start.y)
})

test('Space 를 누르고 있는 동안만 손 툴이 되고, 떼면 선택 툴로 돌아온다', async ({ page }) => {
  // given
  const start = await canvasPoint(page, 0.4, 0.4)
  const before = await viewport(page)

  // when
  await page.keyboard.down('Space')
  await expect(toolButton(page, '손')).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x - 80, start.y + 40, { steps: 4 })
  await page.mouse.up()
  await page.keyboard.up('Space')

  // then
  const after = await viewport(page)
  expect(after.x - before.x).toBeCloseTo(-80)
  await expect(toolButton(page, '선택')).toHaveAttribute('aria-pressed', 'true')
})

test('V·H 단축키로 툴을 바꾼다', async ({ page }) => {
  await page.keyboard.press('h')
  await expect(toolButton(page, '손')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('v')
  await expect(toolButton(page, '선택')).toHaveAttribute('aria-pressed', 'true')
})

test('줌 컨트롤: 확대 단계 → 100% → 화면에 맞추기', async ({ page }) => {
  // given
  const fitted = await viewport(page)
  const level = page.getByTestId('zoom-level')

  // when / then — 맞춘 배율(65% 안팎)의 다음 단계는 66.7%
  await page.getByRole('button', { name: '확대' }).click()
  await expect(level).toHaveText('67%')

  await level.click()
  await expect(level).toHaveText('100%')

  await page.getByRole('button', { name: '화면에 맞추기' }).click()
  expect(await viewport(page)).toEqual(fitted)
})

test('줌은 800% 를 넘지 않는다', async ({ page }) => {
  // given
  const point = await canvasPoint(page, 0.5, 0.5)
  await page.mouse.move(point.x, point.y)

  // when
  await page.keyboard.down('Control')
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -200)
  await page.keyboard.up('Control')

  // then
  await expect(page.getByTestId('zoom-level')).toHaveText('800%')
})

test('창 크기가 바뀌어도 사용자가 정한 줌·위치를 유지한다', async ({ page }) => {
  // given
  await page.getByTestId('zoom-level').click()
  const before = await viewport(page)

  // when
  await page.setViewportSize({ width: 1000, height: 700 })

  // then — 캔버스 크기는 따라가지만 뷰포트는 그대로
  await expect
    .poll(async () => (await page.getByTestId('canvas-stage').boundingBox())!.width)
    .toBe(1000)
  expect(await viewport(page)).toEqual(before)
})
