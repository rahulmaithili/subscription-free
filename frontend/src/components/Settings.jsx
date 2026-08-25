import { useEffect, useState } from 'react'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import SetupAssistant from './SetupAssistant'

export default function Settings({ currencySymbol, onCurrencyChange }) {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState('general')

  // Form Fields mapped to settings keys
  const [fields, setFields] = useState({
    company_name: '',
    company_email: '',
    company_logo_url: '',
    currency: '',
    tax_percentage: '0',
    show_forgot_password: '1',
    maintenance_mode: '0'
  })

  const fetchSettings = async () => {
    try {
      const snap = await getDocs(collection(db, 'system_settings'))
      const settingList = snap.docs.map((doc) => ({ key: doc.id, ...doc.data() }))
      setSettings(settingList)

      const mappedFields = { ...fields }
      settingList.forEach((item) => {
        if (mappedFields[item.key] !== undefined) {
          mappedFields[item.key] = item.value || ''
        }
      })
      setFields(mappedFields)
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleChange = (key, val) => {
    setFields((prev) => ({ ...prev, [key]: val }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setSuccessMsg('')

    try {
      for (const [key, value] of Object.entries(fields)) {
        const ref = doc(db, 'system_settings', key)
        await updateDoc(ref, { value })
      }

      setSuccessMsg('Settings updated successfully!')
      if (fields.currency && fields.currency !== currencySymbol) {
        onCurrencyChange(fields.currency)
      }

      fetchSettings()
    } catch (err) {
      console.error(err)
      alert('Error updating settings profile')
    } finally {
      setUpdating(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
      </div>
    )
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-cog"></i> Site Settings</h2>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 25, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
        <button
          className="btn"
          style={{
            background: activeSubTab === 'general' ? 'var(--navy-accent)' : 'transparent',
            color: activeSubTab === 'general' ? '#fff' : 'var(--text-primary)',
            border: activeSubTab === 'general' ? 'none' : '1px solid var(--border-color)'
          }}
          onClick={() => setActiveSubTab('general')}
        >
          General Parameters
        </button>
        <button
          className="btn"
          style={{
            background: activeSubTab === 'database' ? 'var(--navy-accent)' : 'transparent',
            color: activeSubTab === 'database' ? '#fff' : 'var(--text-primary)',
            border: activeSubTab === 'database' ? 'none' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onClick={() => setActiveSubTab('database')}
        >
          <i className="fas fa-database"></i> Database Seeding
        </button>
      </div>

      {activeSubTab === 'general' && (
        <div style={{ maxWidth: 800 }}>
          {successMsg && (
            <div className="alert-box success" style={{ marginBottom: 15 }}>
              <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>Company / Site Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={fields.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Business Email ID</label>
                <input
                  type="email"
                  className="form-control"
                  value={fields.company_email}
                  onChange={(e) => handleChange('company_email', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Branding Logo Image URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://example.com/logo.png"
                value={fields.company_logo_url}
                onChange={(e) => handleChange('company_logo_url', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Default Currency</label>
                <select
                  className="form-control"
                  value={fields.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                >
                  <option value="₹">INR (₹)</option>
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="Rs">PKR (Rs)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Global Default Tax (%)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={fields.tax_percentage}
                  onChange={(e) => handleChange('tax_percentage', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Authentication Forgot Password</label>
                <select
                  className="form-control"
                  value={fields.show_forgot_password}
                  onChange={(e) => handleChange('show_forgot_password', e.target.value)}
                >
                  <option value="1">Show forgot link</option>
                  <option value="0">Hide forgot link</option>
                </select>
              </div>

              <div className="form-group">
                <label>System Maintenance Mode</label>
                <select
                  className="form-control"
                  value={fields.maintenance_mode}
                  onChange={(e) => handleChange('maintenance_mode', e.target.value)}
                >
                  <option value="0">Maintenance OFF</option>
                  <option value="1">Maintenance ON</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updating} style={{ minWidth: 150 }}>
              {updating ? 'Saving changes...' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}

      {activeSubTab === 'database' && (
        <div style={{ maxWidth: 800 }}>
          <SetupAssistant onSetupComplete={fetchSettings} />
        </div>
      )}
    </div>
  )
}
