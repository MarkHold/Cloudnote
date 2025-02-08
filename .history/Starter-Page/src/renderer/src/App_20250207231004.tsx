import { useState, ChangeEvent, useEffect } from 'react'

function App(): JSX.Element {
  // Make sure you have 'rain-window.mp4' placed in your project's public folder.
  // If you're using Create React App, drop it in "public".
  // If the video is somewhere else or you want to use a hosted file, update the src accordingly.

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // We'll store tasks and notes in localStorage so they're reloaded.
  // If you specifically need a filesystem JSON file, you'll have to run a backend server or an Electron environment.

  // Five random tasks to start with
  const [tasks, setTasks] = useState<string[]>([
    'Buy groceries',
    'Check email',
    'Send project proposal',
    'Feed the cat',
    'Read a book'
  ])

  // Notes state
  interface Note {
    title: string
    content: string
  }

  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('myapp_tasks')
    const savedNotes = localStorage.getItem('myapp_notes')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes))
    }
  }, [])

  // Save tasks whenever they change
  useEffect(() => {
    localStorage.setItem('myapp_tasks', JSON.stringify(tasks))
  }, [tasks])

  // Save notes whenever they change
  useEffect(() => {
    localStorage.setItem('myapp_notes', JSON.stringify(notes))
  }, [notes])

  // Remove task once checkbox is clicked
  const handleCheck = (index: number) => {
    setTasks((prevTasks) => {
      return prevTasks.filter((_, i) => i !== index)
    })
  }

  // Add new note
  const handleNewNote = () => {
    // Add a new note with default title and empty content.
    const newNote: Note = {
      title: 'Untitled Note',
      content: ''
    }
    setNotes((prev) => [...prev, newNote])
    setSelectedNoteIndex(notes.length) // Select the newly added note.
  }

  // Select an existing note
  const handleSelectNote = (index: number) => {
    setSelectedNoteIndex(index)
  }

  // Navigate back to main tasks screen
  const handleGoHome = () => {
    setSelectedNoteIndex(null)
  }

  // Auto-save on each keystroke
  const handleNoteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (selectedNoteIndex === null) return
    const newNotes = [...notes]
    newNotes[selectedNoteIndex].title = e.target.value
    setNotes(newNotes)
  }

  const handleNoteContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNoteIndex === null) return
    const newNotes = [...notes]
    newNotes[selectedNoteIndex].content = e.target.value
    setNotes(newNotes)
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

      {/* App Header */}
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

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Panel */}
        <aside
          style={{
            width: '300px',
            backgroundColor: '#fff',
            marginLeft: '2rem',
            marginTop: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <button
            onClick={handleGoHome}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#1a365d',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '100%',
              marginBottom: '0.5rem'
            }}
          >
            Home
          </button>

          <button
            onClick={handleNewNote}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#1a365d',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '100%'
            }}
          >
            New Note
          </button>

          {/* List of notes as tabs */}
          <div style={{ borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
            {notes.map((note, index) => (
              <div
                key={index}
                onClick={() => handleSelectNote(index)}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {note.title || 'Untitled'}
              </div>
            ))}
          </div>
        </aside>

        {/* Main area: either show tasks or note editor */}
        <main style={{ flex: 1, padding: '2rem' }}>
          {selectedNoteIndex === null ? (
            // Show tasks if no note is selected
            <div
              style={{
                width: '300px',
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
          ) : (
            // Show Markdown editor if a note is selected
            <div>
              <input
                type="text"
                value={notes[selectedNoteIndex].title}
                onChange={handleNoteTitleChange}
                placeholder="Note Title"
                style={{
                  display: 'block',
                  marginBottom: '1rem',
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1.1rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <textarea
                value={notes[selectedNoteIndex].content}
                onChange={handleNoteContentChange}
                style={{
                  width: '100%',
                  height: '400px',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
