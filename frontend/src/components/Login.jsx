import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore'
import { User, Lock, ArrowRight, AlertCircle, RefreshCw, CheckCircle, Sun, Moon } from 'lucide-react'

export default function Login({ onLoginSuccess, onNavigate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isForgot, setIsForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  // Theme Toggle State
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.body.classList.add('dark-mode')
      setIsDark(true)
    }

    if (!auth) {
      setError('Firebase environment variables are missing! Please configure VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, etc. in your Netlify Environment Variables settings.')
    }
  }, [])

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    setIsDark(dark)
  }

  // Map simple usernames to emails for Firebase Auth
  const mapUsernameToEmail = (userVal) => {
    const trimmed = userVal.trim().toLowerCase()
    if (trimmed.includes('@')) return trimmed
    if (trimmed === 'admin') return 'admin@demo.com'
    if (trimmed === 'sales1') return 'salesperson1@demo.com'
    if (trimmed === 'customer1') return 'company1@demo.com'
    return `${trimmed}@demo.com`
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    if (!auth) {
      setError('Firebase configuration is missing! Please configure the VITE_FIREBASE_API_KEY and other environment variables in your Netlify site settings.')
      setLoading(false)
      return
    }

    const email = mapUsernameToEmail(username)

    try {
      if (isForgot) {
        await sendPasswordResetEmail(auth, forgotEmail)
        setSuccessMsg('Password reset link sent! Check your inbox.')
        setIsForgot(false)
        setLoading(false)
        return
      }

      let userCredential
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } catch (signInErr) {
        const defaultUsers = {
          'admin@demo.com': { password: 'admin123', fullName: 'Admin User', role: 'admin' },
          'salesperson1@demo.com': { password: 'sales123', fullName: 'Salesperson 1', role: 'salesperson' },
          'company1@demo.com': { password: 'cust123', fullName: 'Company 1 Portal', role: 'customer' }
        }

        if (defaultUsers[email] && defaultUsers[email].password === password) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const user = userCredential.user
          const profile = {
            uid: user.uid,
            email: email,
            fullName: defaultUsers[email].fullName,
            phone: '',
            role: defaultUsers[email].role,
            isActive: true,
            createdAt: new Date().toISOString()
          }
          await setDoc(doc(db, 'users', user.uid), profile)
        } else {
          throw signInErr
        }
      }

      const user = userCredential.user
      const docRef = doc(db, 'users', user.uid)
      const docSnap = await getDoc(docRef)
      
      let profileData = docSnap.exists() ? docSnap.data() : { uid: user.uid, email: user.email, role: 'admin', isActive: true }
      
      if (profileData.isActive === false) {
        await signOut(auth)
        setError('Your account is deactivated. Please contact administrator.')
        setLoading(false)
        return
      }

      onLoginSuccess(profileData)

    } catch (err) {
      console.error(err)
      setError('Invalid username, email ID or login password.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {onNavigate && (
          <button 
            type="button" 
            onClick={() => onNavigate('home')} 
            className="auth-link" 
            style={{ position: 'absolute', top: 20, left: 24, fontSize: 13, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-arrow-left"></i> Back to Home
          </button>
        )}

        <div className="auth-header">
          <div className="auth-logo-wrap">
            <span className="auth-logo-circle"></span>
          </div>
          <h2>Sign In</h2>
          <p>Login to manage your subscription configurations</p>
        </div>

        {error && (
          <div className="alert-box danger" style={{ marginBottom: 15 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success" style={{ marginBottom: 15 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {isForgot ? (
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Registered Email ID</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email ID"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>
                  <User size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Username
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>
                  <Lock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 20 }}>
            {!isForgot && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" defaultChecked /> Remember Me
              </label>
            )}
            <button
              type="button"
              className="auth-link"
              onClick={() => setIsForgot(!isForgot)}
              style={{ fontSize: 13, border: 0, background: 'transparent', cursor: 'pointer' }}
            >
              {isForgot ? 'Back to Login' : 'Forgot Password?'}
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? (
              <RefreshCw className="spinner" size={16} />
            ) : (
              <>
                <ArrowRight size={16} style={{ display: 'inline', marginRight: 6 }} />
                {isForgot ? 'Reset Password' : 'Login'}
              </>
            )}
          </button>
        </form>

        {onNavigate && (
          <div style={{ marginTop: 20, fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 15 }}>
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('signup') }} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register Now
            </a>
          </div>
        )}

        <div className="login-footer" style={{ marginTop: 20 }}>
          <p>© {new Date().getFullYear()} Mr.Rahul Scripts. All rights reserved.</p>
        </div>
      </div>

      {/* Theme Toggle Button */}
      <button className="login-theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
