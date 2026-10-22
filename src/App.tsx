import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { authenticate, AuthApiError, type AuthField, type AuthFieldErrors, type AuthMode, type AuthSession } from './api'
import { initialMemories, type Memory } from './mockMemories'
import './App.css'

const SESSION_KEY = 'mymemories-session'

function getStoredSession(): AuthSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (!stored) return null

  try {
    const session: unknown = JSON.parse(stored)
    if (
      typeof session === 'object' &&
      session !== null &&
      'token' in session &&
      typeof session.token === 'string' &&
      'username' in session &&
      typeof session.username === 'string' &&
      'email' in session &&
      typeof session.email === 'string'
    ) {
      return {
        id: 'id' in session && typeof session.id === 'number' ? session.id : null,
        token: session.token,
        username: session.username,
        email: session.email,
      }
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
  }

  return null
}

type IconName = 'book' | 'plus' | 'search' | 'edit' | 'trash' | 'close' | 'sparkle' | 'arrow'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    edit: <><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true"><Icon name="sparkle" size={20} /></span>
      <span>my<span className="brand-accent">memories</span></span>
    </div>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (mode === 'register' && !username.trim()) {
      setFieldErrors({ username: 'Please enter your name.' })
      return
    }
    if (!email.trim()) {
      setFieldErrors({ email: 'Please enter your email address.' })
      return
    }
    const emailInput = event.currentTarget.querySelector<HTMLInputElement>('input[type="email"]')
    if (emailInput?.validity.typeMismatch) {
      setFieldErrors({ email: 'Please enter a valid email address.' })
      return
    }
    if (mode === 'register' && password.length < 6) {
      setFieldErrors({ password: 'Your password needs at least 6 characters.' })
      return
    }
    if (!password) {
      setFieldErrors({ password: 'Please enter your password.' })
      return
    }

    setIsSubmitting(true)
    try {
      const session = await authenticate(mode, {
        username: username.trim(),
        email: email.trim(),
        password,
      })
      onAuthenticated(session)
    } catch (caughtError) {
      if (caughtError instanceof AuthApiError) {
        setFieldErrors(caughtError.fieldErrors)
        setError(Object.keys(caughtError.fieldErrors).length ? '' : caughtError.message)
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setFieldErrors({})
  }

  function clearFieldError(field: AuthField) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-story" aria-label="About MyMemories">
          <Brand />
          <div className="story-copy">
            <span className="eyebrow"><Icon name="sparkle" size={14} /> YOUR LIFE, IN LITTLE MOMENTS</span>
            <h1>A place for the things you <em>never want to forget.</em></h1>
            <p>Make a little room for the moments, thoughts, and stories that make a life yours.</p>
          </div>
          <div className="story-note">
            <span className="note-quote">“</span>
            <p>Some days are ordinary. Some days become the ones you remember forever.</p>
            <span className="note-attribution">A gentle reminder to pause</span>
          </div>
          <div className="story-sun" aria-hidden="true" />
          <span className="story-footnote">A softer place to keep your stories.</span>
        </section>

        <section className="auth-panel">
          <div className="auth-mobile-brand"><Brand compact /></div>
          <div className="auth-form-wrap">
            <span className="eyebrow auth-eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'A NEW CHAPTER'}</span>
            <h2>{mode === 'login' ? 'Come on in.' : 'Let’s get started.'}</h2>
            <p className="auth-intro">{mode === 'login' ? 'Your memories are right where you left them.' : 'Create your space for the moments that matter.'}</p>

            <div className="auth-tabs" role="tablist" aria-label="Account">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Log in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Sign up</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="field">
                    <span>Your name</span>
                    <input autoComplete="name" value={username} onChange={(event) => { setUsername(event.target.value); clearFieldError('username') }} placeholder="How should we call you?" required aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? 'username-error' : undefined} />
                  </label>
                  {fieldErrors.username && <p className="field-error" id="username-error">{fieldErrors.username}</p>}
                </div>
              )}
              <div className="auth-field">
                <label className="field">
                  <span>Email address</span>
                  <input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email') }} placeholder="you@example.com" required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                </label>
                {fieldErrors.email && <p className="field-error" id="email-error">{fieldErrors.email}</p>}
              </div>
              <div className="auth-field">
                <label className="field">
                  <span>Password</span>
                  <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password') }} placeholder="At least 6 characters" minLength={mode === 'register' ? 6 : undefined} required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined} />
                </label>
                {fieldErrors.password && <p className="field-error" id="password-error">{fieldErrors.password}</p>}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'One moment…' : mode === 'login' ? 'Log in to your journal' : 'Create your account'}
                {!isSubmitting && <Icon name="arrow" size={17} />}
              </button>
            </form>

            <p className="privacy-note"><span className="privacy-dot" /> Your stories are yours. Always.</p>
          </div>
          <span className="auth-bottom-note">Take a breath. You’re right on time.</span>
        </section>
      </div>
    </main>
  )
}

