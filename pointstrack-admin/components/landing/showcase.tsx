'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { PhoneMockup } from '@/components/ui/phone-mockup'

export default function Showcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  // Scroll animations for left phone (Progress Ring)
  const leftPhoneY = useTransform(scrollYProgress, [0, 1], [100, -50])
  const leftPhoneRotateZ = useTransform(scrollYProgress, [0, 1], [-5, 5])
  
  // Scroll animations for right phone (Certificates)
  const rightPhoneY = useTransform(scrollYProgress, [0, 1], [150, -100])
  const rightPhoneRotateZ = useTransform(scrollYProgress, [0, 1], [5, -5])

  return (
    <section ref={containerRef} className="py-20 px-4 bg-slate-950 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 relative z-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            See It In Action
          </h2>
          <p className="text-lg text-slate-300">
            Explore how the PointsTrack Network transforms college event management
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24 mt-12">
          
          {/* Left Phone: Real-time Progress */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <PhoneMockup style={{ y: leftPhoneY, rotateZ: leftPhoneRotateZ }}>
              <div className="flex w-full h-full flex-col justify-center items-center p-6 bg-slate-900 absolute inset-0">
                
                {/* Simulated Header */}
                <div className="absolute top-12 left-6 right-6 flex justify-between items-center opacity-50">
                   <div className="w-8 h-8 rounded-full bg-slate-800"></div>
                   <div className="w-16 h-4 rounded bg-slate-800"></div>
                </div>

                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="w-48 h-48 rounded-full border-[12px] border-slate-700 border-t-cyan-400 border-r-cyan-400 flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(34,211,238,0.15)] drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] bg-slate-950"
                >
                  <span className="text-5xl font-bold text-white">80</span>
                  <span className="text-sm text-slate-400 mt-1">/ 100 Points</span>
                </motion.div>
                
                {/* Simulated content below */}
                <div className="absolute bottom-12 left-6 right-6 space-y-3 opacity-50">
                   <div className="w-full h-16 rounded-xl bg-slate-800"></div>
                   <div className="w-full h-16 rounded-xl bg-slate-800"></div>
                </div>
              </div>
            </PhoneMockup>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true, margin: "-50px" }}
              className="mt-8 text-center max-w-xs relative z-20"
            >
              <h3 className="text-white font-bold text-2xl mb-2">Real-time Progress</h3>
              <p className="text-slate-400 text-sm">Track your AICTE Activity Points instantly as soon as organizers scan your QR code.</p>
            </motion.div>
          </div>

          {/* Right Phone: Certificate Storage */}
          <div className="w-full md:w-1/2 flex flex-col items-center mt-20 md:mt-0">
            <PhoneMockup style={{ y: rightPhoneY, rotateZ: rightPhoneRotateZ }}>
               <div className="flex w-full h-full flex-col justify-start items-center px-5 py-20 bg-slate-900 absolute inset-0">
                 <div className="w-full text-left mb-6">
                    <h4 className="text-white font-bold text-xl">My Certificates</h4>
                    <p className="text-slate-400 text-sm mt-1">Safely stored in the cloud</p>
                 </div>
                 
                 <div className="w-full space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      viewport={{ once: true }}
                      className="p-4 rounded-xl bg-slate-800 flex items-center justify-between border border-slate-700/50 shadow-lg"
                    >
                       <div>
                         <p className="text-white font-semibold">Tech Hackathon 2026</p>
                         <p className="text-xs text-slate-400 text-left mt-0.5">20 Points • Certificate Available</p>
                       </div>
                       <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center">✓</div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      viewport={{ once: true }}
                      className="p-4 rounded-xl bg-slate-800 flex items-center justify-between border border-slate-700/50 shadow-lg"
                    >
                       <div>
                         <p className="text-white font-semibold">NSS Tree Plantation</p>
                         <p className="text-xs text-slate-400 text-left mt-0.5">15 Points • Certificate Available</p>
                       </div>
                       <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center">✓</div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      viewport={{ once: true }}
                      className="p-4 rounded-xl bg-slate-800 flex items-center justify-between border border-slate-700/50 opacity-60"
                    >
                       <div>
                         <p className="text-white font-semibold">Cultural Dance Fest</p>
                         <p className="text-xs text-slate-400 text-left mt-0.5">Waiting for Approval...</p>
                       </div>
                       <div className="w-8 h-8 rounded bg-slate-700/50 flex items-center justify-center text-xs">⏳</div>
                    </motion.div>
                 </div>
               </div>
            </PhoneMockup>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true, margin: "-50px" }}
              className="mt-8 text-center max-w-xs relative z-20"
            >
              <h3 className="text-white font-bold text-2xl mb-2">Digital Certificates</h3>
              <p className="text-slate-400 text-sm">Your hard-earned certificates are securely backed up in the cloud forever.</p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
