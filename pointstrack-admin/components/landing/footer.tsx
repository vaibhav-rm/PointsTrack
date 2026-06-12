'use client'

import Link from 'next/link'
import { Github, Linkedin, Twitter } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Mobile App', href: '/mobile-app' },
    { label: 'Organizer Dashboard', href: '/organizer/login' },
    { label: 'Security', href: '/security' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Cookies', href: '/cookies' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/60 px-4 pt-16 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-14">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <span className="text-white font-black text-xs">P</span>
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                Points<span className="text-cyan-400">Track</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
              Modern AICTE Activity Points platform for engineering students and college organizers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-semibold text-slate-300 mb-4 text-sm">{group}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-500 hover:text-slate-200 text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} PointsTrack. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {[
              { icon: Twitter, href: '#', label: 'Twitter' },
              { icon: Linkedin, href: '#', label: 'LinkedIn' },
              { icon: Github, href: '#', label: 'GitHub' },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
