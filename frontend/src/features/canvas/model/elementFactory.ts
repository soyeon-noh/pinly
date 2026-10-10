import { nanoid } from 'nanoid'

/** 요소 ID. 클라이언트에서 만든다 (스키마 원칙 4) */
export const newElementId = () => `el_${nanoid(10)}`

/** 모든 요소가 공유하는 기본 필드 (스키마 §3) */
export const elementBase = (x: number, y: number, id = newElementId()) => ({
  id,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  locked: false,
})
