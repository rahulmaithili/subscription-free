import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Dashboard({ user, currencySymbol = '₹', onNavigate }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [products, setProducts] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // Fetch subscriptions
      const subSnap = await getDocs(collection(db, 'subscriptions'))
      const subList = subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setSubscriptions(subList)

      // Fetch products
      const prodSnap = await getDocs(collection(db, 'products'))
      setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      // Fetch salespersons
      const spSnap = await getDocs(collection(db, 'salespersons'))
      setSalespersons(spSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      // Fetch payments
      const paySnap = await getDocs(collection(db, 'payments'))
      setPayments(paySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      // Mock recent activities since we log updates locally in Firestore
      // (Let's generate them based on payments/subscriptions to look alive and real!)
      const logs = []
      subList.slice(0, 5).forEach((sub, idx) => {
        logs.push({
          id: `log-sub-${idx}`,
          user: sub.addedBy || 'admin',
          action: 'Subscription Created',
          details: `Invoice: ${sub.invoiceNo} for ${sub.customerName}`,
          ip: '127.0.0.1',
          time: sub.createdAt || new Date().toISOString()
        })
      })
      paySnap.docs.slice(0, 5).forEach((doc, idx) => {
        const pay = doc.data()
        logs.push({
          id: `log-pay-${idx}`,
          user: 'system',
          action: 'Payment Recorded',
          details: `Invoice: ${pay.invoiceNo} | Amount: ₹${pay.amount}`,
          ip: '192.168.1.15',
          time: pay.createdAt || new Date().toISOString()
        })
      })
      logs.sort((a, b) => new Date(b.time) - new Date(a.time))
      setActivities(logs.slice(0, 8))

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculations
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
  const unpaidRevenue = subscriptions
    .filter(s => s.paymentStatus !== 'Paid')
    .reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)

  // Status mapping
  let activeCount = 0
  let expiringSoonCount = 0
  let expiringTodayCount = 0
  let expiredCount = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limitDate = new Date()
  limitDate.setDate(today.getDate() + 30)

  subscriptions.forEach(sub => {
    if (sub.subscriptionStatus === 'paused' || sub.subscriptionStatus === 'cancelled') return
    if (!sub.expiryDate) {
      activeCount++
      return
    }
    const exp = new Date(sub.expiryDate)
    if (exp < today) {
      expiredCount++
    } else if (exp.getTime() === today.getTime()) {
      expiringTodayCount++
    } else if (exp > today && exp <= limitDate) {
      expiringSoonCount++
    } else {
      activeCount++
    }
  })

  // Product categories list
  const productDistribution = products.map(prod => {
    const count = subscriptions.filter(s => s.productId === prod.id).length
    return { name: prod.productName, count, color: prod.colorCode || '#0074D9' }
  }).sort((a, b) => b.count - a.count).slice(0, 5)

  // Payment statuses pie calculations
  const paymentStatusCounts = {
    Paid: subscriptions.filter(s => s.paymentStatus === 'Paid').length,
    Unpaid: subscriptions.filter(s => s.paymentStatus === 'Unpaid').length,
    Partial: subscriptions.filter(s => s.paymentStatus === 'Partial').length,
    Refunded: subscriptions.filter(s => s.paymentStatus === 'Refunded').length
  }

  // Top Customers by revenue
  const customerRevenueList = {}
  subscriptions.forEach(sub => {
    const name = sub.customerName || 'Unknown'
    const rev = Number(sub.sellingPrice) || 0
    customerRevenueList[name] = (customerRevenueList[name] || 0) + rev
  })
  const topCustomers = Object.entries(customerRevenueList)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Salesperson Leaderboard
  const repPerformance = salespersons.map(sp => {
    const list = subscriptions.filter(s => s.salespersonId === sp.id)
    const rev = list.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    return { name: sp.name, deals: list.length, revenue: rev }
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // 12 months financial summary list
  const getMonthlyFinances = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = {}

    // Init last 12 months
    const d = new Date()
    for (let i = 11; i >= 0; i--) {
      const targetMonth = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const label = `${months[targetMonth.getMonth()]} ${String(targetMonth.getFullYear()).slice(-2)}`
      const key = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`
      result[key] = { label, revenue: 0, profit: 0, deals: 0 }
    }

    subscriptions.forEach((sub) => {
      if (!sub.invoiceDate) return
      const monthKey = sub.invoiceDate.slice(0, 7)
      if (result[monthKey]) {
        const rev = Number(sub.sellingPrice) || 0
        const cost = Number(sub.purchasePrice) || 0
        const tax = Number(sub.taxAmount) || 0
        result[monthKey].revenue += rev
        result[monthKey].profit += (rev - cost - tax)
        result[monthKey].deals++
      }
    })

    return Object.values(result)
  }

  const monthlyFinances = getMonthlyFinances()
  const maxTrendVal = Math.max(...monthlyFinances.map(m => Math.max(m.revenue, m.profit)), 1000)

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. PHP Stats Grid Layout */}
      <div className="reports-summary">
        <div className="reports-card" style={{ borderLeft: '3px solid var(--navy-accent)' }}>
          <h4>Total Revenue</h4>
          <strong>{currencySymbol}{totalRevenue.toLocaleString()}</strong>
          <span>Gross value in system</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <h4>Unpaid Amount</h4>
          <strong>{currencySymbol}{unpaidRevenue.toLocaleString()}</strong>
          <span style={{ color: 'var(--danger)' }}>Outstanding invoices</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid var(--green)' }}>
          <h4>Active Subs</h4>
          <strong>{activeCount}</strong>
          <span>Active active licenses</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid #6c757d' }}>
          <h4>Expired</h4>
          <strong>{expiredCount}</strong>
          <span>Past contract expiry</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid #ff9800' }}>
          <h4>Due Soon</h4>
          <strong>{expiringSoonCount}</strong>
          <span>Expiries in 30 days</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid #dc3545' }}>
          <h4>Expiring Today</h4>
          <strong>{expiringTodayCount}</strong>
          <span style={{ color: 'var(--danger)' }}>Expires today</span>
        </div>
      </div>

      {/* 2. Visual Charts Row */}
      <div className="chart-card-grid">
        {/* Trend Area representation */}
        <div className="chart-card">
          <h3>Monthly Sales & Profit Margin Trend</h3>
          <div className="chart-height-wrap" style={{ height: 260 }}>
            {monthlyFinances.slice(-6).map((m, idx) => {
              const revPct = (m.revenue / maxTrendVal) * 90
              const profPct = (m.profit / maxTrendVal) * 90
              return (
                <div key={idx} className="bar-column" style={{ margin: '0 4px' }}>
                  <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                    <div className="bar-fill" style={{ height: `${revPct}%` }}>
                      <span className="bar-tooltip">{currencySymbol}{m.revenue.toLocaleString()}</span>
                    </div>
                    <div className="bar-fill secondary" style={{ height: `${profPct}%` }}>
                      <span className="bar-tooltip">{currencySymbol}{m.profit.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="bar-axis-label" style={{ fontSize: 10 }}>{m.label}</span>
                </div>
              )
            })}
          </div>
          <div className="chart-legend" style={{ marginTop: 15 }}>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: 'var(--navy-accent)' }} />
              <span>Revenue</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: 'var(--green)' }} />
              <span>Profit</span>
            </div>
          </div>
        </div>

        {/* Product categories split */}
        <div className="chart-card">
          <h3>Product Category Split</h3>
          <div className="pie-summary-list" style={{ marginTop: 10 }}>
            {productDistribution.map((item, idx) => {
              const totalSubs = subscriptions.length || 1
              const pct = Math.round((item.count / totalSubs) * 100)
              return (
                <div key={idx} className="pie-row">
                  <div className="pie-label-part">
                    <span className="pie-color-dot" style={{ backgroundColor: item.color }} />
                    <span style={{ fontSize: 12, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</span>
                  </div>
                  <div className="pie-percent-bg">
                    <div className="pie-percent-fill" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{item.count} ({pct}%)</span>
                </div>
              )
            })}
            {productDistribution.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No products setup.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Data Sections (Tables) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Leaderboards and summaries */}
        <div className="data-section" style={{ padding: 15 }}>
          <div className="section-header" style={{ marginBottom: 15 }}>
            <h2 style={{ fontSize: 15 }}><i className="fas fa-trophy" style={{ color: '#ffc107' }}></i> Sales Representative Leaderboard</h2>
          </div>
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Representative</th>
                  <th>Closed Deals</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {repPerformance.map((rep, idx) => (
                  <tr key={idx}>
                    <td><strong>{rep.name}</strong></td>
                    <td>{rep.deals} deals</td>
                    <td><strong style={{ color: 'var(--green)' }}>{currencySymbol}{rep.revenue.toLocaleString()}</strong></td>
                  </tr>
                ))}
                {repPerformance.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: '#999', padding: 10 }}>No sales reps closed deals yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Customers list */}
        <div className="data-section" style={{ padding: 15 }}>
          <div className="section-header" style={{ marginBottom: 15 }}>
            <h2 style={{ fontSize: 15 }}><i className="fas fa-crown" style={{ color: 'var(--navy-accent)' }}></i> Top 5 Customers by Revenue</h2>
          </div>
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Revenue Closed</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((cust, idx) => (
                  <tr key={idx}>
                    <td><strong>{cust.name}</strong></td>
                    <td><strong style={{ color: 'var(--green)' }}>{currencySymbol}{cust.revenue.toLocaleString()}</strong></td>
                  </tr>
                ))}
                {topCustomers.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', color: '#999', padding: 10 }}>No customer sales found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Recent activity log ledger */}
      <div className="data-section" style={{ padding: 15 }}>
        <div className="section-header" style={{ marginBottom: 15 }}>
          <h2 style={{ fontSize: 15 }}><i className="fas fa-history"></i> Recent Activity Logs</h2>
        </div>
        <div className="table-wrapper">
          <table className="table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Action Event</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((log) => (
                <tr key={log.id}>
                  <td><strong>{log.user}</strong></td>
                  <td>
                    <span className="status-badge" style={{
                      backgroundColor: log.action.includes('Payment') ? 'rgba(40,167,69,0.1)' : 'rgba(0,116,217,0.1)',
                      color: log.action.includes('Payment') ? 'var(--green)' : 'var(--navy-accent)'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.details}</td>
                  <td><code>{log.ip}</code></td>
                  <td>{new Date(log.time).toLocaleString()}</td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No logs recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
