import React, { useState, useEffect, ChangeEvent } from 'react'

// Single-string note with arbitrary-level subnotes (up to 4 levels)
// Path-based indexing: e.g. [0], [0,1], [0,1,2], [0,1,2,3]

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

  const [tasks, setTasks] = useState<string[]>([
    'Buy groceries',
    'Check email',
    'Send project proposal',
    'Feed the cat',
    'Read a book'
  ])

  // The note tree, stored in localStorage.
  const [notes, setNotes] = useState<Note[]>([])

  // A path array (e.g. [0,1,2]) indicates the chain of subnotes from top-level down.
  // e.g. [] => no note selected => show tasks.
  // [i] => i-th top-level note.
  // [i,j] => j-th subnote of i-th note.
  // up to 4 levels.
  const [selectedPath, setSelectedPath] = useState<number[]>([])

  // Load from localStorage
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
      // fallback
    }
  }, [])

  // Save tasks
  useEffect(() => {
    localStorage.setItem('myapp_tasks', JSON.stringify(tasks))
  }, [tasks])

  // Save notes
  useEffect(() => {
    localStorage.setItem('myapp_notes', JSON.stringify(notes))
  }, [notes])

  // Handle tasks
  const handleCheck = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  // GET a note by path (arbitrary depth)
  function getNoteByPath(path: number[]): Note | null {
    if (!path.length) return null

    let current: Note | undefined
    let level: Note[] = notes // current level array

    for (let i = 0; i < path.length; i++) {
      const idx = path[i]
      if (idx < 0 || idx >= level.length) {
        return null
      }
      current = level[idx]
      if (i === path.length - 1) {
        return current
      }
      // Otherwise go deeper
      if (!current.subNotes) {
        return null
      }
      level = current.subNotes
    }

    return null // fallback
  }

  // SET a note by path, replacing it with updated.
  function setNoteByPath(path: number[], updated: Note) {
    if (!path.length) return

    // We'll do a recursive copy strategy.
    const newNotes = structuredClone(notes) // or deep copy manually

    // navigate down
    let level = newNotes as Note[]
    for (let i = 0; i < path.length; i++) {
      const idx = path[i]
      if (i === path.length - 1) {
        // set here
        level[idx] = updated
      } else {
        // go deeper
        if (!level[idx].subNotes) {
          level[idx].subNotes = []
        }
        level = level[idx].subNotes!
      }
    }

    setNotes(newNotes)
  }

  // Create new top-level note
  const handleNewNote = () => {
    const newNote: Note = {
      title: 'Untitled Note',
      content: '',
      subNotes: [],
      isCollapsed: false
    }

    setNotes((prev) => [...prev, newNote])
    setSelectedPath([notes.length]) // select newly added
  }

  // Add sub-note at any path if path.length < 4
  function handleAddSubNote(path: number[]) {
    // get the parent
    const parent = getNoteByPath(path)
    if (!parent) return

    // if we already have 4 levels, do nothing
    if (path.length >= 4) {
      alert('Maximum nesting depth of 4 reached.')
      return
    }

    const newSubNote: Note = {
      title: 'Untitled SubNote',
      content: '',
      subNotes: [],
      isCollapsed: false
    }

    const updated = { ...parent }
    const newSubNotes = parent.subNotes ? [...parent.subNotes] : []
    newSubNotes.push(newSubNote)
    updated.subNotes = newSubNotes

    setNoteByPath(path, updated)
  }

  // Toggle collapse for note at any path (only if it's top-level or we want to let them collapse subnotes too?)
  function handleToggleCollapse(e: React.MouseEvent, path: number[]) {
    e.stopPropagation()
    const note = getNoteByPath(path)
    if (!note) return
    const updated = { ...note, isCollapsed: !note.isCollapsed }
    setNoteByPath(path, updated)
  }

  // handle selecting a note.
  function handleSelectPath(path: number[]) {
    setSelectedPath(path)
  }

  // Return to tasks screen
  const handleGoHome = () => {
    setSelectedPath([])
  }

  // handle note changes
  function handleNoteTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const current = getNoteByPath(selectedPath)
    if (!current) return
    const updated: Note = { ...current, title: e.target.value }
    setNoteByPath(selectedPath, updated)
  }

  function handleNoteContentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const current = getNoteByPath(selectedPath)
    if (!current) return
    const updated: Note = { ...current, content: e.target.value }
    setNoteByPath(selectedPath, updated)
  }

  // Recursively render note + its subnotes.
  function renderNoteItem(note: Note, path: number[]) {
    const hasSubNotes = note.subNotes && note.subNotes.length > 0

    return (
      <div key={path.join('-')} style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Arrow if subnotes exist */}
          {hasSubNotes && (
            <button
              onClick={(e) => handleToggleCollapse(e, path)}
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

          {/* Title, selectable */}
          <div
            onClick={() => handleSelectPath(path)}
            style={{
              flex: 1,
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#000',
              padding: '0.5rem'
            }}
          >
            {note.title || 'Untitled'}
          </div>

          {/* plus button if path < 4 levels */}
          {path.length < 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAddSubNote(path)
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
          )}
        </div>

        {/* Recursively render subnotes if not collapsed */}
        {!note.isCollapsed && hasSubNotes && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            {note.subNotes!.map((child, i) => {
              const childPath = [...path, i]
              return renderNoteItem(child, childPath)
            })}
          </div>
        )}
      </div>
    )
  }

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

  const selectedNote = getNoteByPath(selectedPath)

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
            {notes.map((note, index) => renderNoteItem(note, [index]))}
          </div>
        </aside>

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
                      <td style={{ padding: '1rem', color: '#000' }}>{task}</td>
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
