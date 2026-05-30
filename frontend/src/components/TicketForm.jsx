import { useState } from 'react'

const CATEGORY_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const INTERNAL_DOMAIN = '@company.com'

export default function TicketForm({ onCreate }) {
  const [senderEmail, setSenderEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [category, setCategory] = useState('A')
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const validateEmail = (email) => {
    return email.toLowerCase().endsWith(INTERNAL_DOMAIN)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!senderEmail || !validateEmail(senderEmail)) {
      setError(`Sender email must end with ${INTERNAL_DOMAIN}`)
      return
    }
    if (!department.trim()) {
      setError('Department is required.')
      return
    }
    if (!query.trim()) {
      setError('Query text is required.')
      return
    }

    const payload = {
      senderName: department,
      senderEmail,
      sourceType: 'Internal',
      subject: `Query from ${department}`,
      originalDescription: query,
      category,
      department,
      status: 'Unassigned',
      priority: 'Normal',
    }

    setIsSaving(true)
    const result = await onCreate(payload)
    setIsSaving(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setSenderEmail('')
    setDepartment('')
    setCategory('A')
    setQuery('')
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">New Internal Query</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">A-J</span>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="user@company.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Department</label>
          <input
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="e.g. Manufacturing, Quality, Purchasing"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Query</label>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            placeholder="Type your technical query here..."
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Submitting...' : 'Submit Query'}
        </button>
      </form>
    </div>
  )
}
