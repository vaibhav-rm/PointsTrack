'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { PhoneMockup } from '@/components/ui/phone-mockup'
import { ArrowRight, Smartphone } from 'lucide-react'

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const phoneRotateX = useTransform(scrollYProgress, [0, 0.5], [25, 0])
  const phoneRotateZ = useTransform(scrollYProgress, [0, 0.5], [-10, 0])
  const phoneScale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1.05])
  const phoneY = useTransform(scrollYProgress, [0, 0.5], ['10vh', '-5vh'])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen lg:h-[200vh] bg-slate-950 px-4 overflow-x-clip"
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      {/* Gradient orbs */}
      <div className="absolute lg:fixed top-32 left-1/4 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute lg:fixed bottom-32 right-1/4 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky content wrapper */}
      <div className="lg:sticky top-0 lg:h-screen flex flex-col lg:flex-row items-center justify-center pt-28 pb-16 lg:py-20 max-w-7xl mx-auto w-full relative z-10">

        {/* Left: Text Hero */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative z-20 text-center lg:text-left w-full lg:w-1/2 px-4 lg:pl-12"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 lg:mx-0"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Built for Engineering Students
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-5 text-white leading-[1.08] tracking-tight"
          >
            Your AICTE Points,{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text-cyan">Digitized.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base md:text-lg text-slate-400 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed"
          >
            Say goodbye to lost certificates and messy spreadsheets. Discover events,
            scan QR codes, and automatically track your 100 AICTE Activity Points.
          </motion.p>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex items-center gap-6 mb-8 justify-center lg:justify-start"
          >
            {[
              { value: '500+', label: 'Students' },
              { value: '50+', label: 'Events' },
              { value: '100', label: 'Points goal' },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center"
          >
            <a
              href="https://drive.google.com/file/d/1uoxNGTXS6XHe2g36PXi5MD_g51tm83At/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              Download the App
            </a>
            <Link
              href="/organizer/login"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-white/5"
            >
              Organizer Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Right: Phone Mockup */}
        <div
          className="relative w-full lg:w-1/2 flex items-center justify-center pointer-events-none mt-14 lg:mt-0 h-[450px] sm:h-[500px] lg:h-full"
          style={{ perspective: '1200px' }}
        >
          <motion.div
            style={{
              rotateX: phoneRotateX,
              rotateZ: phoneRotateZ,
              scale: phoneScale,
              y: phoneY,
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.5, type: 'spring', bounce: 0.25 }}
            className="w-full flex justify-center gpu"
          >
            <PhoneMockup>
              <div className="relative w-full h-full bg-[#0F172A] flex flex-col px-5 pt-14 pb-6 overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 z-10 w-full">
                  <div className="flex-1 mr-4">
                    <div className="text-[#94A3B8] font-medium text-sm">Hello,</div>
                    <div className="text-[#F1F5F9] font-bold text-xl truncate">Student</div>
                  </div>
                  <div className="text-[#06B6D4] font-medium text-sm">Logout</div>
                </div>

                {/* Progress Ring */}
                <div className="flex flex-col items-center mb-6 z-10">
                  <div className="w-32 h-32 rounded-full border-[12px] border-[#1E293B] border-t-[#4F46E5] border-r-[#06B6D4] border-b-[#06B6D4] flex flex-col items-center justify-center bg-[#0F172A]" />
                  <div className="mt-4 items-center flex flex-col">
                    <div className="text-[#F1F5F9] font-medium text-lg">85 / 100 Points</div>
                    <div className="text-[#94A3B8] font-normal text-sm mt-1">15 more to go!</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="flex justify-between items-center mb-3 z-10 w-full">
                  <div className="text-xl font-bold text-[#F1F5F9]">Recent Activity</div>
                  <div className="text-[#06B6D4] font-medium text-sm">View All</div>
                </div>

                {/* Event Cards */}
                <div className="space-y-3 z-10 flex-1 w-full">
                  <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-800/50 flex flex-row justify-between items-center">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[#F1F5F9] truncate">Tech Hackathon</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">Technical • 12 Oct</div>
                    </div>
                    <div className="bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                      <div className="text-[#10B981] font-bold text-xs">+20</div>
                    </div>
                  </div>
                  <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-800/50 flex flex-row justify-between items-center">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[#F1F5F9] truncate">NSS Tree Plantation</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">NSS • 05 Oct</div>
                    </div>
                    <div className="bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                      <div className="text-[#10B981] font-bold text-xs">+15</div>
                    </div>
                  </div>
                </div>

                {/* Bottom gradient mask */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0F172A] to-transparent z-20" />
              </div>
            </PhoneMockup>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
