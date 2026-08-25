import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'

// Lucide-react Icons
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
  MoreHorizontal,
  Plus,
  Settings2,
  ShieldCheck,
  X,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  FileText,
  Kanban,
  Calendar,
  CreditCard,
  Users as UsersIcon,
  Truck,
  Tag,
  UserCheck,
  PieChart,
  ShieldAlert,
  Loader
} from 'lucide-react'

// Components
import Login from './components/Login'
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

  // Navigation & UI state
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dbSeeded, setDbSeeded] = useState(true)
  const [currencySymbol, setCurrencySymbol] = useState('₹')
  const [darkMode, setDarkMode] = useState(false)

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
          // Fetch additional profile data from Firestore
          const docRef = doc(db, 'users', user.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const profile = docSnap.data()
            setUserProfile(profile)
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
            // Load currency symbol preference
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

  // 2. Manage dark mode stylesheet state
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.body.classList.toggle('dark-mode')
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
    }
  }

  // Side Navigation bar item descriptors
  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { name: 'Subscriptions', icon: <FileText size={17} /> },
    { name: 'Kanban Board', icon: <Kanban size={17} /> },
    { name: 'Calendar', icon: <Calendar size={17} /> },
    { name: 'Payments', icon: <CreditCard size={17} /> },
    { name: 'Customers', icon: <UsersIcon size={17} /> },
    { name: 'Suppliers', icon: <Truck size={17} /> },
    { name: 'Products', icon: <Tag size={17} /> },
    { name: 'Sales Persons', icon: <UserCheck size={17} /> },
    { name: 'Reports', icon: <PieChart size={17} /> },
    { name: 'Users', icon: <ShieldAlert size={17} /> }
  ]

  // Render Component depending on selected sidebar nav option
  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard':
        return <Dashboard user={userProfile} currencySymbol={currencySymbol} onNavigate={setActiveNav} />
      case 'Subscriptions':
        return <Subscriptions user={userProfile} currencySymbol={currencySymbol} />
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
      case 'Team':
        return <Settings currencySymbol={currencySymbol} onCurrencyChange={setCurrencySymbol} />
      default:
        return <Dashboard user={userProfile} currencySymbol={currencySymbol} onNavigate={setActiveNav} />
    }
  }

  if (authLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', backgroundColor: 'var(--cream)', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader className="spinner" size={32} style={{ marginBottom: 10, color: 'var(--navy-accent)' }} />
          <p style={{ fontSize: 13, fontWeight: 500 }}>Authenticating Connection...</p>
        </div>
      </div>
    )
  }

  // 3. Auth Check Route redirection
  if (!currentUser) {
    return <Login onLoginSuccess={(profile) => setUserProfile(profile)} />
  }

  // 4. Seeding onboarding Check
  if (!dbSeeded) {
    return (
      <div className="auth-container">
        <SetupAssistant onSetupComplete={() => setDbSeeded(true)} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>subscriptly</span>
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-dot">HQ</span>
          <span>
            <strong>Northstar HQ</strong>
            <small>Workspace Hub</small>
          </span>
          <ChevronDown size={16} />
        </div>

        <p className="nav-label">Workspace</p>
        <nav>
          {navItems.map((item) => (
            <button
              className={activeNav === item.name ? 'nav-item active' : 'nav-item'}
              key={item.name}
              onClick={() => {
                setActiveNav(item.name)
                setMenuOpen(false)
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <p className="nav-label secondary-label">Manage</p>
        <nav>
          <button
            className={activeNav === 'Settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setActiveNav('Settings')
              setMenuOpen(false)
            }}
          >
            <Settings2 size={17} />
            <span>Settings</span>
          </button>
          <button
            className={activeNav === 'Team' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setActiveNav('Team')
              setMenuOpen(false)
            }}
          >
            <ShieldCheck size={17} />
            <span>Team access</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="profile">
            <span className="avatar">{(userProfile?.fullName || 'AD').slice(0,2).toUpperCase()}</span>
            <span>
              <strong>{userProfile?.fullName || 'Admin User'}</strong>
              <small style={{ textTransform: 'capitalize' }}>{userProfile?.role || 'Administrator'}</small>
            </span>
            <button className="icon-button" onClick={handleLogout} title="Log Out" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>

          <div className="crumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{activeNav}</strong>
          </div>

          <div className="top-actions">
            <button className="icon-button" onClick={toggleDarkMode} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} style={{ marginRight: 5 }}>
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="live-state">
              <i /> Live data
            </span>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
              <i className="notification-dot" />
            </button>
            <button className="add-button" onClick={() => setActiveNav('Subscriptions')}>
              <Plus size={17} />
              <span>Actions</span>
            </button>
          </div>
        </header>

        <section className="content">
          {renderContent()}
        </section>
      </main>
    </div>
  )
}
