import { useParams } from 'react-router'
import { CanvasStage, useCanvasQuery } from '../features/canvas'
import { NotFoundError } from '../shared/api'
import styles from './CanvasPage.module.css'

/** 캔버스 작업 공간. 기능(canvas·comment·feedback)을 끼워 맞추는 곳 */
export function CanvasPage() {
  const { canvasId = '' } = useParams()
  const canvas = useCanvasQuery(canvasId)

  if (canvas.isPending) {
    return <p className={styles.status}>캔버스를 불러오는 중…</p>
  }

  if (canvas.isError) {
    const message =
      canvas.error instanceof NotFoundError
        ? '캔버스를 찾을 수 없습니다. 주소를 확인하세요.'
        : '캔버스를 불러오지 못했습니다. 잠시 후 다시 시도하세요.'
    return (
      <p className={styles.status} role="alert">
        {message}
      </p>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>
          pin<span>ly</span>
        </span>
        <h1 className={styles.title}>{canvas.data.name ?? '이름 없는 캔버스'}</h1>
      </header>
      <main className={styles.workspace}>
        <CanvasStage document={canvas.data.document} />
      </main>
    </div>
  )
}
