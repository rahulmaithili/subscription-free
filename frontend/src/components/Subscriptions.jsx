import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, MoreHorizontal, ChevronDown, Check, Play, Pause, AlertCircle, RefreshCw } from 'lucide-react'

export default function Subscriptions({ user, currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingSub, setEditingSub] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All subscriptions')

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

  // Quick Action row dropdown menu state
  const [actionMenuId, setActionMenuId] = useState(null)

  const fetchData = async () => {
    try {
      const subSnap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

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
    if (diffDays <= 30) return 'Due soon'
    return 'Active'
  }

  // Populate product details in form automatically when changed
  const handleProductChange = (prodId) => {
    setFormProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      setFormSellingPrice(prod.sellingPrice || '')
      setFormPurchasePrice(prod.purchasePrice || '')
      setFormProductDescription(prod.description || '')
    }
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
    setFormSellingPrice(sub.sellingPrice || '')
    setFormPurchasePrice(sub.purchasePrice || '')
    setFormTaxAmount(sub.taxAmount || '0')
    setFormProductDescription(sub.productDescription || '')
    setFormPaymentStatus(sub.paymentStatus || 'Unpaid')
    setFormPaymentMethod(sub.paymentMethod || '')
    setFormPaymentDate(sub.paymentDate || '')
    setFormAutoRenew(sub.autoRenew !== false)
    setFormPriority(sub.priority || 'Medium')
    setFormStatus(sub.subscriptionStatus || 'active')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Lookup labels
    const customerObj = customers.find((c) => c.id === formCustomerId)
    const productObj = products.find((p) => p.id === formProductId)
    const salespersonObj = salespersons.find((s) => s.id === formSalespersonId)
    const supplierObj = suppliers.find((s) => s.id === formSupplierId)

    const subData = {
      customerId: formCustomerId,
      customerName: customerObj ? customerObj.companyName : 'Unknown',
      productId: formProductId,
      productName: productObj ? productObj.productName : 'Unknown',
      salespersonId: formSalespersonId,
      salespersonName: salespersonObj ? salespersonObj.name : '',
      supplierId: formSupplierId || '',
      supplierName: supplierObj ? supplierObj.companyName : '',
      invoiceNo: formInvoiceNo,
      invoiceDate: formInvoiceDate,
      startingDate: formStartingDate,
      expiryDate: formExpiryDate || '',
      sellingPrice: Number(formSellingPrice) || 0,
      purchasePrice: Number(formPurchasePrice) || 0,
      taxAmount: Number(formTaxAmount) || 0,
      totalAmount: (Number(formSellingPrice) || 0) + (Number(formTaxAmount) || 0),
      productDescription: formProductDescription,
      paymentStatus: formPaymentStatus,
      paymentMethod: formPaymentMethod,
      paymentDate: formPaymentDate || '',
      autoRenew: formAutoRenew,
      priority: formPriority,
      subscriptionStatus: formStatus,
      updatedAt: new Date().toISOString(),
      addedBy: user?.uid || 'system'
    }

    try {
      if (editingSub) {
        await updateDoc(doc(db, 'subscriptions', editingSub.id), subData)
      } else {
        await addDoc(collection(db, 'subscriptions'), subData)
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error('Error saving subscription:', err)
      alert('Error saving subscription details')
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

  const toggleStatus = async (sub, newStatus) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        subscriptionStatus: newStatus,
        updatedAt: new Date().toISOString()
      })
      setActionMenuId(null)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Filter subscriptions
  const filteredSubs = subscriptions.filter((sub) => {
    const renewalStatus = getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus)
    const matchesFilter =
      filter === 'All subscriptions' ||
      renewalStatus === filter ||
      (filter === 'Active' && renewalStatus === 'Active') ||
      (filter === 'Due soon' && renewalStatus === 'Due soon') ||
      (filter === 'Paused' && renewalStatus === 'Paused')

    const needle = search.toLowerCase()
    const matchesSearch =
      `${sub.customerName} ${sub.productName} ${sub.invoiceNo}`.toLowerCase().includes(needle)

    return matchesFilter && matchesSearch
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Subscriptions</p>
          <h1>Subscriptions</h1>
          <p className="subheading">Manage client accounts, check renewal schedules and pricing details.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>New Subscription</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by customer, product, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            {['All subscriptions', 'Active', 'Due soon', 'Paused', 'Expired'].map((item) => (
              <button
                className={filter === item ? 'filter active' : 'filter'}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
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
                  <th>Customer</th>
                  <th>Plan & Product</th>
                  <th>Starting & Expiry</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((item) => {
                  const subRenewalStatus = getSubRenewalStatus(item.expiryDate, item.subscriptionStatus)
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.customerName?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.customerName || 'CU').slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <strong>{item.customerName}</strong>
                            {item.salespersonName && <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10 }}>Rep: {item.salespersonName}</small>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="plan-name">{item.productName}</span>
                        <small className="cycle">Invoice: {item.invoiceNo}</small>
                      </td>
                      <td>
                        <span className="plan-name">{item.startingDate ? new Date(item.startingDate).toLocaleDateString() : 'N/A'}</span>
                        <small className="cycle">Expires: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Continuous'}</small>
                      </td>
                      <td>
                        <strong>{currencySymbol}{item.sellingPrice}</strong>
                        <small className="cycle">Tax: {currencySymbol}{item.taxAmount}</small>
                      </td>
                      <td>
                        <span className={`status ${item.paymentStatus === 'Paid' ? 'active' : 'due-soon'}`} style={{ textTransform: 'capitalize' }}>
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${subRenewalStatus.toLowerCase().replace(' ', '-')}`}>
                          <i />
                          {subRenewalStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', position: 'relative' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button className="icon-button" onClick={() => openEditModal(item)} aria-label="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-button" onClick={() => handleDelete(item.id)} aria-label="Delete">
                            <Trash2 size={16} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                            aria-label="More"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>

                        {actionMenuId === item.id && (
                          <div style={{
                            position: 'absolute', right: 10, top: 40, background: 'var(--bg-card)',
                            border: '1px solid var(--line)', borderRadius: 6, zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: 6, display: 'grid', minWidth: 120, textAlign: 'left'
                          }}>
                            <button className="ghost-button" style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11 }} onClick={() => toggleStatus(item, 'active')}>
                              <Play size={12} style={{ marginRight: 6, display: 'inline' }} /> Activate
                            </button>
                            <button className="ghost-button" style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11 }} onClick={() => toggleStatus(item, 'paused')}>
                              <Pause size={12} style={{ marginRight: 6, display: 'inline' }} /> Pause
                            </button>
                            <button className="ghost-button" style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: 'var(--danger)' }} onClick={() => toggleStatus(item, 'cancelled')}>
                              <X size={12} style={{ marginRight: 6, display: 'inline' }} /> Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredSubs.length === 0 && (
              <div className="empty-state">No subscriptions found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Add / Edit Subscription Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container large">
            <div className="modal-header">
              <h3>{editingSub ? 'Edit Subscription Details' : 'Add New Subscription'}</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Customer *</label>
                    <select className="form-control" value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} required>
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Product / Service *</label>
                    <select className="form-control" value={formProductId} onChange={(e) => handleProductChange(e.target.value)} required>
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.productName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Salesperson Representative</label>
                    <select className="form-control" value={formSalespersonId} onChange={(e) => setFormSalespersonId(e.target.value)}>
                      <option value="">-- Select Rep --</option>
                      {salespersons.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.commissionRate}%)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Supplier Partner</label>
                    <select className="form-control" value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)}>
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input type="text" className="form-control" value={formInvoiceNo} onChange={(e) => setFormInvoiceNo(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Invoice Date</label>
                    <input type="date" className="form-control" value={formInvoiceDate} onChange={(e) => setFormInvoiceDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Starting Date</label>
                    <input type="date" className="form-control" value={formStartingDate} onChange={(e) => setFormStartingDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date (blank if lifetime)</label>
                    <input type="date" className="form-control" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price ({currencySymbol}) *</label>
                    <input type="number" step="any" className="form-control" value={formSellingPrice} onChange={(e) => setFormSellingPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Purchase/Cost Price ({currencySymbol})</label>
                    <input type="number" step="any" className="form-control" value={formPurchasePrice} onChange={(e) => setFormPurchasePrice(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tax Amount ({currencySymbol})</label>
                    <input type="number" step="any" className="form-control" value={formTaxAmount} onChange={(e) => setFormTaxAmount(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Description / Key Information</label>
                  <textarea className="form-control" value={formProductDescription} onChange={(e) => setFormProductDescription(e.target.value)} placeholder="License keys, support levels, PO details..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select className="form-control" value={formPaymentStatus} onChange={(e) => setFormPaymentStatus(e.target.value)}>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <input type="text" className="form-control" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value)} placeholder="Razorpay, Cash, Bank Transfer..." />
                  </div>
                  <div className="form-group">
                    <label>Payment Date</label>
                    <input type="date" className="form-control" value={formPaymentDate} onChange={(e) => setFormPaymentDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="form-control" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Subscription Mode</label>
                    <select className="form-control" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox">
                    <input type="checkbox" checked={formAutoRenew} onChange={(e) => setFormAutoRenew(e.target.checked)} />
                    Auto Renew Subscription automatically on Expiry Date
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
