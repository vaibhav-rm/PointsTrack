'use client'

import { motion } from 'framer-motion'

const problems = [
  {
    number: '01',
    title: 'Messy Certificate Tracking',
    description:
      'Students lose paper certificates and struggle to prove their 100 AICTE Activity Points before graduation.',
  },
  {
    number: '02',
    title: 'No Centralized Platform',
    description:
      'Organizers advertise events via WhatsApp groups, making it nearly impossible for students to discover point-earning opportunities.',
  },
  {
    number: '03',
    title: 'Anxiety & Data Loss',
    description:
      'Colleges relying on manual Excel sheets experience data loss and approval delays at the end of every semester.',
  },
]

export default function Problem() {
  return (
    <section className="relative z-30 py-28 px-4 bg-slate-900 shadow-[0_-24px_60px_rgba(15,23,42,1)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-red-400/80 mb-3 block">
            The Problem
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Earning activity points<br className="hidden sm:block" /> is broken.
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl">
            Traditional AICTE points management is outdated, manual, and frustrates
            both organizers and students.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-slate-800/40 border border-slate-700/50 p-7 rounded-2xl overflow-hidden hover:border-red-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Large muted number */}
              <div className="text-7xl font-black text-slate-700/50 group-hover:text-red-500/20 transition-colors leading-none mb-4 select-none">
                {problem.number}
              </div>

              {/* Red accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500/0 via-red-500/60 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <h3 className="text-lg font-bold text-white mb-3">{problem.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
