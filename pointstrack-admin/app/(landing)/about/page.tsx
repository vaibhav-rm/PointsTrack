'use client'

import Link from 'next/link'
import Navbar from '@/components/landing/navbar'
import Footer from '@/components/landing/footer'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, Target, Users, Layers } from 'lucide-react'

const pillars = [
  {
    icon: Target,
    title: 'Our Mission',
    description:
      'We believe that collegiate organizers should spend less time verifying attendance tables and more time crafting unforgettable events. Students shouldn\'t spend the night before graduation scrambling for lost certificates.',
    accent: 'from-cyan-500 to-blue-600',
    glow: 'shadow-cyan-500/20',
  },
  {
    icon: Layers,
    title: 'The Platform',
    description:
      'We maintain a fluid student Mobile Application built on React Native & Expo, alongside a comprehensive Next.js Organizer Dashboard with dynamic analytics, real-time notifications, and event administration.',
    accent: 'from-violet-500 to-blue-600',
    glow: 'shadow-violet-500/20',
  },
  {
    icon: Zap,
    title: 'The Technology',
    description:
      'Built on a scalable cloud-native backend with a PostgreSQL database, real-time push notification infrastructure, and cryptographically signed QR passes — PointsTrack is engineered to grow with your college.',
    accent: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/20',
  },
  {
    icon: Users,
    title: 'Built For',
    description:
      'Engineering students pursuing their 100 AICTE Activity Points across Technical, Cultural, Sports, and NSS categories. And for the organizers who make those opportunities possible.',
    accent: 'from-emerald-500 to-cyan-600',
    glow: 'shadow-emerald-500/20',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 inner-page-gradient pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 mb-10 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>

            <span className="section-label text-cyan-400/80">About PointsTrack</span>
            <h1 className="page-hero-title mb-6">
              Built to end the{' '}
              <span className="gradient-text-cyan">spreadsheet era</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">
              PointsTrack is a passion project built to dissolve the exhausting spreadsheet friction
              associated with the AICTE 100-Points initiative across engineering colleges.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="flex-1 px-4 pb-24">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.08 }}
              className="glass-card p-7 group"
            >
              <div
                className={`mb-5 w-11 h-11 rounded-xl bg-gradient-to-br ${pillar.accent} flex items-center justify-center shadow-lg ${pillar.glow} group-hover:shadow-xl transition-shadow`}
              >
                <pillar.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white mb-3">{pillar.title}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-12 p-8 rounded-2xl border border-slate-800/60 bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <p className="text-white font-semibold text-lg">Ready to get started?</p>
            <p className="text-slate-400 text-sm mt-1">Download the student app or register as an organizer.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a
              href="https://drive.google.com/file/d/1uoxNGTXS6XHe2g36PXi5MD_g51tm83At/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-px"
            >
              Download App
            </a>
            <Link
              href="/organizer/login"
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Organizer Login
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
