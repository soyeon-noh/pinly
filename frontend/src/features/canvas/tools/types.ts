import type Konva from 'konva'
import type { ComponentType } from 'react'
import type { Point } from '../../../shared/lib/geometry'

/** 툴 이름. 구현은 각 기능에 있다 (예: comment 툴은 features/comment) */
export type ToolId = 'select' | 'hand' | 'draw' | 'erase' | 'text' | 'comment'

export interface ToolPointerEvent {
  /** 캔버스 컨테이너 기준 화면 좌표 */
  screen: Point
  /** stage(문서) 좌표 — 저장·핀 위치에 쓰는 좌표 */
  stage: Point
  /** 포인터가 닿은 Konva 노드. 빈 곳이면 Stage */
  target: Konva.Node | null
  native: PointerEvent
}

export interface ToolContext {
  stage: Konva.Stage
}

/**
 * 툴 = 포인터 이벤트 전략 객체 (계획 §3-2).
 * Stage 는 포인터를 누른 순간의 툴 하나에만 그 시퀀스(down → move… → up)를 넘긴다.
 * 시퀀스 도중 툴이 바뀌어도 이벤트는 처음 툴로 간다 — 스파이크 F-7(핀 클릭이 아래 요소를 선택) 방지.
 */
export interface Tool {
  id: ToolId
  /** 툴바 툴팁·접근성 이름 */
  label: string
  /**
   * 단축키 알파벳 한 글자. 물리 키 위치(KeyboardEvent.code)로 비교하므로
   * 한글 입력 상태(V → ㅍ)에서도 동작한다
   */
  shortcut: string
  Icon: ComponentType
  cursor: string
  /** 포인터를 누르고 있는 동안의 커서. 없으면 cursor */
  activeCursor?: string
  onPointerDown?(event: ToolPointerEvent, context: ToolContext): void
  onPointerMove?(event: ToolPointerEvent, context: ToolContext): void
  onPointerUp?(event: ToolPointerEvent, context: ToolContext): void
  /** 시퀀스가 끝나지 못하고 취소됨 (pointercancel). 진행 중인 작업을 버린다 */
  onPointerCancel?(context: ToolContext): void
}
