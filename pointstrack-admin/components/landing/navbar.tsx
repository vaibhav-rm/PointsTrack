'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'For Organizers', href: '/#for-organizers' },
  { label: 'Mobile App', href: '/mobile-app' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 shadow-lg shadow-slate-950/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <span className="text-white font-black text-xs">P</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">
              Points<span className="text-cyan-400">Track</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/organizer/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all duration-200 hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/organizer/register"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-px"
            >
              Register your club
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 md:hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                <Link
                  href="/organizer/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-all text-center"
                >
                  Log in
                </Link>
                <Link
                  href="/organizer/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center"
                >
                  Register your club
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
