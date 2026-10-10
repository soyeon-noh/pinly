import { createDrawTool } from './drawTool'
import { createEraseTool } from './eraseTool'
import { createHandTool } from './handTool'
import { createSelectTool } from './selectTool'
import type { Tool } from './types'

/**
 * canvas 기능이 제공하는 기본 툴. 툴바 순서대로.
 * 다른 기능의 툴(예: comment 툴)은 CanvasPage 가 이 목록에 끼운다.
 */
export function createBuiltInTools(): Tool[] {
  return [createSelectTool(), createHandTool(), createDrawTool(), createEraseTool()]
}
