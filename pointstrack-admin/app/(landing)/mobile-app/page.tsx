'use client'

import Link from 'next/link'
import Navbar from '@/components/landing/navbar'
import Footer from '@/components/landing/footer'
import { motion } from 'framer-motion'
import { ArrowLeft, Smartphone, QrCode, Bell, Award, TrendingUp, Zap, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: 'Instant Discovery',
    description: 'Browse and filter upcoming college events through a beautiful, category-driven feed. Never miss a point-earning opportunity.',
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Zap,
    title: 'Live Point Tracking',
    description: 'Watch your progress ring fill in real-time as event organizers credit your attendance points — no refresh needed.',
    accent: 'from-violet-500 to-blue-600',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    description: 'Get targeted alerts for newly published events, point approvals, certificate availability, and event cancellations.',
    accent: 'from-orange-500 to-red-500',
  },
  {
    icon: QrCode,
    title: 'Digital Passes',
    description: 'Generate instantly verifiable QR codes from the app to streamline check-in. No paper tokens. No queues.',
    accent: 'from-emerald-500 to-cyan-600',
  },
  {
    icon: Award,
    title: 'Certificate Vault',
    description: 'Every certificate you earn is securely backed up to the cloud, downloadable any time before or after graduation.',
    accent: 'from-yellow-500 to-orange-600',
  },
  {
    icon: Smartphone,
    title: 'Cross-Category Tracking',
    description: 'Technical, Cultural, Sports, NSS — all your AICTE activity categories tracked in one clean, unified dashboard.',
    accent: 'from-blue-500 to-indigo-600',
  },
]

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 inner-page-gradient pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 mb-10 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>

            <span className="section-label text-violet-400/80">Mobile App</span>
            <h1 className="page-hero-title mb-6">
              Your AICTE journey,{' '}
              <span className="gradient-text-cyan">in your pocket</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">
              The PointsTrack student app puts your entire 100-point AICTE journey on your phone — discover
              events, scan QR codes, and watch your progress update in real time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <a
              href="https://drive.google.com/file/d/1uoxNGTXS6XHe2g36PXi5MD_g51tm83At/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-px w-fit"
            >
              <Smartphone className="w-4 h-4" />
              Download for Android
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <span className="inline-flex items-center text-sm text-slate-500 px-2">
              iOS version coming soon
            </span>
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="flex-1 px-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8"
          >
            <span className="section-label text-cyan-400/80">What&apos;s Inside</span>
            <h2 className="text-2xl font-bold text-white">Everything a student needs</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.06 }}
                className="glass-card p-6 group"
              >
                <div
                  className={`mb-4 w-10 h-10 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
