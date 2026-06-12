'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, CalendarPlus, UserCheck, LineChart, Building2, Check } from 'lucide-react'

const valueProps = [
  {
    icon: CalendarPlus,
    title: 'Publish events in seconds',
    description: 'Create an event, add a banner, set the points — students see it in their feed instantly.',
  },
  {
    icon: UserCheck,
    title: 'Approve attendees, award points',
    description: 'Review registrations and credit AICTE points with one tap. The student is notified automatically.',
  },
  {
    icon: LineChart,
    title: 'Real-time analytics',
    description: 'Track registrations, check-ins, and engagement across every event from a single dashboard.',
  },
  {
    icon: Building2,
    title: 'Your own club profile',
    description: 'A branded page with your logo, bio, and event history that every student can discover.',
  },
]

const onboardingSteps = ['Create your club account', 'Publish your first event', 'Start awarding points']

export default function ForOrganizers() {
  return (
    <section
      id="for-organizers"
      className="relative py-28 px-4 bg-slate-950 border-t border-slate-800/50 overflow-hidden"
    >
      {/* ambient glow */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Left: copy + value props */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80 mb-3 block">
                For Organizers
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                Run your club's events like a pro.
              </h2>
              <p className="mt-4 text-lg text-slate-400 max-w-lg leading-relaxed">
                PointsTrack gives clubs and departments a free dashboard to publish events,
                manage attendees, and award AICTE points — no spreadsheets, no WhatsApp chaos.
              </p>
            </motion.div>

            <div className="mt-10 space-y-5">
              {valueProps.map((prop, index) => (
                <motion.div
                  key={prop.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <prop.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{prop.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mt-1">{prop.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-10 flex flex-col sm:flex-row gap-3"
            >
              <Link
                href="/organizer/register"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-0.5"
              >
                Register your club — it's free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/organizer/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Organizer login
              </Link>
            </motion.div>
          </div>

          {/* Right: faux dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: '-60px' }}
            className="relative"
          >
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-sm shadow-2xl shadow-slate-950/60 overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-800/80 bg-slate-900">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <div className="ml-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-4 h-4 rounded bg-gradient-to-br from-cyan-400 to-blue-600 inline-flex items-center justify-center text-white font-black text-[8px]">P</span>
                  app.pointstrack.in/organizer/dashboard
                </div>
              </div>

              {/* dashboard body */}
              <div className="p-5">
                <div className="text-white font-bold text-lg">Dashboard</div>
                <div className="text-slate-500 text-xs mb-4">Welcome back, Tech Club!</div>

                {/* stat cards */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Events', value: '12' },
                    { label: 'Attendees', value: '348' },
                    { label: 'Points given', value: '4.2k' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                      <div className="text-xs text-slate-500">{s.label}</div>
                      <div className="text-lg font-bold text-white mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* recent events mini-table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recent events
                  </div>
                  {[
                    { name: 'Tech Hackathon 2026', scope: 'Open to all', pts: '+20' },
                    { name: 'NSS Tree Plantation', scope: 'College only', pts: '+15' },
                    { name: 'Cultural Dance Fest', scope: 'College only', pts: '+10' },
                  ].map((e) => (
                    <div key={e.name} className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-white">{e.name}</div>
                        <div className="text-[11px] text-slate-500">{e.scope}</div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{e.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* floating onboarding checklist */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="hidden sm:block absolute -bottom-6 -left-6 w-56 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-md p-4 shadow-xl shadow-slate-950/60"
            >
              <div className="text-xs font-semibold text-white mb-3">Get set up in 3 steps</div>
              <ul className="space-y-2.5">
                {onboardingSteps.map((step, i) => (
                  <li key={step} className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="text-xs text-slate-300">{step}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
