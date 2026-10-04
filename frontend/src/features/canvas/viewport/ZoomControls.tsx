import { FitIcon, MinusIcon, PlusIcon } from '../../../shared/ui/icons'
import { useViewportStore } from './viewportStore'
import styles from './ZoomControls.module.css'

export function ZoomControls() {
  const scale = useViewportStore((state) => state.viewport.scale)
  const stepZoom = useViewportStore((state) => state.stepZoom)
  const zoomTo = useViewportStore((state) => state.zoomTo)
  const fit = useViewportStore((state) => state.fit)

  return (
    <div role="group" aria-label="확대·축소" className={styles.controls}>
      <button type="button" className={styles.button} aria-label="축소" title="축소 (⌘/Ctrl −)" onClick={() => stepZoom(-1)}>
        <MinusIcon />
      </button>
      <button
        type="button"
        className={styles.level}
        title="100%로 보기 (Shift 0)"
        data-testid="zoom-level"
        onClick={() => zoomTo(1)}
      >
        {Math.round(scale * 100)}%
      </button>
      <button type="button" className={styles.button} aria-label="확대" title="확대 (⌘/Ctrl +)" onClick={() => stepZoom(1)}>
        <PlusIcon />
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={styles.button} aria-label="화면에 맞추기" title="화면에 맞추기 (Shift 1)" onClick={fit}>
        <FitIcon />
      </button>
    </div>
  )
}
