'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db, storage } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { Calendar, MapPin, Users, Clock, Upload, X } from 'lucide-react'

export default function CreateEventPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: '',
    points: '10',
    openToAll: false
  })

  // File Upload State
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [pastFiles, setPastFiles] = useState<File[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBannerFile(e.target.files[0])
    }
  }

  const handlePastFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setPastFiles(prev => [...prev, ...newFiles])
    }
  }

  const removePastFile = (index: number) => {
    setPastFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !profile) {
      toast.error("You must be logged in to create an event")
      return;
    }
    
    setIsSubmitting(true)
    
    try {
      const eventId = Date.now().toString() // Temporary ID for folder structure
      let uploadedUrls: string[] = []

      // 1. Upload Banner (First Image)
      if (bannerFile) {
        toast.success("Uploading main banner...", { id: 'upload' })
        const url = await uploadFile(bannerFile, `events/${eventId}/banner_${bannerFile.name}`)
        uploadedUrls.push(url)
      }

      // 2. Upload Past Images (Subsequent Images)
      if (pastFiles.length > 0) {
        toast.success(`Uploading ${pastFiles.length} carousel images...`, { id: 'upload' })
        const pastUploadPromises = pastFiles.map(file => 
          uploadFile(file, `events/${eventId}/gallery_${Date.now()}_${file.name}`)
        )
        const pastUrls = await Promise.all(pastUploadPromises)
        uploadedUrls.push(...pastUrls)
      }

      // 3. Save to Firestore
      toast.success("Creating event record...", { id: 'upload' })
      await addDoc(collection(db, "upcoming_events"), {
        title: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        // Keep legacy date field for sorting fallback, use start properties
        date: formData.startTime ? `${formData.startDate}T${formData.startTime}` : `${formData.startDate}T00:00`, 
        location: formData.location,
        type: "Activity", 
        points: parseInt(formData.points, 10) || 10,
        description: formData.description,
        capacity: parseInt(formData.capacity, 10) || 0,
        organizerId: user.uid,
        clubName: profile.clubName,
        clubLogo: profile.logo || '', 
        targetCollege: profile.college, 
        openToAll: formData.openToAll,
        images: uploadedUrls, 
        certificateUrl: uploadedUrls[0] || '', // Fallback
        createdAt: new Date().toISOString()
      })
      
      toast.success("Event broadcasted successfully!", { id: 'upload' })
      router.push('/organizer/dashboard')
    } catch (error) {
      console.error(error)
      toast.error("Failed to post event.", { id: 'upload' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Create Event</h1>
        <p className="text-slate-300 mb-8">Set up a new event and start tracking attendees</p>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-8 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Event Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tech Conference 2024"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell attendees about your event..."
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Date Range */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Start Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">End Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Time Range */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Start Time (Optional)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">End Time (Optional)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Location *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="San Francisco, CA"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Capacity and Points */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Expected Capacity *</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="500"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Activity Points Awarded *</label>
              <div className="relative">
                <div className="absolute left-3 top-3 w-5 h-5 flex items-center justify-center text-slate-400 font-bold">P</div>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Open to All Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <input
              type="checkbox"
              id="openToAll"
              name="openToAll"
              checked={formData.openToAll}
              onChange={(e) => setFormData(prev => ({ ...prev, openToAll: e.target.checked }))}
              className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50 bg-slate-900"
            />
            <label htmlFor="openToAll" className="text-sm font-medium text-slate-200 cursor-pointer select-none flex-1">
              Open to other colleges
              <p className="text-xs text-slate-400 mt-0.5">If checked, students outside your college can also see and join this event.</p>
            </label>
          </div>

          {/* Storage Image Uploads */}
          <div className="space-y-6 pt-4 border-t border-slate-800">
            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Main Banner Image (Optional)</label>
              <div className="relative">
                <Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">The primary thumbnail shown on event cards.</p>
            </div>

            {/* Past Event Images */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Past Event Images / Gallery (Optional)</label>
              <div className="relative">
                <Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePastFilesChange}
                  className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Select multiple files to create an Image Carousel.</p>
              
              {/* Selected Files Preview */}
              {pastFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Selected files:</p>
                  {pastFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-300 truncate max-w-[80%]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removePastFile(index)}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex justify-center items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50"
            >
              {isSubmitting && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              )}
              {isSubmitting ? 'Processing Uploads...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-slate-800/50 border border-slate-700 text-white hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
