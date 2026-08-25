import { useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore'
import { Shield, Mail, Lock, User, Phone, LogIn, AlertCircle } from 'lucide-react'

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isForgot) {
        // Send reset email
        await sendPasswordResetEmail(auth, email)
        setMessage('Password reset email sent. Please check your inbox.')
        setLoading(false)
        return
      }

      if (isSignUp) {
        // Create new user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Check if this is the first user in the database
        const usersQuery = query(collection(db, 'users'), limit(1))
        const usersSnap = await getDocs(usersQuery)
        const isFirstUser = usersSnap.empty

        // User role is 'admin' for the first user, 'customer' for subsequent ones
        const role = isFirstUser ? 'admin' : 'customer'

        // Save profile in Firestore
        const profile = {
          uid: user.uid,
          email: user.email,
          fullName: fullName || email.split('@')[0],
          phone: phone || '',
          role: role,
          isActive: true,
          createdAt: new Date().toISOString()
        }

        await setDoc(doc(db, 'users', user.uid), profile)
        onLoginSuccess(profile)
      } else {
        // Login existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Fetch Firestore profile
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
          // If Firestore profile doesn't exist (e.g. login created via Firebase Console)
          // we create a default admin profile for it
          const profile = {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || email.split('@')[0],
            phone: '',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString()
          }
          await setDoc(doc(db, 'users', user.uid), profile)
          onLoginSuccess(profile)
        }
      }
    } catch (err) {
      console.error(err)
      let displayError = err.message
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        displayError = 'Invalid email or password'
      } else if (err.code === 'auth/email-already-in-use') {
        displayError = 'This email is already in use.'
      } else if (err.code === 'auth/weak-password') {
        displayError = 'Password should be at least 6 characters.'
      } else if (err.code === 'auth/invalid-email') {
        displayError = 'Please enter a valid email address.'
      }
      setError(displayError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card animate-enter">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={32} />
          </div>
          <h2>
            {isForgot ? 'Reset Password' : isSignUp ? 'Create Admin Account' : 'Sign in to Subscriptly'}
          </h2>
          <p>
            {isForgot
              ? 'Enter your email address and we will send you a link to reset your password.'
              : isSignUp
              ? 'Sign up to configure and manage your subscriptions.'
              : 'Enter your credentials to access the subscription portal.'}
          </p>
        </div>

        {error && (
          <div className="alert-box danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="alert-box success">
            <Shield size={16} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isSignUp && !isForgot && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }}>
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }}>
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    className="form-control"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: 40 }}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {!isForgot && (
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: 40 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 10 }} disabled={loading}>
            {loading ? 'Please wait...' : isForgot ? 'Send Password Reset Link' : isSignUp ? 'Sign Up & Continue' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          {isForgot ? (
            <p>
              Remember your password?
              <button className="auth-link" onClick={() => setIsForgot(false)}>
                Sign In
              </button>
            </p>
          ) : isSignUp ? (
            <p>
              Already have an account?
              <button className="auth-link" onClick={() => setIsSignUp(false)}>
                Sign In
              </button>
            </p>
          ) : (
            <>
              <p style={{ marginBottom: 8 }}>
                Don't have an account?
                <button className="auth-link" onClick={() => setIsSignUp(true)}>
                  Sign Up (First user becomes Admin)
                </button>
              </p>
              <p>
                Forgot your password?
                <button className="auth-link" onClick={() => setIsForgot(true)}>
                  Reset Password
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
