import { useState, useEffect, ChangeEvent, useRef } from "react";

// We'll store tasks as objects so we can have title, description, due date.
// We'll add an Electron-friendly shortcut for ctrl+t to open a modal.
// We'll also add ctrl+f for searching notes.
// We'll also add ctrl+s for prompting ChatGPT.
// This search will display a small panel with suggestions for both note titles and content.
// Now styled similarly to Obsidian: a dark theme, left panel for notes, center area for editing.

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // store as ISO or string
}

interface Note {
  title: string;
  content: string;
  subNotes?: Note[];
  isCollapsed?: boolean;
}

interface SearchResult {
  path: number[];
  note: Note;
}

function App(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");

  // Search panel
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // ChatGPT panel
  const [chatGptOpen, setChatGptOpen] = useState(false);
  const [chatGptPrompt, setChatGptPrompt] = useState("");
  const [chatGptResponse, setChatGptResponse] = useState("");
  const [chatGptPromptHistory, setChatGptPromptHistory] = useState<string>("");

  const openAiApiKey = "sk-3LUjXGvek8ASoLwWxu3NHA8YSAC-r0-tXivqtGAOrOT3BlbkFJsb5hPc16m_mPqt5sxc1fbx4Qjc2ezV3EXiFDTEUaIA";

  // Example top bar info, like date/time
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem("myapp_tasks_obj");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      const savedNotes = localStorage.getItem("myapp_notes");
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("myapp_tasks_obj", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("myapp_notes", JSON.stringify(notes));
  }, [notes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        openNewTaskModal();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openSearchPanel();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openChatGptPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ================== SEARCH ==================

  function openSearchPanel() {
    setSearchOpen(true);
    setSearchQuery("");
    setSearchSelectedIndex(0);
  }

  function closeSearchPanel() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchSelectedIndex(0);
  }

  function gatherAllNotes(rootNotes: Note[]): { path: number[]; note: Note }[] {
    const results: { path: number[]; note: Note }[] = [];
    function dfs(notesArr: Note[], currentPath: number[]) {
      notesArr.forEach((n, idx) => {
        const newPath = [...currentPath, idx];
        results.push({ path: newPath, note: n });
        if (n.subNotes && n.subNotes.length > 0) {
          dfs(n.subNotes, newPath);
        }
      });
    }
    dfs(rootNotes, []);
    return results;
  }

  useEffect(() => {
    if (!searchOpen) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchSelectedIndex(0);
      return;
    }
    const all = gatherAllNotes(notes);
    const lowerQ = searchQuery.toLowerCase();
    const matched = all.filter(({ note }) => (
      (note.title ?? "").toLowerCase().includes(lowerQ) ||
      (note.content ?? "").toLowerCase().includes(lowerQ)
    ));
    setSearchResults(matched);
    setSearchSelectedIndex(0);
  }, [searchQuery, notes, searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchSelectedIndex((prev) => {
        const next = prev + 1;
        if (next >= searchResults.length) return 0;
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchSelectedIndex((prev) => {
        const next = prev - 1;
        if (next < 0) return searchResults.length - 1;
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[searchSelectedIndex]) {
        goToSearchResult(searchResults[searchSelectedIndex]);
      }
    } else if (e.key === "Escape") {
      closeSearchPanel();
    }
  }

  function goToSearchResult(res: SearchResult) {
    setSelectedPath(res.path);
    closeSearchPanel();
  }

  // ================== TASKS ==================

  function openNewTaskModal() {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskModalOpen(true);
  }

  function openEditTaskModal(task: Task) {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskDueDate(task.dueDate);
    setTaskModalOpen(true);
  }

  function closeTaskModal() {
    setTaskModalOpen(false);
  }

  function handleCreateOrUpdateTask() {
    if (!taskTitle.trim()) {
      alert("Task title is required.");
      return;
    }

    if (editingTaskId) {
      // update existing
      setTasks((prev) => prev.map((t) => (
        t.id === editingTaskId
          ? { ...t, title: taskTitle, description: taskDescription, dueDate: taskDueDate }
          : t
      )));
    } else {
      // create new
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate,
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setTaskModalOpen(false);
  }

  function handleCheck(index: number) {
    setTasks((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  }

  function handleTaskClick(task: Task) {
    openEditTaskModal(task);
  }

  // ================== NOTES ==================

  function getNoteByPath(path: number[]): Note | null {
    if (!path.length) return null;
    let current: Note | undefined;
    let level: Note[] = notes;
    for (let i = 0; i < path.length; i++) {
      const idx = path[i];
      if (idx < 0 || idx >= level.length) {
        return null;
      }
      current = level[idx];
      if (i === path.length - 1) {
        return current;
      }
      if (!current.subNotes) {
        return null;
      }
      level = current.subNotes;
    }
    return null;
  }

  function setNoteByPath(path: number[], updated: Note) {
    if (!path.length) return;
    const newNotes = structuredClone(notes);
    let level = newNotes as Note[];
    for (let i = 0; i < path.length; i++) {
      const idx = path[i];
      if (i === path.length - 1) {
        level[idx] = updated;
      } else {
        if (!level[idx].subNotes) {
          level[idx].subNotes = [];
        }
        level = level[idx].subNotes!;
      }
    }
    setNotes(newNotes);
  }

  function handleNewNote() {
    const newNote: Note = {
      title: "Untitled Note",
      content: "",
      subNotes: [],
      isCollapsed: false,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedPath([notes.length]);
  }

  function handleAddSubNote(path: number[]) {
    const parent = getNoteByPath(path);
    if (!parent) return;
    if (path.length >= 4) {
      alert("Maximum nesting depth of 4 reached.");
      return;
    }
    const newSubNote: Note = {
      title: "Untitled SubNote",
      content: "",
      subNotes: [],
      isCollapsed: false,
    };
    const updated = { ...parent };
    const newSubNotes = parent.subNotes ? [...parent.subNotes] : [];
    newSubNotes.push(newSubNote);
    updated.subNotes = newSubNotes;
    setNoteByPath(path, updated);
  }

  function handleToggleCollapse(e: React.MouseEvent, path: number[]) {
    e.stopPropagation();
    const note = getNoteByPath(path);
    if (!note) return;
    const updated = { ...note, isCollapsed: !note.isCollapsed };
    setNoteByPath(path, updated);
  }

  function handleSelectPath(path: number[]) {
    setSelectedPath(path);
  }

  function handleGoHome() {
    setSelectedPath([]);
  }

  function handleNoteTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const current = getNoteByPath(selectedPath);
    if (!current) return;
    const updated: Note = { ...current, title: e.target.value };
    setNoteByPath(selectedPath, updated);
  }

  function handleNoteContentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const current = getNoteByPath(selectedPath);
    if (!current) return;
    const updated: Note = { ...current, content: e.target.value };
    setNoteByPath(selectedPath, updated);
  }

  function renderNoteItem(note: Note, path: number[]) {
    const hasSubNotes = note.subNotes && note.subNotes.length > 0;
    return (
      <div key={path.join("-")}
        style={{ marginTop: "0.3rem", padding: "0.2rem", color: "#d0d0d0" }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasSubNotes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse(e, path);
              }}
              style={{
                marginRight: "0.5rem",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "#aaa"
              }}
            >
              {note.isCollapsed ? "▶" : "▼"}
            </button>
          )}
          <div
            onClick={() => handleSelectPath(path)}
            style={{
              flex: 1,
              backgroundColor: "#2b2b2b",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "0.4rem",
              color: "#d0d0d0",
            }}
          >
            {note.title || "Untitled"}
          </div>
          {path.length < 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddSubNote(path);
              }}
              style={{
                marginLeft: "0.5rem",
                backgroundColor: "#483699",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                cursor: "pointer",
                padding: "0.2rem 0.5rem",
              }}
            >
              +
            </button>
          )}
        </div>
        {!note.isCollapsed && hasSubNotes && (
          <div style={{ marginLeft: "1rem", marginTop: "0.3rem" }}>
            {note.subNotes!.map((child, i) => {
              const childPath = [...path, i];
              return renderNoteItem(child, childPath);
            })}
          </div>
        )}
      </div>
    );
  }

  function renderNoteEditor(note: Note) {
    return (
      <div style={{ color: "#ccc" }}>
        <input
          type="text"
          value={note.title}
          onChange={handleNoteTitleChange}
          placeholder="Note Title"
          style={{
            display: "block",
            marginBottom: "1rem",
            width: "100%",
            padding: "0.5rem",
            fontSize: "1.1rem",
            borderRadius: "4px",
            border: "1px solid #555",
            backgroundColor: "#2b2b2b",
            color: "#ccc",
          }}
        />
        <textarea
          value={note.content}
          onChange={handleNoteContentChange}
          placeholder="Write your note here..."
          style={{
            width: "100%",
            height: "400px",
            padding: "0.5rem",
            fontSize: "1rem",
            borderRadius: "4px",
            border: "1px solid #555",
            backgroundColor: "#2b2b2b",
            color: "#ccc",
            resize: "vertical",
          }}
        />
      </div>
    );
  }

  const selectedNote = getNoteByPath(selectedPath);

  // ================== ChatGPT Prompt ==================

  async function openChatGptPanel() {
    setChatGptOpen(true);
    setChatGptPrompt("");
    setChatGptResponse("");
    setChatGptPromptHistory("");
  }

  function closeChatGptPanel() {
    setChatGptOpen(false);
  }

  async function handleSendToChatGpt() {
    if (!chatGptPrompt.trim()) {
      alert("Please type a prompt for ChatGPT.");
      return;
    }
    try {
      setChatGptResponse("Loading...");
      setChatGptPromptHistory(chatGptPrompt);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are ChatGPT." },
            { role: "user", content: chatGptPrompt },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API error: ${errText}`);
      }
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "(No response)";
      setChatGptResponse(reply);
    } catch (err: any) {
      setChatGptResponse("Error: " + err.message);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#1e1e1e", // Obsidian-like dark background
        minHeight: "100vh",
        minWidth: "100vw",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        color: "#ccc", // main text color
      }}
    >
      {/* Remove video for an Obsidian-like vibe */}
      {/* Header: Dark top bar, akin to Obsidian's title bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 1rem",
          backgroundColor: "#2b2b2b",
          color: "#ccc",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ fontSize: "0.9rem" }}>{today}</div>
        <div style={{ fontSize: "0.9rem", color: "#999" }}>Obsidian-like App</div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Left panel: narrower than before, like Obsidian's file explorer */}
        <aside
          style={{
            width: "250px",
            backgroundColor: "#2b2b2b",
            borderRight: "1px solid #333",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* A small top area for new note / tasks button, etc. */}
          <div style={{ padding: "0.5rem", borderBottom: "1px solid #333" }}>
            <button
              onClick={handleNewNote}
              style={{
                width: "100%",
                backgroundColor: "#483699",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "0.4rem",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              + New Note
            </button>
          </div>
          {/* List of notes (like Obsidian's file explorer) */}
          <div style={{ padding: "0.5rem", overflowY: "auto", flex: 1 }}>
            {notes.map((note, index) => renderNoteItem(note, [index]))}
          </div>
          {/* A small button for tasks screen? Could also keep it inside notes. */}
          <button
            onClick={handleGoHome}
            style={{
              margin: "0.5rem",
              backgroundColor: "#444",
              color: "#ccc",
              border: "none",
              borderRadius: "4px",
              padding: "0.4rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Show Tasks
          </button>
        </aside>

        {/* Main area: note editing or tasks */}
        <main style={{ flex: 1, padding: "1rem", position: "relative" }}>
          {selectedNote ? (
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              {renderNoteEditor(selectedNote)}
            </div>
          ) : (
            <div
              style={{
                width: "400px",
                backgroundColor: "#2b2b2b",
                border: "1px solid #333",
                borderRadius: "4px",
                padding: "1rem",
                color: "#ccc",
              }}
            >
              <h2 style={{ marginBottom: "1rem", color: "#ccc" }}>Tasks</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id} style={{ borderBottom: "1px solid #444" }}>
                      <td
                        style={{ padding: "0.5rem", cursor: "pointer" }}
                        onClick={() => handleTaskClick(task)}
                      >
                        <span style={{ color: "#fff" }}>{task.title}</span>
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        <input
                          type="checkbox"
                          onChange={() => handleCheck(index)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={openNewTaskModal}
                style={{
                  marginTop: "1rem",
                  backgroundColor: "#483699",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.4rem 0.8rem",
                  cursor: "pointer",
                }}
              >
                + New Task
              </button>
            </div>
          )}

          {/* ChatGPT side panel if there's a response */}
          {chatGptResponse && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                height: "100%",
                width: "300px",
                backgroundColor: "#2b2b2b",
                borderLeft: "1px solid #333",
                boxShadow: "-2px 0 6px rgba(0,0,0,0.2)",
                padding: "1rem",
                overflowY: "auto",
                color: "#ccc",
              }}
            >
              <h3 style={{ marginBottom: "0.5rem" }}>ChatGPT Prompt:</h3>
              <div
                style={{
                  backgroundColor: "#333",
                  borderRadius: "4px",
                  padding: "0.5rem",
                  marginBottom: "1rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {chatGptPromptHistory}
              </div>
              <h3 style={{ marginBottom: "0.5rem" }}>ChatGPT Response:</h3>
              <div
                style={{
                  backgroundColor: "#333",
                  borderRadius: "4px",
                  padding: "0.5rem",
                  whiteSpace: "pre-wrap",
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
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#2b2b2b",
              borderRadius: "8px",
              padding: "1rem",
              minWidth: "400px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              color: "#ccc",
            }}
          >
            <h2 style={{ marginBottom: "0.5rem", color: "#fff" }}>
              {editingTaskId ? "Edit Task" : "New Task"}
            </h2>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task Title"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #555",
                borderRadius: "4px",
                backgroundColor: "#333",
                color: "#ccc",
              }}
            />
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Task Description"
              style={{
                width: "100%",
                height: "100px",
                padding: "0.5rem",
                border: "1px solid #555",
                borderRadius: "4px",
                resize: "vertical",
                backgroundColor: "#333",
                color: "#ccc",
              }}
            />
            <label style={{ color: "#ccc" }}>
              Due Date:
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                style={{
                  marginLeft: "0.5rem",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "0.3rem",
                  backgroundColor: "#333",
                  color: "#ccc",
                }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={closeTaskModal}
                style={{
                  backgroundColor: "#444",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  color: "#ccc",
                }}
              >
                Close
              </button>
              <button
                onClick={handleCreateOrUpdateTask}
                style={{
                  backgroundColor: "#483699",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                }}
              >
                {editingTaskId ? "Update Task" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search panel */}
      {searchOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "2rem",
            zIndex: 9999,
          }}
          onClick={closeSearchPanel}
        >
          <div
            style={{
              position: "relative",
              backgroundColor: "#2b2b2b",
              padding: "1rem",
              borderRadius: "8px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              width: "400px",
              color: "#ccc",
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
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #555",
                fontSize: "1rem",
                backgroundColor: "#333",
                color: "#ccc",
              }}
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: "0.5rem",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "#2b2b2b",
                }}
              >
                {searchResults.map((res, i) => {
                  const isSelected = i === searchSelectedIndex;
                  return (
                    <div
                      key={res.path.join("-")}
                      onClick={() => goToSearchResult(res)}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: isSelected ? "#483699" : "transparent",
                        color: isSelected ? "#fff" : "#ccc",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{res.note.title || "Untitled"}</strong> - {" "}
                      {(res.note.content ?? "").slice(0, 30)}...
                    </div>
                  );
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
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={closeChatGptPanel}
        >
          <div
            style={{
              backgroundColor: "#2b2b2b",
              borderRadius: "8px",
              padding: "1rem",
              minWidth: "600px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              color: "#ccc",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "0.5rem", color: "#fff" }}>Prompt ChatGPT</h2>
            <textarea
              value={chatGptPrompt}
              onChange={(e) => setChatGptPrompt(e.target.value)}
              placeholder="Ask ChatGPT something..."
              style={{
                width: "100%",
                height: "200px",
                padding: "0.5rem",
                resize: "vertical",
                border: "1px solid #555",
                borderRadius: "4px",
                backgroundColor: "#333",
                color: "#ccc",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={closeChatGptPanel}
                style={{
                  backgroundColor: "#444",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  color: "#ccc",
                }}
              >
                Close
              </button>
              <button
                onClick={handleSendToChatGpt}
                style={{
                  backgroundColor: "#483699",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
