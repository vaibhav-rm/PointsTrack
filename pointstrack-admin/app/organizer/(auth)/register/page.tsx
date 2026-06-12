'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, Lock, User, Building2, Briefcase, Calendar, FileText, Users,
  ArrowLeft, ArrowRight, Check, Eye, EyeOff,
} from 'lucide-react'

import { registerOrganizer } from '@/lib/api'
import toast from 'react-hot-toast'
import { COLLEGES } from '@/lib/colleges'

const steps = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Club details' },
]

const inputClasses =
  'w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    college: '',
    bio: '',
    establishedDate: '',
    coreTeam: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const goNext = () => {
    // Validate the account step before advancing.
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all account fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setDirection(1)
    setStep(2)
  }

  const goBack = () => {
    setDirection(-1)
    setStep(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName || !formData.companyName || !formData.college) {
      toast.error('Please fill in your name, club name, and college')
      return
    }

    setIsLoading(true)
    try {
      await registerOrganizer({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        clubName: formData.companyName,
        college: formData.college,
        bio: formData.bio,
        establishedDate: formData.establishedDate,
        coreTeam: formData.coreTeam,
      })

      toast.success('Welcome to PointsTrack! 🎉')
      router.push('/organizer/dashboard')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const slide = {
    initial: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    animate: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 w-fit mx-auto mb-6 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-white font-black text-sm">P</span>
        </div>
        <span className="font-bold text-white text-lg tracking-tight">
          Points<span className="text-cyan-400">Track</span>
        </span>
      </Link>

      <div className="backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-slate-950/40">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Create your organizer account</h1>
          <p className="text-slate-400 text-sm mt-1">Publish events and start awarding points — free.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((s, i) => {
            const active = step === s.id
            const done = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done
                        ? 'bg-cyan-500 text-white'
                        : active
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-xs font-medium ${active || done ? 'text-white' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px ${done ? 'bg-cyan-500/50' : 'bg-slate-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 ? (
              <motion.div
                key="step1"
                custom={direction}
                variants={slide}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@club.com"
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      className={`${inputClasses} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      className={inputClasses}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="group w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                custom={direction}
                variants={slide}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* Club Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Club Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Tech Club"
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* College */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    College <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <select
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      className={`${inputClasses} appearance-none`}
                    >
                      <option value="" disabled>Select your college</option>
                      {COLLEGES.map((college, index) => (
                        <option key={`${college.code}-${index}`} value={college.name}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Club Bio <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell students what your club is about..."
                      rows={2}
                      className={`${inputClasses} resize-none`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Established Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">Established</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        name="establishedDate"
                        value={formData.establishedDate}
                        onChange={handleChange}
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  {/* Core Team */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">Core Team</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="coreTeam"
                        value={formData.coreTeam}
                        onChange={handleChange}
                        placeholder="Jane (Pres)"
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && (
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {isLoading ? 'Creating...' : 'Create account'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      <p className="text-center text-slate-400 text-sm mt-6">
        Already have an account?{' '}
        <Link href="/organizer/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
