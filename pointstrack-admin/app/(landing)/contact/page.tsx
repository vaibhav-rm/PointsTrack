'use client'

import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Contact Support</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none grid md:grid-cols-2 gap-12">
          
          <div>
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              Are you a collegiate organizer looking to onboard your entire campus onto PointsTrack? Or a student experiencing check-in difficulties? Reach out.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">General Inquiries</h3>
                <p className="text-slate-400">hello@pointstrack.app</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Technical Support</h3>
                <p className="text-slate-400">support@pointstrack.app</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Enterprise Licensing</h3>
                <p className="text-slate-400">sales@pointstrack.app</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input type="email" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="john@college.edu" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="How can we help?"></textarea>
              </div>
              <button type="button" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg transition-colors">
                Send Message
              </button>
            </form>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
