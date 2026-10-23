import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { authenticate, ApiError, createMemory, deleteMemory, getMemories, getTags, updateMemory, type AuthField, type AuthFieldErrors, type AuthMode, type AuthSession, type Memory, type MemoryInput, type MemoryTag } from './api'
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
      if (caughtError instanceof ApiError) {
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

function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function MemoryEditor({
  memory,
  onSave,
  onDelete,
  onClose,
}: {
  memory: Memory | null
  onSave: (input: MemoryInput) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(memory?.title ?? '')
  const [content, setContent] = useState(memory?.content ?? '')
  const [memoryDate, setMemoryDate] = useState(memory?.memoryDate ?? getLocalDate())
  const [tags, setTags] = useState(memory?.tags.join(', ') ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tagNames = [...new Set(tags.split(',').map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))]
    if (tagNames.length > 10) {
      setError('A memory can have up to 10 tags.')
      return
    }
    if (tagNames.some((tag) => tag.length > 30)) {
      setError('Each tag must be 30 characters or fewer.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await onSave({ title: title.trim(), content, memoryDate, tags: tagNames })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'We couldn’t save this memory. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeMemory() {
    setError('')
    setIsDeleting(true)
    try {
      await onDelete()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'We couldn’t delete this memory. Please try again.')
    } finally {
      setIsDeleting(false)
    }
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
            <input autoFocus maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this moment a name" required />
          </label>
          <label className="field">
            <span>When did it happen?</span>
            <input type="date" value={memoryDate} onChange={(event) => setMemoryDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>Your memory <small>· up to 10,000 characters</small></span>
            <textarea rows={8} maxLength={10000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What would you like to remember?" />
          </label>
          <label className="field">
            <span>Tags <small>· separate with commas, up to 10</small></span>
            <input maxLength={320} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="family, travel, summer" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="editor-actions">
            {memory && <button className="button button-quiet button-delete" type="button" onClick={removeMemory} disabled={isSaving || isDeleting}><Icon name="trash" size={16} /> {isDeleting ? 'Deleting…' : 'Delete'}</button>}
            <div className="editor-actions-right">
              <button className="button button-quiet" type="button" onClick={onClose} disabled={isSaving || isDeleting}>Cancel</button>
              <button className="button button-primary" type="submit" disabled={isSaving || isDeleting}>{isSaving ? 'Saving…' : 'Save memory'} {!isSaving && <Icon name="arrow" size={16} />}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

function Dashboard({ session, onSignOut }: { session: AuthSession; onSignOut: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [tags, setTags] = useState<MemoryTag[]>([])
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [sort, setSort] = useState('memoryDate,desc')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [loadFailure, setLoadFailure] = useState<{ key: string; message: string } | null>(null)
  const [tagError, setTagError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const firstName = session.username.trim().split(/\s+/)[0] || 'friend'
  const requestKey = JSON.stringify([session.token, query, fromDate, toDate, selectedTag, sort, page, refreshKey])
  const isLoading = loadedRequestKey !== requestKey
  const error = loadFailure?.key === requestKey ? loadFailure.message : ''

  useEffect(() => {
    const controller = new AbortController()
    void getMemories(session.token, {
      q: query.trim() || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      tag: selectedTag || undefined,
      page,
      size: 12,
      sort: [sort, ...(sort === 'memoryDate,desc' ? ['createdAt,desc'] : [])],
      signal: controller.signal,
    }).then((result) => {
      if (result.content.length === 0 && page > 0 && page >= result.totalPages) {
        setPage(Math.max(0, result.totalPages - 1))
        return
      }
      setMemories(result.content)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
      setLoadFailure(null)
      setLoadedRequestKey(requestKey)
    }).catch((caughtError: unknown) => {
      if (controller.signal.aborted) return
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        onSignOut()
        return
      }
      setLoadFailure({
        key: requestKey,
        message: caughtError instanceof Error ? caughtError.message : 'We couldn’t load your memories. Please try again.',
      })
      setLoadedRequestKey(requestKey)
    })
    return () => controller.abort()
  }, [session.token, query, fromDate, toDate, selectedTag, sort, page, refreshKey, requestKey, onSignOut])

  useEffect(() => {
    const controller = new AbortController()
    void getTags(session.token, controller.signal).then((result) => {
      setTags(result)
      setTagError('')
    }).catch((caughtError: unknown) => {
      if (controller.signal.aborted) return
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        onSignOut()
        return
      }
      setTagError(caughtError instanceof Error ? caughtError.message : 'We couldn’t load your tags. Please try again.')
    })
    return () => controller.abort()
  }, [session.token, refreshKey, onSignOut])

  function handleSave(input: MemoryInput) {
    const operation = editingMemory
      ? updateMemory(session.token, editingMemory.id, input)
      : createMemory(session.token, input)
    return operation.then(() => {
      setEditingMemory(null)
      setIsCreating(false)
      if (!editingMemory) setPage(0)
      setRefreshKey((current) => current + 1)
    }).catch((caughtError: unknown) => {
      if (caughtError instanceof ApiError && caughtError.status === 401) onSignOut()
      throw caughtError
    })
  }

  async function handleDelete(): Promise<void> {
    if (!editingMemory) return
    if (!window.confirm(`Delete “${editingMemory.title}”?`)) return
    try {
      await deleteMemory(session.token, editingMemory.id)
      setEditingMemory(null)
      setRefreshKey((current) => current + 1)
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) onSignOut()
      throw caughtError
    }
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
              <input aria-label="Search memories" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Find a memory..." />
              {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setPage(0) }}><Icon name="close" size={15} /></button>}
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
            <button type="button" className="button button-primary add-memory-button" onClick={() => setIsCreating(true)} disabled={isLoading}><Icon name="plus" size={18} /> New memory</button>
          </div>

          {(error || tagError) && (
            <div className="api-notice api-notice-error" role="alert">
              <Icon name="close" size={16} />
              <span>{error || tagError}</span>
              <button className="button button-quiet" type="button" onClick={() => setRefreshKey((current) => current + 1)}>Try again</button>
            </div>
          )}

          <div className="memory-filters" aria-label="Filter memories">
            <label className="field">
              <span>From</span>
              <input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0) }} />
            </label>
            <label className="field">
              <span>To</span>
              <input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0) }} />
            </label>
            <label className="field">
              <span>Tag</span>
              <select aria-label="Filter by tag" value={selectedTag} onChange={(event) => { setSelectedTag(event.target.value); setPage(0) }}>
                <option value="">All tags</option>
                {tags.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.memoryCount})</option>)}
              </select>
            </label>
            <label className="field">
              <span>Sort by</span>
              <select aria-label="Sort memories" value={sort} onChange={(event) => { setSort(event.target.value); setPage(0) }}>
                <option value="memoryDate,desc">Newest memory date</option>
                <option value="memoryDate,asc">Oldest memory date</option>
                <option value="createdAt,desc">Recently saved</option>
                <option value="updatedAt,desc">Recently edited</option>
              </select>
            </label>
          </div>

          <div className="section-heading">
            <div>
              <h2>Your memories <span>{totalElements}</span></h2>
              <p>Every little thing worth keeping.</p>
            </div>
            <span className="sort-label">PRIVATE TO YOU</span>
          </div>

          {isLoading ? (
            <div className="empty-state" role="status"><h3>Opening your journal…</h3><p>Your memories are on their way.</p></div>
          ) : error ? (
            <div className="empty-state"><h3>Your journal couldn’t load.</h3><p>Please check your connection and try again.</p><button type="button" className="button button-quiet" onClick={() => setRefreshKey((current) => current + 1)}>Try again</button></div>
          ) : memories.length > 0 ? (
            <div className="memory-grid">
              {memories.map((memory, index) => (
                <article className={`memory-card memory-card-${index % 3}`} key={memory.id}>
                  <div className="memory-card-top">
                    <span className="memory-decoration" aria-hidden="true"><Icon name={index % 2 === 0 ? 'sparkle' : 'book'} size={18} /></span>
                    <time dateTime={memory.memoryDate}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${memory.memoryDate}T00:00:00`))}</time>
                  </div>
                  <button className="memory-card-content" type="button" onClick={() => setEditingMemory(memory)} aria-label={`Edit ${memory.title}`}>
                    <h3>{memory.title}</h3>
                    <p>{memory.content || 'A quiet little moment, saved just as it was.'}</p>
                  </button>
                  {memory.tags.length > 0 && <div className="memory-tags">{memory.tags.map((name) => <span key={name}>{name}</span>)}</div>}
                  <div className="memory-card-footer">
                    <span>UPDATED {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(memory.updatedAt))}</span>
                    <button className="card-edit" type="button" onClick={() => setEditingMemory(memory)} aria-label={`Edit ${memory.title}`}><Icon name="edit" size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="search" size={24} /></span>
              <h3>{query || fromDate || toDate || selectedTag ? 'No memories match these filters.' : 'A fresh page, all yours.'}</h3>
              <p>{query || fromDate || toDate || selectedTag ? 'Try changing or clearing your filters.' : 'Save a thought, a moment, or anything you want to come back to.'}</p>
              {query || fromDate || toDate || selectedTag
                ? <button type="button" className="button button-quiet" onClick={() => { setQuery(''); setFromDate(''); setToDate(''); setSelectedTag(''); setPage(0) }}>Clear filters</button>
                : <button type="button" className="button button-primary" onClick={() => setIsCreating(true)}><Icon name="plus" size={17} /> Write your first memory</button>}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Memory pages">
              <button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || isLoading}>Previous</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page + 1 >= totalPages || isLoading}>Next</button>
            </nav>
          )}

          <footer className="journal-footer"><span>Made for the moments in between.</span><span>YOUR SPACE, YOUR PACE <span className="footer-sparkle">✳</span></span></footer>
        </div>
      </section>

      {(isCreating || editingMemory) && (
        <MemoryEditor
          key={editingMemory?.id ?? 'new'}
          memory={editingMemory}
          onSave={handleSave}
          onDelete={handleDelete}
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
