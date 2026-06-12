'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'What are AICTE Activity Points?',
    a: 'AICTE mandates that engineering students earn Activity Points (100 for regular entry, 80 for lateral entry) by participating in technical, sports, cultural, and social activities before graduation. PointsTrack helps you discover qualifying events and track those points automatically.',
  },
  {
    q: 'Is PointsTrack free to use?',
    a: 'Yes. The student mobile app is free to download, and organizers can register their club and publish events for free. No credit card required.',
  },
  {
    q: 'How do students earn points?',
    a: 'Students discover events in the app, apply to ones at their college (or open-to-all events), and attend. Once the organizer approves their attendance, the points are credited instantly and a certificate is stored in their profile.',
  },
  {
    q: 'Who can register as an organizer?',
    a: 'Any college club, department, or society that runs point-earning events. After registering you get a dashboard to publish events, manage attendees, and award points, plus a public club profile students can browse.',
  },
  {
    q: 'Can students add activities they completed elsewhere?',
    a: 'Yes. Students can self-log activities — like an external workshop or a blood donation drive — and attach a certificate, so their entire AICTE record lives in one place.',
  },
  {
    q: 'Is my data secure?',
    a: 'All accounts are protected with encrypted passwords and token-based authentication, and certificates are stored securely in the cloud. See our Security page for the full breakdown.',
  },
]

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden transition-colors hover:border-slate-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-white text-base">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-28 px-4 bg-slate-900/60 border-t border-slate-800/50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80 mb-3 block">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Questions, answered.
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <FaqItem
                q={faq.q}
                a={faq.a}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
