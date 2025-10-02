import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Layout = ({ children }) => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Orders', href: '/orders', icon: '📋' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} fixed inset-0 z-50 lg:block lg:static lg:inset-auto`}>
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-gray-600 opacity-75 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        
        {/* Sidebar content */}
        <div className="relative w-64 h-full bg-white shadow-lg lg:shadow-none">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
            <img 
              src="/anasesem.jpg" 
              alt="Anansesɛm Logo" 
              className="h-8 w-8 rounded-full"
            />
            <span className="ml-2 text-lg font-semibold text-white">Amaya</span>
          </div>

          {/* Navigation */}
          <nav className="mt-8">
            <div className="px-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    location.pathname === item.href
                      ? 'bg-primary-100 text-primary-900 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 border-transparent'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 mb-1 transition-colors duration-200`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* User info and sign out */}
          <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Sign out"
              >
                <span className="text-lg">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Anansesɛm Orders Manager
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications placeholder */}
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout