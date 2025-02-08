import React, { useState, useEffect, ChangeEvent } from 'react'

// Single string-based content for notes (like before), but also sub-notes, arrow collapse, local storage, tasks, etc.

interface Note {
  title: string
  content: string
  subNotes?: Note[]
  isCollapsed?: boolean
}

function App(): JSX.Element {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // We store tasks in localStorage.
  const [tasks, setTasks] = useState<string[]>([
    'Buy groceries',
    'Check email',
    'Send project proposal',
    'Feed the cat',
    'Read a book'
  ])

  // We'll store an array of notes in localStorage.
  // Each note can have subNotes, each also with title + content.
  const [notes, setNotes] = useState<Note[]>([])

  // We'll track which note/sub-note is selected by a path array.
  // e.g. [] => no selection (show tasks). [i] => top-level note i. [i,j] => sub-note j of note i.
  const [selectedNotePath, setSelectedNotePath] = useState<number[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('myapp_tasks')
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
      const savedNotes = localStorage.getItem('myapp_notes')
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes))
      }
    } catch {
      // fallback if parsing fails
    }
  }, [])

  // Save tasks whenever changed
  useEffect(() => {
    localStorage.setItem('myapp_tasks', JSON.stringify(tasks))
  }, [tasks])

  // Save notes whenever changed
  useEffect(() => {
    localStorage.setItem('myapp_notes', JSON.stringify(notes))
  }, [notes])

  // Remove a task once checkbox is clicked
  const handleCheck = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  // Helpers for retrieving and updating notes by path

  function getNoteByPath(path: number[]): Note | null {
    if (path.length === 0) return null // no selection

    let current: Note | undefined = notes[path[0]]
    if (!current) return null

    if (path.length === 2 && current.subNotes) {
      const sub = current.subNotes[path[1]]
      if (!sub) return null
      current = sub
    }

    return current
  }

  function setNoteByPath(path: number[], updatedNote: Note) {
    if (path.length === 0) return

    const newNotes = [...notes]

    if (path.length === 1) {
      // top-level note
      newNotes[path[0]] = updatedNote
    } else {
      // sub-note
      const parentIndex = path[0]
      const subIndex = path[1]
      const parent = { ...newNotes[parentIndex] }
      const subNotes = parent.subNotes ? [...parent.subNotes] : []
      subNotes[subIndex] = updatedNote
      parent.subNotes = subNotes
      newNotes[parentIndex] = parent
    }

    setNotes(newNotes)
  }

  // Create a new top-level note
  const handleNewNote = () => {
    const newNote: Note = {
      title: 'Untitled Note',
      content: '',
      subNotes: [],
      isCollapsed: false
    }
    setNotes((prev) => [...prev, newNote])
    // select the newly added note
    setSelectedNotePath([notes.length])
  }

  // Add a sub-note to an existing note
  const handleAddSubNote = (parentIndex: number) => {
    const newSubNote: Note = {
      title: 'Untitled SubNote',
      content: '',
      subNotes: [],
      isCollapsed: false
    }

    setNotes((prev) => {
      const copy = [...prev]
      const parent = { ...copy[parentIndex] }
      const sub = parent.subNotes ? [...parent.subNotes] : []
      sub.push(newSubNote)
      parent.subNotes = sub
      copy[parentIndex] = parent
      return copy
    })
  }

  // Toggle collapse on a top-level note
  const handleToggleCollapse = (e: React.MouseEvent, noteIndex: number) => {
    e.stopPropagation() // don't also select the note

    setNotes((prev) => {
      const copy = [...prev]
      const note = { ...copy[noteIndex] }
      note.isCollapsed = !note.isCollapsed
      copy[noteIndex] = note
      return copy
    })
  }

  // Selecting notes or subnotes
  const handleSelectNote = (index: number) => {
    setSelectedNotePath([index])
  }

  const handleSelectSubNote = (parentIndex: number, subIndex: number) => {
    setSelectedNotePath([parentIndex, subIndex])
  }

  // Return to tasks screen
  const handleGoHome = () => {
    setSelectedNotePath([])
  }

  // Update the current note's title or content

  const handleNoteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const current = getNoteByPath(selectedNotePath)
    if (!current) return
    const updated: Note = { ...current, title: e.target.value }
    setNoteByPath(selectedNotePath, updated)
  }

  const handleNoteContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const current = getNoteByPath(selectedNotePath)
    if (!current) return
    const updated: Note = { ...current, content: e.target.value }
    setNoteByPath(selectedNotePath, updated)
  }

  // Renders a single note in the left panel, including arrow to collapse, plus button for sub-note
  function renderNoteItem(note: Note, index: number) {
    const hasSubNotes = note.subNotes && note.subNotes.length > 0
    return (
      <div key={index} style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Arrow if subnotes exist */}
          {hasSubNotes && (
            <button
              onClick={(e) => handleToggleCollapse(e, index)}
              style={{
                marginRight: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {note.isCollapsed ? '▶' : '▼'}
            </button>
          )}

          {/* Clicking the note selects it */}
          <div
            onClick={() => handleSelectNote(index)}
            style={{
              flex: 1,
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            {note.title || 'Untitled'}
          </div>

          {/* plus button to add sub note */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddSubNote(index)
            }}
            style={{
              marginLeft: '0.5rem',
              backgroundColor: '#1a365d',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem'
            }}
          >
            +
          </button>
        </div>

        {/* Show subnotes if not collapsed */}
        {!note.isCollapsed && hasSubNotes && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            {note.subNotes!.map((sub, subIndex) => (
              <div key={subIndex} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    onClick={() => handleSelectSubNote(index, subIndex)}
                    style={{
                      flex: 1,
                      backgroundColor: '#e0e0e0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '0.5rem'
                    }}
                  >
                    {sub.title || 'Untitled SubNote'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render the main note editor with a big text area.
  function renderNoteEditor(note: Note) {
    return (
      <div>
        <input
          type="text"
          value={note.title}
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
          value={note.content}
          onChange={handleNoteContentChange}
          placeholder="Write your note here..."
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
    )
  }

  const selectedNote = getNoteByPath(selectedNotePath)

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#1a365d',
        minHeight: '100vh',
        minWidth: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Background video (if present) */}
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
      </video>

      {/* Header */}
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

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left panel with notes list */}
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

          <div style={{ borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
            {notes.map((note, index) => renderNoteItem(note, index))}
          </div>
        </aside>

        {/* Main area: show tasks or big note editor */}
        <main style={{ flex: 1, padding: '2rem' }}>
          {selectedNote ? (
            renderNoteEditor(selectedNote)
          ) : (
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
          )}
        </main>
      </div>
    </div>
  )
}

export default App
