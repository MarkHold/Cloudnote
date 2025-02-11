import React, { useState, useEffect, ChangeEvent, useRef } from 'react'

// We'll store tasks as objects so we can have title, description, due date.
// We'll add an Electron-friendly shortcut for ctrl+t to open a modal.
// We'll also add ctrl+f for searching notes.
// We'll also add ctrl+s for prompting ChatGPT.
// This search displays a small panel with suggestions for both note titles and content.
// Now with an Obsidian-like layout and color scheme, or a white-based light mode.
// ADDED: Tab system in the top bar (like a browser). Each open note is a tab.

/**
 * Debugging notes:
 * - Implemented a small tabs array to track open notes.
 * - Each tab has a path: number[].
 * - If the user selects a note, we either switch to that tab or open a new tab.
 * - The header shows these tabs with a small 'x' to close.
 * - Everything else remains as it was.
 * If anything about expected behavior is unclear, please clarify.
 */

interface Task {
  id: string
  title: string
  description: string
  dueDate: string // store as ISO or string
}

interface Note {
  title: string
  content: string
  subNotes?: Note[]
  isCollapsed?: boolean
}

interface SearchResult {
  path: number[]
  note: Note
}

function pathsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function App(): JSX.Element {
  // ============ STATES ============

  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  // We'll track which note is displayed via selectedPath.
  // But now we also have tabs.
  const [selectedPath, setSelectedPath] = useState<number[]>([])

  // We'll store open tabs as an array of note paths.
  // Each tab references a path: number[]
  const [openTabs, setOpenTabs] = useState<number[][]>([])
  // We'll track which tab is active by index.
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1)

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState<string>('')
  const [taskDescription, setTaskDescription] = useState<string>('')
  const [taskDueDate, setTaskDueDate] = useState<string>('')

  // Search panel
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // ChatGPT panel
  const [chatGptOpen, setChatGptOpen] = useState(false)
  const [chatGptPrompt, setChatGptPrompt] = useState('')
  const [chatGptResponse, setChatGptResponse] = useState('')
  const [chatGptPromptHistory, setChatGptPromptHistory] = useState<string>('')

  // Hard-coded API key (use caution in production)
  const openAiApiKey =
    'sk-3LUjXGvek8ASoLwWxu3NHA8YSAC-r0-tXivqtGAOrOT3BlbkFJsb5hPc16m_mPqt5sxc1fbx4Qjc2ezV3EXiFDTEUaIA'

  // Example top bar info, like date/time
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Dark mode or light mode state
  const [darkMode, setDarkMode] = useState(true)

  // We'll define a helper for the colors depending on mode
  const colors = {
    // base backgrounds
    mainBg: darkMode ? '#1e1e1e' : '#fefefe',
    panelBg: darkMode ? '#2b2b2b' : '#f7f7f7',
    borderColor: darkMode ? '#333' : '#ccc',
    textColor: darkMode ? '#ccc' : '#333',
    // for sub panel or alt backgrounds
    altBg: darkMode ? '#333' : '#eaeaea',
    accent: darkMode ? '#483699' : '#497ef0', // or pick a different accent for light
    buttonBg: darkMode ? '#444' : '#ccc',
    buttonText: darkMode ? '#ccc' : '#333'
  }

  // ======= LOCALSTORAGE LOADING/SAVING =======
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('myapp_tasks_obj')
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

  useEffect(() => {
    localStorage.setItem('myapp_tasks_obj', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('myapp_notes', JSON.stringify(notes))
  }, [notes])

  // ======= KEYBOARD SHORTCUTS =======
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        openNewTaskModal()
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openSearchPanel()
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        openChatGptPanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // ================== SEARCH ==================

  function openSearchPanel() {
    setSearchOpen(true)
    setSearchQuery('')
    setSearchSelectedIndex(0)
  }

  function closeSearchPanel() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchSelectedIndex(0)
  }

  function gatherAllNotes(rootNotes: Note[]): { path: number[]; note: Note }[] {
    const results: { path: number[]; note: Note }[] = []
    function dfs(notesArr: Note[], currentPath: number[]) {
      notesArr.forEach((n, idx) => {
        const newPath = [...currentPath, idx]
        results.push({ path: newPath, note: n })
        if (n.subNotes && n.subNotes.length > 0) {
          dfs(n.subNotes, newPath)
        }
      })
    }
    dfs(rootNotes, [])
    return results
  }

  useEffect(() => {
    if (!searchOpen) return
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchSelectedIndex(0)
      return
    }
    const all = gatherAllNotes(notes)
    const lowerQ = searchQuery.toLowerCase()
    const matched = all.filter(
      ({ note }) =>
        (note.title ?? '').toLowerCase().includes(lowerQ) ||
        (note.content ?? '').toLowerCase().includes(lowerQ)
    )
    setSearchResults(matched)
    setSearchSelectedIndex(0)
  }, [searchQuery, notes, searchOpen])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchResults.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSearchSelectedIndex((prev) => {
        const next = prev + 1
        if (next >= searchResults.length) return 0
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSearchSelectedIndex((prev) => {
        const next = prev - 1
        if (next < 0) return searchResults.length - 1
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults[searchSelectedIndex]) {
        goToSearchResult(searchResults[searchSelectedIndex])
      }
    } else if (e.key === 'Escape') {
      closeSearchPanel()
    }
  }

  function goToSearchResult(res: SearchResult) {
    setSelectedPath(res.path)
    // open that note in a tab
    openNoteTab(res.path)
    closeSearchPanel()
  }

  // ================== TABS ==================

  // This function ensures the note for the given path is open in a tab, and sets it active.
  function openNoteTab(path: number[]) {
    // check if a tab with this path is already open:
    const existingIndex = openTabs.findIndex((t) => pathsEqual(t, path))
    if (existingIndex >= 0) {
      // just switch to that tab
      setActiveTabIndex(existingIndex)
      setSelectedPath(path)
    } else {
      // add a new tab
      setOpenTabs((prev) => [...prev, path])
      setActiveTabIndex(openTabs.length) // new tab is last
      setSelectedPath(path)
    }
  }

  function handleTabClick(index: number) {
    setActiveTabIndex(index)
    setSelectedPath(openTabs[index])
  }

  function handleTabClose(e: React.MouseEvent, index: number) {
    e.stopPropagation()
    setOpenTabs((prev) => {
      const copy = [...prev]
      copy.splice(index, 1)
      return copy
    })
    // if we closed the active tab, pick a new tab to show
    if (index === activeTabIndex) {
      // after removal, activeTabIndex might be out of range.
      // let's pick the previous tab if possible, else next tab.
      let newIndex = index - 1
      if (newIndex < 0) {
        newIndex = 0
      }
      if (newIndex >= openTabs.length - 1) {
        // means there's no tab, or we need to clamp.
        if (openTabs.length - 1 <= 0) {
          // no tabs left.
          setActiveTabIndex(-1)
          setSelectedPath([])
        } else {
          setActiveTabIndex(openTabs.length - 2)
          setSelectedPath(openTabs[openTabs.length - 2])
        }
      } else {
        setActiveTabIndex(newIndex)
        // note: if newIndex >= openTabs.length -1 we do something.
        // but we do it after we remove the tab.
        // maybe do it after state updates.
      }
    } else if (index < activeTabIndex) {
      // shift the activeTabIndex left by 1
      setActiveTabIndex((prev) => prev - 1)
    }
  }

  // ================== TASKS ==================

  function openNewTaskModal() {
    setEditingTaskId(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
    setTaskModalOpen(true)
  }

  function openEditTaskModal(task: Task) {
    setEditingTaskId(task.id)
    setTaskTitle(task.title)
    setTaskDescription(task.description)
    setTaskDueDate(task.dueDate)
    setTaskModalOpen(true)
  }

  function closeTaskModal() {
    setTaskModalOpen(false)
  }

  function handleCreateOrUpdateTask() {
    if (!taskTitle.trim()) {
      alert('Task title is required.')
      return
    }

    if (editingTaskId) {
      // update existing
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: taskTitle,
                description: taskDescription,
                dueDate: taskDueDate
              }
            : t
        )
      )
    } else {
      // create new
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate
      }
      setTasks((prev) => [...prev, newTask])
    }
    setTaskModalOpen(false)
  }

  function handleCheck(index: number) {
    setTasks((prev) => {
      const copy = [...prev]
      copy.splice(index, 1)
      return copy
    })
  }

  function handleTaskClick(task: Task) {
    openEditTaskModal(task)
  }

  // ================== NOTES ==================

  function getNoteByPath(path: number[]): Note | null {
    if (!path.length) return null
    let current: Note | undefined
    let level: Note[] = notes
    for (let i = 0; i < path.length; i++) {
      const idx = path[i]
      if (idx < 0 || idx >= level.length) {
        return null
      }
      current = level[idx]
      if (i === path.length - 1) {
        return current
      }
      if (!current.subNotes) {
        return null
      }
      level = current.subNotes
    }
    return null
  }

  function setNoteByPath(path: number[], updated: Note) {
    if (!path.length) return
    const newNotes = structuredClone(notes)
    let level = newNotes as Note[]
    for (let i = 0; i < path.length; i++) {
      const idx = path[i]
      if (i === path.length - 1) {
        level[idx] = updated
      } else {
        if (!level[idx].subNotes) {
          level[idx].subNotes = []
        }
        level = level[idx].subNotes!
      }
    }
    setNotes(newNotes)
  }

  function handleNewNote() {
    const newNote: Note = {
      title: 'Untitled Note',
      content: '',
      subNotes: [],
      isCollapsed: false
    }
    setNotes((prev) => [...prev, newNote])
    // open the new note in a tab. It's at [notes.length]
    const newPath = [notes.length]
    openNoteTab(newPath)
  }

  function handleAddSubNote(path: number[]) {
    const parent = getNoteByPath(path)
    if (!parent) return
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

  function handleToggleCollapse(e: React.MouseEvent, path: number[]) {
    e.stopPropagation()
    const note = getNoteByPath(path)
    if (!note) return
    const updated = { ...note, isCollapsed: !note.isCollapsed }
    setNoteByPath(path, updated)
  }

  function handleSelectPath(path: number[]) {
    // when the user clicks a note in the left panel,
    // open that note in a tab.
    openNoteTab(path)
  }

  function handleGoHome() {
    setSelectedPath([])
  }

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

  function renderNoteItem(note: Note, path: number[]) {
    const hasSubNotes = note.subNotes && note.subNotes.length > 0
    return (
      <div
        key={path.join('-')}
        style={{
          marginTop: '0.3rem',
          padding: '0.2rem',
          fontSize: '0.9rem',
          color: colors.textColor
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {hasSubNotes && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleCollapse(e, path)
              }}
              style={{
                marginRight: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: darkMode ? '#aaa' : '#777'
              }}
            >
              {note.isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <div
            onClick={() => handleSelectPath(path)}
            style={{
              flex: 1,
              backgroundColor: darkMode ? '#333' : '#eee',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '0.3rem',
              color: colors.textColor
            }}
          >
            {note.title || 'Untitled'}
          </div>
          {path.length < 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAddSubNote(path)
              }}
              style={{
                marginLeft: '0.5rem',
                backgroundColor: colors.accent,
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                fontSize: '0.8rem'
              }}
            >
              +
            </button>
          )}
        </div>
        {!note.isCollapsed && hasSubNotes && (
          <div style={{ marginLeft: '1rem', marginTop: '0.3rem' }}>
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
      <div
        style={{
          backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '4px',
          padding: '1rem',
          color: colors.textColor,
          flex: 1
        }}
      >
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
            border: `1px solid ${colors.borderColor}`,
            backgroundColor: colors.altBg,
            color: colors.textColor
          }}
        />
        <textarea
          value={note.content}
          onChange={handleNoteContentChange}
          placeholder="Write your note here..."
          style={{
            width: '100%',
            flex: 1,
            height: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            borderRadius: '4px',
            border: `1px solid ${colors.borderColor}`,
            backgroundColor: colors.altBg,
            color: colors.textColor,
            resize: 'vertical'
          }}
        />
      </div>
    )
  }

  // Return the note for the active tab, if any.
  // otherwise, if activeTabIndex = -1 or openTabs is empty, selectedNote is used as fallback.
  const activeNote = getNoteByPath(selectedPath)

  // ================== ChatGPT Prompt ==================

  async function openChatGptPanel() {
    setChatGptOpen(true)
    setChatGptPrompt('')
    setChatGptResponse('')
    setChatGptPromptHistory('')
  }

  function closeChatGptPanel() {
    setChatGptOpen(false)
  }

  async function handleSendToChatGpt() {
    if (!chatGptPrompt.trim()) {
      alert('Please type a prompt for ChatGPT.')
      return
    }
    try {
      setChatGptResponse('Loading...')
      setChatGptPromptHistory(chatGptPrompt)
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are ChatGPT.' },
            { role: 'user', content: chatGptPrompt }
          ]
        })
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`OpenAI API error: ${errText}`)
      }
      const data = await res.json()
      const reply = data?.choices?.[0]?.message?.content || '(No response)'
      setChatGptResponse(reply)
    } catch (err: any) {
      setChatGptResponse('Error: ' + err.message)
    }
  }

  function toggleDarkMode() {
    setDarkMode((prev) => !prev)
  }

  // We'll render a small tab bar in the header, below the date & toggle.
  // Each tab references openTabs[i]. We'll get the note's title.

  function renderTabBar() {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
        {openTabs.map((path, i) => {
          const note = getNoteByPath(path)
          const title = note ? note.title || 'Untitled' : '[Missing]'
          const isActive = i === activeTabIndex
          return (
            <div
              key={'tab-' + path.join('-')}
              onClick={() => handleTabClick(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isActive ? colors.altBg : 'transparent',
                color: isActive ? colors.textColor : colors.textColor,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{title}</span>
              <button
                onClick={(e) => handleTabClose(e, i)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? colors.textColor : colors.textColor,
                  fontSize: '0.9rem'
                }}
              >
                x
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: colors.mainBg,
        minHeight: '100vh',
        minWidth: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: colors.textColor
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: darkMode ? '#2b2b2b' : '#f0f0f0',
          color: colors.textColor,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ fontSize: '0.9rem' }}>{today}</div>
        <button
          onClick={toggleDarkMode}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '4px',
            padding: '0.3rem 0.6rem',
            cursor: 'pointer',
            color: colors.textColor
          }}
        >
          {darkMode ? (
            /* sun icon if darkMode is true => user can switch to light */
            <svg
              style={{ width: '1.2rem', height: '1.2rem' }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5V3m4.95 2.05l.71-.71m1.84 6.16h1.5m-2.21 4.66l.71.71M12 19.5V21m-4.95-2.05l-.71.71m-1.84-6.16h-1.5m2.21-4.66l-.71-.71M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
              />
            </svg>
          ) : (
            /* moon icon if darkMode is false => user can switch to dark */
            <svg
              style={{ width: '1.2rem', height: '1.2rem' }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 0010.08 9.79z"
              />
            </svg>
          )}
        </button>
      </header>
      {/* Render the tab bar below the header. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem',
          borderBottom: `1px solid ${colors.borderColor}`
        }}
      >
        {renderTabBar()}
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left panel */}
        <aside
          style={{
            width: '250px',
            backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
            borderRight: `1px solid ${colors.borderColor}`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* A small top area for new note button */}
          <div style={{ padding: '0.5rem', borderBottom: `1px solid ${colors.borderColor}` }}>
            <button
              onClick={handleNewNote}
              style={{
                width: '100%',
                backgroundColor: colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.4rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              + New Note
            </button>
          </div>
          {/* List of notes */}
          <div style={{ padding: '0.5rem', overflowY: 'auto', flex: 1 }}>
            {notes.map((note, index) => renderNoteItem(note, [index]))}
          </div>
          <button
            onClick={handleGoHome}
            style={{
              margin: '0.5rem',
              backgroundColor: darkMode ? '#444' : '#ddd',
              color: colors.textColor,
              border: 'none',
              borderRadius: '4px',
              padding: '0.4rem',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Show Tasks
          </button>
        </aside>

        {/* Main area: note or tasks */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {activeNote ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {renderNoteEditor(activeNote)}
            </div>
          ) : (
            // tasks
            <div
              style={{
                width: '400px',
                backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '4px',
                padding: '1rem',
                color: colors.textColor,
                margin: '1rem'
              }}
            >
              <h2 style={{ marginBottom: '1rem', color: colors.textColor }}>Tasks</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id} style={{ borderBottom: `1px solid ${colors.borderColor}` }}>
                      <td
                        style={{ padding: '0.5rem', cursor: 'pointer' }}
                        onClick={() => handleTaskClick(task)}
                      >
                        <span style={{ color: darkMode ? '#fff' : '#000' }}>{task.title}</span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <input type="checkbox" onChange={() => handleCheck(index)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={openNewTaskModal}
                style={{
                  marginTop: '1rem',
                  backgroundColor: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer'
                }}
              >
                + New Task
              </button>
            </div>
          )}

          {chatGptResponse && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '300px',
                backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
                borderLeft: `1px solid ${colors.borderColor}`,
                boxShadow: '-2px 0 6px rgba(0,0,0,0.2)',
                padding: '1rem',
                overflowY: 'auto',
                color: colors.textColor
              }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>ChatGPT Prompt:</h3>
              <div
                style={{
                  backgroundColor: darkMode ? '#333' : '#eee',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  marginBottom: '1rem',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {chatGptPromptHistory}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>ChatGPT Response:</h3>
              <div
                style={{
                  backgroundColor: darkMode ? '#333' : '#eee',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {chatGptResponse}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Task Modal */}
      {taskModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '400px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              color: colors.textColor
            }}
          >
            <h2 style={{ marginBottom: '0.5rem', color: darkMode ? '#fff' : '#000' }}>
              {editingTaskId ? 'Edit Task' : 'New Task'}
            </h2>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task Title"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '4px',
                backgroundColor: colors.altBg,
                color: colors.textColor
              }}
            />
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Task Description"
              style={{
                width: '100%',
                height: '100px',
                padding: '0.5rem',
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '4px',
                resize: 'vertical',
                backgroundColor: colors.altBg,
                color: colors.textColor
              }}
            />
            <label style={{ color: colors.textColor }}>
              Due Date:
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                style={{
                  marginLeft: '0.5rem',
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '4px',
                  padding: '0.3rem',
                  backgroundColor: colors.altBg,
                  color: colors.textColor
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={closeTaskModal}
                style={{
                  backgroundColor: colors.buttonBg,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  color: colors.buttonText
                }}
              >
                Close
              </button>
              <button
                onClick={handleCreateOrUpdateTask}
                style={{
                  backgroundColor: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                {editingTaskId ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search panel */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '2rem',
            zIndex: 9999
          }}
          onClick={closeSearchPanel}
        >
          <div
            style={{
              position: 'relative',
              backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              width: '400px',
              color: colors.textColor
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search notes..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: `1px solid ${colors.borderColor}`,
                fontSize: '1rem',
                backgroundColor: colors.altBg,
                color: colors.textColor
              }}
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: '0.5rem',
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: darkMode ? '#2b2b2b' : '#fff'
                }}
              >
                {searchResults.map((res, i) => {
                  const isSelected = i === searchSelectedIndex
                  return (
                    <div
                      key={res.path.join('-')}
                      onClick={() => goToSearchResult(res)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: isSelected ? colors.accent : 'transparent',
                        color: isSelected ? '#fff' : colors.textColor,
                        cursor: 'pointer'
                      }}
                    >
                      <strong>{res.note.title || 'Untitled'}</strong> -{' '}
                      {(res.note.content ?? '').slice(0, 30)}...
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ChatGPT Panel */}
      {chatGptOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
          onClick={closeChatGptPanel}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#2b2b2b' : '#f7f7f7',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '600px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              color: colors.textColor
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '0.5rem', color: darkMode ? '#fff' : '#000' }}>
              Prompt ChatGPT
            </h2>
            <textarea
              value={chatGptPrompt}
              onChange={(e) => setChatGptPrompt(e.target.value)}
              placeholder="Ask ChatGPT something..."
              style={{
                width: '100%',
                height: '200px',
                padding: '0.5rem',
                resize: 'vertical',
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '4px',
                backgroundColor: colors.altBg,
                color: colors.textColor
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={closeChatGptPanel}
                style={{
                  backgroundColor: colors.buttonBg,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  color: colors.buttonText
                }}
              >
                Close
              </button>
              <button
                onClick={handleSendToChatGpt}
                style={{
                  backgroundColor: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

/**
 * TEST CASES:
 * 1) Creating a new note => a new tab opens in the top bar.
 * 2) Toggling dark/light mode toggles the entire theme.
 * 3) Searching notes for a known keyword => opens correct note in a new tab if not already open.
 * 4) Sub-note creation => confirm max depth of 4 triggers an alert.
 * 5) ChatGPT prompt => on sending, show "Loading..." then a response or error.
 * 6) Closing a tab => if it was active, switch to neighbor tab or no note.
 * 7) If any behavior is unclear, please let us know the expected outcome!
 */
