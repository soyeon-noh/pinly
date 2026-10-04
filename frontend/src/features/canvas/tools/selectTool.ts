import { SelectIcon } from '../../../shared/ui/icons'
import type { Tool } from './types'

/** 선택 툴. 요소 선택·변형은 Phase 4 에서 채운다 */
export function createSelectTool(): Tool {
  return { id: 'select', label: '선택', shortcut: 'v', Icon: SelectIcon, cursor: 'default' }
}
