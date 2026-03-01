'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Settings, LayoutDashboard, Calendar, LineChart, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/organizer/events', label: 'Events', icon: Calendar },
    { href: '/organizer/analytics', label: 'Analytics', icon: LineChart },
    { href: '/organizer/attendees', label: 'Attendees', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static w-64 h-screen bg-slate-900 border-r border-slate-800 transform transition-transform z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold gradient-text">PointsTrack</h1>
        </div>

        <nav className="p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/organizer/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group mb-2 ${
                  isActive 
                    ? 'bg-slate-800 text-cyan-400' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 space-y-2">
          <Link 
            href="/organizer/settings"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-red-900/20 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:w-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <h1 className="font-bold gradient-text text-xl">PointsTrack</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
