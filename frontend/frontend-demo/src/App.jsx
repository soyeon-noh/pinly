import React, { useCallback, useEffect, useRef, useState } from 'react'
import CanvasStage from './CanvasStage.jsx'
import PinLayer from './PinLayer.jsx'
import Inspector from './Inspector.jsx'
import { useCanvasDoc, baseElement, EMPTY_DOC } from './useCanvasDoc.js'

const TOOLS = [
  { id: 'select', icon: '⬚', label: '선택 (V)', key: 'v' },
  { id: 'hand', icon: '✋', label: '이동 (H)', key: 'h' },
  { id: 'comment', icon: '💬', label: '댓글 (C)', key: 'c' },
  { id: 'text', icon: 'T', label: '텍스트 (T)', key: 't' },
  { id: 'draw', icon: '✏️', label: '그리기 (P)', key: 'p' },
  { id: 'erase', icon: '🩹', label: '선 삭제 (E)', key: 'e' },
]

let cid = 0

export default function App() {
  const { doc, setDoc, undo, redo, canUndo, canRedo } = useCanvasDoc(EMPTY_DOC)
  const [comments, setComments] = useState([])
  const [view, setView] = useState({ x: 60, y: 40, scale: 0.4 })
  const [tool, setTool] = useState('select')
  const [selectedId, setSelectedId] = useState(null)
  const [activeCommentId, setActiveCommentId] = useState(null)
  const [stats, setStats] = useState({ fps: 60, nodes: 0, lastRender: 0, scale: 0.4 })

  const stageRef = useRef(null)
  const containerRef = useRef(null)
  const fileRef = useRef(null)

  /* ---------- FPS 계측 ---------- */
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf
    const tick = (now) => {
      frames++
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last))
        frames = 0
        last = now
        setStats((s) => ({
          ...s, fps,
          nodes: stageRef.current ? stageRef.current.find('Shape').length : 0,
        }))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => { setStats((s) => ({ ...s, scale: view.scale })) }, [view.scale])

  // 프로파일링용 디버그 훅 (데모 전용) — 콘솔에서 __pinly.bench() 로 실측
  useEffect(() => {
    window.__pinly = {
      stage: () => stageRef.current,
      doc: () => doc,
      bench: (runs = 30) => {
        const stage = stageRef.current
        const layer = stage.getLayers()[0]
        layer.draw()
        const t0 = performance.now()
        for (let i = 0; i < runs; i++) layer.draw()
        const ms = (performance.now() - t0) / runs
        return { nodes: stage.find('Shape').length, msPerDraw: +ms.toFixed(2),
                 theoreticalFps: Math.round(1000 / ms) }
      },
    }
  }, [doc])

  /* ---------- 단축키 ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedId) {
          setDoc((d) => ({ ...d, elements: d.elements.filter((el) => el.id !== selectedId) }))
          setSelectedId(null)
        }
        return
      }
      const t = TOOLS.find((x) => x.key === e.key.toLowerCase())
      if (t) setTool(t.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedId, setDoc])

  /* ---------- 캔버스 클릭 핸들러 ---------- */
  const handleCanvasClick = useCallback((kind, p) => {
    if (kind === 'comment') {
      const c = {
        id: `cmt_${cid++}`,
        x: p.x, y: p.y,
        status: 'todo',
        resolved: false,
        messages: [{ who: '편집자', body: '여기 수정 부탁드립니다.' }],
      }
      setComments((prev) => [...prev, c])
      setActiveCommentId(c.id)
      // 같은 클릭의 click 이벤트가 밑의 요소를 선택하지 않도록 다음 tick 에 전환
      setTimeout(() => setTool('select'), 0)
    }
    if (kind === 'text-created') setTool('select')
  }, [])

  const updateComment = (id, patch) =>
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeComment = (id) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
    setActiveCommentId(null)
  }

  /* ---------- 이미지 업로드 (데모: objectURL, 실제: presigned PUT) ---------- */
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const probe = new window.Image()
    probe.onload = () => {
      const maxW = doc.stage.width * 0.8
      const ratio = Math.min(1, maxW / probe.width)
      setDoc((d) => ({
        ...d,
        elements: [...d.elements, {
          ...baseElement('image', 60, 60),
          s3Key: `projects/demo/canvas/${file.name}`,
          naturalWidth: probe.width, naturalHeight: probe.height,
          width: Math.round(probe.width * ratio), height: Math.round(probe.height * ratio),
          _src: url,
        }],
      }))
    }
    probe.src = url
    e.target.value = ''
  }

  /* ---------- 샘플 원고 (웹툰 세로 원고 형태로 생성) ---------- */
  const addSampleManuscript = () => {
    const W = 1200, H = 4000
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#292C28'; ctx.lineWidth = 6
    let y = 60
    for (let i = 0; i < 8; i++) {
      const h = 300 + Math.random() * 260
      ctx.strokeRect(60, y, W - 120, h)
      ctx.fillStyle = '#eef1ed'; ctx.fillRect(66, y + 6, W - 132, h - 12)
      ctx.fillStyle = '#9aa39a'; ctx.font = 'bold 42px sans-serif'
      ctx.fillText(`컷 ${i + 1}`, 100, y + 60)
      ctx.fillStyle = '#292C28'
      y += h + 40
    }
    const url = c.toDataURL('image/png')
    const ratio = Math.min(1, (doc.stage.width * 0.5) / W)
    setDoc((d) => ({
      ...d,
      elements: [{
        ...baseElement('image', 80, 80),
        s3Key: 'projects/demo/canvas/sample-manuscript.png',
        naturalWidth: W, naturalHeight: H,
        width: Math.round(W * ratio), height: Math.round(H * ratio),
        _src: url,
      }, ...d.elements],
    }))
  }

  /* ---------- 부하 테스트 ---------- */
  const stress = (count) => {
    const t0 = performance.now()
    const made = []
    for (let i = 0; i < count; i++) {
      const sx = Math.random() * doc.stage.width
      const sy = Math.random() * doc.stage.height
      const pts = [sx, sy]
      for (let k = 0; k < 40; k++) {
        pts.push(pts[pts.length - 2] + (Math.random() - 0.5) * 30)
        pts.push(pts[pts.length - 2] + (Math.random() - 0.5) * 30)
      }
      made.push({
        ...baseElement('drawing', 0, 0), points: pts,
        stroke: i % 2 ? '#00E4DC' : '#1AE46E', strokeWidth: 3,
        lineCap: 'round', lineJoin: 'round', tension: 0.4, closed: false,
      })
    }
    setDoc((d) => ({ ...d, elements: [...d.elements, ...made] }))
    setStats((s) => ({ ...s, lastRender: Math.round(performance.now() - t0) }))
  }

  const zoomTo = (scale) => setView((v) => ({ ...v, scale }))

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">pin<span>ly</span> · 캔버스 스파이크</div>
        <div className="toolbar">
          {TOOLS.map((t) => (
            <button
              key={t.id} title={t.label}
              className={`tool${tool === t.id ? ' active' : ''}`}
              onClick={() => setTool(t.id)}
            >{t.icon}</button>
          ))}
          <button className="tool" title="이미지 첨부" onClick={() => fileRef.current.click()}>🖼️</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
        <button className="btn" onClick={undo} disabled={!canUndo}>되돌리기</button>
        <button className="btn" onClick={redo} disabled={!canRedo}>다시하기</button>
        <div className="spacer" />
        <button className="btn" onClick={addSampleManuscript}>샘플 원고</button>
        <button className="btn" onClick={() => stress(100)}>부하 +100선</button>
        <button className="btn" onClick={() => stress(1000)}>+1000선</button>
        <button className="btn" onClick={() => zoomTo(0.4)}>40%</button>
        <span className={`badge fps${stats.fps < 40 ? ' bad' : ''}`}>
          {stats.fps} fps · {stats.nodes} nodes
        </span>
      </header>

      <div className="body">
        <div ref={containerRef} className={`stage-wrap tool-${tool}`}>
          <CanvasStage
            doc={doc} setDoc={setDoc}
            view={view} setView={setView}
            tool={tool}
            selectedId={selectedId} setSelectedId={setSelectedId}
            onCanvasClick={handleCanvasClick}
            stageRef={stageRef} containerRef={containerRef}
          />
          <PinLayer
            comments={comments} view={view}
            activeId={activeCommentId} setActiveId={setActiveCommentId}
            updateComment={updateComment} removeComment={removeComment}
          />
        </div>
        <Inspector
          doc={doc} comments={comments}
          setActiveId={setActiveCommentId} updateComment={updateComment}
          stats={stats}
        />
      </div>
    </div>
  )
}
