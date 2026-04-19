'use client'

export default function LoginPage() {
  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const redirect = `${baseUrl}/api/auth/callback`
    const scope = 'read,activity:read_all'
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}`
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.5,
      }} />

      {/* Orange glow */}
      <div style={{
        position: 'absolute',
        width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,76,2,0.12) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
        {/* Logo mark */}
        <div style={{
          width: 64, height: 64,
          background: 'var(--orange)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px',
          fontSize: 28,
        }}>
          ⚡
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}>
          Strava<br />
          <span style={{ color: 'var(--orange)' }}>Coach</span>
        </h1>

        <p style={{
          color: 'var(--muted)',
          fontSize: 16,
          fontWeight: 300,
          marginBottom: 48,
          maxWidth: 320,
          margin: '16px auto 48px',
          lineHeight: 1.6,
        }}>
          Your personal AI running coach powered by your actual training data
        </p>

        <button
          onClick={handleConnect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--orange)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '16px 32px',
            fontSize: 16,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--orange-dim)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--orange)')}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
          </svg>
          Connect with Strava
        </button>

        <p style={{
          color: 'var(--muted)',
          fontSize: 13,
          marginTop: 20,
        }}>
          Read-only access to your activities
        </p>
      </div>
    </main>
  )
}
