'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { Calendar, MapPin, Users, Clock, Upload, X } from 'lucide-react'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Unwrap the params properly using React.use for Next.js 15+
  const resolvedParams = use(params)
  const eventId = resolvedParams.id
  
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
    openToAll: false,
    existingImages: [] as string[]
  })

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [pastFiles, setPastFiles] = useState<File[]>([])

  useEffect(() => {
    const fetchEvent = async () => {
      if (!user) return;
      try {
        const eventDoc = await getDoc(doc(db, "upcoming_events", eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          // Ensure security
          if (data.organizerId !== user.uid) {
             toast.error("You do not have permission to edit this event.");
             router.push('/organizer/events');
             return;
          }
          setFormData({
            name: data.title || '',
            description: data.description || '',
            startDate: data.startDate || data.date?.split('T')[0] || '',
            endDate: data.endDate || data.date?.split('T')[0] || '',
            startTime: data.startTime || data.date?.split('T')[1]?.substring(0,5) || '',
            endTime: data.endTime || '',
            location: data.location || '',
            capacity: data.capacity?.toString() || '',
            points: data.points?.toString() || '10',
            openToAll: data.openToAll || false,
            existingImages: data.images || [data.certificateUrl].filter(Boolean)
          });
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Failed to load event details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [user, eventId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setBannerFile(e.target.files[0])
  }

  const handlePastFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPastFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removePastFile = (index: number) => {
    setPastFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
       ...prev, 
       existingImages: prev.existingImages.filter((_, i) => i !== index)
    }));
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !profile) return;
    
    setIsSubmitting(true)
    
    try {
      let uploadedUrls: string[] = []

      // Keep remaining existing images
      uploadedUrls.push(...formData.existingImages)

      // Upload Banner (Prepends to array to replace thumbnail)
      if (bannerFile) {
        toast.success("Uploading main banner...", { id: 'upload' })
        const url = await uploadFile(bannerFile, `events/${eventId}/banner_${bannerFile.name}`)
        uploadedUrls.unshift(url) // Put at the front of the array
      }

      // Upload Past Images
      if (pastFiles.length > 0) {
        toast.success(`Uploading ${pastFiles.length} new carousel images...`, { id: 'upload' })
        const pastUploadPromises = pastFiles.map(file => 
          uploadFile(file, `events/${eventId}/gallery_${Date.now()}_${file.name}`)
        )
        const pastUrls = await Promise.all(pastUploadPromises)
        uploadedUrls.push(...pastUrls)
      }

      toast.success("Updating event record...", { id: 'upload' })
      const eventRef = doc(db, "upcoming_events", eventId);
      
      const updatePayload: any = {
        title: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        date: formData.startTime ? `${formData.startDate}T${formData.startTime}` : `${formData.startDate}T00:00`, 
        location: formData.location,
        points: parseInt(formData.points, 10) || 10,
        description: formData.description,
        capacity: parseInt(formData.capacity, 10) || 0,
        openToAll: formData.openToAll,
        updatedAt: new Date().toISOString()
      };

      if (uploadedUrls.length > 0) {
        updatePayload.images = uploadedUrls;
        updatePayload.certificateUrl = uploadedUrls[0];
      }

      await updateDoc(eventRef, updatePayload);
      
      // Fire Expo Push Notification for UPDATE
      try {
        await fetch('/api/notify-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Event Updated",
            body: `"${formData.name}" has been updated by the organizer.`,
            eventId: eventId,
            targetCollege: profile.college
          })
        });
      } catch (err) {
        console.error("Failed to notify users:", err);
      }
      
      toast.success("Event updated successfully!", { id: 'upload' })
      router.push('/organizer/events')
    } catch (error) {
      console.error(error)
      toast.error("Failed to update event.", { id: 'upload' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="text-slate-400 p-8">Loading event details...</div>;

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Edit Event</h1>
        <p className="text-slate-300 mb-8">Update details for an existing event</p>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-8 space-y-6">
          {/* Base Details */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Event Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Start Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">End Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.startDate} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Start Time (Optional)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">End Time (Optional)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Location *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" required />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Expected Capacity *</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Activity Points Awarded *</label>
              <div className="relative">
                <div className="absolute left-3 top-3 w-5 h-5 flex items-center justify-center text-slate-400 font-bold">P</div>
                <input type="number" name="points" value={formData.points} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" required />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <input type="checkbox" id="openToAll" name="openToAll" checked={formData.openToAll} onChange={(e) => setFormData(prev => ({ ...prev, openToAll: e.target.checked }))} className="w-5 h-5 rounded" />
            <label htmlFor="openToAll" className="text-sm font-medium text-slate-200 cursor-pointer flex-1">
              Open to other colleges
              <p className="text-xs text-slate-400 mt-0.5">Allow students outside your college to join.</p>
            </label>
          </div>

          {/* Existing Media Previews */}
          {formData.existingImages.length > 0 && (
             <div className="space-y-4 pt-4 border-t border-slate-800">
               <label className="block text-sm font-medium text-slate-200">Current Event Gallery</label>
               <div className="grid grid-cols-2 gap-4">
                 {formData.existingImages.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-700">
                       <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition"><X className="w-4 h-4" /></button>
                       {i === 0 && <span className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">Main Banner</span>}
                    </div>
                 ))}
               </div>
             </div>
          )}

          {/* New Media Uploads */}
          <div className="space-y-6 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Replace Banner Image (Optional)</label>
              <div className="relative"><Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" /><input type="file" accept="image/*" onChange={handleBannerChange} className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400" /></div>
              {bannerFile && <p className="text-xs text-green-400 mt-2">✓ New banner queued: {bannerFile.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Add New Gallery Images (Optional)</label>
              <div className="relative"><Upload className="absolute left-3 top-3 w-5 h-5 text-slate-500" /><input type="file" accept="image/*" multiple onChange={handlePastFilesChange} className="w-full pl-10 pr-4 py-2 text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400" /></div>
              {pastFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Queued files:</p>
                  {pastFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-300">{f.name}</span><button type="button" onClick={() => removePastFile(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button type="submit" disabled={isSubmitting} className="flex-1 flex justify-center items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50">
              {isSubmitting && <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {isSubmitting ? 'Updating Event...' : 'Update Event'}
            </button>
            <button type="button" onClick={() => router.back()} className="flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-slate-800/50 border border-slate-700 text-white hover:bg-slate-800">Cancel</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
