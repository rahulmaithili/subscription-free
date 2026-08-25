import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { Activity, Bell, CalendarDays, ChevronDown, Plus, Search, HelpCircle, DollarSign, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Dashboard({ user, currencySymbol = '₹', onNavigate }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [products, setProducts] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtering / Search States
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All subscriptions')

  useEffect(() => {
    async function fetchData() {
      try {
        const subSnap = await getDocs(collection(db, 'subscriptions'))
        const subList = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setSubscriptions(subList)

        const prodSnap = await getDocs(collection(db, 'products'))
        setProducts(prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

        const spSnap = await getDocs(collection(db, 'salespersons'))
        setSalespersons(spSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

        const paySnap = await getDocs(collection(db, 'payments'))
        setPayments(paySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Helper function to check subscription renewal status relative to today
  const getSubRenewalStatus = (expiryDate, status) => {
    if (status === 'paused') return 'Paused'
    if (status === 'cancelled') return 'Cancelled'
    if (!expiryDate) return 'Active'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expiring Today'
    if (diffDays <= 30) return 'Due soon'
    return 'Active'
  }

  // Derived dashboard metrics
  const activeSubscriptions = subscriptions.filter(
    (sub) => getSubRenewalStatus(sub.expiryDate, sub.subscriptionStatus) === 'Active'
  )

  const mrr = subscriptions
    .filter((sub) => sub.subscriptionStatus !== 'paused' && sub.subscriptionStatus !== 'cancelled')
    .reduce((sum, sub) => sum + (Number(sub.sellingPrice) || 0), 0)

  const renewalsThisMonth = subscriptions.filter((sub) => {
    if (!sub.expiryDate) return false
    const expiry = new Date(sub.expiryDate)
    const now = new Date()
    return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear()
  }).length

  // Subscriptions search and filter logic
  const filteredSubscriptions = subscriptions.filter((item) => {
    const renewalStatus = getSubRenewalStatus(item.expiryDate, item.subscriptionStatus)
    const matchesFilter =
      filter === 'All subscriptions' ||
      renewalStatus === filter ||
      (filter === 'Active' && renewalStatus === 'Active') ||
      (filter === 'Due soon' && renewalStatus === 'Due soon') ||
      (filter === 'Paused' && renewalStatus === 'Paused')

    const matchesSearch =
      `${item.customerName} ${item.productName} ${item.invoiceNo}`
        .toLowerCase()
        .includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  // Chart data calculations
  // 1. Payment Status breakdown
  const paymentStatuses = ['Paid', 'Unpaid']
  const paymentData = paymentStatuses.map((status) => {
    const count = subscriptions.filter((sub) => sub.paymentStatus === status).length
    return { name: status, count }
  })

  // 2. Salesperson leaderboard
  const salesLeaderboard = salespersons
    .map((sp) => {
      const spSubs = subscriptions.filter((sub) => sub.salespersonId === sp.id)
      const revenue = spSubs.reduce((sum, sub) => sum + (Number(sub.sellingPrice) || 0), 0)
      const deals = spSubs.length
      return { name: sp.name, revenue, deals }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // 3. Top Products
  const productData = products
    .map((prod) => {
      const count = subscriptions.filter((sub) => sub.productId === prod.id).length
      return { name: prod.productName, count, color: prod.colorCode || '#0074D9' }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <RefreshCw className="spinner" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">{new Date().toDateString()}</p>
          <h1>Good morning, {user?.fullName || 'User'}<span>.</span></h1>
          <p className="subheading">Here is what is happening across your subscription portfolio.</p>
        </div>
        <button className="date-button">
          <CalendarDays size={16} /> Last 30 days <ChevronDown size={15} />
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card dark">
          <p>Monthly recurring revenue</p>
          <strong>{currencySymbol}{mrr.toLocaleString()}</strong>
          <div>
            <span className="change">↗ 12.8%</span>
            <small>vs. previous month</small>
          </div>
        </article>
        <article className="stat-card">
          <p>Active subscriptions</p>
          <strong>{activeSubscriptions.length}</strong>
          <div>
            <span className="change">↗ 8.4%</span>
            <small>vs. previous month</small>
          </div>
        </article>
        <article className="stat-card warm">
          <p>Renewals this month</p>
          <strong>{renewalsThisMonth}</strong>
          <div>
            <span className="change neutral">{subscriptions.filter(s => getSubRenewalStatus(s.expiryDate, s.subscriptionStatus) === 'Due soon').length} due soon</span>
            <small>active renewals</small>
          </div>
        </article>
        <article className="stat-card">
          <p>Customer retention</p>
          <strong>94.6%</strong>
          <div>
            <span className="change">↗ 2.1%</span>
            <small>vs. previous month</small>
          </div>
        </article>
      </div>

      {/* Modern Dashboard Charts Block */}
      <div className="chart-card-grid">
        {/* Subscriptions by Product Category */}
        <div className="chart-card">
          <h3>Popular Categories</h3>
          <div className="pie-summary-list">
            {productData.map((prod, index) => {
              const total = subscriptions.length || 1
              const pct = Math.round((prod.count / total) * 100)
              return (
                <div key={index} className="pie-row">
                  <div className="pie-label-part">
                    <span className="pie-color-dot" style={{ backgroundColor: prod.color }} />
                    <span>{prod.name}</span>
                  </div>
                  <div className="pie-percent-bg">
                    <div className="pie-percent-fill" style={{ width: `${pct}%`, backgroundColor: prod.color }} />
                  </div>
                  <span style={{ fontWeight: 700 }}>{prod.count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sales Reps Leaderboard */}
        <div className="chart-card">
          <h3>Top Sales Representatives</h3>
          <div className="leaderboard-list">
            {salesLeaderboard.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No sales reps found.</p>
            ) : (
              salesLeaderboard.map((sp, idx) => (
                <div key={idx} className="leaderboard-item">
                  <span className="leaderboard-rank">#{idx + 1}</span>
                  <span className="leaderboard-name">{sp.name}</span>
                  <div className="leaderboard-stats">
                    <span className="leaderboard-rev">{currencySymbol}{sp.revenue.toLocaleString()}</span>
                    <span className="leaderboard-count">{sp.deals} contract{sp.deals !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subscription Pulse Table */}
      <section className="table-section">
        <div className="section-heading">
          <div>
            <h2>Subscription Pulse</h2>
            <p>Keep an eye on your latest customer activity.</p>
          </div>
          <button className="ghost-button" onClick={() => onNavigate('Subscriptions')}>
            View all <span>→</span>
          </button>
        </div>

        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search customers or plans"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            {['All subscriptions', 'Active', 'Due soon', 'Paused'].map((item) => (
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

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan/Product</th>
                <th>Amount</th>
                <th>Next renewal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.slice(0, 5).map((item) => {
                const subRenewalStatus = getSubRenewalStatus(item.expiryDate, item.subscriptionStatus)
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
                      <span className="plan-name">{item.productName}</span>
                      <small className="cycle">{item.invoiceNo || 'N/A'}</small>
                    </td>
                    <td>
                      <strong>{currencySymbol}{item.sellingPrice}</strong>
                      <small className="cycle">Total Price</small>
                    </td>
                    <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Continuous'}</td>
                    <td>
                      <span className={`status ${subRenewalStatus.toLowerCase().replace(' ', '-')}`}>
                        <i />
                        {subRenewalStatus}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredSubscriptions.length === 0 && (
            <div className="empty-state">No subscriptions match your search parameters.</div>
          )}
        </div>
      </section>
    </div>
  )
}
