import { ReactNode } from 'react'
import { motion, MotionStyle } from 'framer-motion'

interface PhoneMockupProps {
  children?: ReactNode
  className?: string
  style?: MotionStyle
}

export function PhoneMockup({ children, className = '', style }: PhoneMockupProps) {
  return (
    <motion.div
      style={style}
      className={`relative z-10 mx-auto flex justify-center drop-shadow-[0_20px_60px_rgba(34,211,238,0.2)] ${className}`}
    >
      {/* CSS Phone Frame */}
      <div className="relative w-[300px] sm:w-[320px] h-[600px] sm:h-[650px] rounded-[3rem] border-[10px] sm:border-[12px] border-slate-900 bg-slate-950 shadow-2xl overflow-hidden ring-4 ring-slate-800/50 transform scale-[0.8] sm:scale-100 origin-top md:origin-center">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2 inset-x-0 flex justify-center z-30">
          <div className="w-24 h-7 bg-black rounded-full flex items-center justify-end px-2">
            <div className="w-2 h-2 rounded-full bg-slate-800/80 mr-1"></div>
          </div>
        </div>
        
        {/* Screen Content */}
        <div className="relative w-full h-full bg-[#0F172A] flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </motion.div>
  )
}
