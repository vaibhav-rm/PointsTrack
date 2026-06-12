'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Smartphone } from 'lucide-react'

export default function CTA() {
  return (
    <section className="relative py-28 px-4 bg-slate-950 overflow-hidden">
      {/* Full-bleed gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-cyan-600/5 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative bg-slate-800/40 border border-slate-700/60 rounded-3xl p-10 md:p-16 text-center overflow-hidden"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-cyan-500/10 pointer-events-none" />
          <div className="absolute -top-24 right-0 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-0 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80 mb-4 block">
              Get Started
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white leading-tight tracking-tight">
              Ready to digitize your<br className="hidden sm:block" /> AICTE Activity Points?
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join students and organizers already using PointsTrack to run
              seamless events and track progress — all in one place.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Link
              href="/organizer/register"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-0.5"
            >
              Register as Organizer
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://drive.google.com/file/d/1uoxNGTXS6XHe2g36PXi5MD_g51tm83At/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <Smartphone className="w-4 h-4" />
              Download Student App
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            viewport={{ once: true }}
            className="text-xs text-slate-500 mt-6"
          >
            Free forever plan available. No credit card required.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
