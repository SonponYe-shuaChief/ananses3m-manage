import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import ToBuy from './pages/ToBuy'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

function App() {
  // Check if environment variables are properly set
  const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
                        import.meta.env.VITE_SUPABASE_ANON_KEY &&
                        import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url_here' &&
                        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'

  if (!hasValidConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Configuration Required</h1>
            <p className="text-gray-600 mb-4">
              The application needs to be configured with Supabase environment variables.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator or check the deployment settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <AuthGuard>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/dashboard" element={
              <AuthGuard>
                <Layout>
                  <Dashboard />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/orders" element={
              <AuthGuard>
                <Layout>
                  <Orders />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/tobuy" element={
              <AuthGuard>
                <Layout>
                  <ToBuy />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/profile" element={
              <AuthGuard>
                <Layout>
                  <Profile />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/settings" element={
              <AuthGuard>
                <Layout>
                  <Settings />
                </Layout>
              </AuthGuard>
            } />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App