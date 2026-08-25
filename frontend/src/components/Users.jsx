import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

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
      setUsers(snap.docs.map((doc, idx) => ({ id: doc.id, index: idx + 1, ...doc.data() })))
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
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-users"></i> Users & Access Control</h2>
        <button className="btn btn-success" onClick={openAddModal}>
          <i className="fas fa-plus"></i> Create User Profile
        </button>
      </div>

      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, email, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Full Name</th>
                <th>Email Credentials</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td>{item.index}</td>
                  <td><strong>{item.fullName}</strong></td>
                  <td>{item.email}</td>
                  <td>{item.phone || '-'}</td>
                  <td>
                    <span className="status-badge" style={{
                      textTransform: 'capitalize',
                      backgroundColor: item.role === 'admin' ? 'rgba(234,67,53,0.1)' : item.role === 'salesperson' ? 'rgba(52,168,83,0.1)' : 'rgba(0,116,217,0.1)',
                      color: item.role === 'admin' ? 'var(--danger)' : item.role === 'salesperson' ? 'var(--green)' : 'var(--navy-accent)',
                      fontWeight: 700
                    }}>
                      {item.role}
                    </span>
                  </td>
                  <td>{item.department || '-'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.isActive !== false}
                      className="toggle"
                      style={{ cursor: 'pointer' }}
                      onChange={() => toggleActiveStatus(item)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="action-icon edit-icon" title="Edit" style={{ color: '#ffc107', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => openEditModal(item)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="action-icon delete-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => handleDelete(item.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No user profiles found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                <i className={editingUser ? 'fas fa-edit' : 'fas fa-users'}></i> {editingUser ? 'Edit User Credentials' : 'Create User Profile'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
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
                  <label className="form-control-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
