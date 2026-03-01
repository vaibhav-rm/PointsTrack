'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CTA() {
  return (
    <section className="py-20 px-4 bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-2xl p-12 text-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-1" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-1" />

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-6 text-white relative z-10"
          >
            Ready to Digitize Your AICTE Activity Points?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto relative z-10"
          >
            Join hundreds of college clubs using the PointsTrack platform to publish events directly to their students' mobile feeds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10"
          >
            <Link href="/organizer/register" className="px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 hover:-translate-y-1 text-lg">
              Register Event Organizer
            </Link>
            <a 
              href="https://drive.google.com/file/d/1uoxNGTXS6XHe2g36PXi5MD_g51tm83At/view?usp=sharing" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-6 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 text-foreground hover:backdrop-blur-lg text-lg"
            >
              Download Student App
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-sm text-slate-400 mt-6 relative z-10"
          >
            No credit card required. Free forever plan available.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
