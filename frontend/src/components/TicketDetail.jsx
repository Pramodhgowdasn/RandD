import { useMemo, useState } from 'react'

const priorityColors = {
  Normal: 'bg-slate-100 text-slate-700',
  Important: 'bg-amber-100 text-amber-900',
  Critical: 'bg-rose-100 text-rose-900',
}

export default function TicketDetail({ ticket, onAssign, onPriorityChange, onClose, onAddNote }) {
  const [noteText, setNoteText] = useState('')

  const noteList = useMemo(() => ticket.notes || [], [ticket.notes])

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ticket {ticket.ticketNumber}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{ticket.subject}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{ticket.originalDescription}</p>
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
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Details</p>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="Add a new note for this ticket"
              />
              <button
                onClick={() => {
                  onAddNote(noteText)
                  setNoteText('')
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
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
                onClick={onAssign}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Claim / Assign to Me
              </button>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Set priority</p>
                <div className="grid gap-2">
                  {['Normal', 'Important', 'Critical'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => onPriorityChange(priority)}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        ticket.priority === priority
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
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
