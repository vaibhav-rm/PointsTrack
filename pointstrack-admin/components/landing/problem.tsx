'use client'

import { motion } from 'framer-motion'
import { Clock, AlertCircle, TrendingUp } from 'lucide-react'

export default function Problem() {
  const problems = [
    {
      icon: Clock,
      title: 'Messy Certificate Tracking',
      description: 'Students lose paper certificates and struggle to prove their 100 AICTE Activity points before graduation.'
    },
    {
      icon: AlertCircle,
      title: 'No Centralized Platform',
      description: 'Organizers advertise events via WhatsApp, making it hard for students to discover point-earning opportunities.'
    },
    {
      icon: TrendingUp,
      title: 'Anxiety & Data Loss',
      description: 'Colleges using manual Excel sheets and PDFs experience data loss and approval delays at the end of the semester.'
    }
  ]

  return (
    <section className="relative z-30 py-32 px-4 bg-slate-900 shadow-[0_-20px_50px_rgba(15,23,42,1)]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Earning Activity Points is Broken
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Traditional AICTE points management is outdated, manual, and frustrates both organizers and students.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 p-8 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <problem.icon className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">{problem.title}</h3>
              <p className="text-slate-300">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
