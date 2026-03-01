import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">About Us</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
            PointsTrack is a passion project built to dissolve the exhausting spreadsheet friction associated with the AICTE 100-Points initiative across engineering colleges.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-400 mb-8">
             We believe that collegiate organizers should spend less time verifying attendance tables and more time crafting unforgettable events. Students shouldn't spend the night before graduation scrambling for lost certificates. PointsTrack was designed from the ground up to digitize, secure, and accelerate this entire pipeline natively.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">The Platform</h2>
          <p className="text-slate-400">
             To achieve this, we maintain both a beautifully fluid student Mobile Application built on React Native & Expo, and a comprehensive NextJS Organizer Dashboard equipped with dynamic analytics, real-time push notification tools, and event administration grids. 
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
