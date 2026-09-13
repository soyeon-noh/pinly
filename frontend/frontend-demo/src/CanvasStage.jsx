import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Image as KImage, Transformer } from 'react-konva'
import { baseElement } from './useCanvasDoc.js'

const MIN_SCALE = 0.08
const MAX_SCALE = 8

/** 데모에서만 쓰는 이미지 로더 — 실제로는 s3Key → presigned URL 로 교체된다. */
function useImageElement(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) return
    const image = new window.Image()
    image.src = src
    image.onload = () => setImg(image)
    return () => { image.onload = null }
  }, [src])
  return img
}

function ImageNode({ el, ...rest }) {
  const img = useImageElement(el._src)
  if (!img) return null
  return <KImage image={img} {...rest} width={el.width} height={el.height} />
}

export default function CanvasStage({
  doc, setDoc, view, setView, tool, selectedId, setSelectedId,
  onCanvasClick, stageRef, containerRef,
}) {
  const layerRef = useRef(null)
  const trRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const drawing = useRef(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(null) // 텍스트 인라인 편집
  const [size, setSize] = useState({ width: 800, height: 600 })

  // 컨테이너 크기 추적
  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [containerRef])

  // 선택 변경 → Transformer 부착
  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const node = selectedId && tool === 'select' ? nodeRefs.current.get(selectedId) : null
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [selectedId, tool, doc.elements])

  const toStageCoords = () => {
    const stage = stageRef.current
    return stage.getRelativePointerPosition()
  }

  /* ---------- 줌 (포인터 기준) ---------- */
  const handleWheel = (e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = view.scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // trackpad 두 손가락 = 팬, ctrl/cmd + wheel = 줌 (Figma 규칙)
    if (!e.evt.ctrlKey && !e.evt.metaKey && Math.abs(e.evt.deltaX) > 0) {
      setView({ ...view, x: view.x - e.evt.deltaX, y: view.y - e.evt.deltaY })
      return
    }
    const dir = e.evt.deltaY > 0 ? -1 : 1
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (1 + dir * 0.08)))
    const mouseTo = { x: (pointer.x - view.x) / oldScale, y: (pointer.y - view.y) / oldScale }
    setView({ scale: next, x: pointer.x - mouseTo.x * next, y: pointer.y - mouseTo.y * next })
  }

  /* ---------- 포인터 다운 ---------- */
  const handleMouseDown = (e) => {
    const stage = stageRef.current
    const clickedEmpty = e.target === stage || e.target.attrs._bg
    const p = toStageCoords()

    if (tool === 'draw') {
      drawing.current = { ...baseElement('drawing', 0, 0), points: [p.x, p.y] }
      setDraft({ ...drawing.current })
      return
    }
    if (tool === 'comment') {
      onCanvasClick('comment', p)
      return
    }
    if (tool === 'text') {
      const el = { ...baseElement('text', p.x, p.y), text: '텍스트 입력', fontSize: 18,
        fontFamily: 'Pretendard', fontStyle: 'normal', fill: '#292C28', align: 'left', width: 240 }
      setDoc((d) => ({ ...d, elements: [...d.elements, el] }))
      setSelectedId(el.id)
      onCanvasClick('text-created')
      return
    }
    if (tool === 'select' && clickedEmpty) setSelectedId(null)
  }

  const handleMouseMove = () => {
    if (tool !== 'draw' || !drawing.current) return
    const p = toStageCoords()
    drawing.current.points = drawing.current.points.concat([p.x, p.y])
    setDraft({ ...drawing.current, points: drawing.current.points })
  }

  const handleMouseUp = () => {
    if (tool !== 'draw' || !drawing.current) return
    const stroke = {
      ...drawing.current,
      stroke: '#1AE46E', strokeWidth: 3, lineCap: 'round', lineJoin: 'round',
      tension: 0.4, closed: false,
    }
    drawing.current = null
    setDraft(null)
    if (stroke.points.length >= 4) {
      setDoc((d) => ({ ...d, elements: [...d.elements, stroke] }))
    }
  }

  /* ---------- 요소 변형 커밋 ---------- */
  const commitTransform = (el, node) => {
    const patch = {
      x: node.x(), y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(), scaleY: node.scaleY(),
    }
    setDoc((d) => ({
      ...d,
      elements: d.elements.map((e) => (e.id === el.id ? { ...e, ...patch } : e)),
    }))
  }

  const commonProps = (el) => ({
    id: el.id,
    ref: (n) => { if (n) nodeRefs.current.set(el.id, n); else nodeRefs.current.delete(el.id) },
    x: el.x, y: el.y, rotation: el.rotation, scaleX: el.scaleX, scaleY: el.scaleY,
    opacity: el.opacity,
    draggable: tool === 'select' && !el.locked,
    perfectDrawEnabled: false,
    onClick: () => {
      if (tool === 'erase') {
        setDoc((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== el.id) }))
        return
      }
      if (tool === 'select') setSelectedId(el.id)
    },
    onDragEnd: (e) => commitTransform(el, e.target),
    onTransformEnd: (e) => commitTransform(el, e.target),
  })

  /* ---------- 텍스트 인라인 편집 ---------- */
  const startEditing = (el) => {
    const node = nodeRefs.current.get(el.id)
    if (!node) return
    const box = node.getClientRect()
    setEditing({
      id: el.id, value: el.text,
      left: box.x, top: box.y,
      width: Math.max(80, box.width), fontSize: el.fontSize * view.scale,
    })
  }
  const commitEditing = () => {
    if (!editing) return
    const { id, value } = editing
    setDoc((d) => ({
      ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, text: value } : e)),
    }))
    setEditing(null)
  }

  return (
    <>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
        draggable={tool === 'hand'}
        onDragMove={(e) => {
          if (e.target !== stageRef.current) return
          setView({ ...view, x: e.target.x(), y: e.target.y() })
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer ref={layerRef}>
          {/* 아트보드 배경 */}
          <Rect
            _bg
            x={0} y={0}
            width={doc.stage.width} height={doc.stage.height}
            fill={doc.stage.background}
            shadowColor="rgba(0,0,0,0.18)" shadowBlur={18} shadowOpacity={1}
            listening={false}
          />
          {doc.elements.map((el) => {
            if (el.type === 'image') return <ImageNode key={el.id} el={el} {...commonProps(el)} />
            if (el.type === 'drawing') {
              return (
                <Line
                  key={el.id} {...commonProps(el)}
                  points={el.points} stroke={el.stroke} strokeWidth={el.strokeWidth}
                  lineCap={el.lineCap} lineJoin={el.lineJoin} tension={el.tension}
                  closed={el.closed} hitStrokeWidth={Math.max(12, el.strokeWidth * 3)}
                />
              )
            }
            return (
              <Text
                key={el.id} {...commonProps(el)}
                text={el.text} fontSize={el.fontSize} fontFamily={el.fontFamily}
                fontStyle={el.fontStyle} fill={el.fill} align={el.align} width={el.width}
                onDblClick={() => startEditing(el)}
                visible={editing?.id !== el.id}
              />
            )
          })}
          {draft && (
            <Line
              points={draft.points} stroke="#1AE46E" strokeWidth={3}
              lineCap="round" lineJoin="round" tension={0.4} listening={false}
              perfectDrawEnabled={false}
            />
          )}
          <Transformer
            ref={trRef}
            rotateEnabled
            ignoreStroke
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 10 || newBox.height < 10 ? oldBox : newBox}
          />
        </Layer>
      </Stage>

      {editing && (
        <textarea
          className="floating-text-edit"
          autoFocus
          value={editing.value}
          style={{
            left: editing.left, top: editing.top,
            width: editing.width, fontSize: editing.fontSize,
          }}
          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          onBlur={commitEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(null)
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEditing() }
          }}
        />
      )}
    </>
  )
}
