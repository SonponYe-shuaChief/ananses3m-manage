import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'manager',
    company_name: '',
    company_type: 'new', // 'new' or 'existing'
    invitation_code: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp, user } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password)
        if (error) throw error
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          role: formData.role,
          company_name: formData.company_name,
          company_type: formData.company_type,
          invitation_code: formData.invitation_code
        })
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Anansesɛm Orders Manager
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required={!isLogin}
                    className="input-field mt-1"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="input-field mt-1"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Setup
                  </label>
                  <div className="space-y-3">
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="company_type"
                          value="new"
                          checked={formData.company_type === 'new'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        Create New Company
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="company_type"
                          value="existing"
                          checked={formData.company_type === 'existing'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        Join Existing Company
                      </label>
                    </div>
                    
                    {formData.company_type === 'new' && (
                      <div>
                        <input
                          id="company_name"
                          name="company_name"
                          type="text"
                          required={!isLogin && formData.company_type === 'new'}
                          className="input-field"
                          placeholder="Enter your company name"
                          value={formData.company_name}
                          onChange={handleChange}
                        />
                      </div>
                    )}
                    
                    {formData.company_type === 'existing' && (
                      <div>
                        <input
                          id="invitation_code"
                          name="invitation_code"
                          type="text"
                          required={!isLogin && formData.company_type === 'existing'}
                          className="input-field"
                          placeholder="Enter invitation code"
                          value={formData.invitation_code}
                          onChange={handleChange}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field mt-1"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                className="input-field mt-1"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login