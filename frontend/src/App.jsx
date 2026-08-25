import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'

// Components
import Home from './components/Home'
import Login from './components/Login'
import SignUp from './components/SignUp'
import SetupAssistant from './components/SetupAssistant'
import Dashboard from './components/Dashboard'
import Subscriptions from './components/Subscriptions'
import KanbanBoard from './components/KanbanBoard'
import CalendarView from './components/CalendarView'
import Payments from './components/Payments'
import Customers from './components/Customers'
import Suppliers from './components/Suppliers'
import Products from './components/Products'
import SalesPersons from './components/SalesPersons'
import Reports from './components/Reports'
import Users from './components/Users'
import Settings from './components/Settings'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Navigation states for public visitors vs authenticated members
  const [publicView, setPublicView] = useState('home') // 'home' | 'login' | 'signup'
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dbSeeded, setDbSeeded] = useState(true)
  const [currencySymbol, setCurrencySymbol] = useState('₹')
  const [darkMode, setDarkMode] = useState(false)

  // Alarm badges count from Subscriptions
  const [expiredCount, setExpiredCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)

  // 1. Monitor Authentication State
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        try {
          const docRef = doc(db, 'users', user.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            setUserProfile(docSnap.data())
          } else {
            setUserProfile({
              uid: user.uid,
              email: user.email,
              fullName: user.displayName || user.email.split('@')[0],
              role: 'admin',
              isActive: true
            })
          }

          // Check if DB settings exist (to determine if we need onboarding setup)
          const settingsSnap = await getDocs(collection(db, 'system_settings'))
          if (settingsSnap.empty) {
            setDbSeeded(false)
          } else {
            setDbSeeded(true)
            const currencyDoc = settingsSnap.docs.find(d => d.id === 'currency')
            if (currencyDoc) {
              setCurrencySymbol(currencyDoc.data().value || '₹')
            }
          }

        } catch (err) {
          console.error('Error fetching auth details:', err)
        }
      } else {
        setCurrentUser(null)
        setUserProfile(null)
      }
      setAuthLoading(false)
    })

    return unsubscribe
  }, [])

  // 2. Fetch alerting counts for badge
  useEffect(() => {
    if (!currentUser || !dbSeeded) return

    async function fetchAlerts() {
      try {
        const snap = await getDocs(collection(db, 'subscriptions'))
        const list = snap.docs.map(doc => doc.data())
        
        let expired = 0
        let expiring = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const limitDate = new Date()
        limitDate.setDate(today.getDate() + 30)

        list.forEach(sub => {
          if (sub.subscriptionStatus !== 'active' || !sub.expiryDate) return
          const exp = new Date(sub.expiryDate)
          if (exp < today) {
            expired++
          } else if (exp >= today && exp <= limitDate) {
            expiring++
          }
        })

        setExpiredCount(expired)
        setExpiringCount(expiring)
      } catch (err) {
        console.error(err)
      }
    }
    fetchAlerts()
  }, [currentUser, dbSeeded, activeNav])

  // Initialize visual theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.body.classList.add('dark-mode')
      setDarkMode(true)
    }
  }, [])

  const toggleDarkMode = () => {
    const dark = document.body.classList.toggle('dark-mode')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    setDarkMode(dark)
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
    }
    setPublicView('home')
  }

  const totalAlerts = expiredCount + expiringCount
  const isAdmin = userProfile?.role === 'admin'

  // Render Component depending on selected sidebar nav option
  const renderContent = () => {
    const forceOpenAdd = activeNav === 'Add Subscription'
    const viewName = forceOpenAdd ? 'Subscriptions' : activeNav

    switch (viewName) {
      case 'Dashboard':
        return <Dashboard user={userProfile} currencySymbol={currencySymbol} onNavigate={setActiveNav} />
      case 'Subscriptions':
        return <Subscriptions user={userProfile} currencySymbol={currencySymbol} autoOpenAdd={forceOpenAdd} />
      case 'Kanban Board':
        return <KanbanBoard currencySymbol={currencySymbol} />
      case 'Calendar':
        return <CalendarView currencySymbol={currencySymbol} />
      case 'Payments':
        return <Payments currencySymbol={currencySymbol} />
      case 'Customers':
        return <Customers />
      case 'Suppliers':
        return <Suppliers />
      case 'Products':
        return <Products currencySymbol={currencySymbol} />
      case 'Sales Persons':
        return <SalesPersons />
      case 'Reports':
        return <Reports currencySymbol={currencySymbol} />
      case 'Users':
        return <Users />
      case 'Settings':
        return <Settings currencySymbol={currencySymbol} onCurrencyChange={setCurrencySymbol} />
      default:
        return <Dashboard user={userProfile} currencySymbol={currencySymbol} onNavigate={setActiveNav} />
    }
  }

  if (authLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#001f3f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: 12, color: '#0074D9' }}></i>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Loading Session...</p>
        </div>
      </div>
    )
  }

  // PUBLIC VISITOR FLOW (Landing Page -> Login / Sign Up)
  if (!currentUser) {
    if (publicView === 'home') {
      return <Home onNavigate={setPublicView} />
    }
    if (publicView === 'signup') {
      return <SignUp onNavigate={setPublicView} />
    }
    return <Login onLoginSuccess={(profile) => setUserProfile(profile)} onNavigate={setPublicView} />
  }

  if (!dbSeeded) {
    return (
      <div className="auth-container">
        <SetupAssistant onSetupComplete={() => setDbSeeded(true)} />
      </div>
    )
  }

  const defaultProfileLogo = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg'

  return (
    <div className="app-container">
      {/* Collapsible Sidebar matches PHP visual structures */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <i className="fas fa-tachometer-alt"></i>
            <span className="sidebar-title-text">Dashboard</span>
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle Sidebar">
            <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} id="sidebarToggleIcon"></i>
          </button>
        </div>

        <div className="sidebar-logo-section">
          <img src={defaultProfileLogo} alt="Profile" className="sidebar-logo" />
        </div>

        {/* Sidebar Menu items */}
        <div className="sidebar-menu-section" style={{ flex: 1, overflowY: 'auto' }}>
          <ul className="sidebar-menu">
            <li data-tooltip="Dashboard">
              <a href="#" className={activeNav === 'Dashboard' ? 'active' : ''} onClick={() => setActiveNav('Dashboard')}>
                <i className="fas fa-chart-line"></i>
                <span>Dashboard</span>
              </a>
            </li>

            <li data-tooltip="Subscriptions">
              <a href="#" className={activeNav === 'Subscriptions' ? 'active' : ''} onClick={() => setActiveNav('Subscriptions')} style={{ position: 'relative' }}>
                <i className="fas fa-file-contract"></i>
                <span>Subscriptions</span>
                {totalAlerts > 0 && (
                  <span className={`sidebar-badge ${expiredCount > 0 ? 'badge-danger' : 'badge-warning'}`} title={`${expiredCount} expired, ${expiringCount} expiring soon`}>
                    {totalAlerts}
                  </span>
                )}
              </a>
            </li>

            <li data-tooltip="Kanban Board">
              <a href="#" className={activeNav === 'Kanban Board' ? 'active' : ''} onClick={() => setActiveNav('Kanban Board')}>
                <i className="fas fa-columns"></i>
                <span>Kanban Board</span>
              </a>
            </li>

            <li data-tooltip="Calendar">
              <a href="#" className={activeNav === 'Calendar' ? 'active' : ''} onClick={() => setActiveNav('Calendar')}>
                <i className="fas fa-calendar-alt"></i>
                <span>Calendar</span>
              </a>
            </li>

            <li data-tooltip="Add Subscription">
              <a href="#" className={activeNav === 'Add Subscription' ? 'active' : ''} onClick={() => setActiveNav('Add Subscription')}>
                <i className="fas fa-plus-circle"></i>
                <span>Add Subscription</span>
              </a>
            </li>

            <li data-tooltip="Payments">
              <a href="#" className={activeNav === 'Payments' ? 'active' : ''} onClick={() => setActiveNav('Payments')}>
                <i className="fas fa-money-bill-wave"></i>
                <span>Payments</span>
              </a>
            </li>

            {isAdmin && (
              <>
                <li data-tooltip="Customers">
                  <a href="#" className={activeNav === 'Customers' ? 'active' : ''} onClick={() => setActiveNav('Customers')}>
                    <i className="fas fa-address-book"></i>
                    <span>Customers</span>
                  </a>
                </li>

                <li data-tooltip="Suppliers">
                  <a href="#" className={activeNav === 'Suppliers' ? 'active' : ''} onClick={() => setActiveNav('Suppliers')}>
                    <i className="fas fa-truck"></i>
                    <span>Suppliers</span>
                  </a>
                </li>

                <li data-tooltip="Products">
                  <a href="#" className={activeNav === 'Products' ? 'active' : ''} onClick={() => setActiveNav('Products')}>
                    <i className="fas fa-box"></i>
                    <span>Products</span>
                  </a>
                </li>

                <li data-tooltip="Sales Persons">
                  <a href="#" className={activeNav === 'Sales Persons' ? 'active' : ''} onClick={() => setActiveNav('Sales Persons')}>
                    <i className="fas fa-user-tie"></i>
                    <span>Sales Persons</span>
                  </a>
                </li>
              </>
            )}

            <li data-tooltip="Reports">
              <a href="#" className={activeNav === 'Reports' ? 'active' : ''} onClick={() => setActiveNav('Reports')}>
                <i className="fas fa-chart-bar"></i>
                <span>Reports</span>
              </a>
            </li>

            {isAdmin && (
              <>
                <li data-tooltip="Users">
                  <a href="#" className={activeNav === 'Users' ? 'active' : ''} onClick={() => setActiveNav('Users')}>
                    <i className="fas fa-users"></i>
                    <span>Users</span>
                  </a>
                </li>

                <li data-tooltip="Site Settings">
                  <a href="#" className={activeNav === 'Settings' ? 'active' : ''} onClick={() => setActiveNav('Settings')}>
                    <i className="fas fa-cog"></i>
                    <span>Site Settings</span>
                  </a>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Sidebar Dark Mode Toggle */}
        <div className="sidebar-theme">
          <button onClick={toggleDarkMode}>
            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`} id="themeIcon"></i>
            <span id="themeText">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Sidebar Logout Footer */}
        <div className="sidebar-logout">
          <button onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout with Theme Controls */}
      <div className="main-content">
        {/* PHP Breadcrumbs rendering */}
        <div className="breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveNav('Dashboard') }} style={{ color: 'var(--navy-accent)', textDecoration: 'none' }}>
            <i className="fas fa-home"></i> Dashboard
          </a>
          <span className="breadcrumb-sep">/</span>
          <span>{activeNav === 'Dashboard' ? 'Overview' : activeNav}</span>
        </div>

        {/* Page Top Header */}
        <div className="header">
          <h1>
            {activeNav === 'Dashboard' && <i className="fas fa-chart-line" />}
            {activeNav === 'Subscriptions' && <i className="fas fa-file-contract" />}
            {activeNav === 'Kanban Board' && <i className="fas fa-columns" />}
            {activeNav === 'Calendar' && <i className="fas fa-calendar-alt" />}
            {activeNav === 'Add Subscription' && <i className="fas fa-plus-circle" />}
            {activeNav === 'Payments' && <i className="fas fa-money-bill-wave" />}
            {activeNav === 'Customers' && <i className="fas fa-address-book" />}
            {activeNav === 'Suppliers' && <i className="fas fa-truck" />}
            {activeNav === 'Products' && <i className="fas fa-box" />}
            {activeNav === 'Sales Persons' && <i className="fas fa-user-tie" />}
            {activeNav === 'Reports' && <i className="fas fa-chart-bar" />}
            {activeNav === 'Users' && <i className="fas fa-users" />}
            {activeNav === 'Settings' && <i className="fas fa-cog" />}
            <span style={{ marginLeft: 8 }}>{activeNav}</span>
          </h1>

          <div className="header-right">
            <div className="notification-bell-wrapper">
              <button className="notification-bell-btn" title="Notifications" style={{ cursor: 'default' }}>
                <i className="fas fa-bell"></i>
                {totalAlerts > 0 && <span className="notification-badge">{totalAlerts}</span>}
              </button>
            </div>
            <div>Welcome, <strong>{userProfile?.fullName || 'Administrator'}</strong></div>
          </div>
        </div>

        {/* Dynamic Inner Subcomponent View Container */}
        {renderContent()}
      </div>
    </div>
  )
}
