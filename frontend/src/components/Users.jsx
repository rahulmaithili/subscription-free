import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Filters
  const [search, setSearch] = useState('')

  // Form Fields
  const [formFullName, setFormFullName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState('customer')
  const [formDepartment, setFormDepartment] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'))
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingUser(null)
    setFormFullName('')
    setFormEmail('')
    setFormPhone('')
    setFormRole('customer')
    setFormDepartment('')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (userItem) => {
    setEditingUser(userItem)
    setFormFullName(userItem.fullName || '')
    setFormEmail(userItem.email || '')
    setFormPhone(userItem.phone || '')
    setFormRole(userItem.role || 'customer')
    setFormDepartment(userItem.department || '')
    setFormIsActive(userItem.isActive !== false)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const userData = {
      fullName: formFullName,
      email: formEmail,
      phone: formPhone,
      role: formRole,
      department: formDepartment,
      isActive: formIsActive,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), userData)
      } else {
        // Generates user profile in Firestore
        // Note: New users will still need to register via signup using this email to log in
        await addDoc(collection(db, 'users'), {
          ...userData,
          createdAt: new Date().toISOString()
        })
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save user credentials')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'users', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (userItem) => {
    try {
      await updateDoc(doc(db, 'users', userItem.id), {
        isActive: !userItem.isActive,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredUsers = users.filter((u) => {
    const needle = search.toLowerCase()
    return (
      (u.fullName || '').toLowerCase().includes(needle) ||
      (u.email || '').toLowerCase().includes(needle) ||
      (u.role || '').toLowerCase().includes(needle)
    )
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / User Roles</p>
          <h1>Users & Team Access</h1>
          <p className="subheading">Configure system user roles (Admins, Salespersons, Customers) and accounts settings.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Create User Profile</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by name, email, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
            <RefreshCw className="spinner" size={24} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Email Credentials</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.fullName?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.fullName || 'US').slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{item.fullName}</strong>
                        </div>
                      </td>
                      <td>{item.email}</td>
                      <td>{item.phone || '—'}</td>
                      <td>
                        <span className="status" style={{
                          textTransform: 'capitalize',
                          backgroundColor: item.role === 'admin' ? 'rgba(234,67,53,0.1)' : item.role === 'salesperson' ? 'rgba(52,168,83,0.1)' : 'rgba(0,116,217,0.1)',
                          color: item.role === 'admin' ? 'var(--danger)' : item.role === 'salesperson' ? 'var(--green)' : 'var(--navy-accent)',
                          fontWeight: 700
                        }}>
                          {item.role}
                        </span>
                      </td>
                      <td>{item.department || '—'}</td>
                      <td>
                        <button
                          className={`status ${item.isActive ? 'active' : 'paused'}`}
                          style={{ cursor: 'pointer', border: 0 }}
                          onClick={() => toggleActiveStatus(item)}
                          title="Click to toggle status"
                        >
                          <i />
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button className="icon-button" onClick={() => openEditModal(item)} aria-label="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-button" onClick={() => handleDelete(item.id)} aria-label="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="empty-state">No user profiles found.</div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User Credentials' : 'Create User Profile'}</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter full name"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="user@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+91 99999 99999"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>System Role *</label>
                    <select className="form-control" value={formRole} onChange={(e) => setFormRole(e.target.value)} required>
                      <option value="admin">Admin</option>
                      <option value="salesperson">Salesperson</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Finance, Support, IT..."
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    Mark user profile as active
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