function MemoryEditor({
  memory,
  onSave,
  onDelete,
  onClose,
}: {
  memory: Memory | null
  onSave: (title: string, content: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(memory?.title ?? '')
  const [content, setContent] = useState(memory?.content ?? '')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give this memory a title before saving.')
      return
    }
    onSave(title.trim(), content.trim())
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="memory-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="editor-heading">
          <div>
            <span className="eyebrow">{memory ? 'A MOMENT TO KEEP' : 'MAKE A LITTLE SPACE'}</span>
            <h2 id="editor-title">{memory ? 'Edit memory' : 'A new memory'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close editor" onClick={onClose}><Icon name="close" /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this moment a name" required />
          </label>
          <label className="field">
            <span>Your memory <small>· take all the space you need</small></span>
            <textarea rows={8} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What would you like to remember?" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="editor-actions">
            {memory && <button className="button button-quiet button-delete" type="button" onClick={onDelete}><Icon name="trash" size={16} /> Delete</button>}
            <div className="editor-actions-right">
              <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
              <button className="button button-primary" type="submit">Save memory <Icon name="arrow" size={16} /></button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

function Dashboard({ session, onSignOut }: { session: AuthSession; onSignOut: () => void }) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [query, setQuery] = useState('')
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const visibleMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return memories
      .filter((memory) => `${memory.title} ${memory.content}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [memories, query])

  const firstName = session.username.trim().split(/\s+/)[0] || 'friend'

  function saveMemory(title: string, content: string) {
    if (editingMemory) {
      setMemories((current) => current.map((memory) => memory.id === editingMemory.id
        ? { ...memory, title, content, updatedAt: new Date().toISOString() }
        : memory))
      setEditingMemory(null)
    } else {
      setMemories((current) => [{
        id: crypto.randomUUID(),
        title,
        content,
        updatedAt: new Date().toISOString(),
      }, ...current])
      setIsCreating(false)
    }
  }

  function deleteMemory() {
    if (!editingMemory) return
    if (!window.confirm(`Delete “${editingMemory.title}”?`)) return
    setMemories((current) => current.filter((memory) => memory.id !== editingMemory.id))
    setEditingMemory(null)
  }

  return (
    <main className="journal-app">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">YOUR SPACE</div>
        <button className="sidebar-link active" type="button"><Icon name="book" size={18} /> My journal <span className="sidebar-count">{memories.length}</span></button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon"><Icon name="sparkle" size={17} /></span>
            <p>Little moments make a life. Keep the ones that feel like yours.</p>
          </div>
          <button className="profile-button" type="button" onClick={onSignOut} title="Sign out">
            <span className="avatar">{firstName.charAt(0).toLocaleUpperCase()}</span>
            <span className="profile-copy"><strong>{session.username}</strong><small>Sign out</small></span>
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </aside>

      <section className="journal-main">
        <header className="journal-topbar">
          <div className="breadcrumbs"><span>My journal</span><span className="breadcrumb-divider">/</span><span>All memories</span></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Icon name="search" size={18} />
              <input aria-label="Search memories" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a memory..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}
            </label>
            <button type="button" className="avatar topbar-avatar" aria-label={`Signed in as ${session.username}`} title={session.email}>{firstName.charAt(0).toLocaleUpperCase()}</button>
          </div>
        </header>

        <div className="journal-content">
          <div className="welcome-row">
            <div>
              <span className="eyebrow">YOUR PERSONAL JOURNAL</span>
              <h1>A lovely day to remember, {firstName}.</h1>
              <p className="welcome-subtitle">A collection of little things that mean a lot.</p>
            </div>
            <button type="button" className="button button-primary add-memory-button" onClick={() => setIsCreating(true)}><Icon name="plus" size={18} /> New memory</button>
          </div>

          <div className="demo-notice"><Icon name="sparkle" size={16} /><span><strong>Preview mode</strong> — these sample memories are saved only for this visit. Journal saving will be available when the memory API is ready.</span></div>

          <div className="section-heading">
            <div>
              <h2>Your memories <span>{memories.length}</span></h2>
              <p>Every little thing worth keeping.</p>
            </div>
            <span className="sort-label">MOST RECENT</span>
          </div>

          {visibleMemories.length > 0 ? (
            <div className="memory-grid">
              {visibleMemories.map((memory, index) => (
                <article className={`memory-card memory-card-${index % 3}`} key={memory.id}>
                  <div className="memory-card-top">
                    <span className="memory-decoration" aria-hidden="true"><Icon name={index % 2 === 0 ? 'sparkle' : 'book'} size={18} /></span>
                    <time dateTime={memory.updatedAt}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(memory.updatedAt))}</time>
                  </div>
                  <button className="memory-card-content" type="button" onClick={() => setEditingMemory(memory)} aria-label={`Edit ${memory.title}`}>
                    <h3>{memory.title}</h3>
                    <p>{memory.content || 'A quiet little moment, saved just as it was.'}</p>
                  </button>
                  <div className="memory-card-footer">
                    <span>IN YOUR JOURNAL</span>
                    <button className="card-edit" type="button" onClick={() => setEditingMemory(memory)} aria-label={`Edit ${memory.title}`}><Icon name="edit" size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="search" size={24} /></span>
              <h3>{query ? 'No memories found just yet.' : 'A fresh page, all yours.'}</h3>
              <p>{query ? 'Try another word or clear your search.' : 'Save a thought, a moment, or anything you want to come back to.'}</p>
              {query
                ? <button type="button" className="button button-quiet" onClick={() => setQuery('')}>Clear search</button>
                : <button type="button" className="button button-primary" onClick={() => setIsCreating(true)}><Icon name="plus" size={17} /> Write your first memory</button>}
            </div>
          )}

          <footer className="journal-footer"><span>Made for the moments in between.</span><span>YOUR SPACE, YOUR PACE <span className="footer-sparkle">✳</span></span></footer>
        </div>
      </section>

      {(isCreating || editingMemory) && (
        <MemoryEditor
          key={editingMemory?.id ?? 'new'}
          memory={editingMemory}
          onSave={saveMemory}
          onDelete={deleteMemory}
          onClose={() => { setIsCreating(false); setEditingMemory(null) }}
        />
      )}
    </main>
  )
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(getStoredSession)

  function handleAuthenticated(nextSession: AuthSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return session
    ? <Dashboard session={session} onSignOut={signOut} />
    : <AuthScreen onAuthenticated={handleAuthenticated} />
}

export default App
