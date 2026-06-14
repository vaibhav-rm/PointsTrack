'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Briefcase, Sparkles, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, logout, type OrganizerProfile } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { COLLEGES } from '@/lib/colleges'

// Onboarding for a logged-in account that doesn't own a club yet. Creating one
// turns the existing (student) account into an organizer — no second account.
export default function CreateClubPage() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ clubName: '', college: '', fullName: '', bio: '' })

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clubName.trim() || !form.college) {
      toast.error('Club name and college are required')
      return
    }
    setSubmitting(true)
    try {
      await api.patch<OrganizerProfile>('/profile/organizer', {
        clubName: form.clubName,
        college: form.college,
        fullName: form.fullName || undefined,
        bio: form.bio || undefined,
      })
      await refreshProfile()
      toast.success('Club created! 🎉')
      router.push('/organizer/dashboard')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Could not create your club')
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    try { await logout() } catch {}
    router.push('/organizer/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-none">Create your club</h1>
            <p className="text-sm text-slate-400 mt-1">
              {user?.email ? `Signed in as ${user.email}. ` : ''}This adds organizer powers to your account.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-7 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Club Name</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                name="clubName"
                value={form.clubName}
                onChange={update}
                placeholder="e.g. Robotics Club"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">College Affiliation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <select
                name="college"
                value={form.college}
                onChange={update}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                required
              >
                <option value="" disabled>Select your college</option>
                {COLLEGES.map((c, i) => (
                  <option key={`${c.code}-${i}`} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Name (primary contact)</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={update}
              placeholder="e.g. Priya Sharma"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Club Bio <span className="text-slate-500">(optional)</span></label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={update}
              rows={3}
              placeholder="What is your club about?"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50 transition-all"
          >
            {submitting ? 'Creating…' : 'Create club & continue'}
          </button>
          <p className="text-xs text-slate-500 text-center">You can add a logo, cover image and theme later in Settings.</p>
        </form>

        <button onClick={signOut} className="mt-4 mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </motion.div>
    </div>
  )
}
