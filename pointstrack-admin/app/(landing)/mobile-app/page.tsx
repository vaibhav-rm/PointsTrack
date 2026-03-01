import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, Smartphone } from 'lucide-react'

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Smartphone className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Mobile App</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-xl text-slate-300 leading-relaxed">
            The PointsTrack mobile application is designed specifically for students to effortlessly discover activities and track their AICTE 100-points progress.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
             <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                <h3 className="text-xl font-semibold text-white mb-3">Instant Discovery</h3>
                <p className="text-slate-400">Browse and filter upcoming college events seamlessly through a gorgeous user interface.</p>
             </div>
             <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                <h3 className="text-xl font-semibold text-white mb-3">Live Point Tracking</h3>
                <p className="text-slate-400">Watch your progress ring fill up instantly as event organizers allot your attendance points in real-time.</p>
             </div>
             <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                <h3 className="text-xl font-semibold text-white mb-3">Push Notifications</h3>
                <p className="text-slate-400">Never miss an opportunity with targeted alerts for cancelled events, approvals, and new activity drops.</p>
             </div>
             <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                <h3 className="text-xl font-semibold text-white mb-3">Digital Passes</h3>
                <p className="text-slate-400">Generate instantly verifiable QR codes to streamline event check-in directly from your phone.</p>
             </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
