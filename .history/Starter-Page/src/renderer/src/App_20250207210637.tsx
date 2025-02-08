function App(): JSX.Element {
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
      <h1
        style={{
          color: 'white',
          fontSize: '4rem',
          fontWeight: 'bold'
        }}
      >
        Hello World
      </h1>
    </div>
  )
}

export default App
