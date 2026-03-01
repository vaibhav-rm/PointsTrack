'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, Calendar, TrendingUp, Activity, ArrowUpRight, Plus, BarChart2, Users as UsersIcon, Clock } from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalEvents: 0,
    internalEvents: 0,
    openEvents: 0,
    totalPoints: 0
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "upcoming_events"), where("organizerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const fetchedEvents: any[] = [];
        
        let internal = 0;
        let open = 0;
        let points = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedEvents.push({ id: doc.id, ...data });
          
          if (data.openToAll) {
            open++;
          } else {
            internal++;
          }
          points += (data.points || 0);
        });
        
        fetchedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setStats({
          totalEvents: fetchedEvents.length,
          internalEvents: internal,
          openEvents: open,
          totalPoints: points
        });
        setRecentEvents(fetchedEvents.slice(0, 3)); // show top 3 closest events
      } catch (error) {
        console.error("Error fetching dashboard events:", error);
      }
    };

    fetchDashboardData();
  }, [user]);

  const statCards = [
    { label: 'Total Events', value: stats.totalEvents.toString(), icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { label: 'College-only Events', value: stats.internalEvents.toString(), icon: Users, color: 'from-purple-500 to-purple-600' },
    { label: 'Open-to-All Events', value: stats.openEvents.toString(), icon: Activity, color: 'from-pink-500 to-pink-600' },
    { label: 'Total Points Offered', value: stats.totalPoints.toString(), icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-300">Welcome back{profile?.clubName ? `, ${profile.clubName}` : ''}! Here's your event overview.</p>
          </div>
          <Link href="/organizer/events/create" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 w-fit">
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/50 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10 shadow-sm`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Recent Events Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Recent Events</h2>
            <Link href="/organizer/events" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Event Name</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Scope</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Points Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No recent events found. Create one to get started!
                    </td>
                  </tr>
                ) : recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{event.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{event.type || 'Activity'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {event.date.split('T')[0]}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${event.openToAll ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {event.openToAll ? 'Open to All' : 'College Only'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-white">+{event.points || 0} Pts</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions (Sidebar style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-bold text-white mb-4 px-1">Quick Actions</h2>
          
          <Link href="/organizer/events/create" className="flex items-center px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors">
              <Plus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Create New Event</h3>
              <p className="text-xs text-slate-400 mt-0.5">Publish a workshop or drive</p>
            </div>
          </Link>
          
          <Link href="/organizer/analytics" className="flex items-center px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mr-4 group-hover:bg-purple-500/20 transition-colors">
              <BarChart2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">View Analytics</h3>
              <p className="text-xs text-slate-400 mt-0.5">Check attendance rates</p>
            </div>
          </Link>
          
          <Link href="/organizer/attendees" className="flex items-center px-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mr-4 group-hover:bg-emerald-500/20 transition-colors">
              <UsersIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Manage Attendees</h3>
              <p className="text-xs text-slate-400 mt-0.5">Review student databases</p>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
