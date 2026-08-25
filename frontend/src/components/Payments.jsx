import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Trash2, X, RefreshCw, DollarSign } from 'lucide-react'

export default function Payments({ currencySymbol = '₹' }) {
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Form Fields
  const [formSubscriptionId, setFormSubscriptionId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPaymentDate, setFormPaymentDate] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('Razorpay')
  const [formNotes, setFormNotes] = useState('')

  // Search/Filters
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    try {
      const paySnap = await getDocs(collection(db, 'payments'))
      setPayments(paySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

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

  const filteredPayments = payments.filter((pay) => {
    const needle = search.toLowerCase()
    return (
      (pay.customerName || '').toLowerCase().includes(needle) ||
      (pay.invoiceNo || '').toLowerCase().includes(needle) ||
      (pay.paymentMethod || '').toLowerCase().includes(needle)
    )
  })

  // List of subscriptions that are unpaid, to display in form selection
  const unpaidSubscriptions = subscriptions.filter((sub) => sub.paymentStatus !== 'Paid')

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Payments</p>
          <h1>Payments</h1>
          <p className="subheading">Track incoming subscription payments, methods, dates and record new payments.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Record Payment</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by customer, invoice, method..."
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
                  <th>Customer</th>
                  <th>Invoice No</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Payment Method</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((item) => {
                  const tone = ['coral', 'mint', 'yellow', 'blue'][Math.abs(item.customerName?.charCodeAt(0) || 0) % 4]
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="customer-cell">
                          <span className={`customer-avatar ${tone}`}>
                            {(item.customerName || 'CU').slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{item.customerName}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="plan-name">{item.invoiceNo}</span>
                      </td>
                      <td>
                        <strong>{currencySymbol}{item.amount.toLocaleString()}</strong>
                      </td>
                      <td>{new Date(item.paymentDate).toLocaleDateString()}</td>
                      <td>
                        <span className="status active" style={{ backgroundColor: 'rgba(0,116,217,0.1)', color: 'var(--navy-accent)' }}>
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.notes || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="icon-button" onClick={() => handleDelete(item.id)} aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredPayments.length === 0 && (
              <div className="empty-state">No payment records found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Record Subscription Payment</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Unpaid Subscription *</label>
                  <select
                    className="form-control"
                    value={formSubscriptionId}
                    onChange={(e) => handleSubscriptionChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select Subscription --</option>
                    {unpaidSubscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.customerName} - {sub.productName} ({sub.invoiceNo}) - {currencySymbol}{sub.sellingPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount Paid ({currencySymbol}) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                    />
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
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Enter transaction details, checks references, etc."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
