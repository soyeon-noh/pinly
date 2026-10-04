import { selectEffectiveToolId, useToolStore } from './toolStore'
import type { Tool } from './types'
import styles from './Toolbar.module.css'

export function Toolbar({ tools }: { tools: Tool[] }) {
  const effectiveToolId = useToolStore(selectEffectiveToolId)
  const setActiveTool = useToolStore((state) => state.setActiveTool)

  return (
    <div role="toolbar" aria-label="캔버스 도구" className={styles.toolbar}>
      {tools.map(({ id, label, shortcut, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tool}
          aria-label={label}
          aria-pressed={effectiveToolId === id}
          title={`${label} (${shortcut.toUpperCase()})`}
          onClick={() => setActiveTool(id)}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}
