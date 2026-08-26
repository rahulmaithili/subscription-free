import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCompany, setFilterCompany] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  
  // Ledger Modal details
  const [reportCustomer, setReportCustomer] = useState(null)
  const [ledgerTab, setLedgerTab] = useState('subscriptions') // 'subscriptions' | 'payments' | 'record'

  // Record Payment fields inside Ledger
  const [recAmount, setRecAmount] = useState('')
  const [recMethod, setRecMethod] = useState('Cash')
  const [recInvoice, setRecInvoice] = useState('')
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0])
  const [recNotes, setRecNotes] = useState('')

  // Form Fields for Add/Edit Customer
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
      const custSnap = await getDocs(collection(db, 'customers'))
      setCustomers(custSnap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() })))

      const subSnap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

      const paySnap = await getDocs(collection(db, 'payments'))
      setPayments(paySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    setFormIsActive('1')
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
    setFormIsActive(cust.isActive !== false ? '1' : '0')
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
      isActive: formIsActive === '1',
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), customerData)
      } else {
        await addDoc(collection(db, 'customers'), {
          ...customerData,
          createdAt: new Date().toISOString()
        })
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete Customer profile? This will break reports linked to this customer.')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'customers', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleToggleStatus = async (cust) => {
    const nextVal = cust.isActive === false
    try {
      await updateDoc(doc(db, 'customers', cust.id), {
        isActive: nextVal,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Record a payment transaction inside Ledger
  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!recAmount || Number(recAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      // 1. Add payment transaction to 'payments' collection
      await addDoc(collection(db, 'payments'), {
        customerId: reportCustomer.id,
        customerName: reportCustomer.companyName,
        invoiceNo: recInvoice,
        amount: Number(recAmount),
        paymentMethod: recMethod,
        paymentDate: recDate,
        notes: recNotes,
        createdAt: new Date().toISOString()
      })

      // 2. Adjust payment status of the target subscription contract if invoiceNo is selected
      if (recInvoice) {
        const sub = subscriptions.find(s => s.invoiceNo === recInvoice)
        if (sub) {
          // If paid matches selling price, set Paid, otherwise set Partial
          const alreadyPaid = payments
            .filter(p => p.invoiceNo === recInvoice)
            .reduce((sum, p) => sum + p.amount, 0)
          const newTotalPaid = alreadyPaid + Number(recAmount)
          
          let nextPaymentStatus = 'Partial'
          if (newTotalPaid >= (Number(sub.sellingPrice) || 0)) {
            nextPaymentStatus = 'Paid'
          }

          await updateDoc(doc(db, 'subscriptions', sub.id), {
            paymentStatus: nextPaymentStatus,
            paymentDate: recDate,
            paymentMethod: recMethod
          })
        }
      }

      // Reset record fields
      setRecAmount('')
      setRecNotes('')
      setRecInvoice('')
      setLedgerTab('payments')
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to record payment')
      setLoading(false)
    }
  }

  // Filter customers logic
  const filteredCustomers = customers.filter(cust => {
    let matchCompany = true
    let matchCity = true
    let matchStatus = true

    if (filterCompany.trim()) {
      matchCompany = cust.companyName.toLowerCase().includes(filterCompany.toLowerCase())
    }
    if (filterCity.trim()) {
      matchCity = (cust.city || '').toLowerCase().includes(filterCity.toLowerCase())
    }
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active') matchStatus = cust.isActive !== false
      if (filterStatus === 'Inactive') matchStatus = cust.isActive === false
    }

    return matchCompany && matchCity && matchStatus
  })

  // Customer Ledger calculations
  const getCustomerLedgerData = (cust) => {
    if (!cust) return null
    // match on customerName or customerId
    const customerSubs = subscriptions.filter(s => s.customerName === cust.companyName || s.customerId === cust.id)
    const customerPays = payments.filter(p => p.customerName === cust.companyName || p.customerId === cust.id)

    const totalPurchase = customerSubs.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    const totalPaid = customerPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balanceDue = totalPurchase - totalPaid

    return { customerSubs, customerPays, totalPurchase, totalPaid, balanceDue }
  }

  const ledgerData = getCustomerLedgerData(reportCustomer)

  const exportCSV = () => {
    let csv = 'ID,Company Name,Contact Person,Email,Phone,City,Status\n'
    filteredCustomers.forEach((s) => {
      csv += `"${s.index}","${s.companyName || ''}","${s.contactPerson || ''}","${s.email || ''}","${s.phone || ''}","${s.city || ''}","${s.isActive !== false ? 'Active' : 'Inactive'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'customers_report.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setFilterCompany('')
    setFilterCity('')
    setFilterStatus('All')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      <div className="data-section">
        {/* Header toolbar */}
        <div className="section-header">
          <h2><i className="fas fa-address-book"></i> Customers</h2>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn btn-secondary" onClick={fetchData}><i className="fas fa-sync-alt"></i> Refresh</button>
            <button className="btn btn-success" onClick={openAddModal}><i className="fas fa-plus"></i> Add Customer</button>
          </div>
        </div>

        {/* 1. Filters Card Layout matching Image 2 */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 15, border: '1px solid #e9ecef', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#333' }}><i className="fas fa-filter"></i> Filters</span>
            <button className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={clearFilters}><i className="fas fa-times-circle"></i> Clear All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Customer Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search customer..." 
                value={filterCompany} 
                onChange={(e) => setFilterCompany(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>City</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search city..." 
                value={filterCity} 
                onChange={(e) => setFilterCity(e.target.value)} 
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
            Search: <input type="text" className="form-control" style={{ display: 'inline-block', width: 'auto', padding: '4px 8px', fontSize: 12 }} placeholder="Filter..." value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} />
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
                  <th>Customer Name</th>
                  <th>Contact Person</th>
                  <th>Email ID</th>
                  <th>Phone Number</th>
                  <th>City</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', width: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" /></td>
                    <td>{item.index}</td>
                    <td><strong style={{ color: 'var(--navy-accent)' }}>{item.companyName}</strong></td>
                    <td>{item.contactPerson || '-'}</td>
                    <td style={{ fontSize: 12 }}>{item.email || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td>{item.city || '-'}</td>
                    <td>
                      {/* Active Status Toggle */}
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
                        {/* 3. Invoice/Ledger icon button */}
                        <button 
                          className="action-icon" 
                          title="Customer Ledger" 
                          style={{ color: '#7c3aed', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }}
                          onClick={() => {
                            setReportCustomer(item)
                            setLedgerTab('subscriptions')
                          }}
                        >
                          <i className="fas fa-file-invoice"></i>
                        </button>
                        
                        <button className="action-icon" title="Edit" style={{ color: '#ffc107', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={() => openEditModal(item)}>
                          <i className="fas fa-edit"></i>
                        </button>

                        <button className="action-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onClick={() => handleDelete(item.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#888', padding: 20 }}>No customers registered.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3>
                <i className={editingCustomer ? 'fas fa-edit' : 'fas fa-plus-circle'}></i> {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer / Company Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formContactPerson}
                      onChange={(e) => setFormContactPerson(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Address</label>
                  <textarea
                    className="form-control"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    style={{ height: 60 }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Active Status</label>
                    <select className="form-control" value={formIsActive} onChange={(e) => setFormIsActive(e.target.value)}>
                      <option value="1">Active</option>
                      <option value="0">Inactive / Deactivated</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER LEDGER MODAL matching Image 2 */}
      {reportCustomer && ledgerData && (
        <div className="modal-overlay active" style={{ zIndex: 10002 }}>
          <div className="modal-container" style={{ maxWidth: 850 }}>
            {/* Branded Header */}
            <div style={{ background: 'linear-gradient(135deg,#001f3f 0%,#003366 100%)', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-file-invoice" style={{ fontSize: 18, color: '#0074D9' }}></i>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{reportCustomer.companyName}</h3>
                  <p style={{ margin: 0, fontSize: 10, opacity: 0.8 }}>Customer Ledger</p>
                </div>
              </div>
              <button 
                onClick={() => setReportCustomer(null)} 
                style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 16, cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* 3 cards in a row inside modal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid #e9ecef', background: '#fff' }}>
              <div style={{ padding: '16px 20px', textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0074D9' }}>INR {ledgerData.totalPurchase.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Total Purchase</div>
              </div>
              <div style={{ padding: '16px 20px', textAlign: 'center', borderRight: '1px solid #e9ecef' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#28a745' }}>INR {ledgerData.totalPaid.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Total Paid</div>
              </div>
              <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc3545' }}>INR {ledgerData.balanceDue.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Balance Due</div>
              </div>
            </div>

            {/* Tabs bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
              <button 
                className={`tab-btn ${ledgerTab === 'subscriptions' ? 'active' : ''}`}
                style={{ flex: 1, padding: 12, border: 0, background: 'transparent', fontWeight: ledgerTab === 'subscriptions' ? 700 : 500, borderBottom: ledgerTab === 'subscriptions' ? '3px solid #0074D9' : 'none', cursor: 'pointer', fontSize: 12 }}
                onClick={() => setLedgerTab('subscriptions')}
              >
                Subscriptions ({ledgerData.customerSubs.length})
              </button>
              <button 
                className={`tab-btn ${ledgerTab === 'payments' ? 'active' : ''}`}
                style={{ flex: 1, padding: 12, border: 0, background: 'transparent', fontWeight: ledgerTab === 'payments' ? 700 : 500, borderBottom: ledgerTab === 'payments' ? '3px solid #0074D9' : 'none', cursor: 'pointer', fontSize: 12 }}
                onClick={() => setLedgerTab('payments')}
              >
                Payments ({ledgerData.customerPays.length})
              </button>
              <button 
                className={`tab-btn ${ledgerTab === 'record' ? 'active' : ''}`}
                style={{ flex: 1, padding: 12, border: 0, background: 'transparent', fontWeight: ledgerTab === 'record' ? 700 : 500, borderBottom: ledgerTab === 'record' ? '3px solid #0074D9' : 'none', cursor: 'pointer', fontSize: 12 }}
                onClick={() => setLedgerTab('record')}
              >
                <i className="fas fa-plus-circle"></i> Record Payment
              </button>
            </div>

            <div style={{ padding: 20, maxHeight: '45vh', overflowY: 'auto', background: '#fff' }}>
              {/* Tab 1: Subscriptions list */}
              {ledgerTab === 'subscriptions' && (
                <div className="table-wrapper" style={{ margin: 0 }}>
                  <table className="table" style={{ fontSize: 11, width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Product</th>
                        <th>Date</th>
                        <th>Expiry</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.customerSubs.map((sub, idx) => {
                        const paidOnSub = payments
                          .filter(p => p.invoiceNo === sub.invoiceNo)
                          .reduce((sum, p) => sum + p.amount, 0)
                        const bal = (Number(sub.sellingPrice) || 0) - paidOnSub

                        return (
                          <tr key={idx}>
                            <td><code>{sub.invoiceNo}</code></td>
                            <td><strong>{sub.productName}</strong></td>
                            <td>{sub.invoiceDate}</td>
                            <td>{sub.expiryDate || 'N/A'}</td>
                            <td>INR {Number(sub.sellingPrice || 0).toLocaleString()}</td>
                            <td style={{ color: '#28a745', fontWeight: 600 }}>{paidOnSub}</td>
                            <td style={{ color: bal > 0 ? '#dc3545' : 'inherit', fontWeight: 600 }}>{bal}</td>
                            <td>
                              <span className={`status-badge ${sub.paymentStatus === 'Paid' ? 'pay-paid' : 'pay-unpaid'}`}>
                                {sub.paymentStatus || 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {ledgerData.customerSubs.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No subscription invoices linked to this customer profile.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Payments history */}
              {ledgerTab === 'payments' && (
                <div className="table-wrapper" style={{ margin: 0 }}>
                  <table className="table" style={{ fontSize: 11, width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice / Ref</th>
                        <th>Method</th>
                        <th>Notes / Memo</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.customerPays.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.paymentDate}</td>
                          <td><code>{p.invoiceNo || 'Direct Payment'}</code></td>
                          <td>{p.paymentMethod}</td>
                          <td>{p.notes || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#28a745' }}>INR {p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {ledgerData.customerPays.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No payments transaction history.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Record Payment Form */}
              {ledgerTab === 'record' && (
                <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 15, maxWidth: 500, margin: '0 auto' }}>
                  <div className="form-group">
                    <label>Amount to Pay *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter amount (INR)"
                      value={recAmount}
                      onChange={(e) => setRecAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Link to Subscription Invoice</label>
                    <select 
                      className="form-control"
                      value={recInvoice}
                      onChange={(e) => setRecInvoice(e.target.value)}
                    >
                      <option value="">-- Choose Invoice --</option>
                      {ledgerData.customerSubs.map(sub => (
                        <option key={sub.id} value={sub.invoiceNo}>{sub.invoiceNo} - {sub.productName} (INR {sub.sellingPrice})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select 
                      className="form-control"
                      value={recMethod}
                      onChange={(e) => setRecMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Stripe">Stripe</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="GPay/UPI">GPay/UPI</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={recDate}
                      onChange={(e) => setRecDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes / Memo</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Received via GPay"
                      value={recNotes}
                      onChange={(e) => setRecNotes(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-success" style={{ padding: 12 }}>
                    Record Payment Entry
                  </button>
                </form>
              )}
            </div>

            {/* Print Footer matching Image 2 */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#dc3545', fontWeight: 700 }}>
                Balance: INR {ledgerData.balanceDue.toLocaleString()}
              </span>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <button
                  className="btn btn-warning"
                  style={{ background: '#ffa000', border: 0, color: '#fff', fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print"></i> Thermal
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: '#001f3f', border: 0, color: '#fff', fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print"></i> A4 Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
