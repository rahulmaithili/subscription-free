import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)

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
      const snap = await getDocs(collection(db, 'customers'))
      setCustomers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setEditingCustomer(null)
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

  const openEditModal = (cust) => {
    setEditingCustomer(cust)
    setFormCompanyName(cust.companyName || '')
    setFormContactPerson(cust.contactPerson || '')
    setFormEmail(cust.email || '')
    setFormPhone(cust.phone || '')
    setFormAddress(cust.address || '')
    setFormCity(cust.city || '')
    setFormCountry(cust.country || '')
    setFormNotes(cust.notes || '')
    setFormIsActive(cust.isActive !== false)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const customerData = {
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
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), customerData)
      } else {
        await addDoc(collection(db, 'customers'), customerData)
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save customer details')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'customers', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (cust) => {
    try {
      await updateDoc(doc(db, 'customers', cust.id), {
        isActive: !cust.isActive,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const needle = search.toLowerCase()
    return (
      (c.companyName || '').toLowerCase().includes(needle) ||
      (c.contactPerson || '').toLowerCase().includes(needle) ||
      (c.email || '').toLowerCase().includes(needle)
    )
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Customers</p>
          <h1>Customers</h1>
          <p className="subheading">View customer profiles, contact credentials and notes.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Add Customer</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by company name, contact, email..."
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
                {filteredCustomers.map((item) => {
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.companyName?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.companyName || 'CU').slice(0, 2).toUpperCase()}
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
            {filteredCustomers.length === 0 && (
              <div className="empty-state">No customers found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer Info' : 'Add New Customer'}</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Company / Customer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter company name"
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
                      placeholder="e.g. Mumbai"
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
                  <label>Internal Client Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Notes regarding account profile..."
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
                    Mark customer as active and enabled
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
