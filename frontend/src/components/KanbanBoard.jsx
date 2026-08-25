import { useEffect, useState } from 'react'
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { CheckCircle, AlertTriangle, Clock, RefreshCw, Play, Pause, XCircle } from 'lucide-react'

export default function KanbanBoard({ currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'subscriptions'))
      setSubscriptions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
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
    if (diffDays <= 30) return 'Expiring Soon'
    return 'Active'
  }

  const columns = [
    { key: 'Active', label: 'Active', color: '#34a853', icon: <CheckCircle size={16} /> },
    { key: 'Expiring Soon', label: 'Expiring Soon', color: '#ff9800', icon: <Clock size={16} /> },
    { key: 'Expiring Today', label: 'Expiring Today', color: '#ea4335', icon: <AlertTriangle size={16} /> },
    { key: 'Expired', label: 'Expired', color: '#6c757d', icon: <AlertTriangle size={16} /> },
    { key: 'Paused', label: 'Paused', color: '#fbbc04', icon: <Pause size={16} /> },
    { key: 'Cancelled', label: 'Cancelled', color: '#343a40', icon: <XCircle size={16} /> }
  ]

  const updateSubStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'subscriptions', id), {
        subscriptionStatus: newStatus,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const getCardsForColumn = (colKey) => {
    return subscriptions.filter(
      (sub) => getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus) === colKey
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <RefreshCw className="spinner" size={24} />
      </div>
    )
  }

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Kanban Board</p>
          <h1>Kanban Board</h1>
          <p className="subheading">Track subscription expiries and statuses in an visual column layout.</p>
        </div>
      </div>

      <div className="kanban-grid">
        {columns.map((col) => {
          const cards = getCardsForColumn(col.key)
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-header" style={{ borderBottomColor: col.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: col.color }}>
                  {col.icon}
                  <h3>{col.label}</h3>
                </div>
                <span className="kanban-col-count">{cards.length}</span>
              </div>

              <div className="kanban-cards-list">
                {cards.map((card) => {
                  const daysLeft = card.expiryDate
                    ? Math.ceil((new Date(card.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                    : null
                  return (
                    <div key={card.id} className="kanban-card">
                      <h4>{card.customerName}</h4>
                      <p style={{ margin: '4px 0', fontSize: 12, fontWeight: 600 }}>{card.productName}</p>
                      <p style={{ margin: 0 }}>
                        {card.expiryDate ? (
                          <span style={{ color: daysLeft < 0 ? 'var(--danger)' : 'inherit' }}>
                            Expiry: {new Date(card.expiryDate).toLocaleDateString()} ({daysLeft} days left)
                          </span>
                        ) : (
                          'Continuous Subscription'
                        )}
                      </p>
                      <div className="kanban-card-meta">
                        <span className="kanban-card-amount">{currencySymbol}{card.sellingPrice.toLocaleString()}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {card.subscriptionStatus !== 'active' && (
                            <button
                              className="icon-button"
                              onClick={() => updateSubStatus(card.id, 'active')}
                              title="Activate"
                              style={{ color: 'var(--green)', padding: 2 }}
                            >
                              <Play size={12} />
                            </button>
                          )}
                          {card.subscriptionStatus === 'active' && (
                            <button
                              className="icon-button"
                              onClick={() => updateSubStatus(card.id, 'paused')}
                              title="Pause"
                              style={{ color: 'var(--warning)', padding: 2 }}
                            >
                              <Pause size={12} />
                            </button>
                          )}
                          {card.subscriptionStatus !== 'cancelled' && (
                            <button
                              className="icon-button"
                              onClick={() => updateSubStatus(card.id, 'cancelled')}
                              title="Cancel"
                              style={{ color: 'var(--danger)', padding: 2 }}
                            >
                              <XCircle size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {cards.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 20, border: '1px dashed var(--line)', borderRadius: 6 }}>
                    No subscriptions in this phase.
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
