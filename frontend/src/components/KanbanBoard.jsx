import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function KanbanBoard({ currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getSubRenewalStatus = (expiryDate, status) => {
    if (status === 'paused') return 'paused'
    if (status === 'cancelled') return 'cancelled'
    if (!expiryDate) return 'active'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'expired'
    if (diff === 0) return 'expiring_today'
    if (diff > 0 && diff <= 30) return 'expiring_soon'
    return 'active'
  }

  const columns = {
    active: { label: 'Active', color: '#28a745', cards: [] },
    expiring_soon: { label: 'Expiring Soon', color: '#ff9800', cards: [] },
    expiring_today: { label: 'Expiring Today', color: '#dc3545', cards: [] },
    expired: { label: 'Expired', color: '#6c757d', cards: [] },
    paused: { label: 'Paused', color: '#ffc107', cards: [] },
    cancelled: { label: 'Cancelled', color: '#343a40', cards: [] }
  }

  // Group subscriptions into columns
  subscriptions.forEach(sub => {
    const colKey = getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus)
    if (columns[colKey]) {
      columns[colKey].cards.push(sub)
    }
  })

  const colOrder = ['active', 'expiring_soon', 'expiring_today', 'expired', 'paused', 'cancelled']

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-columns"></i> Kanban Board</h2>
        <button className="btn btn-primary" onClick={fetchData}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
        </div>
      ) : (
        <div className="kanban-board">
          {colOrder.map(key => {
            const col = columns[key]
            return (
              <div className="kanban-col" key={key}>
                <div className="kanban-col-header" style={{ background: col.color }}>
                  <span>{col.label}</span>
                  <span className="kanban-count">{col.cards.length}</span>
                </div>
                <div className="kanban-col-body">
                  {col.cards.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#999', fontSize: 12 }}>
                      <i className="fas fa-inbox" style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.5 }}></i>
                      No subscriptions
                    </div>
                  )}
                  {col.cards.map((card, index) => {
                    const daysLeft = card.expiryDate ? Math.ceil((new Date(card.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const daysText = daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)} days ago`) : ''

                    return (
                      <div className="kanban-card" key={card.id || index}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text-primary)' }}>{card.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {card.invoiceNo} {card.productName ? ` · ${card.productName}` : ''}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, alignItems: 'center' }}>
                          <span style={{ color: 'var(--navy-accent)', fontWeight: 600 }}>{currencySymbol}{Number(card.sellingPrice || 0).toLocaleString()}</span>
                          <span className={`status-badge ${
                            card.paymentStatus === 'Paid' ? 'pay-paid' :
                            card.paymentStatus === 'Unpaid' ? 'pay-unpaid' : 'pay-partial'
                          }`}>{card.paymentStatus || 'Unpaid'}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                          Expires: {card.expiryDate || 'N/A'} {daysText ? ` · ${daysText}` : ''}
                        </div>
                        {card.salespersonName && (
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                            SP: {card.salespersonName}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
