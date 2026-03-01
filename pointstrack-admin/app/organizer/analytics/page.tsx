'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return;
      try {
        // Fetch events
        const eventsQ = query(collection(db, "upcoming_events"), where("organizerId", "==", user.uid));
        const eventsSnapshot = await getDocs(eventsQ);
        const fetchedEvents: any[] = [];
        eventsSnapshot.forEach((doc) => fetchedEvents.push({ id: doc.id, ...doc.data() }));
        setEvents(fetchedEvents);

        // Fetch attendees
        const attendeesQ = query(collection(db, "attendees"), where("organizerId", "==", user.uid));
        const attendeesSnapshot = await getDocs(attendeesQ);
        const fetchedAttendees: any[] = [];
        attendeesSnapshot.forEach((doc) => fetchedAttendees.push({ id: doc.id, ...doc.data() }));
        setAttendees(fetchedAttendees);
        
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user]);

  const checkedInCount = attendees.filter(a => a.status === 'checked-in').length;

  const metrics = [
    { label: 'Total Check-ins', value: checkedInCount.toString(), change: 'Live', icon: Users },
    { label: 'Avg. Session Time', value: 'N/A', change: '--', icon: Clock },
    { label: 'Total Registrations', value: attendees.length.toString(), change: 'Live', icon: TrendingUp },
    { label: 'Active Events', value: events.length.toString(), change: 'Live', icon: BarChart3 },
  ]

  // 1. Dynamic Attendance Trend (Last 7 Days)
  const getAttendanceTrend = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun - Sat
    
    attendees.forEach(a => {
      if (a.checkInTimestamp) {
        // Handle Firestore Timestamp or string dates
        const date = a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp);
        const dayIndex = date.getDay();
        trendCounts[dayIndex]++;
      }
    });

    // Reorder array so today is last, and previous 6 days precede it.
    const todayIndex = new Date().getDay();
    const orderedTrend = [];
    
    // Calculate max to normalize percentages
    const maxCount = Math.max(...trendCounts, 1); // Avoid div by 0
    
    for (let i = 6; i >= 0; i--) {
      const dIndex = (todayIndex - i + 7) % 7;
      orderedTrend.push({
        day: days[dIndex],
        count: trendCounts[dIndex],
        percentage: Math.floor((trendCounts[dIndex] / maxCount) * 100)
      });
    }
    return orderedTrend;
  };
  const trendData = getAttendanceTrend();

  // 2. Dynamic Engagement Distribution
  const getEngagementStats = () => {
    const total = attendees.length || 1; // avoid division by zero
    const high = attendees.filter(a => a.engagement === 'High').length;
    const medium = attendees.filter(a => a.engagement === 'Medium').length;
    const low = attendees.filter(a => a.engagement === 'Low' || a.engagement === 'Pending').length;

    return [
      { label: 'High', value: Math.round((high / total) * 100), color: 'bg-green-500' },
      { label: 'Medium', value: Math.round((medium / total) * 100), color: 'bg-blue-500' },
      { label: 'Low', value: Math.round((low / total) * 100), color: 'bg-slate-500' },
    ];
  };
  const engagementData = getEngagementStats();

  // 3. Dynamic Event Performance (Top 3)
  const getPerformanceStats = () => {
    // Create map of event ID -> Attendee Count
    const attendanceMap: Record<string, number> = {};
    attendees.forEach(a => {
      if (a.status === 'checked-in') {
         attendanceMap[a.eventId] = (attendanceMap[a.eventId] || 0) + 1;
      }
    });

    // Map events and sort
    const mapped = events.map(event => ({
      event: event.title,
      attendees: attendanceMap[event.id] || 0,
      rating: 5.0 // Ratings not yet implemented, defaulting
    }));

    return mapped.sort((a, b) => b.attendees - a.attendees).slice(0, 5);
  };
  const performanceStats = getPerformanceStats();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-slate-300">Track and analyze your event performance</p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <metric.icon className="w-6 h-6 text-cyan-400" />
              <span className="text-xs font-semibold text-green-400">{metric.change}</span>
            </div>
            <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
            <p className="text-3xl font-bold text-white">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Attendance Trend */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Attendance Trend (Past 7 Days)</h3>
          <div className="space-y-4">
            {trendData.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">{item.day}</span>
                  <span className="text-slate-400">{item.count} check-ins</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${item.percentage > 0 ? Math.max(item.percentage, 5) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Distribution */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Engagement Distribution</h3>
          <div className="space-y-4">
            {engagementData.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-slate-400">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Detailed Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="backdrop-blur-md bg-white/10 dark:bg-slate-900/30 border border-white/20 dark:border-slate-700/30 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Top Performing Events</h3>
        {performanceStats.length === 0 && (
           <p className="text-slate-400 italic">No event data available yet.</p>
        )}
        <div className="space-y-4">
          {performanceStats.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-slate-800/50 rounded-lg hover:bg-slate-800/30 transition-colors">
              <div>
                <p className="font-semibold text-white">{item.event}</p>
                <p className="text-sm text-slate-400">{item.attendees} attendees</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-cyan-400">{item.rating}★</p>
                <p className="text-xs text-slate-400">rating</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
