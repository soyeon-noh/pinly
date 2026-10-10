import { create } from 'zustand'

/** 펜 색 — 빨강(교정 표준) / 브랜드 민트 / 차콜 */
export const STROKE_COLORS = [
  { label: '빨강', value: '#F03E3E' },
  { label: '민트', value: '#1AE46E' },
  { label: '차콜', value: '#292C28' },
] as const

/** 펜 굵기 (stage px) */
export const STROKE_WIDTHS = [
  { label: '가는 선', value: 4 },
  { label: '굵은 선', value: 12 },
] as const

interface DrawStyleState {
  color: string
  width: number
  setColor(color: string): void
  setWidth(width: number): void
}

export const useDrawStyleStore = create<DrawStyleState>()((set) => ({
  color: STROKE_COLORS[0].value,
  width: STROKE_WIDTHS[0].value,
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
}))
