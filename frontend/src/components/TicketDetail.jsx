import { useMemo, useState, useEffect } from 'react'

const priorityColors = {
  Normal: 'bg-slate-100 text-slate-700',
  Important: 'bg-amber-100 text-amber-900',
  Critical: 'bg-rose-100 text-rose-900',
}

export default function TicketDetail({ ticket, supportUser, onAssign, onPriorityChange, onClose, onAddNote }) {
  const [noteText, setNoteText] = useState('')
  const [actionInProgress, setActionInProgress] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const isAssignedToCurrentUser = !ticket.assignedTo || ticket.assignedTo === supportUser

  const noteList = useMemo(() => ticket.notes || [], [ticket.notes])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleAssignClick = async () => {
    setActionInProgress('assign')
    try {
      await onAssign()
      setSuccessMessage('✓ Ticket claimed successfully!')
    } finally {
      setActionInProgress(null)
    }
  }

  const handlePriorityClick = async (priority) => {
    setActionInProgress(`priority-${priority}`)
    try {
      await onPriorityChange(priority)
      setSuccessMessage(`✓ Priority changed to ${priority}!`)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCloseClick = async () => {
    setActionInProgress('close')
    try {
      await onClose()
      setSuccessMessage('✓ Ticket closed successfully!')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleAddNoteClick = async () => {
    setActionInProgress('note')
    try {
      await onAddNote(noteText)
      setNoteText('')
      setSuccessMessage('✓ Note added successfully!')
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      {!isAssignedToCurrentUser ? (
        <div className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
          This ticket is assigned to <strong>{ticket.assignedTo}</strong>. Only the assigned support member may edit or add notes.
        </div>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Ticket {ticket.ticketNumber}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">{ticket.subject}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{ticket.originalDescription}</p>
        </div>
        <div className="space-y-3 text-right">
          <div className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${priorityColors[ticket.priority] || 'bg-slate-100 text-slate-700'}`}>
            {ticket.priority}
          </div>
          <p className="text-sm text-slate-500">Received: {new Date(ticket.receivedAt).toLocaleString()}</p>
          {ticket.closedAt ? <p className="text-sm text-slate-500">Closed: {new Date(ticket.closedAt).toLocaleString()}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">Details</p>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Source</dt>
                <dd>{ticket.sourceType}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Owner</dt>
                <dd>{ticket.assignedTo || 'Unassigned'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Department</dt>
                <dd>{ticket.department || 'Not set'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Category</dt>
                <dd>{ticket.category || '-'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Component</dt>
                <dd>{ticket.componentNumber || 'Not set'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Resolution Summary</p>
            <p className="mt-3 min-h-[120px] whitespace-pre-line text-sm leading-6 text-slate-700">
              {ticket.resolutionSummary || 'No summary yet. Close the ticket to capture the final decision.'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Conversation / Notes</p>
            <div className="mt-3 space-y-3">
              {noteList.length === 0 ? (
                <p className="text-sm text-slate-500">No notes yet. Use the note composer to capture updates.</p>
              ) : (
                noteList.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{note.author || 'Unknown'}</p>
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{note.body}</p>
                    <p className="mt-2 text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-3">
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={4}
                disabled={!isAssignedToCurrentUser}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder={isAssignedToCurrentUser ? 'Add a new note for this ticket' : 'This ticket is assigned to another support member'}
              />
              <button
                onClick={handleAddNoteClick}
                disabled={!isAssignedToCurrentUser || !noteText.trim()}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  !isAssignedToCurrentUser || !noteText.trim()
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Actions</p>
            <div className="mt-4 space-y-3">
              <button
                onClick={handleAssignClick}
                disabled={ticket.assignedTo && ticket.assignedTo !== supportUser}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${ticket.assignedTo ? 'bg-emerald-100 text-emerald-900 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
              >
                {ticket.assignedTo ? `Assigned to ${ticket.assignedTo}` : 'Claim / Assign to Me'}
              </button>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Set priority</p>
                <div className="grid gap-2">
                  {['Normal', 'Important', 'Critical'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handlePriorityClick(priority)}
                      disabled={!isAssignedToCurrentUser}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        ticket.priority === priority
                          ? 'bg-slate-900 text-white'
                          : !isAssignedToCurrentUser
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCloseClick}
                disabled={!isAssignedToCurrentUser}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  !isAssignedToCurrentUser
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                Close Ticket
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">Lookup details</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">Sender</p>
                <p>{ticket.senderName || 'Unknown'} • {ticket.senderEmail || 'No email'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Conversation ID</p>
                <p>{ticket.conversationId || 'None'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Attachments</p>
                <p>{ticket.attachments || 'None'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
