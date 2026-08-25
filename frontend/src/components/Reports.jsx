import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { DollarSign, BarChart2, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'

export default function Reports({ currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const subSnap = await getDocs(collection(db, 'subscriptions'))
        setSubscriptions(subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

        const spSnap = await getDocs(collection(db, 'salespersons'))
        setSalespersons(spSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

        const prodSnap = await getDocs(collection(db, 'products'))
        setProducts(prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 1. Calculate main metrics
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
  const totalCost = subscriptions.reduce((sum, s) => sum + (Number(s.purchasePrice) || 0), 0)
  const totalTax = subscriptions.reduce((sum, s) => sum + (Number(s.taxAmount) || 0), 0)
  const totalProfit = totalRevenue - totalCost - totalTax

  const unpaidRevenue = subscriptions
    .filter((s) => s.paymentStatus !== 'Paid')
    .reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)

  // 2. Monthly revenue mapping (last 6 months)
  const getMonthlyBreakdown = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = {}

    // Initialize last 6 months
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const label = `${months[targetMonth.getMonth()]} ${String(targetMonth.getFullYear()).slice(-2)}`
      const key = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`
      result[key] = { label, revenue: 0, profit: 0 }
    }

    // Populate data
    subscriptions.forEach((sub) => {
      if (!sub.invoiceDate) return
      const monthKey = sub.invoiceDate.slice(0, 7) // 'YYYY-MM'
      if (result[monthKey]) {
        const rev = Number(sub.sellingPrice) || 0
        const cost = Number(sub.purchasePrice) || 0
        const tax = Number(sub.taxAmount) || 0
        result[monthKey].revenue += rev
        result[monthKey].profit += (rev - cost - tax)
      }
    })

    return Object.values(result)
  }

  const monthlyReportData = getMonthlyBreakdown()
  const maxVal = Math.max(...monthlyReportData.map((d) => Math.max(d.revenue, d.profit)), 1000)

  // 3. Product categories share
  const productShare = products.map((prod) => {
    const list = subscriptions.filter((s) => s.productId === prod.id)
    const rev = list.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    return { name: prod.productName, revenue: rev, count: list.length, color: prod.colorCode || '#0074D9' }
  }).sort((a, b) => b.revenue - a.revenue)

  // 4. Sales Rep performance
  const repPerformance = salespersons.map((sp) => {
    const list = subscriptions.filter((s) => s.salespersonId === sp.id)
    const rev = list.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    const cost = list.reduce((sum, s) => sum + (Number(s.purchasePrice) || 0), 0)
    const tax = list.reduce((sum, s) => sum + (Number(s.taxAmount) || 0), 0)
    const profit = rev - cost - tax

    // commission is a percentage of (revenue - cost - tax) if positive
    const commission = profit > 0 ? (profit * (Number(sp.commissionRate) || 0)) / 100 : 0

    return { name: sp.name, rate: sp.commissionRate, count: list.length, revenue: rev, commission }
  }).sort((a, b) => b.revenue - a.revenue)

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
          <p className="eyebrow">Workspace / Financial Reports</p>
          <h1>Financial Reports</h1>
          <p className="subheading">Analyze monthly revenues, margins, and sales rep commission payouts.</p>
        </div>
      </div>

      <div className="reports-summary">
        <div className="reports-card">
          <h4>Gross Revenue</h4>
          <strong>{currencySymbol}{totalRevenue.toLocaleString()}</strong>
          <span style={{ color: 'var(--green)' }}>Total contract value</span>
        </div>
        <div className="reports-card">
          <h4>Execution Cost</h4>
          <strong style={{ color: 'var(--text-secondary)' }}>{currencySymbol}{totalCost.toLocaleString()}</strong>
          <span style={{ color: 'var(--text-muted)' }}>Supplier/Purchase costs</span>
        </div>
        <div className="reports-card">
          <h4>Net Profit Margin</h4>
          <strong style={{ color: 'var(--green)' }}>{currencySymbol}{totalProfit.toLocaleString()}</strong>
          <span>Profit post-cost & tax</span>
        </div>
        <div className="reports-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <h4>Pending Contracts</h4>
          <strong style={{ color: 'var(--danger)' }}>{currencySymbol}{unpaidRevenue.toLocaleString()}</strong>
          <span style={{ color: 'var(--text-muted)' }}>Unpaid invoices total</span>
        </div>
      </div>

      <div className="chart-card-grid">
        {/* Revenue & Profit Trends */}
        <div className="chart-card">
          <h3>Revenue & Profit Trend (Last 6 Months)</h3>
          <div className="chart-height-wrap">
            {monthlyReportData.map((d, index) => {
              const revHeight = (d.revenue / maxVal) * 90
              const profHeight = (d.profit / maxVal) * 90
              return (
                <div key={index} className="bar-column">
                  <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                    <div className="bar-fill" style={{ height: `${revHeight}%` }}>
                      <span className="bar-tooltip">{currencySymbol}{d.revenue.toLocaleString()}</span>
                    </div>
                    <div className="bar-fill secondary" style={{ height: `${profHeight}%` }}>
                      <span className="bar-tooltip">{currencySymbol}{d.profit.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="bar-axis-label">{d.label}</span>
                </div>
              )
            })}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: 'var(--navy-accent)' }} />
              <span>Gross Revenue</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: 'var(--green)' }} />
              <span>Net Profit</span>
            </div>
          </div>
        </div>

        {/* Product share share list */}
        <div className="chart-card">
          <h3>Category Revenue Share</h3>
          <div className="pie-summary-list" style={{ marginTop: 10 }}>
            {productShare.map((prod, idx) => {
              const pct = totalRevenue > 0 ? Math.round((prod.revenue / totalRevenue) * 100) : 0
              return (
                <div key={idx} className="pie-row">
                  <div className="pie-label-part">
                    <span className="pie-color-dot" style={{ backgroundColor: prod.color }} />
                    <span>{prod.name}</span>
                  </div>
                  <div className="pie-percent-bg">
                    <div className="pie-percent-fill" style={{ width: `${pct}%`, backgroundColor: prod.color }} />
                  </div>
                  <span style={{ fontWeight: 700 }}>{currencySymbol}{prod.revenue.toLocaleString()} ({pct}%)</span>
                </div>
              )
            })}
            {productShare.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No product metrics found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales leaderboard and commission tracking */}
      <section className="table-section" style={{ paddingBottom: 20 }}>
        <div className="section-heading" style={{ marginBottom: 15 }}>
          <div>
            <h2>Sales Representative Commission Ledger</h2>
            <p>Track closed deals, total sales, and payable commission (based on representative's rate applied to closed contract profits).</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Representative Name</th>
                <th>Commission Rate</th>
                <th>Closed Deals</th>
                <th>Total Sales Value</th>
                <th>Payable Commission</th>
              </tr>
            </thead>
            <tbody>
              {repPerformance.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.rate}%</td>
                  <td>{item.count} deals</td>
                  <td><strong>{currencySymbol}{item.revenue.toLocaleString()}</strong></td>
                  <td>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                      {currencySymbol}{item.commission.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {repPerformance.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No active representatives.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
