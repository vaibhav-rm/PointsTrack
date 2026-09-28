'use client'

import { motion } from 'framer-motion'
import { Search, Mail, UserPlus, ShieldCheck, Trash2, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import {
  fetchMyClubs,
  fetchClubMembers,
  inviteClubMember,
  moderateClubMember,
  removeClubMember,
  type Club,
  type ClubMember,
} from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const ROLES = ['member', 'scanner', 'event_manager', 'admin']

// Club roster management: organizers add members by email (students need an
// app account first), verify pending requests, change roles, and remove.
// Whatever is set here shows up verified on the student's profile.
export default function MembersPage() {
  const { user, selectedClub, selectClub, clubs, refreshProfile } = useAuth()
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)

  const activeClub: Club | null = selectedClub ?? clubs[0] ?? null

  const load = useCallback(async () => {
    if (!user || !activeClub) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await fetchClubMembers(activeClub.id)
      setMembers(rows)
      // Am I allowed to manage? (server enforces; this only toggles the UI)
      const mine = await fetchMyClubs()
      const myRow = mine.find((m) => m.club.id === activeClub.id)
      setCanManage(
        !!myRow && (myRow.membership.role === 'owner' || myRow.membership.role === 'admin')
      )
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [user, activeClub])

  useEffect(() => {
    load()
  }, [load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClub || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await inviteClubMember(activeClub.id, inviteEmail.trim(), inviteRole as any)
      setInviteEmail('')
      toast.success('Member added — they are now verified')
      load()
      refreshProfile()
    } catch (error: any) {
      toast.error(error?.message || 'Could not add member (they need an app account first)')
    } finally {
      setInviting(false)
    }
  }

  const handleModerate = async (m: ClubMember, status: 'active' | 'rejected') => {
    if (!activeClub) return
    setActingId(m.membershipId)
    try {
      await moderateClubMember(activeClub.id, m.membershipId, status)
      toast.success(status === 'active' ? 'Member verified' : 'Request rejected')
      load()
    } catch (error: any) {
      toast.error(error?.message || 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  const handleRole = async (m: ClubMember, role: string) => {
    if (!activeClub || role === m.role) return
    setActingId(m.membershipId)
    try {
      await moderateClubMember(activeClub.id, m.membershipId, 'active', role)
      toast.success(`Role set to ${role}`)
      load()
    } catch (error: any) {
      toast.error(error?.message || 'Could not change role')
    } finally {
      setActingId(null)
    }
  }

  const handleRemove = async (m: ClubMember) => {
    if (!activeClub) return
    if (!confirm(`Remove ${m.studentName || m.studentEmail} from the club?`)) return
    setActingId(m.membershipId)
    try {
      await removeClubMember(activeClub.id, m.membershipId)
      toast.success('Member removed')
      load()
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove member')
    } finally {
      setActingId(null)
    }
  }

  const pending = members.filter((m) => m.status === 'pending')
  const active = members.filter((m) => m.status === 'active')

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-4xl font-bold text-white mb-2">Members</h1>
        <p className="text-slate-300">Add your club members — they show up verified on student profiles</p>
      </motion.div>

      {/* Club picker */}
      {clubs.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Club:</span>
          <div className="relative">
            <select
              value={activeClub?.id ?? ''}
              onChange={(e) => {
                const c = clubs.find((x) => x.id === e.target.value)
                if (c) selectClub(c)
              }}
              className="appearance-none pl-4 pr-10 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Invite */}
      {canManage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" /> Add member
          </h2>
          <p className="text-sm text-slate-400 mb-4">They need a PointsTrack account first — use their signup email.</p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="student@college.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-50"
            >
              {inviting ? 'Adding…' : 'Add'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="backdrop-blur-md bg-white/10 border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-amber-500/20">
            <h2 className="font-bold text-white">Verification requests ({pending.length})</h2>
          </div>
          {pending.map((m) => (
            <div key={m.membershipId} className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50">
              <div>
                <p className="font-medium text-white">{m.studentName || m.studentEmail}</p>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {m.studentEmail}{m.usn ? ` • ${m.usn}` : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleModerate(m, 'active')}
                    disabled={actingId === m.membershipId}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 disabled:opacity-50"
                    title="Verify"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleModerate(m, 'rejected')}
                    disabled={actingId === m.membershipId}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Roster */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-white">Verified members ({active.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">USN</th>
                {canManage && <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : active.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No verified members yet — add your first above.</td></tr>
              ) : active.map((m) => (
                <tr key={m.membershipId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-6 py-3">
                    <p className="font-medium text-white">{m.studentName || '—'}</p>
                    <p className="text-sm text-slate-400">{m.studentEmail}</p>
                  </td>
                  <td className="px-6 py-3">
                    {canManage && m.role !== 'owner' ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRole(m, e.target.value)}
                        disabled={actingId === m.membershipId}
                        className="px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                      >
                        {['owner', ...ROLES].map((r) => (
                          <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {m.role === 'owner' && <ShieldCheck className="w-3 h-3" />}{m.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-300 text-sm">{m.usn || '—'}</td>
                  {canManage && (
                    <td className="px-6 py-3 text-right">
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemove(m)}
                          disabled={actingId === m.membershipId}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 disabled:opacity-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
