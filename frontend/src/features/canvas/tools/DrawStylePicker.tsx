import type { CSSProperties } from 'react'
import { STROKE_COLORS, STROKE_WIDTHS, useDrawStyleStore } from './drawStyleStore'
import { selectEffectiveToolId, useToolStore } from './toolStore'
import styles from './DrawStylePicker.module.css'

/** 그리기 툴일 때만 캔버스 위에 뜨는 펜 색·굵기 선택 */
export function DrawStylePicker() {
  const isDrawing = useToolStore((state) => selectEffectiveToolId(state) === 'draw')
  const { color, width, setColor, setWidth } = useDrawStyleStore()

  if (!isDrawing) return null

  return (
    <div role="group" aria-label="펜 설정" className={styles.picker}>
      {STROKE_COLORS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={styles.swatch}
          style={{ '--swatch': value } as CSSProperties}
          aria-label={label}
          aria-pressed={color === value}
          title={label}
          onClick={() => setColor(value)}
        />
      ))}
      <span className={styles.divider} aria-hidden="true" />
      {STROKE_WIDTHS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={styles.width}
          aria-label={label}
          aria-pressed={width === value}
          title={label}
          onClick={() => setWidth(value)}
        >
          <span className={styles.widthSample} style={{ height: value === STROKE_WIDTHS[0].value ? 2 : 5 }} />
        </button>
      ))}
    </div>
  )
}
