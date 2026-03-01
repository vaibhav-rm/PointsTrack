import Link from 'next/link'
import Footer from '@/components/landing/footer'
import { ArrowLeft, BookOpenText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-20">
        <Link href="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <BookOpenText className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Terms of Service</h1>
        </div>
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-400 mb-8">Effective Date: {new Date().toLocaleDateString()}</p>

          <p className="text-slate-300 leading-relaxed mb-8">
            By accessing or using PointsTrack, you agree to be bound by these institutional Terms of Service and all applicable laws and regulations concerning academic activity tracking software.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">Acceptable Use</h2>
          <p className="text-slate-400 mb-8">
             You agree not to manipulate the point-awarding mechanisms, utilize automated spoofing scripts to artificially inflate attendances, or submit falsified institutional documents while applying for Organizer privileges. Violations of this policy will result in immediate API revocation and notification of your respective collegiate dean.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4">Service Availability</h2>
          <p className="text-slate-400">
             We strive for 99.9% uptime during peak collegiate hours, but PointsTrack is provided "as is" without warranty of uninterrupted service. We are not liable for AICTE submission delays resulting from localized network outages.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
