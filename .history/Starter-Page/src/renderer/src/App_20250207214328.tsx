import { useState } from 'react'

function App(): JSX.Element {
  // Make sure you have 'rain-window.mp4' placed in your project's public folder
  // If you put the file in the 'public' folder at the root of Create React App, the path should be '/rain-window.mp4'
  // If the video is somewhere else or you want to use a hosted file, update the src accordingly.

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Five random tasks to start with
  const [tasks, setTasks] = useState<string[]>([
    'Buy groceries',
    'Check email',
    'Send project proposal',
    'Feed the cat',
    'Read a book'
  ])

  // Remove task once checkbox is clicked
  const handleCheck = (index: number) => {
    setTasks((prevTasks) => {
      return prevTasks.filter((_, i) => i !== index)
    })
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#1a365d', // dark blue fallback
        minHeight: '100vh',
        minWidth: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Background video */}
      {/* Make sure the .mp4 path is correct. If you place the mp4 in public folder, use '/rain-window.mp4' */}
      <video
        autoPlay
        muted
        loop
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1
        }}
      >
        <source src="/rain-window.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ fontSize: '1.1rem' }}>{today}</div>
        <div style={{ fontSize: '1.1rem' }}>☀️ 72°F</div>
      </header>

      {/* Tasks box */}
      <div
        style={{
          marginTop: '2rem',
          marginLeft: '2rem',
          width: '300px', // smaller width
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>Today's Tasks</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {tasks.map((task, index) => (
              <tr key={index}>
                <td style={{ padding: '1rem' }}>{task}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <input type="checkbox" onChange={() => handleCheck(index)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
