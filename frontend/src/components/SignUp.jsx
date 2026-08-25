import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function SignUp({ onNavigate }) {
  // Section 1: Account
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Section 2: Customer & Billing
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')

  // Section 3: Business profile
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [taxId, setTaxId] = useState('')
  const [publicNotes, setPublicNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

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
        companyName: companyName,
        contactPerson: contactPerson || username,
        email,
        phone,
        website,
        city,
        country,
        address,
        industry,
        companySize,
        taxId,
        notes: publicNotes,
        notesInternal: internalNotes,
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
      <div className="auth-card" style={{ maxWidth: 850, padding: 40, margin: '40px auto' }}>
        
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

        <div className="auth-header" style={{ marginBottom: 25 }}>
          <div className="auth-logo-wrap">
            <span className="auth-logo-circle" style={{ borderColor: 'var(--primary)' }}>
              <i className="fas fa-user-plus" style={{ color: 'var(--primary)', fontSize: 24 }}></i>
            </span>
          </div>
          <h2>Create Your Business Account</h2>
          <p>Fill in your details below to get instant access to premium extensions & tools</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, textAlign: 'left' }}>
            
            {/* SECTION 1: Account Credentials */}
            <div className="section-title" style={{ gridColumn: 'span 2', fontSize: 15, fontWeight: 700, marginTop: 15, paddingBottom: 6, borderBottom: '2px solid #0074D9', color: '#0074D9', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-user-lock"></i> Account Credentials
            </div>

            <div className="form-group">
              <label><i className="fas fa-user"></i> Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-envelope"></i> Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-lock"></i> Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-lock"></i> Confirm Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* SECTION 2: Customer & Billing Info */}
            <div className="section-title" style={{ gridColumn: 'span 2', fontSize: 15, fontWeight: 700, marginTop: 15, paddingBottom: 6, borderBottom: '2px solid #0074D9', color: '#0074D9', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-building"></i> Customer &amp; Billing Info
            </div>

            <div className="form-group">
              <label><i className="fas fa-id-card"></i> Customer / Company Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter customer name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-user-tie"></i> Contact Person</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter contact person name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-phone"></i> Contact Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-globe"></i> Website</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-city"></i> City</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><i className="fas fa-globe-americas"></i> Country</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label><i className="fas fa-map-marker-alt"></i> Address</label>
              <textarea
                className="form-control"
                placeholder="Enter full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ height: 60 }}
              />
            </div>

            {/* SECTION 3: Additional Business Profile */}
            <div className="section-title" style={{ gridColumn: 'span 2', fontSize: 15, fontWeight: 700, marginTop: 15, paddingBottom: 6, borderBottom: '2px solid #0074D9', color: '#0074D9', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-briefcase"></i> Additional Business Profile
            </div>

            <div className="form-group">
              <label><i className="fas fa-industry"></i> Industry</label>
              <select className="form-control" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">-- Select Industry --</option>
                <option value="IT">IT &amp; Software</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance &amp; Banking</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail &amp; E-commerce</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label><i className="fas fa-users"></i> Company Size</label>
              <select className="form-control" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                <option value="">-- Select Size --</option>
                <option value="1-10">1-10 Employees</option>
                <option value="11-50">11-50 Employees</option>
                <option value="51-200">51-200 Employees</option>
                <option value="201-500">201-500 Employees</option>
                <option value="500+">500+ Employees</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label><i className="fas fa-percent"></i> Tax ID / VAT No</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Tax ID or VAT Registration Number"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label><i className="fas fa-sticky-note"></i> Public Notes / Special Instructions</label>
              <textarea
                className="form-control"
                placeholder="Any additional notes or instructions for billing..."
                value={publicNotes}
                onChange={(e) => setPublicNotes(e.target.value)}
                style={{ height: 60 }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label><i className="fas fa-file-invoice"></i> Internal Notes (Private to Admin)</label>
              <textarea
                className="form-control"
                placeholder="Enter any private remarks or internal details..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                style={{ height: 60 }}
              />
            </div>

          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, marginTop: 25, fontSize: 15, fontWeight: 700 }} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Complete Onboarding & Register'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20, textAlign: 'center' }}>
          Already have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login') }} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Login Now
          </a>
        </div>
      </div>
    </div>
  )
}
