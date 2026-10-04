import { expect, test } from '@playwright/test'

/** src/features/canvas/debug/installDebugHook.ts 가 붙이는 개발용 API 중 여기서 쓰는 부분 */
interface PinlyDebugWindow {
  __pinly?: {
    doc(): { stage: { width: number; height: number } } | null
    stage(): { findOne(selector: string): unknown } | null
    bench(runs?: number): { nodes: number; msPerDraw: number } | null
  }
}

test('루트로 들어오면 데모 캔버스로 이동해 빈 아트보드를 그린다', async ({ page }) => {
  // when
  await page.goto('/')

  // then
  await expect(page).toHaveURL(/\/projects\/demo\/canvases\/demo$/)
  await expect(page.getByRole('heading', { name: '데모 캔버스' })).toBeVisible()
  await expect(page.getByTestId('canvas-stage').locator('canvas')).toBeVisible()

  await page.waitForFunction(() => (window as PinlyDebugWindow).__pinly?.stage() != null)
  const state = await page.evaluate(() => {
    const pinly = (window as PinlyDebugWindow).__pinly!
    return {
      stage: pinly.doc()?.stage,
      hasArtboard: pinly.stage()?.findOne('.artboard') != null,
      bench: pinly.bench(5),
    }
  })
  expect(state.stage).toMatchObject({ width: 1920, height: 1080 })
  expect(state.hasArtboard).toBe(true)
  expect(state.bench?.nodes).toBeGreaterThanOrEqual(1)
})

test('없는 캔버스 주소는 재시도 없이 바로 안내한다', async ({ page }) => {
  // when
  await page.goto('/projects/demo/canvases/nope')

  // then
  await expect(page.getByRole('alert')).toHaveText('캔버스를 찾을 수 없습니다. 주소를 확인하세요.', {
    timeout: 2000,
  })
})
