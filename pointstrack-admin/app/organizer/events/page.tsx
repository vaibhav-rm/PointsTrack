'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, Users, MapPin, Clock, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "upcoming_events"), where("organizerId", "==", user.uid));
      const snapshot = await getDocs(q);
      const fetchedEvents: any[] = [];
      snapshot.forEach((doc) => fetchedEvents.push({ id: doc.id, ...doc.data() }));
      
      // Sort client side since we need composite index for where+orderBy in firestore
      fetchedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This will remove it from all students' feeds immediately.")) return;
    try {
      const eventToDelete = events.find(e => e.id === eventId);
      
      await deleteDoc(doc(db, "upcoming_events", eventId));
      setEvents(events.filter(e => e.id !== eventId));
      
      if (eventToDelete) {
        try {
          await fetch('/api/notify-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: "Event Cancelled",
              body: `"${eventToDelete.title}" has been removed from the schedule.`,
              eventId: eventId,
              targetCollege: eventToDelete.targetCollege
            })
          });
        } catch (err) {
          console.error("Failed to notify users of deletion:", err);
        }
      }
      
      toast.success("Event deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete event");
    }
  };


  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Events</h1>
            <p className="text-slate-300">Manage and track all your events</p>
          </div>
          <Link href="/organizer/events/create" className="px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 hover:-translate-y-1 w-fit">
            Create New Event
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Events</h3>
          <p className="text-slate-400">You haven't broadcasted any upcoming activities to the mobile app yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">{event.title}</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm truncate">{event.date.split('T')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm truncate">{event.date.split('T')[1]?.substring(0,5) || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm">Max {event.capacity} Capacity</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <span className="px-4 py-2 rounded-lg font-medium bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm">
                    Live Status
                  </span>
                  <Link 
                    href={`/organizer/events/edit/${event.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(event.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
