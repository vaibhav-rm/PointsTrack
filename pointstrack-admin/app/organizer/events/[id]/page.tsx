'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Award, Search,
  Mail, CheckCircle, XCircle, Edit2, Globe, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { api, newIdempotencyKey } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import VolunteersCard from '@/components/organizer/VolunteersCard'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

interface EventSummary {
  total: number
  checkedIn: number
  pending: number
  rejected: number
  waitlisted: number
  pointsAwarded: number
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [event, setEvent] = useState<any | null>(null)
  const [attendees, setAttendees] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [eventSummary, setEventSummary] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Selection is page-scoped: changing page or filter resets it so bulk
  // actions can't mix ids from different result sets.
  useEffect(() => {
    setSelected(new Set())
  }, [page, debouncedSearch])

  const loadAttendees = useCallback(async () => {
    if (!user || !id) return
    try {
      const params = new URLSearchParams({
        eventId: id as string,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const { data, total } = await api.getPage<any[]>(`/attendees?${params}`)
      setAttendees(data)
      setTotal(total ?? data.length)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load attendees')
    }
  }, [user, id, page, debouncedSearch])

  useEffect(() => {
    if (!user || !id) return
    const load = async () => {
      try {
        const [ev, summary] = await Promise.all([
          api.get<any>(`/events/${id}`),
          api.get<EventSummary>(`/attendees/summary?eventId=${id}`),
        ])
        setEvent(ev)
        setEventSummary(summary)
      } catch (error) {
        console.error(error)
        toast.error('Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, id])

  useEffect(() => {
    loadAttendees()
  }, [loadAttendees])

  const refreshSummary = useCallback(async () => {
    if (!user || !id) return
    try {
      setEventSummary(await api.get<EventSummary>(`/attendees/summary?eventId=${id}`))
    } catch (error) {
      console.error(error)
    }
  }, [user, id])

  // Reload the current page (a reject can promote a waitlisted student
  // server-side, which the optimistic row alone would never show).
  const reloadPage = useCallback(async () => {
    if (!user || !id) return
    try {
      const params = new URLSearchParams({
        eventId: id as string,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const { data, total } = await api.getPage<any[]>(`/attendees?${params}`)
      setAttendees(data)
      setTotal(total ?? data.length)
    } catch (error) {
      console.error(error)
    }
  }, [user, id, page, debouncedSearch])

  const handleStatusUpdate = async (attendeeId: string, newStatus: string, newEngagement: string) => {
    setProcessingId(attendeeId)
    try {
      await api.patch(`/attendees/${attendeeId}`, { status: newStatus, engagement: newEngagement })
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendeeId
            ? { ...a, status: newStatus, engagement: newEngagement, checkInTimestamp: newStatus === 'checked-in' ? new Date().toISOString() : a.checkInTimestamp }
            : a
        )
      )
      // No longer actionable — drop from selection so the next bulk can't
      // resubmit it.
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(attendeeId)
        return next
      })
      refreshSummary()
      // A rejection may promote a waitlisted student server-side: reload the
      // page so the roster reflects it.
      if (newStatus === 'rejected') reloadPage()
      toast.success(newStatus === 'checked-in' ? 'Points allotted successfully' : 'Registration rejected')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update status')
    } finally {
      setProcessingId(null)
    }
  }

  const handleBulk = async (newStatus: 'checked-in' | 'rejected') => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkProcessing(true)
    try {
      // The server caps batches at 500 ids — chunk larger selections so the
      // whole operation doesn't fail, and report the server's true counts.
      let updatedCount = 0
      let skippedCount = 0
      const processedIds: string[] = []
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500)
        const res = await api.patch<{ updated: number; skipped: number; attendees: any[] }>(
          '/attendees/bulk',
          { ids: chunk, status: newStatus, engagement: newStatus === 'checked-in' ? 'High' : 'Low' },
          // Fresh key per chunk: the server rejects a reused key with a
          // different payload, so chunks must not share one.
          { headers: { 'Idempotency-Key': newIdempotencyKey() } }
        )
        updatedCount += res.updated
        skippedCount += res.skipped
        processedIds.push(...res.attendees.map((a: any) => a.id))
      }
      const ts = new Date().toISOString()
      setAttendees((prev) =>
        prev.map((a) =>
          processedIds.includes(a.id)
            ? { ...a, status: newStatus, checkInTimestamp: newStatus === 'checked-in' ? ts : a.checkInTimestamp }
            : a
        )
      )
      // Processed rows are no longer actionable — drop them from selection so
      // the next bulk can't resubmit them.
      setSelected((prev) => {
        const next = new Set(prev)
        processedIds.forEach((id) => next.delete(id))
        return next
      })
      toast.success(
        `${updatedCount} attendee${updatedCount !== 1 ? 's' : ''} ${newStatus === 'checked-in' ? 'checked in' : 'rejected'}` +
        (skippedCount > 0 ? ` (${skippedCount} skipped)` : '')
      )
      refreshSummary()
    } catch (error) {
      console.error(error)
      toast.error('Bulk update failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exportCsv = async () => {
    // Export the full server-side result set (paged fetch), not just the
    // visible page, so large rosters still export completely.
    try {
      const all: any[] = []
      const LIMIT = 500
      for (let offset = 0; ; offset += LIMIT) {
        const params = new URLSearchParams({
          eventId: id as string,
          limit: String(LIMIT),
          offset: String(offset),
        })
        if (debouncedSearch) params.set('search', debouncedSearch)
        const { data } = await api.getPage<any[]>(`/attendees?${params}`)
        all.push(...data)
        if (data.length < LIMIT) break
      }
      const headers = ['Name', 'Email', 'Status', 'Engagement', 'Points', 'Check-in time']
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
      // Per-attendee snapshot: what was actually awarded, not live event.points.
      const rows = all.map((a) =>
        [a.name, a.email, a.status, a.engagement, a.status === 'checked-in' ? a.pointsAwarded ?? 0 : 0,
         a.checkInTimestamp ? new Date(a.checkInTimestamp).toLocaleString() : ''].map(esc).join(',')
      )
      const csv = [headers.map(esc).join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(event?.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendees.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast.error('CSV export failed')
    }
  }

  // Search is server-side now; the page holds the filtered result directly.
  const filtered = attendees

  // Pending + waitlisted attendees are the ones an organizer can still act on.
  const actionable = (a: any) => a.status === 'pending' || a.status === 'waitlisted'
  const actionableFiltered = filtered.filter(actionable)
  const allActionableSelected = actionableFiltered.length > 0 && actionableFiltered.every((a) => selected.has(a.id))
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allActionableSelected) actionableFiltered.forEach((a) => next.delete(a.id))
      else actionableFiltered.forEach((a) => next.add(a.id))
      return next
    })
  }

  const checkedIn = eventSummary?.checkedIn ?? attendees.filter((a) => a.status === 'checked-in').length
  const pending = eventSummary?.pending ?? attendees.filter((a) => a.status === 'pending').length
  const waitlisted = eventSummary?.waitlisted ?? attendees.filter((a) => a.status === 'waitlisted').length
  const registered = eventSummary?.total ?? total
  // Server-summed snapshot total — exact across pages even if event.points
  // changed after check-in.
  const pointsAwarded = eventSummary?.pointsAwarded ?? attendees
    .filter((a) => a.status === 'checked-in')
    .reduce((sum, a) => sum + (Number(a.pointsAwarded) || 0), 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-2">Event not found</h2>
        <Link href="/organizer/events" className="text-cyan-400 hover:underline">← Back to events</Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/organizer/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to events
      </Link>

      {/* Event header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-white">{event.title}</h1>
              {event.openToAll && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Globe className="w-3 h-3" /> Open to all
                </span>
              )}
            </div>
            {event.description && <p className="text-slate-300 mb-4 max-w-2xl">{event.description}</p>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Meta icon={Calendar} label={event.date?.split('T')[0]} />
              <Meta icon={Clock} label={event.date?.split('T')[1]?.substring(0, 5) || 'TBD'} />
              <Meta icon={MapPin} label={event.location || 'TBD'} />
              <Meta icon={Award} label={`${event.points} points`} />
            </div>
          </div>
          <Link
            href={`/organizer/events/edit/${event.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shrink-0"
          >
            <Edit2 className="w-4 h-4" /> Edit event
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Registered" value={registered} color="text-white" />
        <Stat label="Checked in" value={checkedIn} color="text-emerald-400" />
        <Stat label="Pending" value={pending} color="text-yellow-400" />
        <Stat label="Waitlisted" value={waitlisted} color="text-orange-400" />
        <Stat label="Points awarded" value={pointsAwarded} color="text-cyan-400" />
      </div>

      {/* Volunteer scanning */}
      <VolunteersCard eventId={id} />

      {/* Attendees */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Attendees</h2>
          </div>
          <button
            onClick={exportCsv}
            disabled={attendees.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-md bg-white/5 border border-slate-700 text-slate-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed w-fit"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <span className="text-sm text-cyan-300 font-medium">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulk('checked-in')}
                disabled={bulkProcessing}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              >
                Allot Points to Selected
              </button>
              <button
                onClick={() => handleBulk('rejected')}
                disabled={bulkProcessing}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              >
                Reject Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-white px-2">Clear</button>
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search this event's attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400">
              {attendees.length === 0 ? 'No students have registered for this event yet.' : 'No attendees match your search.'}
            </p>
          </div>
        ) : (
          <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-4 w-10">
                      {actionableFiltered.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allActionableSelected}
                          onChange={toggleSelectAll}
                          title="Select all actionable"
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/40 cursor-pointer"
                        />
                      )}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Check-in</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((attendee) => (
                    <tr key={attendee.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        {actionable(attendee) && (
                          <input
                            type="checkbox"
                            checked={selected.has(attendee.id)}
                            onChange={() => toggleSelected(attendee.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/40 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{attendee.name}</p>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {attendee.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-4 h-4" />
                          {attendee.checkInTimestamp ? new Date(attendee.checkInTimestamp).toLocaleString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {attendee.status === 'checked-in' ? (
                          <span className="inline-flex items-center gap-2 text-emerald-400 font-medium">
                            <CheckCircle className="w-5 h-5" /> Approved / {event.points} Pts
                          </span>
                        ) : attendee.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-2 text-red-500 font-medium">
                            <XCircle className="w-5 h-5" /> Rejected
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {attendee.status === 'waitlisted' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                Waitlisted
                              </span>
                            )}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                {total === 0 ? 'No results' : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700/50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700/50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Meta({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
      <span className="text-sm truncate">{label}</span>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
