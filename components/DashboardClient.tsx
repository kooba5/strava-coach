'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Activity {
  id: number
  name: string
  distance: number
  moving_time: number
  start_date: string
  average_speed: number
  average_heartrate?: number
  total_elevation_gain: number
}

const SUGGESTIONS = [
  "What's my session for tomorrow? I'm free after 4pm",
  'How did my last run compare to the plan?',
  'Check my cadence trend — am I improving?',
  'I just finished a run, give me feedback',
  'How is my sub-1:35 goal looking right now?',
  'What should I focus on technically this week?',
]

const PLAN_WEEKS = [
  { week: 'Week 1', dates: '20–27 Apr', label: 'Recovery', current: true },
  { week: 'Week 2', dates: '28 Apr–4 May', label: 'Mountain trip 🏔️', current: false },
  { week: 'Week 3', dates: '5–11 May', label: 'Key quality + Edinburgh ✈️', current: false },
  { week: 'Week 4', dates: '12–18 May', label: 'Peak week', current: false },
  { week: 'Week 5', dates: '19–23 May', label: 'Taper 🏁', current: false },
]

function formatKm(m: number) {
  return (m / 1000).toFixed(1) + ' km'
}

function formatPace(seconds: number, distanceM: number) {
  if (!distanceM) return '—'
  const s = seconds / (distanceM / 1000)
  return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}`
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--orange)' : 'var(--surface2)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '12px 16px',
        fontSize: 15,
        lineHeight: 1.65,
        color: isUser ? '#fff' : 'var(--text)',
        border: isUser ? 'none' : '0.5px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

export default function DashboardClient({
  athleteName,
  athleteAvatar,
}: {
  athleteName: string
  athleteAvatar: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stravaContext, setStravaContext] = useState<string>('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/strava')
      .then((r) => r.json())
      .then((data) => {
        if (data.context) setStravaContext(data.context)
        if (data.activities) setActivities(data.activities.slice(0, 20))
        setDataLoading(false)
      })
      .catch(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          stravaContext,
        }),
      })

      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantMsg += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const firstName = athleteName.split(' ')[0]

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      fontFamily: 'var(--font-body)',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 280 : 0,
        minWidth: sidebarOpen ? 280 : 0,
        background: 'var(--surface)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <img
              src={athleteAvatar}
              alt={athleteName}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: 'var(--surface2)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '0.02em' }}>
                {athleteName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Strava athlete</div>
            </div>
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Race countdown */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', background: 'rgba(252,76,2,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>
              Race Day
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                {Math.ceil((new Date('2026-05-23').getTime() - Date.now()) / 86400000)} days
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>23 May · Sub-1:35</div>
            </div>
            <div style={{ marginTop: 8, height: 3, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                borderRadius: 2,
                background: 'var(--orange)',
                width: `${Math.min(100, Math.round((1 - (new Date('2026-05-23').getTime() - Date.now()) / (34 * 86400000)) * 100))}%`,
              }} />
            </div>
          </div>

          {/* Plan weeks */}
          <div style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ padding: '0 16px 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Training Plan
            </div>
            {PLAN_WEEKS.map((w) => (
              <div key={w.week} style={{
                padding: '7px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: w.current ? 'rgba(252,76,2,0.08)' : 'transparent',
                borderLeft: w.current ? '2px solid var(--orange)' : '2px solid transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: w.current ? 500 : 400, color: w.current ? 'var(--text)' : 'var(--muted)', marginBottom: 1 }}>
                    {w.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.dates}</div>
                </div>
                {w.current && (
                  <div style={{ fontSize: 10, background: 'var(--orange)', color: '#fff', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                    NOW
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Daily check-in */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              Daily Check-in
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
              Tell the coach your schedule for tomorrow to get a session proposal.
            </div>
            <button
              onClick={() => sendMessage("Daily check-in: what's my session for tomorrow? My schedule is: work 7–3, free after 3pm.")}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--surface2)',
                border: '0.5px solid var(--border2)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orange)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            >
              🗓️ Check tomorrow's session →
            </button>
            <button
              onClick={() => sendMessage("I just completed a run. Based on my latest Strava activity, how did I do vs the plan? Any adjustments needed?")}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '9px 12px',
                background: 'var(--surface2)',
                border: '0.5px solid var(--border2)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orange)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            >
              ✅ Post-run feedback →
            </button>
          </div>

          {/* Recent runs */}
          <div style={{ padding: '14px 0' }}>
            <div style={{ padding: '0 16px 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Recent Runs
            </div>
            {dataLoading ? (
              <div style={{ padding: '0 16px', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
            ) : activities.length === 0 ? (
              <div style={{ padding: '0 16px', color: 'var(--muted)', fontSize: 13 }}>No runs found</div>
            ) : (
              activities.map((a) => (
                <div key={a.id} style={{
                  padding: '8px 16px',
                  borderBottom: '0.5px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
                    <span>{formatKm(a.distance)}</span>
                    <span>{formatPace(a.moving_time, a.distance)} /km</span>
                    {a.average_heartrate && <span>{Math.round(a.average_heartrate)}bpm</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {new Date(a.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '0.5px solid var(--border2)',
              borderRadius: 8,
              color: 'var(--muted)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '0.5px solid var(--border)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1 }}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <span style={{ color: 'var(--orange)' }}>Coach</span> AI
          </div>
          {!dataLoading && (
            <div style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Strava data loaded
            </div>
          )}
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {messages.length === 0 ? (
            <div style={{ maxWidth: 600, margin: '40px auto 0', textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Hey {firstName} 👋
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                Your plan is loaded. 23 May is coming fast.
              </p>
              <p style={{ color: 'var(--orange)', fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 32 }}>
                Sub-1:35 · {Math.ceil((new Date('2026-05-23').getTime() - Date.now()) / 86400000)} days to go
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
                textAlign: 'left',
              }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: 'var(--surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      color: 'var(--text)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 740, margin: '0 auto' }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div style={{ display: 'flex', gap: 6, padding: '12px 0 12px 4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 7, height: 7,
                      borderRadius: '50%',
                      background: 'var(--orange)',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 20px',
          borderTop: '0.5px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            maxWidth: 740,
            margin: '0 auto',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            background: 'var(--surface)',
            border: '0.5px solid var(--border2)',
            borderRadius: 16,
            padding: '10px 12px',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your training, request a plan..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 15,
                fontFamily: 'var(--font-body)',
                fontWeight: 300,
                resize: 'none',
                maxHeight: 140,
                overflowY: 'auto',
                lineHeight: 1.5,
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 140) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: input.trim() && !loading ? 'var(--orange)' : 'var(--surface2)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? '#fff' : 'var(--muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
