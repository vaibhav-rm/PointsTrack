'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { PhoneMockup } from '@/components/ui/phone-mockup'

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Extend scroll distance to give the animation room to breathe
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  // Advanced 3D Transform Sequence for the right side
  const phoneRotateX = useTransform(scrollYProgress, [0, 0.5], [25, 0])
  const phoneRotateZ = useTransform(scrollYProgress, [0, 0.5], [-10, 0])
  const phoneScale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1.05])
  const phoneY = useTransform(scrollYProgress, [0, 0.5], ['10vh', '-5vh']) // slight lift
  
  // Keep the text slightly parallaxing downwards
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2])

  return (
    <section ref={containerRef} className="relative h-[200vh] bg-slate-950 px-4">
      {/* Background gradient orbs fixed to viewport */}
      <div className="fixed top-20 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] opacity-20 pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] opacity-20 pointer-events-none" />

      {/* Sticky container holds the viewport items while we scroll the 200vh section */}
      <div className="sticky top-0 h-screen flex flex-col lg:flex-row items-center justify-center overflow-hidden pt-20 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Floating Text Hero */}
        <motion.div 
          style={{ opacity: textOpacity, y: textY }} 
          className="relative z-20 text-center lg:text-left w-full lg:w-1/2 px-4 lg:pl-12 mt-8 lg:mt-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6 lg:mx-0"
          >
            <span className="inline-block text-sm font-semibold text-cyan-400 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              The Ultimate App for Engineering Students
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight"
          >
            Your AICTE Points, <br/>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Digitized.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0"
          >
            Say goodbye to lost paper certificates and messy excel sheets. Discover college events, scan QR codes to check-in, and automatically track your 100 AICTE Activity points straight from your smartphone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center"
          >
            <button className="px-8 py-3 rounded-xl font-bold transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:scale-105 hover:-translate-y-1">
              Download the App
            </button>
            <Link href="/organizer/login" className="px-8 py-3 rounded-xl font-medium transition-all duration-300 backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 text-white hover:bg-white/20 hover:backdrop-blur-lg">
              Organizer Dashboard
            </Link>
          </motion.div>
        </motion.div>

        {/* Right Side: 3D Animated CSS Smartphone */}
        <div className="relative w-full lg:w-1/2 flex items-center justify-center pointer-events-none mt-12 lg:mt-0 h-[500px] sm:h-[60vh] lg:h-full" style={{ perspective: '1200px' }}>
          <motion.div
            style={{ 
              rotateX: phoneRotateX, 
              rotateZ: phoneRotateZ, 
              scale: phoneScale,
              y: phoneY
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 0.5, type: 'spring', bounce: 0.3 }}
            className="w-full flex justify-center"
          >
            <PhoneMockup>
              {/* Screen Content - App UI Replica from PointsTrack Source */}
              <div className="relative w-full h-full bg-[#0F172A] flex flex-col px-5 pt-14 pb-6 overflow-hidden">
                
                {/* Header Match */}
                <div className="flex justify-between items-center mb-6 z-10 w-full">
                  <div className="flex-1 mr-4">
                    <div className="text-[#94A3B8] font-medium text-sm">Hello,</div>
                    <div className="text-[#F1F5F9] font-bold text-xl truncate">Student</div>
                  </div>
                  <div>
                    <div className="text-[#06B6D4] font-medium text-sm">Logout</div>
                  </div>
                </div>
                
                {/* Progress Ring Match */}
                <div className="flex flex-col items-center mb-6 z-10 delay-100 duration-500 animate-in fade-in zoom-in-95">
                  <div className="w-32 h-32 rounded-full border-[12px] border-[#1E293B] border-t-[#4F46E5] border-r-[#06B6D4] border-b-[#06B6D4] flex flex-col items-center justify-center relative bg-[#0F172A]">
                     {/* Inner icon placeholder */}
                  </div>
                  <div className="mt-4 items-center flex flex-col">
                    <div className="text-[#F1F5F9] font-medium text-lg">
                      85 / 100 Points
                    </div>
                    <div className="text-[#94A3B8] font-normal text-sm mt-1">
                      15 more to go!
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity Header */}
                <div className="flex justify-between items-center mb-3 z-10 w-full delay-200 duration-500 animate-in fade-in">
                  <div className="text-xl font-bold text-[#F1F5F9]">Recent Activity</div>
                  <div className="text-[#06B6D4] font-medium text-sm">View All</div>
                </div>
                
                {/* Event Cards Match */}
                <div className="space-y-3 z-10 flex-1 w-full">
                  {/* Card 1 */}
                  <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-800/50 shadow-sm flex flex-row justify-between items-center delay-300 duration-500 animate-in fade-in slide-in-from-bottom-6">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[#F1F5F9] truncate">Tech Hackathon</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">Technical • 12 Oct</div>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                      <div className="bg-[#4F46E5]/20 p-1.5 rounded-full">
                        <svg className="w-4 h-4 text-[#818CF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                        <div className="text-[#10B981] font-bold text-xs">+20</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 2 */}
                  <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-800/50 shadow-sm flex flex-row justify-between items-center delay-500 duration-500 animate-in fade-in slide-in-from-bottom-8">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[#F1F5F9] truncate">NSS Tree Plantation</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">NSS • 05 Oct</div>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                      {/* No cert icon to show variety */}
                      <div className="bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                        <div className="text-[#10B981] font-bold text-xs">+15</div>
                      </div>
                    </div>
                  </div>
                </div>
            
                {/* Bottom Nav Bar Mask */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0F172A] to-transparent flex items-end justify-center pb-2 z-20" />
              </div>
            </PhoneMockup>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
