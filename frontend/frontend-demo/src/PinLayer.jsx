import React, { useState } from 'react'

export const STATUS = {
  todo: { label: '수정 대기', cls: 'todo' },
  review: { label: '확인 대기', cls: 'review' },
  done: { label: '확인됨', cls: 'done' },
}

/**
 * 핀(코멘트)은 Konva 가 아니라 DOM 오버레이 — Figma 방식.
 * 캔버스 transform 에서 좌표만 계산해 절대위치로 얹는다.
 */
export default function PinLayer({ comments, view, activeId, setActiveId, updateComment, removeComment }) {
  const [replyDraft, setReplyDraft] = useState('')
  const project = (c) => ({ left: c.x * view.scale + view.x, top: c.y * view.scale + view.y })

  return (
    <div className="pin-layer">
      {comments.map((c, i) => {
        const pos = project(c)
        const active = activeId === c.id
        return (
          <React.Fragment key={c.id}>
            <div
              className={`pin${c.resolved ? ' resolved' : ''}${active ? ' active' : ''}`}
              style={pos}
              onClick={() => { setActiveId(active ? null : c.id); setReplyDraft('') }}
              title={c.messages[0]?.body}
            >
              {i + 1}
            </div>
            {active && (
              <div className="thread" style={pos} onMouseDown={(e) => e.stopPropagation()}>
                <h4>핀 #{i + 1} · ({Math.round(c.x)}, {Math.round(c.y)})</h4>
                {c.messages.map((m, mi) => (
                  <div className="msg" key={mi}>
                    <span className="who">{m.who}</span>
                    <div>{m.body}</div>
                  </div>
                ))}
                <textarea
                  placeholder="답글 입력…"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                />
                <div className="row">
                  <button
                    className="btn primary"
                    disabled={!replyDraft.trim()}
                    onClick={() => {
                      updateComment(c.id, {
                        messages: [...c.messages, { who: '나', body: replyDraft.trim() }],
                      })
                      setReplyDraft('')
                    }}
                  >답글</button>
                  <select
                    value={c.status}
                    onChange={(e) => updateComment(c.id, { status: e.target.value })}
                  >
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => updateComment(c.id, { resolved: !c.resolved })}
                  >{c.resolved ? '해결 취소' : '해결됨'}</button>
                  <button className="btn" onClick={() => removeComment(c.id)}>삭제</button>
                </div>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
