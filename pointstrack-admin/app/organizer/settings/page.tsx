'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { api, uploadFile, type OrganizerProfile } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { User, Users, Image as ImageIcon, Briefcase, Camera, Upload, Palette, Check } from 'lucide-react'
import { COLLEGES } from '@/lib/colleges'
import { DEFAULT_ACCENT } from '@/lib/api'
import ClubPageCustomizer from '@/components/organizer/ClubPageCustomizer'

// Curated presets; organizers can also pick any custom colour.
const THEME_PRESETS = [
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Slate', value: '#475569' },
]

export default function SettingsPage() {
  const { user, profile, setProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState({ logo: false, cover: false })
  
  const [formData, setFormData] = useState({
    fullName: '',
    clubName: '',
    college: '',
    bio: '',
    logo: '',
    coverImage: '',
    establishedDate: '',
    coreTeam: '',
    accentColor: DEFAULT_ACCENT,
    // Public club-page customization
    links: [] as { type: string; url: string }[],
    gallery: [] as string[],
    announcement: '',
    announcementLink: '',
    coverStyle: 'gradient' as 'gradient' | 'solid',
    secondaryColor: '',
    hiddenSections: [] as string[],
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        clubName: profile.clubName || '',
        college: profile.college || '',
        bio: profile.bio || '',
        logo: profile.logo || '',
        coverImage: profile.coverImage || '',
        establishedDate: profile.establishedDate || '',
        coreTeam: profile.coreTeam || '',
        accentColor: profile.accentColor || DEFAULT_ACCENT,
        links: profile.links || [],
        gallery: profile.gallery || [],
        announcement: profile.announcement || '',
        announcementLink: profile.announcementLink || '',
        coverStyle: (profile.coverStyle as 'gradient' | 'solid') || 'gradient',
        secondaryColor: profile.secondaryColor || '',
        hiddenSections: profile.hiddenSections || [],
      })
      setIsLoading(false)
    }
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverImage') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(prev => ({ ...prev, [field === 'logo' ? 'logo' : 'cover']: true }));
    try {
      const url = await uploadFile(file);
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success(`${field === 'logo' ? 'Logo' : 'Cover Image'} uploaded successfully!`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to upload ${field}.`);
    } finally {
      setIsUploading(prev => ({ ...prev, [field === 'logo' ? 'logo' : 'cover']: false }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("You must be logged in to update settings")
      return;
    }
    
    setIsSubmitting(true)
    
    try {
      const updated = await api.patch<OrganizerProfile>('/profile/organizer', {
        fullName: formData.fullName,
        clubName: formData.clubName,
        college: formData.college,
        bio: formData.bio,
        logo: formData.logo,
        coverImage: formData.coverImage,
        establishedDate: formData.establishedDate,
        coreTeam: formData.coreTeam,
        accentColor: formData.accentColor,
        links: formData.links.filter((l) => l.url.trim()),
        gallery: formData.gallery,
        announcement: formData.announcement || null,
        announcementLink: formData.announcementLink || null,
        coverStyle: formData.coverStyle,
        secondaryColor: formData.secondaryColor || null,
        hiddenSections: formData.hiddenSections,
      })

      // Keep the shared auth context (dashboard greeting, theme, etc.) in sync.
      setProfile(updated)
      toast.success("Profile settings updated successfully!")
    } catch (error) {
      console.error(error)
      toast.error("Failed to update profile settings.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-slate-400">Loading settings...</div>
  }

  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Club Profile Settings</h1>
        <p className="text-slate-400 mb-8">Manage how your club appears on the PointsTrack mobile app.</p>

        {/* Live Preview Header — reflects the chosen accent, like the public club page */}
        <div className="mb-8 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50">
           <div className="w-full h-32 relative" style={{ background: `linear-gradient(135deg, ${formData.accentColor}, ${formData.accentColor}33)` }}>
             {formData.coverImage ? (
               <img src={formData.coverImage} className="w-full h-full object-cover" alt="Cover" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
                  <Camera className="w-8 h-8 opacity-70 mb-2" />
                  <span className="text-sm">No Cover Image</span>
               </div>
             )}
           </div>
           <div className="px-6 pb-6 pt-0 relative">
              <div className="w-20 h-20 rounded-full bg-slate-800 -mt-10 overflow-hidden relative z-10 flex items-center justify-center text-slate-500" style={{ border: `4px solid ${formData.accentColor}` }}>
                {formData.logo ? (
                  <img src={formData.logo} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <ImageIcon className="w-6 h-6 opacity-50" />
                )}
              </div>
              <h2 className="text-xl font-bold text-white mt-3">{formData.clubName || 'Your Club Name'}</h2>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: formData.accentColor }}>{formData.college || 'Your College'}</p>
              {formData.bio && (
                 <p className="text-sm text-slate-300 mt-3 border-l-2 pl-3" style={{ borderColor: formData.accentColor }}>{formData.bio}</p>
              )}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-8 space-y-6">
          {/* Contact / organizer name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Name (primary contact)</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Club Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Club Name</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  name="clubName"
                  value={formData.clubName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            {/* College Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">College Affiliation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <select
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Club Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell students what your club is about..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Established Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Established Date</label>
              <div className="relative">
                <input
                  type="date"
                  name="establishedDate"
                  value={formData.establishedDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Core Team */}
            <div>
               <label className="block text-sm font-medium text-slate-300 mb-2">Core Team Members</label>
               <input
                  type="text"
                  name="coreTeam"
                  value={formData.coreTeam}
                  onChange={handleChange}
                  placeholder="e.g. John (Pres), Jane (VP)"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Upload Logo Display Picture</label>
            <div className="relative">
              <Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logo')}
                className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
              />
            </div>
            {isUploading.logo && <p className="text-xs text-cyan-400 mt-2">Uploading logo to cloud...</p>}
            {!isUploading.logo && formData.logo && <p className="text-xs text-green-400 mt-2">✓ Logo embedded</p>}
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Upload Profile Header Cover</label>
            <div className="relative">
              <Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'coverImage')}
                className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
              />
            </div>
            {isUploading.cover && <p className="text-xs text-cyan-400 mt-2">Uploading cover image to cloud...</p>}
            {!isUploading.cover && formData.coverImage && <p className="text-xs text-green-400 mt-2">✓ Cover image embedded</p>}
          </div>

          {/* Theme / brand accent */}
          <div className="border-t border-slate-700/50 pt-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
              <Palette className="w-4 h-4 text-slate-400" /> Brand Theme
            </label>
            <p className="text-xs text-slate-500 mb-3">Your accent colour themes both your public club page (in the app) and your dashboard here.</p>
            <div className="flex flex-wrap items-center gap-3">
              {THEME_PRESETS.map((preset) => {
                const active = formData.accentColor.toLowerCase() === preset.value.toLowerCase()
                return (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.name}
                    onClick={() => setFormData((prev) => ({ ...prev, accentColor: preset.value }))}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: preset.value, outline: active ? `2px solid white` : 'none', outlineOffset: '2px' }}
                  >
                    {active && <Check className="w-4 h-4 text-white" />}
                  </button>
                )
              })}
              <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-700">
                <input
                  type="color"
                  aria-label="Custom accent colour"
                  value={formData.accentColor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accentColor: e.target.value }))}
                  className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 uppercase">{formData.accentColor}</span>
              </div>
            </div>
          </div>

          {/* Public club-page customization */}
          <ClubPageCustomizer
            value={{
              accentColor: formData.accentColor,
              secondaryColor: formData.secondaryColor,
              coverStyle: formData.coverStyle,
              links: formData.links,
              gallery: formData.gallery,
              announcement: formData.announcement,
              announcementLink: formData.announcementLink,
              hiddenSections: formData.hiddenSections,
            }}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || isUploading.logo || isUploading.cover}
              className="w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(isSubmitting || isUploading.logo || isUploading.cover) && (
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              )}
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
