'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Fields that make a club profile feel "complete". Club name + college are
// required at registration, so they're never missing — these are the rest.
const CHECKS: { key: 'fullName' | 'bio' | 'logo' | 'coverImage' | 'establishedDate' | 'coreTeam'; label: string }[] = [
  { key: 'fullName', label: 'your name' },
  { key: 'logo', label: 'a logo' },
  { key: 'coverImage', label: 'a cover image' },
  { key: 'bio', label: 'a bio' },
  { key: 'establishedDate', label: 'established date' },
  { key: 'coreTeam', label: 'core team' },
]

const DISMISS_KEY = 'pt_profile_prompt_dismissed'

/**
 * Nudges organizers with an incomplete club profile to finish it. Appears on
 * every organizer page (except settings, where they'd fix it). Dismissible, but
 * reappears whenever the set of missing fields changes (so completing one and
 * leaving others still re-prompts on the next visit only if newly empty).
 */
export default function ProfileCompletionBanner() {
  const { profile } = useAuth()
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(true) // default hidden until we check

  const missing = profile ? CHECKS.filter((c) => !((profile as any)[c.key] || '').toString().trim()) : []
  const signature = missing.map((m) => m.key).join(',')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prev = window.localStorage.getItem(DISMISS_KEY)
    // Show again if the missing-fields signature changed since last dismiss.
    setDismissed(prev === signature && signature !== '')
  }, [signature])

  // Don't nag on the settings page itself, when complete, or when dismissed.
  if (!profile || missing.length === 0 || dismissed || pathname.startsWith('/organizer/settings')) {
    return null
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, signature)
    setDismissed(true)
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 md:px-5 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200">Your club profile is incomplete</p>
        <p className="text-xs text-amber-100/70 mt-0.5">
          Students see this in the app. Add {missing.slice(0, 3).map((m) => m.label).join(', ')}
          {missing.length > 3 ? `, and ${missing.length - 3} more` : ''} to look credible.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/organizer/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-sm font-medium px-3 py-1.5 transition-colors"
        >
          Complete profile
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1.5 rounded-lg text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
