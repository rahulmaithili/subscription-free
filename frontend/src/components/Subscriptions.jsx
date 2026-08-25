import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Subscriptions({ user, currencySymbol = '₹', autoOpenAdd = false }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterSalesperson, setFilterSalesperson] = useState('All')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSub, setEditingSub] = useState(null)

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formProductId, setFormProductId] = useState('')
  const [formSalespersonId, setFormSalespersonId] = useState('')
  const [formSupplierId, setFormSupplierId] = useState('')
  const [formInvoiceNo, setFormInvoiceNo] = useState('')
  const [formInvoiceDate, setFormInvoiceDate] = useState('')
  const [formStartingDate, setFormStartingDate] = useState('')
  const [formExpiryDate, setFormExpiryDate] = useState('')
  const [formSellingPrice, setFormSellingPrice] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState('')
  const [formTaxAmount, setFormTaxAmount] = useState('0')
  const [formProductDescription, setFormProductDescription] = useState('')
  const [formPaymentStatus, setFormPaymentStatus] = useState('Unpaid')
  const [formPaymentMethod, setFormPaymentMethod] = useState('')
  const [formPaymentDate, setFormPaymentDate] = useState('')
  const [formAutoRenew, setFormAutoRenew] = useState(true)
  const [formPriority, setFormPriority] = useState('Medium')
  const [formStatus, setFormStatus] = useState('active')

  const fetchData = async () => {
    try {
      const subSnap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(subSnap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() })))

      const custSnap = await getDocs(collection(db, 'customers'))
      setCustomers(custSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(c => c.isActive !== false))

      const prodSnap = await getDocs(collection(db, 'products'))
      setProducts(prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(p => p.isActive !== false))

      const spSnap = await getDocs(collection(db, 'salespersons'))
      setSalespersons(spSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(s => s.isActive !== false))

      const suppSnap = await getDocs(collection(db, 'suppliers'))
      setSuppliers(suppSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(s => s.isActive !== false))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Listen to autoOpenAdd from navigation actions
  useEffect(() => {
    if (autoOpenAdd && !loading) {
      openAddModal()
    }
  }, [autoOpenAdd, loading])

  const getSubRenewalStatus = (expiryDate, status) => {
    if (status === 'paused') return 'Paused'
    if (status === 'cancelled') return 'Cancelled'
    if (!expiryDate) return 'Active'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expiring Today'
    if (diffDays <= 30) return 'Expiring Soon'
    return 'Active'
  }

  const openAddModal = () => {
    setEditingSub(null)
    setFormCustomerId('')
    setFormProductId('')
    setFormSalespersonId('')
    setFormSupplierId('')
    setFormInvoiceNo(`INV-${Date.now().toString().slice(-6)}`)
    setFormInvoiceDate(new Date().toISOString().split('T')[0])
    setFormStartingDate(new Date().toISOString().split('T')[0])
    setFormExpiryDate('')
    setFormSellingPrice('')
    setFormPurchasePrice('')
    setFormTaxAmount('0')
    setFormProductDescription('')
    setFormPaymentStatus('Unpaid')
    setFormPaymentMethod('')
    setFormPaymentDate('')
    setFormAutoRenew(true)
    setFormPriority('Medium')
    setFormStatus('active')
    setShowModal(true)
  }

  const openEditModal = (sub) => {
    setEditingSub(sub)
    setFormCustomerId(sub.customerId || '')
    setFormProductId(sub.productId || '')
    setFormSalespersonId(sub.salespersonId || '')
    setFormSupplierId(sub.supplierId || '')
    setFormInvoiceNo(sub.invoiceNo || '')
    setFormInvoiceDate(sub.invoiceDate || '')
    setFormStartingDate(sub.startingDate || '')
    setFormExpiryDate(sub.expiryDate || '')
    setFormSellingPrice(String(sub.sellingPrice || ''))
    setFormPurchasePrice(String(sub.purchasePrice || ''))
    setFormTaxAmount(String(sub.taxAmount || '0'))
    setFormProductDescription(sub.productDescription || '')
    setFormPaymentStatus(sub.paymentStatus || 'Unpaid')
    setFormPaymentMethod(sub.paymentMethod || '')
    setFormPaymentDate(sub.paymentDate || '')
    setFormAutoRenew(sub.autoRenew !== false)
    setFormPriority(sub.priority || 'Medium')
    setFormStatus(sub.subscriptionStatus || 'active')
    setShowModal(true)
  }

  const handleProductChange = (prodId) => {
    setFormProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      setFormSellingPrice(String(prod.sellingPrice || ''))
      setFormPurchasePrice(String(prod.purchasePrice || ''))
      setFormProductDescription(prod.description || '')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const selectedCust = customers.find(c => c.id === formCustomerId)
    const selectedProd = products.find(p => p.id === formProductId)
    const selectedSP = salespersons.find(s => s.id === formSalespersonId)
    const selectedSupp = suppliers.find(s => s.id === formSupplierId)

    const subData = {
      customerId: formCustomerId,
      customerName: selectedCust ? selectedCust.companyName : 'Unknown',
      productId: formProductId,
      productName: selectedProd ? selectedProd.productName : 'Uncategorized',
      salespersonId: formSalespersonId,
      salespersonName: selectedSP ? selectedSP.name : '',
      supplierId: formSupplierId,
      supplierName: selectedSupp ? selectedSupp.companyName : '',
      invoiceNo: formInvoiceNo,
      invoiceDate: formInvoiceDate,
      startingDate: formStartingDate,
      expiryDate: formExpiryDate,
      sellingPrice: Number(formSellingPrice) || 0,
      purchasePrice: Number(formPurchasePrice) || 0,
      taxAmount: Number(formTaxAmount) || 0,
      totalAmount: (Number(formSellingPrice) || 0) + (Number(formTaxAmount) || 0),
      productDescription: formProductDescription,
      paymentStatus: formPaymentStatus,
      paymentMethod: formPaymentMethod,
      paymentDate: formPaymentDate,
      autoRenew: formAutoRenew,
      priority: formPriority,
      subscriptionStatus: formStatus,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingSub) {
        await updateDoc(doc(db, 'subscriptions', editingSub.id), subData)
      } else {
        await addDoc(collection(db, 'subscriptions'), {
          ...subData,
          createdAt: new Date().toISOString()
        })
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save subscription details')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'subscriptions', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  // Filter Logic
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const searchNeedle = search.toLowerCase()
    const matchesSearch =
      (sub.customerName || '').toLowerCase().includes(searchNeedle) ||
      (sub.invoiceNo || '').toLowerCase().includes(searchNeedle) ||
      (sub.productName || '').toLowerCase().includes(searchNeedle)

    const subStatus = getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus)
    let matchesStatus = true
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active') matchesStatus = subStatus === 'Active'
      else if (filterStatus === 'Expired') matchesStatus = subStatus === 'Expired'
      else if (filterStatus === 'Expiring Today') matchesStatus = subStatus === 'Expiring Today'
      else if (filterStatus === 'Expiring Soon') matchesStatus = subStatus === 'Expiring Soon'
      else if (filterStatus === 'Paused') matchesStatus = sub.subscriptionStatus === 'paused'
      else if (filterStatus === 'Cancelled') matchesStatus = sub.subscriptionStatus === 'cancelled'
    }

    const matchesPayment = filterPayment === 'All' ? true : sub.paymentStatus === filterPayment
    const matchesSP = filterSalesperson === 'All' ? true : sub.salespersonId === filterSalesperson

    return matchesSearch && matchesStatus && matchesPayment && matchesSP
  })

  // Export CSV
  const exportCSV = () => {
    let csv = 'ID,Invoice No,Customer,Product,Selling Price,Expiry,Payment,Status\n'
    filteredSubscriptions.forEach((s) => {
      const status = getSubRenewalStatus(s.expiryDate, s.subscriptionStatus)
      csv += `"${s.index}","${s.invoiceNo || ''}","${s.customerName || ''}","${s.productName || ''}","${s.sellingPrice || 0}","${s.expiryDate || 'N/A'}","${s.paymentStatus || 'Unpaid'}","${status}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'subscriptions_export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-file-contract"></i> Subscriptions</h2>
        <div>
          <button className="btn btn-success" onClick={openAddModal} style={{ marginRight: 8 }}>
            <i className="fas fa-plus"></i> Add Subscription
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      {/* Complex Filter row matching PHP layouts */}
      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search by customer, invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 220 }}
        />

        <select
          className="form-control"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Expiring Today">Expiring Today</option>
          <option value="Expiring Soon">Expiring Soon (30 Days)</option>
          <option value="Paused">Paused</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          className="form-control"
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="All">All Payments</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partial">Partial</option>
          <option value="Refunded">Refunded</option>
        </select>

        <select
          className="form-control"
          value={filterSalesperson}
          onChange={(e) => setFilterSalesperson(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="All">All Salespersons</option>
          {salespersons.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>

        {(search || filterStatus !== 'All' || filterPayment !== 'All' || filterSalesperson !== 'All') && (
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setFilterStatus('All'); setFilterPayment('All'); setFilterSalesperson('All') }}>
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
                <th>Invoice No</th>
                <th>Customer Name</th>
                <th>Product Name</th>
                <th>Selling Price</th>
                <th>Expiry Date</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((item) => {
                const subStatus = getSubRenewalStatus(item.expiryDate, item.subscriptionStatus)
                return (
                  <tr key={item.id}>
                    <td>{item.index}</td>
                    <td><code>{item.invoiceNo}</code></td>
                    <td><strong>{item.customerName}</strong></td>
                    <td>{item.productName}</td>
                    <td><strong>{currencySymbol}{item.sellingPrice.toLocaleString()}</strong></td>
                    <td>{item.expiryDate || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${
                        item.paymentStatus === 'Paid' ? 'pay-paid' :
                        item.paymentStatus === 'Unpaid' ? 'pay-unpaid' : 'pay-partial'
                      }`}>
                        {item.paymentStatus || 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge" style={{
                        backgroundColor:
                          subStatus === 'Active' ? '#d4edda' :
                          subStatus === 'Expired' ? '#6c757d' :
                          subStatus === 'Expiring Today' ? '#f8d7da' : '#fff3cd',
                        color:
                          subStatus === 'Active' ? '#155724' :
                          subStatus === 'Expired' ? '#fff' :
                          subStatus === 'Expiring Today' ? '#721c24' : '#856404'
                      }}>
                        {subStatus}
                      </span>
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
                )
              })}
              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No subscriptions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>
                <i className={editingSub ? 'fas fa-edit' : 'fas fa-plus-circle'}></i> {editingSub ? 'Edit Subscription' : 'Add Subscription'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer *</label>
                    <select className="form-control" value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} required>
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product / Plan *</label>
                    <select className="form-control" value={formProductId} onChange={(e) => handleProductChange(e.target.value)} required>
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.productName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Custom Description</label>
                  <textarea
                    className="form-control"
                    placeholder="Custom specs, licensing terms, keys..."
                    value={formProductDescription}
                    onChange={(e) => setFormProductDescription(e.target.value)}
                    style={{ height: 60 }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Supplier / Partner</label>
                    <select className="form-control" value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)}>
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sales Representative</label>
                    <select className="form-control" value={formSalespersonId} onChange={(e) => setFormSalespersonId(e.target.value)}>
                      <option value="">-- Choose Sales Rep --</option>
                      {salespersons.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Invoice Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formInvoiceNo}
                      onChange={(e) => setFormInvoiceNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Invoice Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formInvoiceDate}
                      onChange={(e) => setFormInvoiceDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Contract Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formStartingDate}
                      onChange={(e) => setFormStartingDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contract Expiry Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Retail Selling price"
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Price (Cost) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Supplier Purchase cost"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Custom Tax Amount</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formTaxAmount}
                      onChange={(e) => setFormTaxAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select className="form-control" value={formPaymentStatus} onChange={(e) => setFormPaymentStatus(e.target.value)}>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select className="form-control" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value)}>
                      <option value="">-- Choose Method --</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Stripe">Stripe</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formPaymentDate}
                      onChange={(e) => setFormPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority Tag</label>
                    <select className="form-control" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contract Status</label>
                    <select className="form-control" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option value="active">Active / Running</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={formAutoRenew}
                      onChange={(e) => setFormAutoRenew(e.target.checked)}
                    />
                    Enable Auto-Renew notifications
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
