function App(): JSX.Element {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div
      style={{
        backgroundColor: '#1a365d', // dark blue background
        minHeight: '100vh', // full viewport height
        minWidth: '100vw', // full viewport width
        margin: 0,
        padding: 0,
        position: 'fixed', // ensures no scrolling and full coverage
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ fontSize: '1.1rem' }}>{today}</div>
        <div style={{ fontSize: '1.1rem' }}>☀️ 72°F</div>
      </header>
    </div>
  )
}

export default App
