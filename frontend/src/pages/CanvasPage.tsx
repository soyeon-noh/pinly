import { useState } from 'react'
import { useParams } from 'react-router'
import {
  CanvasStage,
  createBuiltInTools,
  Toolbar,
  useCanvasQuery,
  useCanvasShortcuts,
  ZoomControls,
} from '../features/canvas'
import { NotFoundError } from '../shared/api'
import styles from './CanvasPage.module.css'

/** 캔버스 작업 공간. 기능(canvas·comment·feedback)을 끼워 맞추는 곳 */
export function CanvasPage() {
  const { canvasId = '' } = useParams()
  const canvas = useCanvasQuery(canvasId)
  // 다른 기능의 툴(댓글 등)은 Phase 6 부터 이 목록 뒤에 붙인다
  const [tools] = useState(createBuiltInTools)
  useCanvasShortcuts(tools)

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
        <div className={styles.identity}>
          <span className={styles.brand}>
            pin<span>ly</span>
          </span>
          <h1 className={styles.title}>{canvas.data.name ?? '이름 없는 캔버스'}</h1>
        </div>
        <Toolbar tools={tools} />
      </header>
      <main className={styles.workspace}>
        <CanvasStage document={canvas.data.document} tools={tools} />
        <ZoomControls />
      </main>
    </div>
  )
}
