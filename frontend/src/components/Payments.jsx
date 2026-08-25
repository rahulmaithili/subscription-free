import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Payments({ currencySymbol = '₹' }) {
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterInvoice, setFilterInvoice] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterMethod, setFilterMethod] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Form Fields
  const [formSubscriptionId, setFormSubscriptionId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPaymentDate, setFormPaymentDate] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('Razorpay')
  const [formNotes, setFormNotes] = useState('')

  const fetchData = async () => {
    try {
      const paySnap = await getDocs(collection(db, 'payments'))
      setPayments(paySnap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() })))

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
    setFormSubscriptionId('')
    setFormAmount('')
    setFormPaymentDate(new Date().toISOString().split('T')[0])
    setFormPaymentMethod('Razorpay')
    setFormNotes('')
    setShowModal(true)
  }

  const handleSubscriptionChange = (subId) => {
    setFormSubscriptionId(subId)
    const sub = subscriptions.find((s) => s.id === subId)
    if (sub) {
      setFormAmount(sub.sellingPrice || '')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const sub = subscriptions.find((s) => s.id === formSubscriptionId)
    if (!sub) return

    const payData = {
      subscriptionId: formSubscriptionId,
      invoiceNo: sub.invoiceNo || 'N/A',
      customerName: sub.customerName || 'Unknown',
      amount: Number(formAmount) || 0,
      paymentDate: formPaymentDate,
      paymentMethod: formPaymentMethod,
      notes: formNotes,
      createdAt: new Date().toISOString()
    }

    try {
      // 1. Add payment record
      await addDoc(collection(db, 'payments'), payData)

      // 2. Update subscription status
      await updateDoc(doc(db, 'subscriptions', formSubscriptionId), {
        paymentStatus: 'Paid',
        paymentMethod: formPaymentMethod,
        paymentDate: formPaymentDate
      })

      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error('Error saving payment:', err)
      alert('Failed to save payment record')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'payments', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  // Filter Logic
  const filteredPayments = payments.filter((pay) => {
    const matchInvoice = (pay.invoiceNo || '').toLowerCase().includes(filterInvoice.toLowerCase())
    const matchCustomer = (pay.customerName || '').toLowerCase().includes(filterCustomer.toLowerCase())
    const matchMethod = filterMethod ? pay.paymentMethod === filterMethod : true

    return matchInvoice && matchCustomer && matchMethod
  })

  // Export CSV
  const exportCSV = () => {
    let csv = 'ID,Invoice No,Customer Name,Amount,Payment Date,Payment Method,Notes\n'
    filteredPayments.forEach((p) => {
      csv += `"${p.index}","${p.invoiceNo || ''}","${p.customerName || ''}","${p.amount || 0}","${p.paymentDate || ''}","${p.paymentMethod || ''}","${p.notes || ''}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'payments_export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-money-bill-wave"></i> Payments Ledger</h2>
        <div>
          <button className="btn btn-success" onClick={openAddModal} style={{ marginRight: 8 }}>
            <i className="fas fa-plus-circle"></i> Add Payment Record
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
          placeholder="Filter by Invoice..."
          value={filterInvoice}
          onChange={(e) => setFilterInvoice(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input
          type="text"
          className="form-control"
          placeholder="Filter by Customer..."
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select
          className="form-control"
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="">All Methods</option>
          <option value="Razorpay">Razorpay</option>
          <option value="Stripe">Stripe</option>
          <option value="PayPal">PayPal</option>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
        {(filterInvoice || filterCustomer || filterMethod) && (
          <button className="btn btn-secondary" onClick={() => { setFilterInvoice(''); setFilterCustomer(''); setFilterMethod('') }}>
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
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Payment Method</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((item) => (
                <tr key={item.id}>
                  <td>{item.index}</td>
                  <td><code>{item.invoiceNo}</code></td>
                  <td><strong>{item.customerName}</strong></td>
                  <td><strong style={{ color: 'var(--green)' }}>{currencySymbol}{item.amount.toLocaleString()}</strong></td>
                  <td>{item.paymentDate}</td>
                  <td>
                    <span className="status-badge pay-paid">
                      {item.paymentMethod}
                    </span>
                  </td>
                  <td>{item.notes || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="action-icon delete-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => handleDelete(item.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No payment transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3><i className="fas fa-money-bill-wave"></i> Add Payment Record</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Select Unpaid Subscription *</label>
                  <select
                    className="form-control"
                    value={formSubscriptionId}
                    onChange={(e) => handleSubscriptionChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Contract --</option>
                    {subscriptions
                      .filter((s) => s.paymentStatus !== 'Paid')
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.invoiceNo} - {sub.customerName} ({currencySymbol}{sub.sellingPrice})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount Paid *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter amount"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method *</label>
                    <select
                      className="form-control"
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      required
                    >
                      <option value="Razorpay">Razorpay</option>
                      <option value="Stripe">Stripe</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Payment Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notes / Comments</label>
                  <textarea
                    className="form-control"
                    placeholder="Enter transaction notes..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ height: 60 }}
                  />
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
