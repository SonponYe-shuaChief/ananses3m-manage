import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
  const { profile, signOut, isManager } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Orders', href: '/orders', icon: '📋' },
    { name: 'Buy List', href: '/buy-list', icon: '🛒' },
    ...(isManager ? [{ name: 'Analytics', href: '/analytics', icon: '📊' }] : []),
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Anansesɛm
              </h1>
            </div>
            
            <div className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">Welcome, </span>
              <span className="font-medium text-gray-900">{profile?.full_name}</span>
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                {profile?.role}
              </span>
            </div>
            
            <button
              onClick={signOut}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-3 py-2 text-base font-medium ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navbar