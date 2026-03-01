'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/50 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">PointsTrack</h3>
            <p className="text-slate-400 text-sm">
              Modern AICTE Activity Points platform for engineering students and college organizers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="/mobile-app" className="hover:text-cyan-400 transition">Mobile App</Link></li>
              <li><Link href="/login" className="hover:text-cyan-400 transition">Organizer Dashboard</Link></li>
              <li><Link href="/security" className="hover:text-cyan-400 transition">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="/about" className="hover:text-cyan-400 transition">About</Link></li>
              <li><Link href="/blog" className="hover:text-cyan-400 transition">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-cyan-400 transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="/privacy" className="hover:text-cyan-400 transition">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-cyan-400 transition">Terms</Link></li>
              <li><Link href="/cookies" className="hover:text-cyan-400 transition">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} PointsTrack. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-slate-400 hover:text-cyan-400 transition">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-cyan-400 transition">LinkedIn</a>
            <a href="#" className="text-slate-400 hover:text-cyan-400 transition">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
