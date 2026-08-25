import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react'

export default function CalendarView({ currencySymbol = '₹' }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

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
    calendarDays.push({
      dayNum: prevMonthLastDay - i,
      dateString: new Date(year, month - 1, prevMonthLastDay - i).toISOString().split('T')[0],
      isCurrentMonth: false
    })
  }

  // Days of the current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dString = new Date(year, month, i + 1).toISOString().split('T')[0] // local ISO fix
    calendarDays.push({
      dayNum: i,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true
    })
  }

  // Padding days from next month to complete the grid (multiples of 7)
  const remainingCells = 42 - calendarDays.length
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      dayNum: i,
      dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: false
    })
  }

  // Retrieve events for a date string
  const getEventsForDate = (dateStr) => {
    const events = []

    subscriptions.forEach((sub) => {
      // 1. Expiry events
      if (sub.expiryDate === dateStr) {
        events.push({
          id: `${sub.id}-exp`,
          type: 'expiry',
          label: `Expiry: ${sub.customerName} (${sub.productName})`,
          amount: sub.sellingPrice
        })
      }
      // 2. Starting events
      if (sub.startingDate === dateStr) {
        events.push({
          id: `${sub.id}-start`,
          type: 'start',
          label: `Start: ${sub.customerName} (${sub.productName})`,
          amount: sub.sellingPrice
        })
      }
      // 3. Payment events
      if (sub.paymentDate === dateStr) {
        events.push({
          id: `${sub.id}-pay`,
          type: 'payment',
          label: `Paid: ${sub.customerName} (${currencySymbol}${sub.sellingPrice})`,
          amount: sub.sellingPrice
        })
      }
    })

    return events
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const isToday = (dateStr) => {
    return dateStr === new Date().toISOString().split('T')[0]
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
          <p className="eyebrow">Workspace / Subscription Calendar</p>
          <h1>Calendar</h1>
          <p className="subheading">Track subscription starts, expiries and payments in a monthly calendar layout.</p>
        </div>
      </div>

      <div className="calendar-wrap">
        <div className="calendar-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} style={{ color: 'var(--navy-accent)' }} />
            <h2 className="calendar-title">{monthNames[month]} {year}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: 6 }} onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary" style={{ padding: 6, fontSize: 11 }} onClick={() => setCurrentDate(new Date())}>
              Today
            </button>
            <button className="btn btn-secondary" style={{ padding: 6 }} onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="weekday-header">{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((cell, idx) => {
            const dayEvents = getEventsForDate(cell.dateString)
            const todayClass = isToday(cell.dateString) ? 'today' : ''
            const inactiveClass = !cell.isCurrentMonth ? 'inactive' : ''

            return (
              <div key={idx} className={`calendar-day-cell ${todayClass} ${inactiveClass}`}>
                <div className="calendar-day-num">{cell.dayNum}</div>
                <div className="calendar-events-list">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`calendar-event-badge badge-${evt.type}`}
                      title={`${evt.label}`}
                    >
                      {evt.label}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="chart-legend" style={{ marginTop: 20 }}>
          <div className="legend-item">
            <span className="legend-color badge-start" />
            <span>Subscription Start</span>
          </div>
          <div className="legend-item">
            <span className="legend-color badge-expiry" />
            <span>Subscription Expiry</span>
          </div>
          <div className="legend-item">
            <span className="legend-color badge-payment" />
            <span>Payment Date</span>
          </div>
        </div>
      </div>
    </div>
  )
}
