'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/landing/navbar'
import Footer from '@/components/landing/footer'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, MessageSquare, Building2, Send, CheckCircle } from 'lucide-react'

const contactOptions = [
  {
    icon: MessageSquare,
    title: 'General Inquiries',
    description: 'Questions about the platform or how to get started.',
    email: 'hello@pointstrack.app',
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Mail,
    title: 'Technical Support',
    description: 'Students or organizers experiencing issues.',
    email: 'support@pointstrack.app',
    accent: 'from-violet-500 to-blue-600',
  },
  {
    icon: Building2,
    title: 'Enterprise Licensing',
    description: 'Onboard your entire college onto PointsTrack.',
    email: 'sales@pointstrack.app',
    accent: 'from-emerald-500 to-teal-600',
  },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire up to API route
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 inner-page-gradient pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 mb-10 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>

            <span className="section-label text-cyan-400/80">Contact</span>
            <h1 className="page-hero-title mb-4">
              Get in{' '}
              <span className="gradient-text-cyan">touch</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
              Whether you're a student, organizer, or college admin — we'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="flex-1 px-4 pb-24">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">

          {/* Left: contact options */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {contactOptions.map((opt, i) => (
              <motion.div
                key={opt.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + i * 0.08 }}
                className="glass-card p-5 group flex items-start gap-4"
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${opt.accent} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
                >
                  <opt.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm mb-0.5">{opt.title}</h3>
                  <p className="text-slate-400 text-xs mb-2 leading-relaxed">{opt.description}</p>
                  <a
                    href={`mailto:${opt.email}`}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
                  >
                    {opt.email}
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: contact form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card p-7"
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-slate-400 text-sm">We&apos;ll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-semibold text-white mb-5">Send a message</h3>

                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="john@college.edu"
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-slate-900 transition-all duration-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-200 hover:-translate-y-px"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
