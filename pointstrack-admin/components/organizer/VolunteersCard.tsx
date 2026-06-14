'use client'

import { useState, useEffect } from 'react'
import { ScanLine, UserPlus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { listVolunteers, addVolunteer, removeVolunteer, type Volunteer } from '@/lib/api'

/**
 * Manage the students authorised to scan/check-in for this event. The event
 * owner can always scan; these volunteers are the extra helpers. Volunteers are
 * ordinary students, added by USN or email.
 */
export default function VolunteersCard({ eventId }: { eventId: string }) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    listVolunteers(eventId)
      .then(setVolunteers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  const add = async () => {
    const value = input.trim()
    if (!value) return
    setAdding(true)
    try {
      const by = value.includes('@') ? { email: value } : { usn: value }
      const v = await addVolunteer(eventId, by)
      setVolunteers((prev) => (prev.some((p) => p.studentId === v.studentId) ? prev : [v, ...prev]))
      setInput('')
      toast.success(`${v.name} can now scan this event`)
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that student')
    } finally {
      setAdding(false)
    }
  }

  const remove = async (studentId: string, name: string) => {
    try {
      await removeVolunteer(eventId, studentId)
      setVolunteers((prev) => prev.filter((v) => v.studentId !== studentId))
      toast.success(`Removed ${name}`)
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove volunteer')
    }
  }

  return (
    <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <ScanLine className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Volunteer scanners</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Add students who can check attendees in from the app for this event. You (the owner) can always scan.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Student USN or email"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={add}
          disabled={adding || !input.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50 transition-all"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading volunteers…</p>
      ) : volunteers.length === 0 ? (
        <p className="text-sm text-slate-500">No volunteers yet. Only you can scan this event.</p>
      ) : (
        <ul className="space-y-2">
          {volunteers.map((v) => (
            <li key={v.studentId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{v.name}</p>
                <p className="text-xs text-slate-400 truncate">{v.usn} · {v.email}</p>
              </div>
              <button
                onClick={() => remove(v.studentId, v.name)}
                aria-label={`Remove ${v.name}`}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
