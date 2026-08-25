import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Dashboard({ user, currencySymbol = '₹', onNavigate }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [products, setProducts] = useState([])
  const [salespersons, setSalespersons] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const subSnap = await getDocs(collection(db, 'subscriptions'))
      const subList = subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setSubscriptions(subList)

      const prodSnap = await getDocs(collection(db, 'products'))
      setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      const spSnap = await getDocs(collection(db, 'salespersons'))
      setSalespersons(spSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      const paySnap = await getDocs(collection(db, 'payments'))
      setPayments(paySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
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

  // Alerts calculations
  // Unpaid for 30+ days
  const unpaidOver30Count = subscriptions.filter(sub => {
    if (sub.paymentStatus === 'Paid') return false
    if (!sub.startingDate) return false
    const start = new Date(sub.startingDate)
    const diffDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24))
    return diffDays >= 30
  }).length

  // Monthly Breakdown (last 6 months)
  const getMonthlyBreakdown = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = {}

    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const label = `${months[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`
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

  const monthlyBreakdown = getMonthlyBreakdown()
  const totalBreakdownRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.revenue, 0)
  const totalBreakdownProfit = monthlyBreakdown.reduce((sum, m) => sum + m.profit, 0)

  // Product categories list
  const productDistribution = products.map(prod => {
    const count = subscriptions.filter(s => s.productId === prod.id).length
    return { name: prod.productName, count, color: prod.colorCode || '#0074D9' }
  }).sort((a, b) => b.count - a.count).slice(0, 5)

  // Payments Statuses
  const paidCount = subscriptions.filter(s => s.paymentStatus === 'Paid').length
  const unpaidCount = subscriptions.filter(s => s.paymentStatus === 'Unpaid').length
  const partialCount = subscriptions.filter(s => s.paymentStatus === 'Partial').length
  const refundedCount = subscriptions.filter(s => s.paymentStatus === 'Refunded').length
  const totalPaymentStatuses = paidCount + unpaidCount + partialCount + refundedCount || 1

  // Top 5 Customers by Revenue
  const customerRevenueMap = {}
  subscriptions.forEach(sub => {
    const name = sub.customerName || 'Unknown'
    const rev = Number(sub.sellingPrice) || 0
    customerRevenueMap[name] = (customerRevenueMap[name] || 0) + rev
  })
  const topCustomers = Object.entries(customerRevenueMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Salesperson Leaderboard
  const repLeaderboard = salespersons.map(sp => {
    const list = subscriptions.filter(s => s.salespersonId === sp.id)
    const rev = list.reduce((sum, s) => sum + (Number(s.sellingPrice) || 0), 0)
    return { name: sp.name, deals: list.length, revenue: rev }
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Subscriptions expiring within 30 days
  const upcomingExpirations = subscriptions.filter(sub => {
    if (sub.subscriptionStatus !== 'active' || !sub.expiryDate) return false
    const exp = new Date(sub.expiryDate)
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 30
  }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).slice(0, 5)

  // Helper for rendering SVG Area/Line Charts
  const renderSVGChartPoints = (data, valueKey) => {
    const maxVal = Math.max(...data.map(d => d[valueKey]), 1000)
    const width = 280
    const height = 120
    const padding = 10

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
      const y = height - padding - (d[valueKey] / maxVal) * (height - 2 * padding)
      return { x, y }
    })

    const pathString = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
    }, '')

    const areaString = points.length > 0 
      ? `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : ''

    return { pathString, areaString, points }
  }

  const chartRevenue = renderSVGChartPoints(monthlyBreakdown, 'revenue')
  const chartProfit = renderSVGChartPoints(monthlyBreakdown, 'profit')

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* 1. Alerts Row */}
      <div className="dash-alerts">
        {unpaidOver30Count > 0 && (
          <a href="#" className="dash-alert dash-alert-orange" onClick={(e) => { e.preventDefault(); onNavigate('Subscriptions') }}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>{unpaidOver30Count} subscription(s) unpaid for 30+ days</span>
          </a>
        )}
        {expiredCount > 0 && (
          <a href="#" className="dash-alert dash-alert-red" onClick={(e) => { e.preventDefault(); onNavigate('Subscriptions') }}>
            <i className="fas fa-ban"></i>
            <span>{expiredCount} total expired subscription(s)</span>
          </a>
        )}
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="dash-stats">
        <div className="dash-card dash-card-navy" onClick={() => onNavigate('Subscriptions')}>
          <div className="dash-card-icon"><i className="fas fa-file-contract"></i></div>
          <div className="dash-card-value">{subscriptions.length}</div>
          <div className="dash-card-label">Total Subscriptions</div>
        </div>

        <div className="dash-card dash-card-blue" onClick={() => onNavigate('Reports')}>
          <div className="dash-card-icon"><i className="fas fa-database"></i></div>
          <div className="dash-card-value">{currencySymbol}{totalRevenue.toLocaleString()}</div>
          <div className="dash-card-label">Revenue ({currencySymbol})</div>
        </div>

        <div className="dash-card dash-card-green" onClick={() => onNavigate('Subscriptions')}>
          <div className="dash-card-icon"><i className="fas fa-check-circle"></i></div>
          <div className="dash-card-value">{activeCount}</div>
          <div className="dash-card-label">Active</div>
        </div>

        <div className="dash-card dash-card-orange" onClick={() => onNavigate('Subscriptions')}>
          <div className="dash-card-icon"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="dash-card-value">{expiringSoonCount}</div>
          <div className="dash-card-label">Expiring Soon</div>
        </div>

        <div className="dash-card dash-card-red" onClick={() => onNavigate('Subscriptions')}>
          <div className="dash-card-icon"><i className="fas fa-ban"></i></div>
          <div className="dash-card-value">{expiredCount}</div>
          <div className="dash-card-label">Expired</div>
        </div>

        <div className="dash-card dash-card-purple" onClick={() => onNavigate('Payments')}>
          <div className="dash-card-icon"><i className="fas fa-money-bill-wave"></i></div>
          <div className="dash-card-value">{currencySymbol}{unpaidRevenue.toLocaleString()}</div>
          <div className="dash-card-label">Unpaid Amount</div>
        </div>
      </div>

      {/* 3. 4-column Charts Grid */}
      <div className="dash-charts-4">
        {/* Revenue & Profit Area Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-title"><i className="fas fa-chart-area"></i> Revenue & Profit</div>
          <div style={{ position: 'relative', height: 130 }}>
            <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0074D9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0074D9" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#28a745" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#28a745" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="10" y1="10" x2="270" y2="10" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="10" y1="60" x2="270" y2="60" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="10" y1="110" x2="270" y2="110" stroke="#eceff1" strokeWidth="1" />

              {/* Area paths */}
              {chartRevenue.areaString && <path d={chartRevenue.areaString} fill="url(#revGrad)" />}
              {chartProfit.areaString && <path d={chartProfit.areaString} fill="url(#profGrad)" />}

              {/* Line paths */}
              {chartRevenue.pathString && <path d={chartRevenue.pathString} fill="none" stroke="#0074D9" strokeWidth="2.5" />}
              {chartProfit.pathString && <path d={chartProfit.pathString} fill="none" stroke="#28a745" strokeWidth="2" />}

              {/* Dots */}
              {chartRevenue.points.map((p, idx) => (
                <circle key={`r-${idx}`} cx={p.x} cy={p.y} r="3" fill="#0074D9" />
              ))}
              {chartProfit.points.map((p, idx) => (
                <circle key={`p-${idx}`} cx={p.x} cy={p.y} r="2.5" fill="#28a745" />
              ))}
            </svg>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-title"><i className="fas fa-chart-line"></i> Monthly Trend</div>
          <div style={{ position: 'relative', height: 130 }}>
            <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100%' }}>
              <line x1="10" y1="10" x2="270" y2="10" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="10" y1="60" x2="270" y2="60" stroke="#f1f3f5" strokeWidth="1" />
              <line x1="10" y1="110" x2="270" y2="110" stroke="#eceff1" strokeWidth="1" />

              {chartRevenue.pathString && <path d={chartRevenue.pathString} fill="none" stroke="#0074D9" strokeWidth="2.5" />}
              {chartProfit.pathString && <path d={chartProfit.pathString} fill="none" stroke="#28a745" strokeWidth="2" strokeDasharray="4 3" />}

              {chartRevenue.points.map((p, idx) => (
                <circle key={`tr-${idx}`} cx={p.x} cy={p.y} r="3" fill="#0074D9" />
              ))}
            </svg>
          </div>
        </div>

        {/* Products Bar Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-title"><i className="fas fa-tags"></i> Products</div>
          <div style={{ position: 'relative', height: 130 }}>
            <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100%' }}>
              {productDistribution.map((item, idx) => {
                const maxCount = Math.max(...productDistribution.map(p => p.count), 5)
                const barWidth = 24
                const gap = 16
                const paddingLeft = 30
                const x = paddingLeft + idx * (barWidth + gap)
                const barHeight = (item.count / maxCount) * 90
                const y = 110 - barHeight

                return (
                  <g key={idx}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={item.color} />
                    <text x={x + 12} y="118" fontSize="8" textAnchor="middle" fill="#888">{item.name.slice(0, 4)}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Payments Status Pie Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-title"><i className="fas fa-credit-card"></i> Payments</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 130, gap: 10 }}>
            <svg viewBox="0 0 100 100" style={{ width: 85, height: 85 }}>
              {/* SVG Pie using Stroke Dasharray */}
              {(() => {
                const paidPct = (paidCount / totalPaymentStatuses) * 100
                const unpaidPct = (unpaidCount / totalPaymentStatuses) * 100
                const partialPct = (partialCount / totalPaymentStatuses) * 100
                const refPct = (refundedCount / totalPaymentStatuses) * 100

                // dash arrays
                let offset = 0
                const strokeWidth = 32
                const radius = 16
                const circ = 2 * Math.PI * radius

                const slices = [
                  { pct: paidPct, color: '#28a745' },
                  { pct: unpaidPct, color: '#dc3545' },
                  { pct: partialPct, color: '#ffc107' },
                  { pct: refPct, color: '#0074D9' }
                ]

                return slices.map((s, idx) => {
                  if (s.pct === 0) return null
                  const strokeDash = `${(s.pct / 100) * circ} ${circ}`
                  const strokeOffset = -offset
                  offset += (s.pct / 100) * circ

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      strokeDashoffset={strokeOffset}
                      transform="rotate(-90 50 50)"
                    />
                  )
                })
              })()}
            </svg>
            <div style={{ fontSize: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, background: '#28a745', marginRight: 4 }}></span>Paid</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, background: '#dc3545', marginRight: 4 }}></span>Unpaid</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ffc107', marginRight: 4 }}></span>Partial</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, background: '#0074D9', marginRight: 4 }}></span>Refunded</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 2x2 Tables row (Leaderboard & Top Customers) */}
      <div className="dash-tables-2x2">
        {/* Top 5 Customers Card */}
        <div className="dash-chart-card" style={{ padding: 15 }}>
          <div className="dash-chart-title" style={{ fontSize: 13, marginBottom: 15 }}><i className="fas fa-users"></i> Top 5 Customers by Revenue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 160 }}>
            {topCustomers.map((c, idx) => {
              const maxRev = Math.max(...topCustomers.map(x => x.revenue), 1000)
              const pct = (c.revenue / maxRev) * 100
              const colors = ['#001f3f', '#0074D9', '#28a745', '#f59e0b', '#7c3aed']
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <strong>{c.name}</strong>
                    <span>{currencySymbol}{c.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ width: '100%', height: 14, background: '#f1f3f5', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[idx % colors.length], borderRadius: 4 }}></div>
                  </div>
                </div>
              )
            })}
            {topCustomers.length === 0 && (
              <p style={{ textAlign: 'center', padding: 20, color: '#999' }}>No customer sales transactions.</p>
            )}
          </div>
        </div>

        {/* Salesperson Leaderboard Card */}
        <div className="dash-chart-card" style={{ padding: 15 }}>
          <div className="dash-chart-title" style={{ fontSize: 13, marginBottom: 15 }}><i className="fas fa-trophy"></i> Salesperson Leaderboard</div>
          <div className="about-table-wrapper" style={{ margin: 0, maxHeight: 180, overflowY: 'auto' }}>
            <table className="about-roles-table" style={{ fontSize: 11, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>Name</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px' }}>Deals</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {repLeaderboard.map((sp, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px' }}>{idx + 1}</td>
                    <td style={{ padding: '8px' }}><strong>{sp.name}</strong></td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{sp.deals}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{currencySymbol}{sp.revenue.toLocaleString()}</td>
                  </tr>
                ))}
                {repLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#888', padding: 20 }}>No representative entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Row 4 (Monthly Breakdown & Upcoming Expirations) */}
      <div className="dash-tables-2x2">
        {/* Monthly Breakdown Card */}
        <div className="settings-mega-card">
          <div className="settings-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', gap: 15, alignItems: 'center' }}>
            <div className="settings-card-icon icon-gradient-navy" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#001f3f 0%,#0074D9 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <i className="fas fa-table"></i>
            </div>
            <div>
              <h3 className="settings-card-title" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Monthly Breakdown</h3>
              <p className="settings-card-subtitle" style={{ margin: 0, fontSize: 11, color: '#888' }}>Revenue by month</p>
            </div>
          </div>
          <div className="settings-card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
            <div className="about-table-wrapper" style={{ margin: 0 }}>
              <table className="about-roles-table" style={{ fontSize: 13, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Month</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.label}</td>
                      <td style={{ textAlign: 'right' }}>{currencySymbol}{m.revenue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{currencySymbol}{m.profit.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#001f3f', color: '#fff', fontWeight: 700 }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>{currencySymbol}{totalBreakdownRevenue.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{currencySymbol}{totalBreakdownProfit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Expirations Card */}
        <div className="settings-mega-card">
          <div className="settings-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', gap: 15, alignItems: 'center' }}>
            <div className="settings-card-icon icon-gradient-navy" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#001f3f 0%,#0074D9 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <i className="fas fa-calendar-times"></i>
            </div>
            <div>
              <h3 className="settings-card-title" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upcoming Expirations</h3>
              <p className="settings-card-subtitle" style={{ margin: 0, fontSize: 11, color: '#888' }}>Subscriptions expiring within 30 days</p>
            </div>
          </div>
          <div className="settings-card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
            <div className="about-table-wrapper" style={{ margin: 0 }}>
              <table className="about-roles-table" style={{ fontSize: 13, width: '100%' }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Invoice</th>
                    <th>Days Left</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingExpirations.map((sub, idx) => {
                    const diffDays = Math.ceil((new Date(sub.expiryDate) - today) / (1000 * 60 * 60 * 24))
                    return (
                      <tr key={idx}>
                        <td><strong>{sub.customerName}</strong></td>
                        <td><code>{sub.invoiceNo}</code></td>
                        <td>
                          <span className="status-badge" style={{ background: '#28a745', color: '#fff', fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                            {diffDays}d
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${sub.paymentStatus === 'Paid' ? 'pay-paid' : 'pay-unpaid'}`} style={{ padding: '3px 8px', borderRadius: 4 }}>
                            {sub.paymentStatus || 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {upcomingExpirations.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#888', padding: 20 }}>No upcoming expiries in 30 days.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
