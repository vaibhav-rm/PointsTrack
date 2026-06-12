'use client'

import { motion } from 'framer-motion'
import { Zap, BarChart3, Shield } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Zap,
    title: 'Organizer Publishes Event',
    description:
      'Organizers create and publish events on the dashboard. Students see them instantly in their mobile feed.',
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Student Scans & Attends',
    description:
      'At the event, students scan a unique QR code on their phone. Attendance is recorded to the second.',
  },
  {
    number: '03',
    icon: Shield,
    title: 'Points & Certificate Awarded',
    description:
      'AICTE Activity Points are credited instantly. Digital certificates are stored securely in the cloud.',
  },
]

export default function Solution() {
  return (
    <section className="py-28 px-4 bg-slate-900 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80 mb-3 block">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            The PointsTrack Ecosystem
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl">
            A real-time sync engine connecting your organizer dashboard directly
            to students' mobile apps — from event creation to certificate delivery.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: index * 0.12 }}
              viewport={{ once: true }}
              className="group relative bg-slate-800/40 border border-slate-700/50 p-7 rounded-2xl overflow-hidden hover:border-cyan-500/30 card-glow transition-all duration-300 hover:-translate-y-1"
            >
              {/* Step number background */}
              <div className="text-7xl font-black text-slate-700/40 group-hover:text-cyan-500/15 transition-colors leading-none mb-5 select-none">
                {step.number}
              </div>

              {/* Icon */}
              <div className="mb-4 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                <step.icon className="w-5 h-5 text-white" />
              </div>

              <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>

              {/* Connector arrow — hidden on last card and mobile */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 z-10">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
