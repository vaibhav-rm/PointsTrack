'use client'

import { motion } from 'framer-motion'
import { Search, Mail, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

interface Summary {
  total: number
  checkedIn: number
  pending: number
  rejected: number
  waitlisted: number
}

export default function AttendeesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [attendees, setAttendees] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Debounce search so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  const fetchAttendees = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      const { data, total } = await api.getPage<any[]>(`/attendees?${params}`)
      // Server already sorts by check-in time descending.
      setAttendees(data)
      setTotal(total ?? data.length)
    } catch (error) {
      console.error("Error fetching attendees:", error)
      toast.error("Failed to load attendees list")
    } finally {
      setLoading(false)
    }
  }, [user, page, debouncedSearch, statusFilter])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  // Summary counts come from a GROUP BY query — no row downloads. Refreshed on
  // mount and after each moderation action (NOT on every keystroke/render).
  const [summaryTick, setSummaryTick] = useState(0)
  useEffect(() => {
    if (!user) return
    api.get<Summary>('/attendees/summary')
      .then(setSummary)
      .catch((e) => console.error('Error fetching summary:', e))
  }, [user, summaryTick])

  const handleStatusUpdate = async (attendeeId: string, newStatus: string, newEngagement: string) => {
    setProcessingId(attendeeId);
    try {
      // The API records the status change and, on approval, writes the points
      // ledger row and sends the student push notification server-side.
      await api.patch(`/attendees/${attendeeId}`, {
        status: newStatus,
        engagement: newEngagement,
      });

      // Optimistic update
      setAttendees(prev => prev.map(a =>
        a.id === attendeeId ? { ...a, status: newStatus, engagement: newEngagement, checkInTimestamp: newStatus === 'checked-in' ? new Date().toISOString() : a.checkInTimestamp } : a
      ));
      setSummaryTick((t) => t + 1);
      toast.success(newStatus === 'checked-in' ? "Points allotted successfully" : "Registration rejected");
    } catch (error) {
      console.error("Error updating attendee status:", error);
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Attendees</h1>
        <p className="text-slate-300">Manage and track all event attendees</p>
      </motion.div>

      {/* Search + status filter (server-side) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="checked-in">Checked in</option>
          <option value="rejected">Rejected</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
      </motion.div>

      {/* Attendees Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Event</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Check-in</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Engagement</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : attendees.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No attendees match your filters.</td></tr>
              ) : attendees.map((attendee) => (
                <tr
                  key={attendee.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{attendee.name}</p>
                      <p className="text-sm text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {attendee.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{attendee.eventTitle}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4" />
                      {attendee.checkInTimestamp ? new Date(attendee.checkInTimestamp).toLocaleString() : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      attendee.engagement === 'High'
                        ? 'bg-green-500/20 text-green-400'
                        : attendee.engagement === 'Medium'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}>
                      {attendee.engagement}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {attendee.status === 'checked-in' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Approved / {attendee.pointsAwarded ?? 10} Pts</span>
                        </>
                      ) : attendee.status === 'rejected' ? (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-500 font-medium">Rejected</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStatusUpdate(attendee.id, 'checked-in', 'High')}
                            disabled={processingId === attendee.id}
                            className={`px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-all ${processingId === attendee.id ? 'opacity-50' : ''}`}
                          >
                            Allot Points
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(attendee.id, 'rejected', 'Low')}
                            disabled={processingId === attendee.id}
                            className={`px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-all ${processingId === attendee.id ? 'opacity-50' : ''}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <p className="text-sm text-slate-400">
            {total === 0 ? 'No results' : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700/50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Summary (server-aggregated, not derived from the page) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Total Attendees</p>
          <p className="text-3xl font-bold text-white">{summary?.total ?? '—'}</p>
        </div>
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Checked In</p>
          <p className="text-3xl font-bold text-green-400">{summary?.checkedIn ?? '—'}</p>
        </div>
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-400">{summary?.pending ?? '—'}</p>
        </div>
      </motion.div>
    </div>
  )
}
