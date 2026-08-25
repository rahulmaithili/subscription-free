import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  // Filters
  const [search, setSearch] = useState('')

  // Form Fields
  const [formCompanyName, setFormCompanyName] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formCountry, setFormCountry] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'suppliers'))
      setSuppliers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setEditingSupplier(null)
    setFormCompanyName('')
    setFormContactPerson('')
    setFormEmail('')
    setFormPhone('')
    setFormAddress('')
    setFormCity('')
    setFormCountry('')
    setFormNotes('')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (supp) => {
    setEditingSupplier(supp)
    setFormCompanyName(supp.companyName || '')
    setFormContactPerson(supp.contactPerson || '')
    setFormEmail(supp.email || '')
    setFormPhone(supp.phone || '')
    setFormAddress(supp.address || '')
    setFormCity(supp.city || '')
    setFormCountry(supp.country || '')
    setFormNotes(supp.notes || '')
    setFormIsActive(supp.isActive !== false)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const supplierData = {
      companyName: formCompanyName,
      contactPerson: formContactPerson,
      email: formEmail,
      phone: formPhone,
      address: formAddress,
      city: formCity,
      country: formCountry,
      notes: formNotes,
      isActive: formIsActive,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), supplierData)
      } else {
        await addDoc(collection(db, 'suppliers'), supplierData)
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save supplier details')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'suppliers', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (supp) => {
    try {
      await updateDoc(doc(db, 'suppliers', supp.id), {
        isActive: !supp.isActive,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const needle = search.toLowerCase()
    return (
      (s.companyName || '').toLowerCase().includes(needle) ||
      (s.contactPerson || '').toLowerCase().includes(needle) ||
      (s.email || '').toLowerCase().includes(needle)
    )
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Suppliers</p>
          <h1>Suppliers</h1>
          <p className="subheading">Manage software/hardware supplier endpoints, support emails and addresses.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Add Supplier</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by supplier name, contact, email..."
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
                  <th>Company Name</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City / Country</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((item) => {
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.companyName?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.companyName || 'SU').slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{item.companyName}</strong>
                        </div>
                      </td>
                      <td>{item.contactPerson || '—'}</td>
                      <td>{item.email || '—'}</td>
                      <td>{item.phone || '—'}</td>
                      <td>{item.city ? `${item.city}, ${item.country}` : '—'}</td>
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
            {filteredSuppliers.length === 0 && (
              <div className="empty-state">No suppliers found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit Supplier Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Company / Supplier Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter supplier company name"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter contact person"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="email@example.com"
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

                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter address details"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Noida"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. India"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Internal Partner Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Notes regarding partner support terms..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    Mark supplier as active and enabled
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
