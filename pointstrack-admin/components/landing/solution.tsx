'use client'

import { motion } from 'framer-motion'
import { Zap, BarChart3, Users } from 'lucide-react'

export default function Solution() {
  const solutions = [
    {
      icon: Zap,
      title: 'Instant Point Allocation',
      description: 'Award participants their hard-earned AICTE Activity Points instantly upon event completion.'
    },
    {
      icon: BarChart3,
      title: 'Centralized Discovery',
      description: 'Publish your events to a unified mobile feed where students across the college can discover them.'
    },
    {
      icon: Users,
      title: 'Secure Certificate Hosting',
      description: 'Deliver digital certificates securely via Firebase Storage directly to your attendees\' profiles.'
    }
  ]

  return (
    <section className="py-20 px-4 bg-slate-900 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            The PointsTrack Ecosystem
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            A real-time database syncing your dashboard directly to the students' mobile app.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 p-8 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all">
                <solution.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{solution.title}</h3>
              <p className="text-slate-300">{solution.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
