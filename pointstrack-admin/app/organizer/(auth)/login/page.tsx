'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock } from 'lucide-react'

import { login } from '@/lib/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await login(formData.email, formData.password)
      toast.success("Welcome back!")
      router.push('/organizer/dashboard')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses =
    'w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors'

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your organizer dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClasses}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-center text-slate-400 text-sm mt-6">
        Don't have an account?{' '}
        <Link href="/organizer/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
          Register your club
        </Link>
      </p>
    </motion.div>
  )
}
