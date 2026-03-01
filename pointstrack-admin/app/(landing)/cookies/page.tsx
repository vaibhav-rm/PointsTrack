import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, Cookie } from 'lucide-react'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Cookie className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Cookie Policy</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
            PointsTrack uses essential cookies uniquely designed to maintain your encrypted session state and keep your collegiate dashboard secure.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">What Are Cookies?</h2>
          <p className="text-slate-400 mb-8">
             Cookies are tiny cryptographic text files placed on your browser when you authenticate into the Organizer Dashboard.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">How We Use Them</h2>
          <p className="text-slate-400 mb-8">
             We use **Strictly Necessary** cookies provided natively by Firebase Authentication to ensure that only verified organizers can modify their respective Event schedules. We also use functional cookies to remember your Dark Mode preferences.
          </p>

           <h2 className="text-2xl font-bold text-white mb-4">Third-Party Tracking</h2>
          <p className="text-slate-400">
             We **do not** embed third-party advertising or cross-site behavioral tracking cookies anywhere in the PointsTrack ecosystem. Your academic presence is entirely isolated.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
