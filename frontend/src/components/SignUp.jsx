import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function SignUp({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Customer details
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('India')
  const [address, setAddress] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // 1. Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const uid = cred.user.uid

      // 2. Save profile in 'users' collection
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        username,
        fullName: contactPerson || username,
        phone,
        role: 'customer',
        isActive: true,
        createdAt: new Date().toISOString()
      })

      // 3. Save details in 'customers' collection
      await addDoc(collection(db, 'customers'), {
        companyName: companyName || contactPerson || username,
        contactPerson: contactPerson || username,
        email,
        phone,
        city,
        country,
        address,
        isActive: true,
        linkedUid: uid,
        createdAt: new Date().toISOString()
      })

      setSuccess('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        onNavigate('login')
      }, 2000)

    } catch (err) {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.')
      } else {
        setError(err.message || 'Failed to create account. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 600, padding: 35 }}>
        <div className="auth-header">
          <div className="auth-logo-wrap">
            <span className="auth-logo-circle" style={{ borderColor: 'var(--primary)' }}>
              <i className="fas fa-user-plus" style={{ color: 'var(--primary)', fontSize: 24 }}></i>
            </span>
          </div>
          <h2>Create Account</h2>
          <p>Register as a new customer to manage subscriptions</p>
        </div>

        {error && (
          <div className="alert-box danger" style={{ marginBottom: 15 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-box success" style={{ marginBottom: 15 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignUp}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Choose username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '15px 0', paddingSelf: 10 }}>
            <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10 }}>Customer Profile Info</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label>Company / Brand Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Person Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                className="form-control"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Full Address</label>
            <textarea
              className="form-control"
              placeholder="Enter billing address detail..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ height: 50 }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 12, marginTop: 10 }} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Register Account'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20, textAlign: 'center' }}>
          Already have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login') }} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Login Now
          </a>
        </div>
      </div>
    </div>
  )
}
