import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function CalendarView({ currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filters: 'all', 'starts', 'expiries', 'payments'
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const snap = await getDocs(collection(db, 'subscriptions'))
        setSubscriptions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Generate calendar days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayIndex = firstDayOfMonth.getDay() // 0 (Sun) to 6 (Sat)

  const calendarDays = []

  // Padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    calendarDays.push({
      dayNum: prevMonthLastDay - i,
      dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      isCurrentMonth: false
    })
  }

  // Days of the current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      dayNum: i,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true
    })
  }

  // Padding days from next month to complete the grid (multiples of 7)
  const remainingCells = 42 - calendarDays.length
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i)
    calendarDays.push({
      dayNum: i,
      dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      isCurrentMonth: false
    })
  }

  // Retrieve events for a date string matching filter
  const getEventsForDate = (dateStr) => {
    const events = []

    subscriptions.forEach((sub) => {
      // 1. Expiry events
      if (sub.expiryDate === dateStr && (activeFilter === 'all' || activeFilter === 'expiries')) {
        events.push({
          id: `${sub.id}-exp`,
          type: 'expiry',
          label: `Exp: ${sub.customerName} (${sub.productName})`,
          amount: sub.sellingPrice,
          color: '#dc3545'
        })
      }
      // 2. Starting events
      if (sub.startingDate === dateStr && (activeFilter === 'all' || activeFilter === 'starts')) {
        events.push({
          id: `${sub.id}-start`,
          type: 'start',
          label: `Start: ${sub.customerName} (${sub.productName})`,
          amount: sub.sellingPrice,
          color: '#28a745'
        })
      }
      // 3. Payment events
      if (sub.paymentDate === dateStr && (activeFilter === 'all' || activeFilter === 'payments')) {
        events.push({
          id: `${sub.id}-pay`,
          type: 'payment',
          label: `Pay: ${sub.customerName} (${currencySymbol}${Number(sub.sellingPrice || 0).toLocaleString()})`,
          amount: sub.sellingPrice,
          color: '#0074D9'
        })
      }
    })

    return events
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-calendar-alt"></i> Calendar</h2>
      </div>

      <div className="calendar-wrap">
        {/* PHP Filter Bar */}
        <div className="cal-filters">
          <button className={`cal-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
            All Events
          </button>
          <button className={`cal-filter-btn ${activeFilter === 'starts' ? 'active' : ''}`} onClick={() => setActiveFilter('starts')}>
            <span className="dot" style={{ background: '#28a745' }} /> Contract Starts
          </button>
          <button className={`cal-filter-btn ${activeFilter === 'expiries' ? 'active' : ''}`} onClick={() => setActiveFilter('expiries')}>
            <span className="dot" style={{ background: '#dc3545' }} /> Expiries
          </button>
          <button className={`cal-filter-btn ${activeFilter === 'payments' ? 'active' : ''}`} onClick={() => setActiveFilter('payments')}>
            <span className="dot" style={{ background: '#0074D9' }} /> Payments
          </button>
        </div>

        {/* Legend */}
        <div className="cal-legend">
          <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: '#28a745' }} />
            <span>Start Date</span>
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: '#dc3545' }} />
            <span>Expiry Date</span>
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: '#0074D9' }} />
            <span>Payment Recieved</span>
          </div>
        </div>

        {/* Month Header Controller */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {monthNames[month]} {year}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handlePrevMonth} title="Previous Month">
              <i className="fas fa-chevron-left" />
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())} title="Today">
              Today
            </button>
            <button className="btn btn-secondary" onClick={handleNextMonth} title="Next Month">
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }} />
          </div>
        ) : (
          <div>
            {/* Weekdays row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              {weekdays.map((day) => (
                <div key={day} style={{ color: 'var(--text-secondary)' }}>{day}</div>
              ))}
            </div>

            {/* Grid days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              {calendarDays.map((cell, idx) => {
                const dayEvents = getEventsForDate(cell.dateString)
                const isToday = cell.dateString === new Date().toISOString().split('T')[0]

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: 100,
                      padding: 6,
                      borderRight: '1px solid var(--border-color)',
                      borderTop: '1px solid var(--border-color)',
                      backgroundColor: isToday ? 'rgba(0,116,217,0.06)' : cell.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-secondary)',
                      opacity: cell.isCurrentMonth ? 1 : 0.6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isToday ? 'var(--navy-accent)' : 'var(--text-primary)',
                          background: isToday ? 'rgba(0,116,217,0.15)' : 'transparent',
                          width: isToday ? 22 : 'auto',
                          height: isToday ? 22 : 'auto',
                          display: 'inline-grid',
                          placeItems: 'center',
                          borderRadius: '50%'
                        }}
                      >
                        {cell.dayNum}
                      </span>
                    </div>

                    {/* Events list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dayEvents.map((ev, index) => (
                        <div
                          key={ev.id || index}
                          style={{
                            fontSize: 10,
                            padding: '3px 6px',
                            borderRadius: 4,
                            backgroundColor: ev.color,
                            color: '#fff',
                            fontWeight: 600,
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}
                          title={ev.label}
                        >
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
