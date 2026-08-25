import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'

export default function SalesPersons() {
  const [salespersons, setSalespersons] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSalesperson, setEditingSalesperson] = useState(null)

  // Filters
  const [search, setSearch] = useState('')

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formCommissionRate, setFormCommissionRate] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'salespersons'))
      setSalespersons(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setEditingSalesperson(null)
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormDepartment('Sales Dept')
    setFormCommissionRate('')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (sp) => {
    setEditingSalesperson(sp)
    setFormName(sp.name || '')
    setFormEmail(sp.email || '')
    setFormPhone(sp.phone || '')
    setFormDepartment(sp.department || '')
    setFormCommissionRate(String(sp.commissionRate || 0))
    setFormIsActive(sp.isActive !== false)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const spData = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      department: formDepartment,
      commissionRate: Number(formCommissionRate) || 0,
      isActive: formIsActive,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingSalesperson) {
        await updateDoc(doc(db, 'salespersons', editingSalesperson.id), spData)
      } else {
        await addDoc(collection(db, 'salespersons'), spData)
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save salesperson details')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salesperson?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'salespersons', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (sp) => {
    try {
      await updateDoc(doc(db, 'salespersons', sp.id), {
        isActive: !sp.isActive,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredSalespersons = salespersons.filter((s) => {
    const needle = search.toLowerCase()
    return (
      (s.name || '').toLowerCase().includes(needle) ||
      (s.email || '').toLowerCase().includes(needle) ||
      (s.department || '').toLowerCase().includes(needle)
    )
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Sales Persons</p>
          <h1>Sales Persons</h1>
          <p className="subheading">Manage sales representatives, track commission percentages, contact details, and departments.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Add Representative</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by representative name, email, department..."
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
                  <th>Representative Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Commission Rate</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalespersons.map((item) => {
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.name?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.name || 'SP').slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{item.name}</strong>
                        </div>
                      </td>
                      <td>{item.email || '—'}</td>
                      <td>{item.phone || '—'}</td>
                      <td>{item.department || '—'}</td>
                      <td>
                        <strong>{item.commissionRate}%</strong>
                      </td>
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
            {filteredSalespersons.length === 0 && (
              <div className="empty-state">No representatives found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit Representative Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingSalesperson ? 'Edit Representative Details' : 'Add New Representative'}</h3>
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
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="salesrep@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
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
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Enterprise Sales"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Commission Rate (%) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="e.g. 5.5"
                      value={formCommissionRate}
                      onChange={(e) => setFormCommissionRate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    Mark representative as active and enabled
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
