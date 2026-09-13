import React, { useMemo, useState } from 'react'
import { STATUS } from './PinLayer.jsx'

const serialize = (doc) => ({
  ...doc,
  // 데모 전용 필드(_src)는 저장 대상이 아니다 — 실제로는 s3Key 만 남는다
  elements: doc.elements.map(({ _src, ...rest }) => rest),
})

export default function Inspector({ doc, comments, setActiveId, updateComment, stats }) {
  const [tab, setTab] = useState('log')
  const payload = useMemo(() => JSON.stringify(serialize(doc), null, 2), [doc])
  const bytes = useMemo(() => new Blob([payload]).size, [payload])

  const counts = doc.elements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1
    return acc
  }, {})
  const points = doc.elements.reduce((n, el) => n + (el.points?.length ?? 0) / 2, 0)

  return (
    <aside className="side">
      <div className="tabs">
        <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>피드백 로그</button>
        <button className={tab === 'json' ? 'active' : ''} onClick={() => setTab('json')}>JSONB</button>
        <button className={tab === 'perf' ? 'active' : ''} onClick={() => setTab('perf')}>계측</button>
      </div>

      {tab === 'log' && (
        <div className="pane">
          {comments.length === 0 && (
            <p className="hint">댓글 툴(<code>C</code>)로 캔버스를 클릭해 핀을 찍어보세요.
              핀은 Konva 가 아니라 DOM 오버레이로 렌더됩니다.</p>
          )}
          {comments.map((c, i) => (
            <div className="log-item" key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>#{i + 1}</b>
                <span className={`chip ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
              </div>
              <span className="body">{c.messages[0]?.body}</span>
              <button className="btn" onClick={() => setActiveId(c.id)}>캔버스에서 열기</button>{' '}
              <button
                className="btn"
                onClick={() => {
                  const order = ['todo', 'review', 'done']
                  const next = order[(order.indexOf(c.status) + 1) % order.length]
                  updateComment(c.id, { status: next })
                }}
              >상태 전환</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'json' && (
        <div className="pane">
          <div className="stat"><span>elements</span><b>{doc.elements.length}</b></div>
          <div className="stat"><span>image / text / drawing</span>
            <b>{counts.image || 0} / {counts.text || 0} / {counts.drawing || 0}</b></div>
          <div className="stat"><span>드로잉 좌표 수</span><b>{points.toLocaleString()}</b></div>
          <div className="stat" style={{ marginBottom: 10 }}>
            <span>JSONB 크기</span><b>{(bytes / 1024).toFixed(1)} KB</b></div>
          <pre>{payload.length > 6000 ? payload.slice(0, 6000) + '\n… (생략)' : payload}</pre>
        </div>
      )}

      {tab === 'perf' && (
        <div className="pane">
          <div className="stat"><span>FPS</span><b>{stats.fps}</b></div>
          <div className="stat"><span>Konva 노드 수</span><b>{stats.nodes}</b></div>
          <div className="stat"><span>마지막 렌더(ms)</span><b>{stats.lastRender}</b></div>
          <div className="stat"><span>줌</span><b>{Math.round(stats.scale * 100)}%</b></div>
          <p className="hint" style={{ marginTop: 12 }}>
            상단 <b>부하 테스트</b> 버튼으로 선을 대량 투입해 한계점을 확인하세요.<br />
            JSONB 크기가 저장 페이로드 그대로이므로, 여기서 나온 KB 수치가
            백엔드 <code>canvas.document</code> 컬럼 크기 예상치입니다.
          </p>
        </div>
      )}
    </aside>
  )
}
