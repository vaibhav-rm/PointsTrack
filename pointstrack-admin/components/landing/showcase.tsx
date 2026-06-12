'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { PhoneMockup } from '@/components/ui/phone-mockup'

const stats = [
  { value: '500+', label: 'Students' },
  { value: '50+', label: 'Events tracked' },
  { value: '100', label: 'Points goal' },
  { value: '< 3s', label: 'QR check-in' },
]

export default function Showcase() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const leftPhoneY = useTransform(scrollYProgress, [0, 1], [80, -40])
  const leftPhoneRotateZ = useTransform(scrollYProgress, [0, 1], [-4, 4])
  const rightPhoneY = useTransform(scrollYProgress, [0, 1], [120, -80])
  const rightPhoneRotateZ = useTransform(scrollYProgress, [0, 1], [4, -4])

  return (
    <section ref={containerRef} className="py-28 px-4 bg-slate-950 overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12 relative z-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80 mb-3 block">
            See It In Action
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Built for real students,<br className="hidden sm:block" /> real colleges.
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl">
            Explore how the PointsTrack network transforms college event management
            from end to end.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 relative z-20"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-4 text-center"
            >
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Phones */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24">

          {/* Left Phone: Progress Tracker */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <PhoneMockup style={{ y: leftPhoneY, rotateZ: leftPhoneRotateZ }}>
              <div className="flex w-full h-full flex-col justify-center items-center p-6 bg-slate-900 absolute inset-0">
                <div className="absolute top-12 left-6 right-6 flex justify-between items-center opacity-40">
                  <div className="w-8 h-8 rounded-full bg-slate-700" />
                  <div className="w-16 h-3 rounded bg-slate-700" />
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="w-48 h-48 rounded-full border-[12px] border-slate-700 border-t-cyan-400 border-r-cyan-400 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.2)] bg-slate-950"
                >
                  <span className="text-5xl font-bold text-white">80</span>
                  <span className="text-sm text-slate-400 mt-1">/ 100 Points</span>
                </motion.div>
                <div className="absolute bottom-12 left-6 right-6 space-y-3 opacity-40">
                  <div className="w-full h-14 rounded-xl bg-slate-800" />
                  <div className="w-full h-14 rounded-xl bg-slate-800" />
                </div>
              </div>
            </PhoneMockup>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true, margin: "-50px" }}
              className="mt-8 text-center max-w-xs relative z-20"
            >
              <h3 className="text-white font-bold text-xl mb-2">Real-time Progress</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Track your AICTE Activity Points instantly as soon as organizers scan your QR code.
              </p>
            </motion.div>
          </div>

          {/* Right Phone: Certificate Storage */}
          <div className="w-full md:w-1/2 flex flex-col items-center mt-16 md:mt-0">
            <PhoneMockup style={{ y: rightPhoneY, rotateZ: rightPhoneRotateZ }}>
              <div className="flex w-full h-full flex-col justify-start items-center px-5 py-20 bg-slate-900 absolute inset-0">
                <div className="w-full text-left mb-5">
                  <h4 className="text-white font-bold text-xl">My Certificates</h4>
                  <p className="text-slate-400 text-sm mt-0.5">Safely stored in the cloud</p>
                </div>
                <div className="w-full space-y-3">
                  {[
                    { title: 'Tech Hackathon 2026', points: 20, status: 'available' },
                    { title: 'NSS Tree Plantation', points: 15, status: 'available' },
                    { title: 'Cultural Dance Fest', points: null, status: 'pending' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                      viewport={{ once: true }}
                      className={`p-4 rounded-xl bg-slate-800 flex items-center justify-between border border-slate-700/50 ${item.status === 'pending' ? 'opacity-60' : ''}`}
                    >
                      <div>
                        <p className="text-white font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.status === 'available'
                            ? `${item.points} Points • Certificate Available`
                            : 'Waiting for Approval...'}
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        item.status === 'available'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}>
                        {item.status === 'available' ? '✓' : '⏳'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </PhoneMockup>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true, margin: "-50px" }}
              className="mt-8 text-center max-w-xs relative z-20"
            >
              <h3 className="text-white font-bold text-xl mb-2">Digital Certificates</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your hard-earned certificates are securely backed up in the cloud, forever.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
