'use client'

import { motion } from 'framer-motion'
import { Search, Mail, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AttendeesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleStatusUpdate = async (attendeeId: string, newStatus: string, newEngagement: string) => {
    setProcessingId(attendeeId);
    try {
      const attendeeRef = doc(db, "attendees", attendeeId);
      const attendeeSnap = await getDoc(attendeeRef);
      
      if (!attendeeSnap.exists()) {
         throw new Error("Attendee not found");
      }
      
      const attendeeData = attendeeSnap.data();
      
      // Update the attendee's specific registration status
      await updateDoc(attendeeRef, {
        status: newStatus,
        engagement: newEngagement
      });
      
      // If approved, actually award the points!
      if (newStatus === 'checked-in') {
        const pointsToAward = attendeeData.pointsAwarded || 10;
        
        // Fetch the original event to retain description and type
        const originalEventRef = doc(db, "upcoming_events", attendeeData.eventId);
        const originalEventSnap = await getDoc(originalEventRef);
        
        let eventType = "Points Awarded";
        let eventDescription = `You were awarded ${pointsToAward} points for attending this event.`;
        
        if (originalEventSnap.exists()) {
            const originalData = originalEventSnap.data();
            eventType = originalData.type || eventType;
            eventDescription = originalData.description || eventDescription;
        }

        // 1. Add to the Global `events` collection so the Mobile App instantly aggregates it!
        await addDoc(collection(db, "events"), {
          userId: attendeeData.attendeeUid,
          organizerId: attendeeData.organizerId,
          eventId: attendeeData.eventId,
          clubName: originalEventSnap.exists() ? originalEventSnap.data().clubName || "" : "",
          clubLogo: originalEventSnap.exists() ? originalEventSnap.data().clubLogo || "" : "",
          title: attendeeData.event || "Activity Approved",
          type: eventType,
          description: eventDescription,
          points: pointsToAward,
          semester: 1, // Defaulting semester as standard
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
        
        // 2. Trigger targeted Push Notification!
        fetch('/api/notify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: attendeeData.attendeeUid,
                title: "Points Awarded! 🎉",
                body: `You just received ${pointsToAward} points for ${attendeeData.event}!`
            })
        }).catch(err => console.error("Failed to notify user:", err));
      }
      
      // Optimistic update
      setAttendees(prev => prev.map(a => 
        a.id === attendeeId ? { ...a, status: newStatus, engagement: newEngagement } : a
      ));
      toast.success(newStatus === 'checked-in' ? "Points allotted successfully" : "Registration rejected");
    } catch (error) {
      console.error("Error updating attendee status:", error);
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    const fetchAttendees = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "attendees"), where("organizerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const fetchedAttendees: any[] = [];
        snapshot.forEach((doc) => fetchedAttendees.push({ id: doc.id, ...doc.data() }));
        
        // Sort by check-in time descending
        fetchedAttendees.sort((a, b) => {
          if (!a.checkInTimestamp) return 1;
          if (!b.checkInTimestamp) return -1;
          return new Date(b.checkInTimestamp).getTime() - new Date(a.checkInTimestamp).getTime();
        });
        
        setAttendees(fetchedAttendees);
      } catch (error) {
        console.error("Error fetching attendees:", error);
        toast.error("Failed to load attendees list")
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, [user]);

  const filteredAttendees = attendees.filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.event?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Attendees</h1>
        <p className="text-slate-300">Manage and track all event attendees</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </motion.div>

      {/* Attendees Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Event</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Check-in</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Engagement</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((attendee, index) => (
                <tr
                  key={attendee.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{attendee.name}</p>
                      <p className="text-sm text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {attendee.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{attendee.event}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4" />
                      {attendee.checkIn}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      attendee.engagement === 'High'
                        ? 'bg-green-500/20 text-green-400'
                        : attendee.engagement === 'Medium'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}>
                      {attendee.engagement}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {attendee.status === 'checked-in' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Approved / 10 Pts</span>
                        </>
                      ) : attendee.status === 'rejected' ? (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-500 font-medium">Rejected</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(attendee.id, 'checked-in', 'High')}
                            disabled={processingId === attendee.id}
                            className={`px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-all ${processingId === attendee.id ? 'opacity-50' : ''}`}
                          >
                            Allot Points
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(attendee.id, 'rejected', 'Low')}
                            disabled={processingId === attendee.id}
                            className={`px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-all ${processingId === attendee.id ? 'opacity-50' : ''}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Total Attendees</p>
          <p className="text-3xl font-bold text-white">{filteredAttendees.length}</p>
        </div>
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Checked In</p>
          <p className="text-3xl font-bold text-green-400">{filteredAttendees.filter(a => a.status === 'checked-in').length}</p>
        </div>
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-400">{filteredAttendees.filter(a => a.status === 'pending').length}</p>
        </div>
      </motion.div>
    </div>
  )
}
