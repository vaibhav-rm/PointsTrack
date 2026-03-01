import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, KeySquare } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <KeySquare className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Privacy Policy</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
          <p className="text-slate-400 mb-8">
             We collect minimal viable information necessary to authenticate engineering students and college organizers. This includes institutional email addresses, basic profile data (Name, College), and encrypted push notification tokens. 
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Information</h2>
          <p className="text-slate-400 mb-8">
             Your data is exclusively used to maintain the integrity of the AICTE point ledger. We do not sell your academic activity tracking history to third-party marketers. Institutional organizers only have access to the records of students who explicitly check into their events.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">3. Data Retention</h2>
          <p className="text-slate-400">
             Account data is retained until graduation or explicit deletion requests are submitted through the application settings.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
