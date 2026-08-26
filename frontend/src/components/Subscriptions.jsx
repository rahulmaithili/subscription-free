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

  // Filtering / Search States
  const [searchCustomer, setSearchCustomer] = useState('')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterProduct, setFilterProduct] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterAddedBy, setFilterAddedBy] = useState('All')

  // Chevron Active Tab Filter (ALL, ACTIVE, EXPIRING SOON, EXPIRING TODAY, EXPIRED, PAUSED, CANCELLED)
  const [activeStage, setActiveStage] = useState('ALL')

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

  // Page limit
  const [pageLimit, setPageLimit] = useState(10)

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

  useEffect(() => {
    if (autoOpenAdd && !loading) {
      openAddModal()
    }
  }, [autoOpenAdd, loading])

  // Calculation helpers
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limitDate = new Date()
  limitDate.setDate(today.getDate() + 30)

  const getSubRenewalStatus = (expiryDate, status) => {
    if (status === 'paused') return 'Paused'
    if (status === 'cancelled') return 'Cancelled'
    if (!expiryDate) return 'Active'

    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expiring Today'
    if (diffDays <= 30) return 'Expiring Soon'
    return 'Active'
  }

  // Count stats for cards
  let activeCount = 0
  let expiringSoonCount = 0
  let expiringTodayCount = 0
  let expiredCount = 0
  let pausedCount = 0
  let cancelledCount = 0

  subscriptions.forEach(sub => {
    const status = getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus)
    if (sub.subscriptionStatus === 'paused') pausedCount++
    else if (sub.subscriptionStatus === 'cancelled') cancelledCount++
    else if (status === 'Active') activeCount++
    else if (status === 'Expiring Soon') expiringSoonCount++
    else if (status === 'Expiring Today') expiringTodayCount++
    else if (status === 'Expired') expiredCount++
  })

  const totalRevenue = subscriptions.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
  const unpaidRevenue = subscriptions
    .filter(s => s.paymentStatus !== 'Paid')
    .reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)

  // Status Tab Action mapping
  const filterByStage = (sub) => {
    if (activeStage === 'ALL') return true
    const renewalStatus = getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus)
    if (activeStage === 'ACTIVE') return sub.subscriptionStatus === 'active' && renewalStatus === 'Active'
    if (activeStage === 'EXPIRING SOON') return sub.subscriptionStatus === 'active' && renewalStatus === 'Expiring Soon'
    if (activeStage === 'EXPIRING TODAY') return sub.subscriptionStatus === 'active' && renewalStatus === 'Expiring Today'
    if (activeStage === 'EXPIRED') return sub.subscriptionStatus === 'active' && renewalStatus === 'Expired'
    if (activeStage === 'PAUSED') return sub.subscriptionStatus === 'paused'
    if (activeStage === 'CANCELLED') return sub.subscriptionStatus === 'cancelled'
    return true
  }

  // Table filters logic
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!filterByStage(sub)) return false

    // search customer name / invoice
    if (searchCustomer.trim()) {
      const needle = searchCustomer.toLowerCase()
      const matchName = (sub.customerName || '').toLowerCase().includes(needle)
      const matchInvoice = (sub.invoiceNo || '').toLowerCase().includes(needle)
      if (!matchName && !matchInvoice) return false
    }

    // payment status
    if (filterPayment !== 'All' && sub.paymentStatus !== filterPayment) return false

    // priority
    if (filterPriority !== 'All' && sub.priority !== filterPriority) return false

    // product
    if (filterProduct !== 'All' && sub.productId !== filterProduct) return false

    // date from
    if (filterDateFrom) {
      if (!sub.invoiceDate || sub.invoiceDate < filterDateFrom) return false
    }

    // date to
    if (filterDateTo) {
      if (!sub.invoiceDate || sub.invoiceDate > filterDateTo) return false
    }

    // added by
    if (filterAddedBy !== 'All' && sub.salespersonId !== filterAddedBy) return false

    return true
  })

  // Quick Inline Status Update Dropdowns
  const handleUpdatePaymentStatus = async (sub, newStatus) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        paymentStatus: newStatus,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdatePriority = async (sub, newPriority) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        priority: newPriority,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleSubStatus = async (sub) => {
    const nextStatus = sub.subscriptionStatus === 'paused' ? 'active' : 'paused'
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        subscriptionStatus: nextStatus,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
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
      alert('Failed to save subscription')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete Subscription? This action cannot be undone.')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'subscriptions', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const exportCSV = () => {
    let csv = 'SL,Customer,Invoice,Product,Expiry,Days Left,Status,Payment,Amount,Priority\n'
    filteredSubscriptions.forEach((s) => {
      const status = getSubRenewalStatus(s.expiryDate, s.subscriptionStatus)
      const daysLeft = s.expiryDate ? Math.ceil((new Date(s.expiryDate) - today) / (1000 * 60 * 60 * 24)) : ''
      csv += `"${s.index}","${s.customerName || ''}","${s.invoiceNo || ''}","${s.productName || ''}","${s.expiryDate || 'N/A'}","${daysLeft}","${status}","${s.paymentStatus || 'Unpaid'}","${s.sellingPrice || 0}","${s.priority || 'Medium'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'subscriptions_report.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearAllFilters = () => {
    setSearchCustomer('')
    setFilterPayment('All')
    setFilterPriority('All')
    setFilterProduct('All')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAddedBy('All')
    setActiveStage('ALL')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 1. Header Stat Cards Row (9 Columns Layout matching screenshot 1) */}
      <div className="dash-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <div className="dash-card dash-card-navy" style={{ padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('ALL')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-file-contract"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{subscriptions.length}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Total</div>
        </div>
        <div className="dash-card dash-card-green" style={{ padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('ACTIVE')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-check-circle"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{activeCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Active</div>
        </div>
        <div className="dash-card" style={{ background: '#ffa000', padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('EXPIRING SOON')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-exclamation-triangle"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{expiringSoonCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Expiring Soon</div>
        </div>
        <div className="dash-card" style={{ background: '#ff7043', padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('EXPIRING TODAY')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-clock"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{expiringTodayCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Expiring Today</div>
        </div>
        <div className="dash-card dash-card-red" style={{ padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('EXPIRED')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-ban"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{expiredCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Expired</div>
        </div>
        <div className="dash-card dash-card-blue" style={{ padding: '12px 10px', minHeight: 70 }}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-coins"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{currencySymbol}{totalRevenue.toLocaleString()}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Revenue</div>
        </div>
        <div className="dash-card dash-card-purple" style={{ padding: '12px 10px', minHeight: 70 }}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-money-bill-wave"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{currencySymbol}{unpaidRevenue.toLocaleString()}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Unpaid</div>
        </div>
        <div className="dash-card" style={{ background: '#fbc02d', padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('PAUSED')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-pause"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{pausedCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Paused</div>
        </div>
        <div className="dash-card" style={{ background: '#d32f2f', padding: '12px 10px', minHeight: 70 }} onClick={() => setActiveStage('CANCELLED')}>
          <div className="dash-card-icon" style={{ fontSize: 24 }}><i className="fas fa-times-circle"></i></div>
          <div className="dash-card-value" style={{ fontSize: 18 }}>{cancelledCount}</div>
          <div className="dash-card-label" style={{ fontSize: 8 }}>Cancelled</div>
        </div>
      </div>

      <div className="data-section">
        {/* Card Header */}
        <div className="section-header">
          <h2><i className="fas fa-file-contract"></i> Subscriptions</h2>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn btn-secondary" onClick={fetchData}><i className="fas fa-sync-alt"></i> Refresh</button>
            <button className="btn btn-success" onClick={openAddModal}><i className="fas fa-plus"></i> Add Subscription</button>
          </div>
        </div>

        {/* 2. Pipeline Segment Buttons Filter */}
        <div className="pipeline-stages" style={{ marginBottom: 20 }}>
          <div className={`pipeline-stage ${activeStage === 'ALL' ? 'active' : ''}`} style={{ background: '#001f3f' }} onClick={() => setActiveStage('ALL')}>
            <span className="pipeline-stage-name">ALL</span>
            <span className="pipeline-stage-count">({subscriptions.length})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'ACTIVE' ? 'active' : ''}`} style={{ background: '#28a745' }} onClick={() => setActiveStage('ACTIVE')}>
            <span className="pipeline-stage-name">ACTIVE</span>
            <span className="pipeline-stage-count">({activeCount})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'EXPIRING SOON' ? 'active' : ''}`} style={{ background: '#ffa000' }} onClick={() => setActiveStage('EXPIRING SOON')}>
            <span className="pipeline-stage-name">EXPIRING SOON</span>
            <span className="pipeline-stage-count">({expiringSoonCount})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'EXPIRING TODAY' ? 'active' : ''}`} style={{ background: '#ff7043' }} onClick={() => setActiveStage('EXPIRING TODAY')}>
            <span className="pipeline-stage-name">EXPIRING TODAY</span>
            <span className="pipeline-stage-count">({expiringTodayCount})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'EXPIRED' ? 'active' : ''}`} style={{ background: '#dc3545' }} onClick={() => setActiveStage('EXPIRED')}>
            <span className="pipeline-stage-name">EXPIRED</span>
            <span className="pipeline-stage-count">({expiredCount})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'PAUSED' ? 'active' : ''}`} style={{ background: '#fbc02d' }} onClick={() => setActiveStage('PAUSED')}>
            <span className="pipeline-stage-name">PAUSED</span>
            <span className="pipeline-stage-count">({pausedCount})</span>
          </div>
          <div className={`pipeline-stage ${activeStage === 'CANCELLED' ? 'active' : ''}`} style={{ background: '#6c757d' }} onClick={() => setActiveStage('CANCELLED')}>
            <span className="pipeline-stage-name">CANCELLED</span>
            <span className="pipeline-stage-count">({cancelledCount})</span>
          </div>
        </div>

        {/* 3. Filters Box */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 15, border: '1px solid #e9ecef', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#333' }}><i className="fas fa-filter"></i> Filters</span>
            <button className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={clearAllFilters}><i className="fas fa-times-circle"></i> Clear All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Customer</label>
              <input type="text" className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="Search customer..." value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Payment Status</label>
              <select className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Priority</label>
              <select className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="All">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Product</label>
              <select className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                <option value="All">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.productName}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Date From</label>
              <input type="date" className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Date To</label>
              <input type="date" className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Added By</label>
              <select className="form-control" style={{ padding: '6px 10px', fontSize: 12 }} value={filterAddedBy} onChange={(e) => setFilterAddedBy(e.target.value)}>
                <option value="All">All Users</option>
                {salespersons.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. CSV, PDF Toolbar options */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn btn-sm btn-primary" style={{ background: '#001f3f' }} onClick={exportCSV}><i className="fas fa-file-csv"></i> CSV</button>
            <button className="btn btn-sm btn-primary" style={{ background: '#dc3545' }} onClick={() => window.print()}><i className="fas fa-file-pdf"></i> PDF</button>
            <button className="btn btn-sm btn-primary" style={{ background: '#6c757d' }} onClick={() => window.print()}><i className="fas fa-print"></i> Print</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span>Show</span>
            <select className="form-control" style={{ padding: '4px 8px', width: 'auto', fontSize: 12 }} value={pageLimit} onChange={(e) => setPageLimit(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
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
                  <th style={{ width: 30 }}><input type="checkbox" /></th>
                  <th style={{ width: 40 }}>SL</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Product</th>
                  <th>Expiry</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Priority</th>
                  <th>Sales Person</th>
                  <th>Added By</th>
                  <th>Sub Status</th>
                  <th style={{ textAlign: 'right', width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.slice(0, pageLimit).map((item) => {
                  const status = getSubRenewalStatus(item.expiryDate, item.subscriptionStatus)
                  const daysLeft = item.expiryDate ? Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24)) : null
                  const isNeg = daysLeft !== null && daysLeft < 0

                  return (
                    <tr key={item.id}>
                      <td><input type="checkbox" /></td>
                      <td>{item.index}</td>
                      <td><strong style={{ color: 'var(--navy-accent)' }}>{item.customerName}</strong></td>
                      <td style={{ fontSize: 11 }}>{item.phone || '-'}</td>
                      <td>
                        <span className="status-badge" style={{ background: '#0074D9', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 4 }}>
                          {item.productName}
                        </span>
                      </td>
                      <td style={{ fontSize: 11 }}>{item.expiryDate || 'N/A'}</td>
                      <td>
                        {daysLeft !== null ? (
                          <span style={{ fontWeight: 700, color: isNeg ? '#dc3545' : 'var(--text-primary)' }}>
                            {daysLeft}
                          </span>
                        ) : '--'}
                      </td>
                      <td>
                        <span className="status-badge" style={{
                          backgroundColor:
                            status === 'Active' ? '#d4edda' :
                            status === 'Expired' ? '#f8d7da' :
                            status === 'Expiring Today' ? '#f8d7da' : '#fff3cd',
                          color:
                            status === 'Active' ? '#155724' :
                            status === 'Expired' ? '#721c24' :
                            status === 'Expiring Today' ? '#721c24' : '#856404',
                          fontWeight: 700
                        }}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          item.paymentStatus === 'Paid' ? 'pay-paid' :
                          item.paymentStatus === 'Unpaid' ? 'pay-unpaid' : 'pay-partial'
                        }`}>
                          {item.paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td><strong>{currencySymbol}{Number(item.sellingPrice || 0).toLocaleString()}</strong></td>
                      <td>
                        {item.priority ? (
                          <span className="status-badge" style={{
                            background:
                              item.priority === 'Critical' ? '#7f1d1d' :
                              item.priority === 'High' ? '#ffa000' :
                              item.priority === 'Medium' ? '#0074D9' : '#6c757d',
                            color: '#fff',
                            fontSize: 10
                          }}>
                            {item.priority}
                          </span>
                        ) : '--'}
                      </td>
                      <td style={{ fontSize: 11 }}>{item.salespersonName || '-'}</td>
                      <td style={{ fontSize: 11 }}>{item.addedBy || 'admin'}</td>
                      <td>
                        <span className="status-badge" style={{ background: item.subscriptionStatus === 'active' ? '#28a745' : '#ffc107', color: '#fff', fontSize: 10 }}>
                          {item.subscriptionStatus === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button className="action-icon" title="Edit" style={{ color: '#ffc107', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => openEditModal(item)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          
                          <button className="action-icon" title="Copy Contract" style={{ color: '#28a745', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => openAddModal()}>
                            <i className="fas fa-sync-alt"></i>
                          </button>

                          <button className="action-icon" title="Print Invoice" style={{ color: '#ff9800', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => window.print()}>
                            <i className="fas fa-file-invoice"></i>
                          </button>

                          <a href={`https://wa.me/${item.phone}?text=Hello`} target="_blank" rel="noreferrer" className="action-icon" title="Send WhatsApp" style={{ color: '#25d366' }}>
                            <i className="fab fa-whatsapp"></i>
                          </a>

                          <a href={`mailto:${item.customerEmail}?subject=Invoice`} className="action-icon" title="Send Email" style={{ color: '#0074D9' }}>
                            <i className="fas fa-envelope"></i>
                          </a>

                          {/* Quick change dropdowns */}
                          <select 
                            style={{ fontSize: 9, padding: '2px 4px', width: 65, cursor: 'pointer' }} 
                            value={item.paymentStatus || 'Unpaid'}
                            onChange={(e) => handleUpdatePaymentStatus(item, e.target.value)}
                          >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Partial">Partial</option>
                            <option value="Refunded">Refunded</option>
                          </select>

                          <select 
                            style={{ fontSize: 9, padding: '2px 4px', width: 65, cursor: 'pointer' }} 
                            value={item.priority || 'Medium'}
                            onChange={(e) => handleUpdatePriority(item, e.target.value)}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>

                          <button className="action-icon" title="Pause / Active" style={{ color: '#fbc02d', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => handleToggleSubStatus(item)}>
                            <i className={item.subscriptionStatus === 'active' ? 'fas fa-pause-circle' : 'fas fa-play-circle'}></i>
                          </button>

                          <button className="action-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => handleDelete(item.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredSubscriptions.length === 0 && (
                  <tr>
                    <td colSpan="15" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No subscriptions listed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                      <option value="Critical">Critical</option>
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
