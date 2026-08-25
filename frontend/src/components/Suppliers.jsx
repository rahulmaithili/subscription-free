import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCompany, setFilterCompany] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [reportSupplier, setReportSupplier] = useState(null)

  // Form Fields
  const [formCompanyName, setFormCompanyName] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formCountry, setFormCountry] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formIsActive, setFormIsActive] = useState('1')

  const fetchData = async () => {
    try {
      const supSnap = await getDocs(collection(db, 'suppliers'))
      setSuppliers(supSnap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() })))

      const subSnap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setFormIsActive('1')
    setShowModal(true)
  }

  const openEditModal = (sup) => {
    setEditingSupplier(sup)
    setFormCompanyName(sup.companyName || '')
    setFormContactPerson(sup.contactPerson || '')
    setFormEmail(sup.email || '')
    setFormPhone(sup.phone || '')
    setFormAddress(sup.address || '')
    setFormCity(sup.city || '')
    setFormCountry(sup.country || '')
    setFormNotes(sup.notes || '')
    setFormIsActive(sup.isActive !== false ? '1' : '0')
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
      isActive: formIsActive === '1',
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), supplierData)
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...supplierData,
          createdAt: new Date().toISOString()
        })
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
    if (!window.confirm('Delete Supplier? This action cannot be undone. All linked data may also be affected.')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'suppliers', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleToggleActive = async (sup, checked) => {
    try {
      await updateDoc(doc(db, 'suppliers', sup.id), {
        isActive: checked,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Filter Logic
  const filteredSuppliers = suppliers.filter((sup) => {
    const compName = (sup.companyName || '').toLowerCase()
    const city = (sup.city || '').toLowerCase()
    const matchCompany = compName.includes(filterCompany.toLowerCase())
    const matchCity = city.includes(filterCity.toLowerCase())
    
    let matchStatus = true
    if (filterStatus === 'active') matchStatus = sup.isActive !== false
    if (filterStatus === 'inactive') matchStatus = sup.isActive === false

    return matchCompany && matchCity && matchStatus
  })

  // Purchase Report Calculations for Modal
  const getSupplierReport = (sup) => {
    if (!sup) return null
    const purchases = subscriptions.filter(s => s.supplierId === sup.id)
    const totalCount = purchases.length
    const totalValue = purchases.reduce((sum, s) => sum + (Number(s.purchasePrice) || 0), 0)
    
    const paidCount = purchases.filter(s => s.paymentStatus === 'Paid').length
    const unpaidCount = purchases.filter(s => s.paymentStatus !== 'Paid').length

    return { purchases, totalCount, totalValue, paidCount, unpaidCount }
  }

  const reportData = getSupplierReport(reportSupplier)

  // Export Data to CSV
  const exportCSV = () => {
    let csv = 'ID,Company Name,Contact Person,Email,Phone,City,Status\n'
    filteredSuppliers.forEach((s) => {
      csv += `"${s.index}","${s.companyName || ''}","${s.contactPerson || ''}","${s.email || ''}","${s.phone || ''}","${s.city || ''}","${s.isActive !== false ? 'Active' : 'Inactive'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'suppliers_export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-truck"></i> Suppliers</h2>
        <div>
          <button className="btn btn-success" onClick={openAddModal} style={{ marginRight: 8 }}>
            <i className="fas fa-plus"></i> Add Supplier
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      {/* Filter toolbar matching PHP filter layout */}
      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Filter by Company..."
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input
          type="text"
          className="form-control"
          placeholder="Filter by City..."
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select
          className="form-control"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(filterCompany || filterCity || filterStatus) && (
          <button className="btn btn-secondary" onClick={() => { setFilterCompany(''); setFilterCity(''); setFilterStatus('') }}>
            Clear Filters
          </button>
        )}
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
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((item) => (
                <tr key={item.id}>
                  <td>{item.index}</td>
                  <td><strong>{item.companyName}</strong></td>
                  <td>{item.contactPerson || '-'}</td>
                  <td>
                    {item.email ? (
                      <a href={`mailto:${item.email}`} style={{ color: 'var(--navy-accent)', textDecoration: 'none' }}>
                        {item.email}
                      </a>
                    ) : '-'}
                  </td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.city || '-'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.isActive !== false}
                      className="toggle"
                      style={{ cursor: 'pointer' }}
                      onChange={(e) => handleToggleActive(item, e.target.checked)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="action-icon report-icon" title="Purchase Report" style={{ color: '#0074D9', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setReportSupplier(item)}>
                        <i className="fas fa-chart-line"></i>
                      </button>
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
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3 id="modalTitle">
                <i className={editingSupplier ? 'fas fa-edit' : 'fas fa-truck'}></i> {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave} id="supplierForm">
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Company / Supplier Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="formCompanyName"
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
                    id="formContactPerson"
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
                      id="formEmail"
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
                      id="formPhone"
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
                    id="formAddress"
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
                      id="formCity"
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
                      id="formCountry"
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
                    id="formNotes"
                    placeholder="Notes regarding partner support terms..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ height: 80 }}
                  />
                </div>

                <div className="form-group" id="activeGroup">
                  <label>Status</label>
                  <select className="form-control" id="formIsActive" value={formIsActive} onChange={(e) => setFormIsActive(e.target.value)}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
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

      {/* Supplier Purchase Report Modal (Swal-Equivalent React UI) */}
      {reportSupplier && reportData && (
        <div className="modal-overlay active" style={{ zIndex: 10002 }}>
          <div className="modal-container" style={{ maxWidth: 850 }}>
            {/* Branded Header */}
            <div style={{ background: 'linear-gradient(135deg,var(--navy-primary,#001f3f) 0%,var(--navy-light,#003366) 100%)', color: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-truck" style={{ fontSize: 20, color: 'var(--navy-accent,#0074D9)' }}></i>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{reportSupplier.companyName}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Purchase Report</div>
                </div>
              </div>
              <button className="icon-button" onClick={() => setReportSupplier(null)} style={{ color: '#fff' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid #e9ecef' }}>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-primary,#001f3f)' }}>{reportData.totalCount}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Total Purchases</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-accent,#0074D9)' }}>₹ {reportData.totalValue.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Purchase Value</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#28a745' }}>{reportData.paidCount}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Paid Invoices</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#dc3545' }}>{reportData.unpaidCount}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Unpaid Invoices</div>
              </div>
            </div>

            <div style={{ padding: 20, maxHeight: '50vh', overflowY: 'auto' }}>
              {reportData.purchases.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
                  <i className="fas fa-inbox" style={{ fontSize: 40, color: '#ddd', display: 'block', marginBottom: 14 }}></i>
                  No purchases found for this supplier.
                </div>
              ) : (
                <div className="table-wrapper" style={{ margin: 0, borderRadius: 4, border: '1px solid #e0e0e0' }}>
                  <table className="table" style={{ fontSize: 12, margin: 0, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Invoice</th>
                        <th>Customer</th>
                        <th>Product ID</th>
                        <th>Purchase Price</th>
                        <th>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.purchases.map((r, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.invoiceNo || '-'}</td>
                          <td>{r.customerName || '-'}</td>
                          <td>{r.productName || r.productId || '-'}</td>
                          <td>₹ {parseFloat(r.purchasePrice || 0).toLocaleString()}</td>
                          <td>
                            <span className="status-badge" style={{
                              backgroundColor: r.paymentStatus === 'Paid' ? '#d4edda' : '#f8d7da',
                              color: r.paymentStatus === 'Paid' ? '#155724' : '#721c24'
                            }}>
                              {r.paymentStatus || 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Print Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                Total Purchase: <strong style={{ color: 'var(--navy-primary,#001f3f)' }}>₹ {reportData.totalValue.toLocaleString()}</strong>
              </span>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print()
                }}
              >
                <i className="fas fa-print"></i> Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
