import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function SalesPersons() {
  const [salespersons, setSalespersons] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterName, setFilterName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSalesperson, setEditingSalesperson] = useState(null)
  const [reportSalesperson, setReportSalesperson] = useState(null)

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDepartment, setFormDepartment] = useState('Sales Dept')
  const [formCommissionRate, setFormCommissionRate] = useState('')
  const [formIsActive, setFormIsActive] = useState('1')

  const fetchData = async () => {
    try {
      const spSnap = await getDocs(collection(db, 'salespersons'))
      setSalespersons(spSnap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() })))

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
    setEditingSalesperson(null)
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormDepartment('Sales Dept')
    setFormCommissionRate('')
    setFormIsActive('1')
    setShowModal(true)
  }

  const openEditModal = (sp) => {
    setEditingSalesperson(sp)
    setFormName(sp.name || '')
    setFormEmail(sp.email || '')
    setFormPhone(sp.phone || '')
    setFormDepartment(sp.department || '')
    setFormCommissionRate(String(sp.commissionRate || 0))
    setFormIsActive(sp.isActive !== false ? '1' : '0')
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
      isActive: formIsActive === '1',
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingSalesperson) {
        await updateDoc(doc(db, 'salespersons', editingSalesperson.id), spData)
      } else {
        await addDoc(collection(db, 'salespersons'), {
          ...spData,
          createdAt: new Date().toISOString()
        })
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
    if (!window.confirm('Delete Salesperson? This action cannot be undone. All linked data may also be affected.')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'salespersons', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleToggleActive = async (sp, checked) => {
    try {
      await updateDoc(doc(db, 'salespersons', sp.id), {
        isActive: checked,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Filter Logic
  const filteredSalespersons = salespersons.filter((sp) => {
    const matchName = (sp.name || '').toLowerCase().includes(filterName.toLowerCase())
    let matchStatus = true
    if (filterStatus === 'active') matchStatus = sp.isActive !== false
    if (filterStatus === 'inactive') matchStatus = sp.isActive === false
    return matchName && matchStatus
  })

  // Salesperson Deals & Commission calculations
  const getSalespersonReport = (sp) => {
    if (!sp) return null
    // match on salespersonId
    const deals = subscriptions.filter(s => s.salespersonId === sp.id)
    const closedCount = deals.length
    const totalSales = deals.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    
    // commission is calculated based on (revenue - cost - tax) * commissionRate % if positive
    const netProfit = deals.reduce((sum, s) => {
      const rev = Number(s.sellingPrice) || 0
      const cost = Number(s.purchasePrice) || 0
      const tax = Number(s.taxAmount) || 0
      return sum + (rev - cost - tax)
    }, 0)

    const commissionPayable = netProfit > 0 ? (netProfit * (sp.commissionRate || 0)) / 100 : 0

    return { deals, closedCount, totalSales, netProfit, commissionPayable }
  }

  const reportData = getSalespersonReport(reportSalesperson)

  // Export CSV
  const exportCSV = () => {
    let csv = 'ID,Name,Email,Phone,Department,Commission Rate,Status\n'
    filteredSalespersons.forEach((s) => {
      csv += `"${s.index}","${s.name || ''}","${s.email || ''}","${s.phone || ''}","${s.department || ''}","${s.commissionRate || 0}%","${s.isActive !== false ? 'Active' : 'Inactive'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'salespersons_export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-user-tie"></i> Sales Representatives</h2>
        <div>
          <button className="btn btn-success" onClick={openAddModal} style={{ marginRight: 8 }}>
            <i className="fas fa-plus"></i> Add Salesperson
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Filter by Name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
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
        {(filterName || filterStatus) && (
          <button className="btn btn-secondary" onClick={() => { setFilterName(''); setFilterStatus('') }}>
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
                <th>Representative Name</th>
                <th>Email ID</th>
                <th>Phone Number</th>
                <th>Department</th>
                <th>Commission Rate</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalespersons.map((item) => (
                <tr key={item.id}>
                  <td>{item.index}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.email || '-'}</td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.department || '-'}</td>
                  <td><strong style={{ color: 'var(--green)' }}>{item.commissionRate || 0}%</strong></td>
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
                      <button className="action-icon report-icon" title="Sales Report" style={{ color: '#0074D9', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setReportSalesperson(item)}>
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
              {filteredSalespersons.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No representative entries found.</td>
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
                <i className={editingSalesperson ? 'fas fa-edit' : 'fas fa-user-tie'}></i> {editingSalesperson ? 'Edit Representative' : 'Add Salesperson'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Representative Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter sales representative full name"
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
                      placeholder="Enter mobile contact number"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Sales Department</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sales Dept, Enterprise, HQ"
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
                      placeholder="Percentage of margins"
                      value={formCommissionRate}
                      onChange={(e) => setFormCommissionRate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={formIsActive} onChange={(e) => setFormIsActive(e.target.value)}>
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

      {/* Salesperson Report Modal */}
      {reportSalesperson && reportData && (
        <div className="modal-overlay active" style={{ zIndex: 10002 }}>
          <div className="modal-container" style={{ maxWidth: 850 }}>
            {/* Branded Header */}
            <div style={{ background: 'gradient(135deg,var(--navy-primary,#001f3f) 0%,var(--navy-light,#003366) 100%)', color: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-user-tie" style={{ fontSize: 20, color: 'var(--navy-accent,#0074D9)' }}></i>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{reportSalesperson.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Representative Commission & Sales Ledger</div>
                </div>
              </div>
              <button className="icon-button" onClick={() => setReportSalesperson(null)} style={{ color: '#fff' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid #e9ecef' }}>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-primary,#001f3f)' }}>{reportData.closedCount}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Closed Deals</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-accent,#0074D9)' }}>₹ {reportData.totalSales.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Total Sales Value</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#28a745' }}>₹ {reportData.netProfit.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Net Profit Margin</div>
              </div>
              <div style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0074D9' }}>₹ {Math.round(reportData.commissionPayable).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Commission ({reportSalesperson.commissionRate}%)</div>
              </div>
            </div>

            <div style={{ padding: 20, maxHeight: '50vh', overflowY: 'auto' }}>
              {reportData.deals.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
                  <i className="fas fa-inbox" style={{ fontSize: 40, color: '#ddd', display: 'block', marginBottom: 14 }}></i>
                  No deals closed by this sales representative.
                </div>
              ) : (
                <div className="table-wrapper" style={{ margin: 0, borderRadius: 4, border: '1px solid #e0e0e0' }}>
                  <table className="table" style={{ fontSize: 12, margin: 0, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Invoice</th>
                        <th>Customer</th>
                        <th>Product ID</th>
                        <th>Selling Price</th>
                        <th>Estimated Profit</th>
                        <th>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.deals.map((r, i) => {
                        const profit = (Number(r.sellingPrice) || 0) - (Number(r.purchasePrice) || 0) - (Number(r.taxAmount) || 0)
                        return (
                          <tr key={i}>
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.invoiceNo || '-'}</td>
                            <td>{r.customerName || '-'}</td>
                            <td>{r.productName || r.productId || '-'}</td>
                            <td>₹ {parseFloat(r.sellingPrice || 0).toLocaleString()}</td>
                            <td style={{ color: profit > 0 ? '#28a745' : '#dc3545', fontWeight: 600 }}>₹ {profit.toLocaleString()}</td>
                            <td>
                              <span className="status-badge" style={{
                                backgroundColor: r.paymentStatus === 'Paid' ? '#d4edda' : '#f8d7da',
                                color: r.paymentStatus === 'Paid' ? '#155724' : '#721c24'
                              }}>
                                {r.paymentStatus || 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Print Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                Commission Payable: <strong style={{ color: 'var(--navy-primary,#001f3f)' }}>₹ {Math.round(reportData.commissionPayable).toLocaleString()}</strong>
              </span>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print()
                }}
              >
                <i className="fas fa-print"></i> Print Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
