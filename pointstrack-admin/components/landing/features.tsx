'use client'

import { motion } from 'framer-motion'
import { BarChart3, QrCode, Shield, Layers, Bell, Users, Award, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Live Dashboard',
    description: 'Instant analytics for organizers tracking attendance and point allocation in real time.',
  },
  {
    icon: QrCode,
    title: 'QR Check-In',
    description: 'Students scan a unique event QR code — no paper tokens, no manual lists.',
  },
  {
    icon: Shield,
    title: 'Secure Certificates',
    description: 'Digital certificates securely stored in the cloud, accessible anytime from the student\'s profile.',
  },
  {
    icon: Layers,
    title: 'Event Categories',
    description: 'Technical, Sports, Cultural & NSS — AICTE categories automatically applied.',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    description: 'Notify students of new events, approvals, and point credits instantly via FCM.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'College Admins, Event Organizers — each role sees only what they need.',
  },
  {
    icon: Award,
    title: 'Auto Point Calculation',
    description: 'The platform tracks 100-point (AICTE) and 80-point thresholds automatically.',
  },
  {
    icon: TrendingUp,
    title: 'Semester Analytics',
    description: 'Deep progress tracking across semesters for both students and institutions.',
  },
]

export default function Features() {
  return (
    <section className="py-28 px-4 bg-slate-900/60">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400/80 mb-3 block">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Everything you need,<br className="hidden sm:block" /> nothing you don't.
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl">
            A tightly integrated platform built for the complete AICTE points lifecycle.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.04 }}
              viewport={{ once: true }}
              className="group bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl hover:border-blue-500/30 card-glow transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2 text-sm">{feature.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
