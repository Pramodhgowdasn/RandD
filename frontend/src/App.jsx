import { useEffect, useMemo, useState } from 'react'
import TicketList from './components/TicketList'
import TicketDetail from './components/TicketDetail'
import TicketForm from './components/TicketForm'

const API_BASE = 'http://localhost:5000/api'
const DEFAULT_SUPPORT_CODE = import.meta.env.VITE_SUPPORT_ACCESS_CODE || 'techsupport'

function App() {
  const [mode, setMode] = useState('landing')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportCode, setSupportCode] = useState('')
  const [supportCategories, setSupportCategories] = useState([])
  const [supportError, setSupportError] = useState(null)
  const [supportUser, setSupportUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [search, setSearch] = useState('')
  const [closedSearch, setClosedSearch] = useState('')
  const [activeTicketTab, setActiveTicketTab] = useState('open')
  const [viewMode, setViewMode] = useState('list')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (mode === 'support' && supportUser) {
      fetchTickets()
    }
  }, [mode, supportUser])

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const url = `${API_BASE}/tickets?q=${encodeURIComponent(search)}`
      const response = await fetch(url)
      const data = await response.json()
      setTickets(data)
      if (selectedTicket) {
        const refreshed = data.find((ticket) => ticket.id === selectedTicket.id)
        if (refreshed) setSelectedTicket(refreshed)
      }
    } catch (err) {
      setError('Unable to load tickets. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== 'Closed'), [tickets])
  const closedTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'Closed'), [tickets])

  const filteredOpenTickets = useMemo(() => {
    let result = openTickets
    if (statusFilter !== 'All') {
      result = result.filter((ticket) => ticket.status === statusFilter)
    }
    if (categoryFilter !== 'All') {
      result = result.filter((ticket) => ticket.category === categoryFilter)
    }
    return result
  }, [openTickets, statusFilter, categoryFilter])

  const eligibleOpenTickets = useMemo(() => {
    if (!supportUser) return filteredOpenTickets
    return filteredOpenTickets.filter((ticket) => {
      if (ticket.assignedTo === supportUser) return true
      if (ticket.assignedTo) return false
      if (!ticket.category) return true
      return supportCategories.includes(ticket.category)
    })
  }, [filteredOpenTickets, supportCategories, supportUser])

  const filteredClosedTickets = useMemo(() => {
    const query = closedSearch.trim().toLowerCase()
    if (!query) return closedTickets
    return closedTickets.filter((ticket) => {
      return [
        ticket.subject,
        ticket.originalDescription,
        ticket.resolutionSummary,
        ticket.ticketNumber,
        ticket.department,
        ticket.category,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [closedTickets, closedSearch])

  function handleSelect(ticket) {
    setSelectedTicket(ticket)
    setViewMode('detail')
  }

  async function updateTicket(payload) {
    if (!selectedTicket?.id) return
    try {
      const response = await fetch(`${API_BASE}/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, actor: supportUser, actorCategories: supportCategories }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to update ticket.')
        return
      }
      setSelectedTicket(result)
      fetchTickets()
    } catch {
      setError('Unable to update ticket.')
    }
  }

  async function handleAssignToMe() {
    if (selectedTicket?.assignedTo && selectedTicket.assignedTo !== supportUser) {
      setError('Only the current assigned user can update this ticket.')
      return
    }
    if (selectedTicket?.category && !supportCategories.includes(selectedTicket.category)) {
      setError(`You are not assigned to category ${selectedTicket.category}.`)
      return
    }
    await updateTicket({ status: 'In Progress', assignedTo: supportUser })
  }

  async function handlePriorityChange(priority) {
    if (selectedTicket?.assignedTo && selectedTicket.assignedTo !== supportUser) {
      setError('Only the assigned user can change the priority of this ticket.')
      return
    }
    await updateTicket({ priority })
  }

  async function handleClose() {
    if (selectedTicket?.assignedTo && selectedTicket.assignedTo !== supportUser) {
      setError('Only the assigned user can close this ticket.')
      return
    }
    const resolutionSummary = window.prompt('Enter a concise resolution summary (2-3 sentences):')
    if (!resolutionSummary) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionSummary, author: supportUser }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to close ticket.')
        return
      }
      setSelectedTicket(result)
      fetchTickets()
    } catch {
      setError('Unable to close ticket.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNote(body) {
    if (!body) return
    if (selectedTicket?.assignedTo && selectedTicket.assignedTo !== supportUser) {
      setError('Only the assigned user can add notes to this ticket.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, author: supportUser }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to add note.')
        return
      }
      setSelectedTicket(result)
      fetchTickets()
    } catch {
      setError('Unable to add note.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTicket(payload) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (response.ok) {
        return result
      }
      setError(result.error || 'Unable to create ticket.')
      return result
    } catch (err) {
      setError('Unable to create ticket.')
      return { error: 'Unable to create ticket.' }
    } finally {
      setLoading(false)
    }
  }

  function toggleSupportCategory(category) {
    setSupportCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    )
  }

  function handleSupportLogin(event) {
    event.preventDefault()
    setSupportError(null)
    if (!supportEmail || !supportEmail.includes('@')) {
      setSupportError('Enter a valid support email.')
      return
    }
    if (supportCategories.length === 0) {
      setSupportError('Select at least one category you support.')
      return
    }
    if (supportCode !== DEFAULT_SUPPORT_CODE) {
      setSupportError('Invalid support access code.')
      return
    }
    setSupportUser(supportEmail)
    setMode('support')
  }

  function renderLanding() {
    return (
      <div className="rounded-[2rem] bg-white/95 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm ring-1 ring-slate-200">
        <h2 className="text-3xl font-semibold text-slate-900">Choose your entry point</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Internal employees submit a new query here. Technical support staff access the answer portal separately.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <button
            onClick={() => setMode('submit')}
            className="group rounded-[2rem] bg-slate-900 px-6 py-7 text-left text-white shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-1 hover:bg-slate-800"
          >
            <p className="text-2xl font-semibold">Submit Query</p>
            <p className="mt-3 text-sm text-slate-300">Internal employees can open a new support ticket.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200 transition group-hover:bg-white/15">
              Fill form & submit
            </div>
          </button>
          <button
            onClick={() => setMode('support-login')}
            className="group rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-7 text-left shadow-sm transition duration-300 hover:border-slate-300 hover:shadow-md"
          >
            <p className="text-2xl font-semibold text-slate-900">Technical Support</p>
            <p className="mt-3 text-sm text-slate-600">Authorized support team members can claim and answer tickets.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-700 transition group-hover:bg-slate-200">
              Login to your queue
            </div>
          </button>
        </div>
      </div>
    )
  }

  function renderSubmitView() {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Submit a Query</h2>
              <p className="mt-2 text-sm text-slate-600">Only internal employees may submit questions here. Choose the right department and category.</p>
            </div>
            <button
              onClick={() => setMode('landing')}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to entry
            </button>
          </div>
        </div>
        <TicketForm onCreate={handleCreateTicket} />
      </div>
    )
  }

  function renderSupportLogin() {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Technical Support Access</h2>
          <p className="mt-2 text-sm text-slate-600">Only authorized technical support staff may enter the answer portal.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSupportLogin}>
          <div>
            <label className="text-sm font-medium text-slate-700">Support Email</label>
            <input
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="support@company.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Access Code</label>
            <input
              value={supportCode}
              onChange={(event) => setSupportCode(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Enter support access code"
              type="password"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Support categories</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleSupportCategory(category)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    supportCategories.includes(category)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          {supportError ? <p className="text-sm text-rose-600">{supportError}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Enter support portal
            </button>
            <button
              type="button"
              onClick={() => setMode('landing')}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to entry
            </button>
          </div>
        </form>
      </div>
    )
  }

  function renderSupportPortal() {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-900/20 ring-1 ring-slate-200/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Technical Support Portal</p>
              <h2 className="mt-3 text-3xl font-semibold">Welcome, {supportUser}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Authorized staff can claim tickets, change priority, add notes, and close issues. Use category filters to focus on your area instantly.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setMode('landing')}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Sign out
              </button>
              <button
                onClick={fetchTickets}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Refresh tickets
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'detail' && selectedTicket ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[1.75rem] bg-white p-4 shadow-lg shadow-slate-200/70 ring-1 ring-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-500">Viewing ticket details</p>
                <h3 className="text-xl font-semibold text-slate-900">{selectedTicket.subject}</h3>
                <p className="mt-1 text-sm text-slate-600">Claimed by {selectedTicket.assignedTo || 'unassigned'}</p>
              </div>
              <button
                onClick={() => setViewMode('list')}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to queue
              </button>
            </div>
            {error ? (
              <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm shadow-rose-100/80">{error}</div>
            ) : null}
            {loading ? (
              <div className="rounded-[1.75rem] bg-white p-6 shadow-lg shadow-slate-200/70">Loading ticket...</div>
            ) : (
              <TicketDetail
                ticket={selectedTicket}
                supportUser={supportUser}
                onAssign={handleAssignToMe}
                onPriorityChange={handlePriorityChange}
                onClose={handleClose}
                onAddNote={handleAddNote}
              />
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-4 shadow-lg shadow-slate-200/70 ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Support queue</h3>
                    <p className="mt-1 text-sm text-slate-600">Only support users can view and manage tickets here.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTicketTab('open')
                        setViewMode('list')
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTicketTab === 'open' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
                    >
                      Open tickets
                    </button>
                    <button
                      onClick={() => {
                        setActiveTicketTab('closed')
                        setViewMode('list')
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTicketTab === 'closed' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
                    >
                      Closed tickets
                    </button>
                  </div>
                </div>
                {activeTicketTab === 'open' ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[240px_1fr]">
                    <div className="grid gap-3">
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-500"
                      >
                        <option>All</option>
                        <option>Unassigned</option>
                        <option>In Progress</option>
                        <option>Waiting on Client</option>
                        <option>Redirected</option>
                      </select>
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-500"
                      >
                        <option>All</option>
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                        <option>D</option>
                        <option>E</option>
                        <option>F</option>
                        <option>G</option>
                        <option>H</option>
                        <option>I</option>
                        <option>J</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && fetchTickets()}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                        placeholder="Search open tickets"
                      />
                      <button
                        onClick={fetchTickets}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={closedSearch}
                      onChange={(event) => setClosedSearch(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && fetchTickets()}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                      placeholder="Search closed tickets"
                    />
                    <button
                      onClick={fetchTickets}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Search
                    </button>
                  </div>
                )}
              </div>
              <TicketList
                title={activeTicketTab === 'open' ? 'Open Ticket Queue' : 'Closed Tickets'}
                tickets={activeTicketTab === 'open' ? eligibleOpenTickets : filteredClosedTickets}
                selectedId={selectedTicket?.id}
                onSelect={handleSelect}
              />
            </div>

            <section className="space-y-4">
              {error ? (
                <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm shadow-rose-100/80">{error}</div>
              ) : null}
              {loading ? (
                <div className="rounded-[1.75rem] bg-white p-6 shadow-lg shadow-slate-200/70">Loading tickets...</div>
              ) : (
                <div className="rounded-3xl bg-white p-8 shadow-sm">
                  <p className="text-slate-600">Select a ticket from the queue to review, assign, and close it.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-100">
      <header className="border-b border-slate-900/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 shadow-2xl shadow-slate-950/20 text-white">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">R&D Support System</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === 'submit' ? 'Submit Query' : mode === 'support' ? 'Technical Support Portal' : 'R&D Support System'}</h1>
          </div>
          <div className="space-y-2 text-right text-sm text-slate-200 md:space-y-0 md:text-right">
            <p>Backend: <span className="text-emerald-300">localhost:5000</span></p>
            {supportUser ? <p>Support: <strong className="text-white">{supportUser}</strong></p> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {mode === 'landing' && renderLanding()}
        {mode === 'submit' && renderSubmitView()}
        {mode === 'support-login' && renderSupportLogin()}
        {mode === 'support' && renderSupportPortal()}
      </main>
    </div>
  )
}

export default App
