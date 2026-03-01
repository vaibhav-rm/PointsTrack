import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, Edit3 } from 'lucide-react'

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Edit3 className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Engineering Blog</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-xl text-slate-300 leading-relaxed mb-12">
            Dive into the technical architecture, deployment strategies, and organizational paradigms powering the PointsTrack platform.
          </p>

          <div className="grid gap-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors">
               <span className="text-sm font-semibold text-cyan-400 mb-2 block">Engineering</span>
               <h3 className="text-xl font-bold text-white mb-2">Scaling React Native Push Notifications with Expo</h3>
               <p className="text-slate-400 mb-4">How we utilized Expo Server SDKs within our NextJS environment to achieve sub-second push notification delivery for event cancellations.</p>
               <span className="text-slate-500 text-sm">March 2, 2026 • 5 min read</span>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors">
               <span className="text-sm font-semibold text-cyan-400 mb-2 block">Product</span>
               <h3 className="text-xl font-bold text-white mb-2">The AICTE 100-Points Economy</h3>
               <p className="text-slate-400 mb-4">Breaking down the algorithmic tracking requirements for modern collegiate organizers and mitigating attendance inflation.</p>
               <span className="text-slate-500 text-sm">February 15, 2026 • 8 min read</span>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors">
               <span className="text-sm font-semibold text-cyan-400 mb-2 block">Updates</span>
               <h3 className="text-xl font-bold text-white mb-2">PointsTrack 1.0 Release</h3>
               <p className="text-slate-400 mb-4">Announcing our dynamic visualization dashboard and comprehensive mobile companion application.</p>
               <span className="text-slate-500 text-sm">January 30, 2026 • 3 min read</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
