'use client'

import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

export default function Features() {
  const features = [
    'Instant live dashboard for organizational tracking',
    'Seamless Firestore integration to student mobile app',
    'Event categorizations (Technical, Sports, Cultural, NSS)',
    'Automatic AICTE required-points calculation (100 / 80)',
    'Secure certificate hosting in Firebase Storage',
    'Role-based access controls for College Admins',
    'Mobile-friendly companion app for engineering students',
    'Deep analytics for semester-by-semester progress tracking'
  ]

  return (
    <section className="py-20 px-4 bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Powerful Features
          </h2>
          <p className="text-lg text-slate-300">
            Everything you need to run successful events with confidence
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 p-4 rounded-lg backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 hover:bg-slate-800/50 transition-colors"
            >
              <CheckCircle className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-200">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
