import { create } from 'zustand'
import type { ToolId } from './types'

interface ToolState {
  activeToolId: ToolId
  /** Space 를 누르고 있는 동안 손 툴로 임시 전환 */
  spaceHeld: boolean
  setActiveTool(id: ToolId): void
  setSpaceHeld(held: boolean): void
}

export const useToolStore = create<ToolState>()((set) => ({
  activeToolId: 'select',
  spaceHeld: false,
  setActiveTool: (activeToolId) => set({ activeToolId }),
  setSpaceHeld: (spaceHeld) => set({ spaceHeld }),
}))

/** 지금 포인터를 누르면 동작할 툴 */
export const selectEffectiveToolId = (state: Pick<ToolState, 'activeToolId' | 'spaceHeld'>): ToolId =>
  state.spaceHeld ? 'hand' : state.activeToolId
