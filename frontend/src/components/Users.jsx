import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [targetUser, setTargetUser] = useState(null)

  // Form Fields for Add/Edit User
  const [formFullName, setFormFullName] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('customer')
  const [formDepartment, setFormDepartment] = useState('')
  const [formLinkedTo, setFormLinkedTo] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Form Fields for Password Change
  const [newPassword, setNewPassword] = useState('')

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'))
      setUsers(snap.docs.map((doc, idx) => ({ id: doc.id, index: idx + 1, ...doc.data() })))

      const custSnap = await getDocs(collection(db, 'customers'))
      setCustomers(custSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setFormUsername('')
    setFormEmail('')
    setFormRole('customer')
    setFormDepartment('')
    setFormLinkedTo('')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (userItem) => {
    setEditingUser(userItem)
    setFormFullName(userItem.fullName || '')
    setFormUsername(userItem.username || '')
    setFormEmail(userItem.email || '')
    setFormRole(userItem.role || 'customer')
    setFormDepartment(userItem.department || '')
    setFormLinkedTo(userItem.customerName || userItem.linkedTo || '')
    setFormIsActive(userItem.isActive !== false)
    setShowModal(true)
  }

  const openPasswordModal = (userItem) => {
    setTargetUser(userItem)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const userData = {
      fullName: formFullName,
      username: formUsername,
      email: formEmail,
      role: formRole,
      department: formDepartment,
      linkedTo: formLinkedTo,
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        password: newPassword, // Note: In full deployment this matches client side mock logic
        updatedAt: new Date().toISOString()
      })
      alert('Password updated successfully!')
      setShowPasswordModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
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

  const handleToggleStatus = async (userItem) => {
    const nextVal = userItem.isActive === false
    try {
      await updateDoc(doc(db, 'users', userItem.id), {
        isActive: nextVal,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Filter users logic
  const filteredUsers = users.filter(userItem => {
    // search filter
    if (search.trim()) {
      const needle = search.toLowerCase()
      const matchName = (userItem.fullName || '').toLowerCase().includes(needle)
      const matchEmail = (userItem.email || '').toLowerCase().includes(needle)
      const matchUsername = (userItem.username || '').toLowerCase().includes(needle)
      if (!matchName && !matchEmail && !matchUsername) return false
    }

    // Role filter
    if (filterRole !== 'All') {
      if (userItem.role !== filterRole.toLowerCase()) return false
    }

    // Status filter
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active' && userItem.isActive === false) return false
      if (filterStatus === 'Inactive' && userItem.isActive !== false) return false
    }

    // Department filter
    if (filterDepartment.trim() && !(userItem.department || '').toLowerCase().includes(filterDepartment.toLowerCase())) {
      return false
    }

    // Date From / To
    if (filterDateFrom && userItem.createdAt && userItem.createdAt < filterDateFrom) return false
    if (filterDateTo && userItem.createdAt && userItem.createdAt > filterDateTo) return false

    return true
  })

  const exportCSV = () => {
    let csv = 'ID,Full Name,Username,Email,Role,Department,Status\n'
    filteredUsers.forEach((s) => {
      csv += `"${s.index}","${s.fullName || ''}","${s.username || ''}","${s.email || ''}","${s.role || ''}","${s.department || ''}","${s.isActive !== false ? 'Active' : 'Inactive'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'users_report.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterRole('All')
    setFilterDepartment('')
    setFilterStatus('All')
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      <div className="data-section">
        {/* Header toolbar */}
        <div className="section-header">
          <h2><i className="fas fa-users"></i> Users</h2>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn btn-secondary" onClick={fetchData}><i className="fas fa-sync-alt"></i> Refresh</button>
            <button className="btn btn-success" onClick={openAddModal}><i className="fas fa-plus"></i> Add User</button>
          </div>
        </div>

        {/* 1. Filters Card Layout matching Image 3 */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 15, border: '1px solid #e9ecef', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#333' }}><i className="fas fa-filter"></i> Filters</span>
            <button className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={clearFilters}><i className="fas fa-times-circle"></i> Clear All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Date From</label>
              <input 
                type="date" 
                className="form-control" 
                value={filterDateFrom} 
                onChange={(e) => setFilterDateFrom(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Date To</label>
              <input 
                type="date" 
                className="form-control" 
                value={filterDateTo} 
                onChange={(e) => setFilterDateTo(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Role</label>
              <select 
                className="form-control" 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Salesperson">Salesperson</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Department</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="All Departments"
                value={filterDepartment} 
                onChange={(e) => setFilterDepartment(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Status</label>
              <select 
                className="form-control" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. CSV / Export Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn btn-sm btn-primary" style={{ background: '#001f3f' }} onClick={exportCSV}><i className="fas fa-file-csv"></i> CSV</button>
            <button className="btn btn-sm btn-primary" style={{ background: '#dc3545' }} onClick={() => window.print()}><i className="fas fa-file-pdf"></i> PDF</button>
            <button className="btn btn-sm btn-primary" style={{ background: '#6c757d' }} onClick={() => window.print()}><i className="fas fa-print"></i> Print</button>
          </div>
          <div style={{ fontSize: 12 }}>
            Search: <input type="text" className="form-control" style={{ display: 'inline-block', width: 'auto', padding: '4px 8px', fontSize: 12 }} placeholder="Filter..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '30vh' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 30 }}><input type="checkbox" /></th>
                  <th style={{ width: 50 }}>ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Linked To</th>
                  <th>Last Login</th>
                  <th>Active</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" /></td>
                    <td>{item.index}</td>
                    <td><strong style={{ color: 'var(--navy-accent)' }}>{item.fullName}</strong></td>
                    <td>{item.username || '-'}</td>
                    <td style={{ fontSize: 12 }}>{item.email || '-'}</td>
                    <td>
                      <span className="status-badge" style={{
                        background: 
                          item.role === 'admin' ? '#d4edda' :
                          item.role === 'salesperson' ? '#fff3cd' : '#e2e8f0',
                        color:
                          item.role === 'admin' ? '#155724' :
                          item.role === 'salesperson' ? '#856404' : '#475569',
                        fontWeight: 700,
                        textTransform: 'capitalize'
                      }}>
                        {item.role}
                      </span>
                    </td>
                    <td>{item.department || '-'}</td>
                    <td>
                      {item.linkedTo ? (
                        <span><i className="fas fa-link" style={{ marginRight: 4, fontSize: 10 }}></i>{item.linkedTo}</span>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: 11 }}>{item.lastLogin || 'Never'}</td>
                    <td>
                      {/* Active Status Switch checkbox */}
                      <label className="toggle-switch" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={item.isActive !== false}
                          onChange={() => handleToggleStatus(item)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 10 }}>
                        <button className="action-icon" title="Edit" style={{ color: '#ffc107', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={() => openEditModal(item)}>
                          <i className="fas fa-edit"></i>
                        </button>

                        {/* Change Password Key/Login icon */}
                        <button className="action-icon" title="Change Password" style={{ color: '#0074D9', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={() => openPasswordModal(item)}>
                          <i className="fas fa-sign-in-alt"></i>
                        </button>

                        <button className="action-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={() => handleDelete(item.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', color: '#888', padding: 20 }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>
                <i className={editingUser ? 'fas fa-edit' : 'fas fa-plus-circle'}></i> {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email ID *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select className="form-control" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                      <option value="admin">Administrator</option>
                      <option value="salesperson">Salesperson</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sales, Support, IT"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Linked Customer Profile</label>
                    <select className="form-control" value={formLinkedTo} onChange={(e) => setFormLinkedTo(e.target.value)}>
                      <option value="">-- No link --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.companyName}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    Enable user login access
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && targetUser && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3><i className="fas fa-key"></i> Reset Password ({targetUser.fullName})</h3>
              <button className="icon-button" onClick={() => setShowPasswordModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleUpdatePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Enter New Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
