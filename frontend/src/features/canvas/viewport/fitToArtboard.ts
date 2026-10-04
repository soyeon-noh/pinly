import type { Size, Viewport } from '../../../shared/lib/geometry'

/**
 * 아트보드 전체가 여백을 두고 컨테이너 가운데에 들어오는 뷰포트.
 * 작은 아트보드는 키우지 않는다(최대 배율 1) — 원고가 실제보다 크게 보이면 해상도를 착각하게 된다.
 */
export function fitToArtboard(container: Size, artboard: Size, padding = 48): Viewport {
  const availableWidth = Math.max(container.width - padding * 2, 1)
  const availableHeight = Math.max(container.height - padding * 2, 1)
  const scale = Math.min(availableWidth / artboard.width, availableHeight / artboard.height, 1)

  return {
    scale,
    x: (container.width - artboard.width * scale) / 2,
    y: (container.height - artboard.height * scale) / 2,
  }
}
