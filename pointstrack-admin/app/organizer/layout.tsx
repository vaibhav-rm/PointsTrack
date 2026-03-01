'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Settings, LayoutDashboard, Calendar, LineChart, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import toast from 'react-hot-toast'

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success("Signed out successfully")
      router.push('/organizer/login')
    } catch (error) {
      console.error(error)
      toast.error("Failed to sign out")
    }
  }

  const navItems = [
    { href: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/organizer/events', label: 'Events', icon: Calendar },
    { href: '/organizer/analytics', label: 'Analytics', icon: LineChart },
    { href: '/organizer/attendees', label: 'Attendees', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Always Visible) */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-slate-900 border-r border-slate-800 z-40 shrink-0 sticky top-0">
        <SidebarContent 
          navItems={navItems} 
          pathname={pathname} 
          setSidebarOpen={setSidebarOpen} 
          handleSignOut={handleSignOut} 
        />
      </aside>

      {/* Mobile Sidebar (Animated off-canvas) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed md:hidden flex flex-col w-72 h-screen bg-slate-900 border-r border-slate-800 z-40 top-0 left-0 shadow-2xl"
          >
            <SidebarContent 
              navItems={navItems} 
              pathname={pathname} 
              setSidebarOpen={setSidebarOpen} 
              handleSignOut={handleSignOut} 
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-h-screen min-w-0">
        {/* Mobile Header (Sticky & Glassmorphic) */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="font-bold text-white text-xl tracking-tight hidden sm:block">PointsTrack</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-300"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}

function SidebarContent({ navItems, pathname, setSidebarOpen, handleSignOut }: any) {
  return (
    <>
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">PointsTrack</h1>
          <p className="text-xs font-medium text-cyan-400">Organizer Portal</p>
        </div>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item: any) => {
            const isActive = pathname === item.href || (item.href !== '/organizer/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1 bg-slate-900">
        <Link 
          href="/organizer/settings"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
            pathname.startsWith('/organizer/settings')
              ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
          }`}
        >
          <Settings className={`w-5 h-5 transition-transform duration-300 ${pathname.startsWith('/organizer/settings') ? 'scale-110' : 'group-hover:rotate-90'}`} />
          <span className="font-medium">Settings</span>
        </Link>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 border-l-2 border-transparent transition-all group"
        >
          <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )
}
