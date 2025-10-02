import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const { signIn, signUp, resetPassword, user, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'worker',
    company_type: 'existing',
    company_name: '',
    invitation_code: ''
  })

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, navigate, location])

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (showForgotPassword) {
      if (!formData.email) {
        toast.error('Please enter your email address')
        return
      }
      
      const { error } = await resetPassword(formData.email)
      if (!error) {
        toast.success('Password reset email sent! Check your inbox.')
        setShowForgotPassword(false)
      }
      return
    }

    if (isSignUp) {
      // Validation for sign up
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields')
        return
      }

      if (formData.company_type === 'new' && !formData.company_name) {
        toast.error('Please enter your company name')
        return
      }

      if (formData.company_type === 'existing' && !formData.invitation_code) {
        toast.error('Please enter your invitation code')
        return
      }

      const metadata = {
        full_name: formData.full_name,
        role: formData.role,
        company_type: formData.company_type,
        ...(formData.company_type === 'new' && { company_name: formData.company_name }),
        ...(formData.company_type === 'existing' && { invitation_code: formData.invitation_code })
      }

      const { user, error } = await signUp(formData.email, formData.password, metadata)
      
      if (!error && user) {
        toast.success('Account created successfully!')
        // Navigate will happen automatically via useEffect when user state updates
      }
    } else {
      // Sign in
      if (!formData.email || !formData.password) {
        toast.error('Please enter your email and password')
        return
      }

      const { user, error } = await signIn(formData.email, formData.password)
      
      if (!error && user) {
        toast.success('Welcome back!')
        // Navigate will happen automatically via useEffect when user state updates
      }
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'worker',
      company_type: 'existing',
      company_name: '',
      invitation_code: ''
    })
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setShowForgotPassword(false)
    resetForm()
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div>
            <img
              className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover"
              src="/amaya.png"
              alt="AMAYA Logo"
            />
            <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-xs sm:text-sm text-gray-600">
              Enter your email address and we'll send you a reset link.
            </p>
          </div>
          
          <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-sm sm:text-base py-2.5 sm:py-3"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="btn-secondary text-sm sm:text-base py-2.5 sm:py-3"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <img
            className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover"
            src="/amaya.png"
            alt="AMAYA Logo"
          />
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-xs sm:text-sm text-gray-600">
            AMAYA Orders Manager
          </p>
        </div>
        
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className="input-field mt-1"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    className="input-field mt-1"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="company_type" className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <select
                    id="company_type"
                    name="company_type"
                    required
                    className="input-field mt-1"
                    value={formData.company_type}
                    onChange={handleInputChange}
                  >
                    <option value="existing">Join existing company</option>
                    <option value="new">Create new company</option>
                  </select>
                </div>

                {formData.company_type === 'new' && (
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <input
                      id="company_name"
                      name="company_name"
                      type="text"
                      required
                      className="input-field mt-1"
                      placeholder="Enter your company name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                    />
                  </div>
                )}

                {formData.company_type === 'existing' && (
                  <div>
                    <label htmlFor="invitation_code" className="block text-sm font-medium text-gray-700">
                      Invitation Code
                    </label>
                    <input
                      id="invitation_code"
                      name="invitation_code"
                      type="text"
                      required
                      className="input-field mt-1"
                      placeholder="Enter invitation code"
                      value={formData.invitation_code}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
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
                onChange={handleInputChange}
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
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                className="input-field mt-1"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-sm sm:text-base py-2.5 sm:py-3"
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-center text-xs sm:text-sm text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </button>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs sm:text-sm text-primary-600 hover:text-primary-500"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login