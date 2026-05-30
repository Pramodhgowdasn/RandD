export default function TicketList({ title = 'Ticket Queue', tickets, selectedId, onSelect }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
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
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{ticket.status}</span>
                <span>{ticket.sourceType}</span>
                <span>{ticket.assignedTo || 'Unassigned'}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
