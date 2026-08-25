import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'

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
      setError('Firebase environment variables are missing! Configure in your Netlify settings.')
    }
  }, [])

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    setIsDark(dark)
  }

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
      setError('Firebase configuration is missing!')
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

  const logoUrl = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg'

  return (
    <div className="login-container">
      {onNavigate && (
        <button 
          onClick={() => onNavigate('home')} 
          className="btn btn-outline" 
          style={{ position: 'absolute', top: 20, left: 24, fontSize: 13, color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.2)' }}
        >
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
      )}

      <div className="login-box">
        <img src={logoUrl} alt="Logo" className="login-logo" />
        <h2>Sign In</h2>

        {error && (
          <div className="alert-box danger" style={{ marginBottom: 20 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success" style={{ marginBottom: 20 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {isForgot ? (
            <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>Registered Email ID</label>
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
              <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  <i className="fas fa-user" style={{ marginRight: 6 }}></i> Username
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

              <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  <i className="fas fa-lock" style={{ marginRight: 6 }}></i> Password
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 25 }}>
            {!isForgot && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" defaultChecked /> Remember Me
              </label>
            )}
            <button
              type="button"
              onClick={() => setIsForgot(!isForgot)}
              style={{ fontSize: 13, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--navy-accent)' }}
            >
              {isForgot ? 'Back to Login' : 'Forgot Password?'}
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 20px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <span>{isForgot ? 'Reset Password' : 'Login'}</span>
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        {onNavigate && (
          <div style={{ marginTop: 25, fontSize: 13, borderTop: '1px solid #e9ecef', paddingTop: 15, color: '#666' }}>
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('signup') }} style={{ color: 'var(--navy-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Register Now
            </a>
          </div>
        )}

        <div className="login-footer">
          <p>© {new Date().getFullYear()} Mr.Rahul Scripts. All rights reserved.</p>
        </div>
      </div>

      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme} 
        style={{ position: 'fixed', bottom: 20, right: 20, width: 44, height: 44, borderRadius: '50%', border: 0, background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        title="Toggle Theme"
      >
        <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} style={{ fontSize: 18, color: '#333' }}></i>
      </button>
    </div>
  )
}
