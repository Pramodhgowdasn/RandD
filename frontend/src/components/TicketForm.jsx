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
    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">New Internal Query</h2>
          <p className="mt-2 text-sm text-slate-500">Submit your question and assign it to a category for faster support routing.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Categories A–J</span>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            className="mt-2 w-full rounded-[1.5rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            placeholder="user@company.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Department</label>
          <input
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="mt-2 w-full rounded-[1.5rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            placeholder="e.g. Manufacturing, Quality, Purchasing"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-[1.5rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
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
