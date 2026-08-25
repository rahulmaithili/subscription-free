import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore'
import { User, Lock, ArrowRight, AlertCircle, RefreshCw, CheckCircle, Sun, Moon } from 'lucide-react'

export default function Login({ onLoginSuccess }) {
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
        // Attempt normal login
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } catch (signInErr) {
        // If user not found and they are trying to log in with default credentials,
        // automatically register them in Firebase Auth
        const defaultUsers = {
          'admin@demo.com': { password: 'admin123', fullName: 'Admin User', role: 'admin' },
          'salesperson1@demo.com': { password: 'sales123', fullName: 'Salesperson 1', role: 'salesperson' },
          'company1@demo.com': { password: 'cust123', fullName: 'Company 1 Portal', role: 'customer' }
        }

        if (defaultUsers[email] && defaultUsers[email].password === password) {
          // Register demo user
          userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const user = userCredential.user

          // Set profile in Firestore
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

      // Retrieve Firestore profile
      const docRef = doc(db, 'users', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const profile = docSnap.data()
        if (!profile.isActive) {
          await signOut(auth)
          throw new Error('Your account has been deactivated. Please contact an administrator.')
        }
        onLoginSuccess(profile)
      } else {
        // Default admin profile if document doesn't exist
        const profile = {
          uid: user.uid,
          email: user.email,
          fullName: username,
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString()
        }
        await setDoc(doc(db, 'users', user.uid), profile)
        onLoginSuccess(profile)
      }
    } catch (err) {
      console.error(err)
      let displayError = err.message
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        displayError = 'Invalid username/email or password'
      } else if (err.code === 'auth/invalid-email') {
        displayError = 'Please enter a valid email address.'
      }
      setError(displayError)
    } finally {
      setLoading(false)
    }
  }

  const logoUrl = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg'

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logoUrl} alt="Logo" className="login-logo" />
        <h2>My Company</h2>

        {error && (
          <div className="alert-box danger" style={{ textAlign: 'left', marginBottom: 20 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success" style={{ textAlign: 'left', marginBottom: 20 }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {isForgot ? (
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>
                <User size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter registered email"
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
              style={{ fontSize: 13 }}
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

        <div className="login-footer">
          <p>© {new Date().getFullYear()} My Company. All rights reserved.</p>
        </div>
      </div>

      {/* Theme Toggle Button */}
      <button className="login-theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
