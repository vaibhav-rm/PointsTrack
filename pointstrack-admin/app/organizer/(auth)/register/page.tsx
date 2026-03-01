'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Building2, Briefcase, Calendar, FileText, Users } from 'lucide-react'

import { auth, db } from '@/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { COLLEGES } from '@/lib/colleges'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    college: '',
    bio: '',
    establishedDate: '',
    coreTeam: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }
    
    setIsLoading(true)
    
    try {
      const creds = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      await setDoc(doc(db, "organizers", creds.user.uid), {
        email: formData.email,
        clubName: formData.companyName,
        college: formData.college,
        bio: formData.bio,
        establishedDate: formData.establishedDate,
        coreTeam: formData.coreTeam,
        role: "organizer",
        createdAt: new Date().toISOString()
      })
      
      toast.success("Account created successfully!")
      router.push('/organizer/dashboard')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-2xl p-8 mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-slate-300">Start publishing events with PointsTrack</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Full Name <span className="text-red-400">*</span></label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Company / Club Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Club Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Tech Club"
                className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* College Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">College Affiliation <span className="text-red-400">*</span></label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <select
                name="college"
                value={formData.college}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                required
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
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Club Bio</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell students what your club is about..."
              rows={2}
              className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Established Date */}
          <div>
             <label className="block text-sm font-medium text-slate-200 mb-2">Established Date</label>
             <div className="relative">
               <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
               <input
                 type="date"
                 name="establishedDate"
                 value={formData.establishedDate}
                 onChange={handleChange}
                 className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
               />
             </div>
          </div>

          {/* Core Team */}
          <div>
             <label className="block text-sm font-medium text-slate-200 mb-2">Core Team Members</label>
             <div className="relative">
               <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
               <input
                 type="text"
                 name="coreTeam"
                 value={formData.coreTeam}
                 onChange={handleChange}
                 placeholder="e.g. John (Pres), Jane (VP)"
                 className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
               />
             </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2 mt-4 text-cyan-400">Security Credentials</label>
          <label className="block text-sm font-medium text-slate-200 mb-2">Email Address <span className="text-red-400">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Confirm Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 rounded-lg glass-effect bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 mt-4 rounded-lg font-bold transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-lg p-4 mb-6">
        <p className="text-xs text-slate-300">
          By creating an account, you agree to our <a href="#" className="text-cyan-400 hover:underline">Terms of Service</a> and <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a>
        </p>
      </div>

      <div className="text-center">
        <p className="text-slate-300">
          Already have an account?{' '}
          <Link href="/organizer/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
