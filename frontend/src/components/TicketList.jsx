export default function TicketList({ title = 'Ticket Queue', tickets, selectedId, onSelect }) {
  return (
    <div className="rounded-[2rem] bg-white p-4 shadow-lg shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Click a ticket to view the full ticket details and actions.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{tickets.length}</span>
      </div>
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets match the current filter.</p>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                selectedId === ticket.id
                  ? 'border-slate-900 bg-slate-100'
                  : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject || 'Untitled ticket'}</p>
                  <p className="mt-1 text-xs text-slate-500">{ticket.ticketNumber} • {ticket.department || 'No department'} • {ticket.category || 'No category'}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">{ticket.priority}</span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
                <span className="rounded-full bg-slate-100 px-2 py-1">{ticket.status}</span>
                <span className={`rounded-full px-2 py-1 ${ticket.assignedTo ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>
                  {ticket.assignedTo ? `Claimed by ${ticket.assignedTo}` : 'Unassigned'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
