import { useState } from 'react'
import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { Database, Play, CheckCircle, AlertTriangle } from 'lucide-react'

export default function SetupAssistant({ onSetupComplete }) {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('idle') // idle, running, success, error

  const addLog = (text, type = 'info') => {
    setLogs((prev) => [...prev, { text, type, time: new Date().toLocaleTimeString() }])
  }

  const runSetup = async () => {
    setLoading(true)
    setStatus('running')
    setLogs([])
    addLog('Starting Database Setup...', 'info')

    try {
      if (!db) {
        throw new Error('Firestore DB not initialized. Check your Firebase credentials.')
      }

      // Batch 1: Settings & Supporting Info
      addLog('Preparing Batch 1: System Settings, Currencies, Tax Rates...', 'info')
      const batch1 = writeBatch(db)

      // Settings
      const settings = [
        { key: 'currency', value: 'INR', description: 'System default currency' },
        { key: 'company_name', value: 'My Company', description: 'Used in email headers and reports' },
        { key: 'company_email', value: 'admin@company.com', description: 'Default sender identity for notifications' },
        { key: 'company_logo_url', value: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg', description: 'Logo for emails and login page' },
        { key: 'notification_days_before', value: '30,15,7,3,1,0', description: 'Days before expiry to trigger alerts' },
        { key: 'auto_email_enabled', value: 'true', description: 'Master toggle for automated email notifications' },
        { key: 'tax_percentage', value: '0', description: 'Default tax rate if applicable' },
        { key: 'show_forgot_password', value: '1', description: 'Show forgot password link on login' },
        { key: 'maintenance_mode', value: '0', description: 'Enable maintenance mode' },
        { key: 'default_language', value: 'en', description: 'Default UI language' }
      ]
      settings.forEach((item) => {
        const ref = doc(collection(db, 'system_settings'), item.key)
        batch1.set(ref, { value: item.value, description: item.description })
      })

      // Currencies
      const currencies = [
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchangeRate: 1.0, isDefault: true },
        { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012, isDefault: false },
        { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011, isDefault: false },
        { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.0094, isDefault: false }
      ]
      currencies.forEach((item) => {
        const ref = doc(collection(db, 'currencies'), item.code)
        batch1.set(ref, item)
      })

      // Tax Rates
      const taxRates = [
        { name: 'No Tax', rate: 0, isDefault: true, isActive: true },
        { name: 'GST 5%', rate: 5, isDefault: false, isActive: true },
        { name: 'GST 12%', rate: 12, isDefault: false, isActive: true },
        { name: 'GST 18%', rate: 18, isDefault: false, isActive: true }
      ]
      taxRates.forEach((item) => {
        const ref = doc(collection(db, 'tax_rates'), item.name.replace(/\s+/g, '_').toLowerCase())
        batch1.set(ref, item)
      })

      await batch1.commit()
      addLog('Batch 1 committed successfully!', 'success')

      // Batch 2: Products & Salespersons & Suppliers
      addLog('Preparing Batch 2: Products, Salespersons, Suppliers...', 'info')
      const batch2 = writeBatch(db)

      // Products
      const products = [
        { id: 'prod_1', productName: 'Software', productCode: 'software', description: 'Software subscriptions and licenses', colorCode: '#0078D4', sellingPrice: 10000, purchasePrice: 8000, downloadUrl: 'https://example.com/download/software', isActive: true, displayOrder: 1 },
        { id: 'prod_2', productName: 'Hardware', productCode: 'hardware', description: 'Hardware and equipment purchases', colorCode: '#008000', sellingPrice: 50000, purchasePrice: 45000, downloadUrl: '', isActive: true, displayOrder: 2 },
        { id: 'prod_3', productName: 'Cloud Services', productCode: 'cloud', description: 'Cloud hosting and storage solutions', colorCode: '#00A2E8', sellingPrice: 25000, purchasePrice: 20000, downloadUrl: '', isActive: true, displayOrder: 3 },
        { id: 'prod_4', productName: 'Priority Support', productCode: 'support', description: 'Support and maintenance contracts', colorCode: '#5C2D91', sellingPrice: 15000, purchasePrice: 12000, downloadUrl: '', isActive: true, displayOrder: 4 }
      ]
      products.forEach((item) => {
        const ref = doc(collection(db, 'products'), item.id)
        batch2.set(ref, item)
      })

      // Salespersons
      const salespersons = [
        { id: 'sp_1', name: 'Salesperson 1', email: 'salesperson1@demo.com', phone: '03001010001', department: 'Sales Dept', commissionRate: 5.0, isActive: true },
        { id: 'sp_2', name: 'Salesperson 2', email: 'salesperson2@demo.com', phone: '03001010002', department: 'Enterprise', commissionRate: 7.5, isActive: true },
        { id: 'sp_3', name: 'Salesperson 3', email: 'salesperson3@demo.com', phone: '03001010003', department: 'SMB Dept', commissionRate: 6.0, isActive: true }
      ]
      salespersons.forEach((item) => {
        const ref = doc(collection(db, 'salespersons'), item.id)
        batch2.set(ref, item)
      })

      // Suppliers
      const suppliers = [
        { id: 'supp_1', companyName: 'Global Software Distributors', contactPerson: 'John Supp', email: 'supp1@demo.com', phone: '04230100001', address: 'House 1, Street 10, Cloud City', city: 'Cloud City', country: 'Global Land', isActive: true },
        { id: 'supp_2', companyName: 'Enterprise Hardware Ltd', contactPerson: 'Mark Supp', email: 'supp2@demo.com', phone: '04230100002', address: 'House 2, Street 20, Chip City', city: 'Chip City', country: 'Hardware Land', isActive: true }
      ]
      suppliers.forEach((item) => {
        const ref = doc(collection(db, 'suppliers'), item.id)
        batch2.set(ref, item)
      })

      await batch2.commit()
      addLog('Batch 2 committed successfully!', 'success')

      // Batch 3: Customers & Subscriptions
      addLog('Preparing Batch 3: Customers & Subscriptions...', 'info')
      const batch3 = writeBatch(db)

      // Customers
      const customers = [
        { id: 'cust_1', companyName: 'Northstar Studio', contactPerson: 'Alice', email: 'company1@demo.com', phone: '04230000001', address: 'Office 1, Tower A, Business park', city: 'Mumbai', country: 'India', isActive: true },
        { id: 'cust_2', companyName: 'Morrow & Co.', contactPerson: 'Bob', email: 'company2@demo.com', phone: '04230000002', address: 'Office 2, Tower B, Business park', city: 'Delhi', country: 'India', isActive: true },
        { id: 'cust_3', companyName: 'Aster Labs', contactPerson: 'Charlie', email: 'company3@demo.com', phone: '04230000003', address: 'Suite 404, Science park', city: 'Bangalore', country: 'India', isActive: true },
        { id: 'cust_4', companyName: 'Juniper House', contactPerson: 'David', email: 'company4@demo.com', phone: '04230000004', address: 'Building 12, Design district', city: 'Pune', country: 'India', isActive: true },
        { id: 'cust_5', companyName: 'Kite & Signal', contactPerson: 'Emily', email: 'company5@demo.com', phone: '04230000005', address: 'Level 5, Creative Hub', city: 'Chennai', country: 'India', isActive: true }
      ]
      customers.forEach((item) => {
        const ref = doc(collection(db, 'customers'), item.id)
        batch3.set(ref, item)
      })

      // Helper dates
      const getFutureDate = (days) => {
        const d = new Date()
        d.setDate(d.getDate() + days)
        return d.toISOString().split('T')[0]
      }
      const getPastDate = (days) => {
        const d = new Date()
        d.setDate(d.getDate() - days)
        return d.toISOString().split('T')[0]
      }

      // Subscriptions
      const subscriptions = [
        { id: 'sub_1', customerId: 'cust_1', customerName: 'Northstar Studio', invoiceNo: 'INV-2026-001', productId: 'prod_1', productName: 'Software', invoiceDate: getPastDate(26), startingDate: getPastDate(26), expiryDate: getFutureDate(10), sellingPrice: 10000, purchasePrice: 8000, taxAmount: 0, totalAmount: 10000, paymentStatus: 'Paid', paymentMethod: 'Razorpay', paymentDate: getPastDate(26), autoRenew: true, priority: 'High', subscriptionStatus: 'active', salespersonId: 'sp_1', salespersonName: 'Salesperson 1' },
        { id: 'sub_2', customerId: 'cust_2', customerName: 'Morrow & Co.', invoiceNo: 'INV-2026-002', productId: 'prod_3', productName: 'Cloud Services', invoiceDate: getPastDate(18), startingDate: getPastDate(18), expiryDate: getFutureDate(18), sellingPrice: 25000, purchasePrice: 20000, taxAmount: 0, totalAmount: 25000, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer', paymentDate: getPastDate(18), autoRenew: true, priority: 'Medium', subscriptionStatus: 'active', salespersonId: 'sp_2', salespersonName: 'Salesperson 2' },
        { id: 'sub_3', customerId: 'cust_3', customerName: 'Aster Labs', invoiceNo: 'INV-2026-003', productId: 'prod_4', productName: 'Priority Support', invoiceDate: getPastDate(5), startingDate: getPastDate(5), expiryDate: getFutureDate(25), sellingPrice: 15000, purchasePrice: 12000, taxAmount: 0, totalAmount: 15000, paymentStatus: 'Unpaid', paymentMethod: '', paymentDate: '', autoRenew: false, priority: 'Low', subscriptionStatus: 'active', salespersonId: 'sp_1', salespersonName: 'Salesperson 1' },
        { id: 'sub_4', customerId: 'cust_4', customerName: 'Juniper House', invoiceNo: 'INV-2026-004', productId: 'prod_1', productName: 'Software', invoiceDate: getPastDate(30), startingDate: getPastDate(30), expiryDate: getPastDate(1), sellingPrice: 10000, purchasePrice: 8000, taxAmount: 0, totalAmount: 10000, paymentStatus: 'Unpaid', paymentMethod: '', paymentDate: '', autoRenew: true, priority: 'High', subscriptionStatus: 'active', salespersonId: 'sp_3', salespersonName: 'Salesperson 3' },
        { id: 'sub_5', customerId: 'cust_5', customerName: 'Kite & Signal', invoiceNo: 'INV-2026-005', productId: 'prod_2', productName: 'Hardware', invoiceDate: getPastDate(45), startingDate: getPastDate(45), expiryDate: getFutureDate(120), sellingPrice: 50000, purchasePrice: 45000, taxAmount: 0, totalAmount: 50000, paymentStatus: 'Paid', paymentMethod: 'Cheque', paymentDate: getPastDate(44), autoRenew: false, priority: 'Medium', subscriptionStatus: 'paused', salespersonId: 'sp_2', salespersonName: 'Salesperson 2' }
      ]
      subscriptions.forEach((item) => {
        const ref = doc(collection(db, 'subscriptions'), item.id)
        batch3.set(ref, item)
      })

      // Add a couple of initial payments
      const payments = [
        { id: 'pay_1', subscriptionId: 'sub_1', invoiceNo: 'INV-2026-001', customerName: 'Northstar Studio', amount: 10000, paymentDate: getPastDate(26), paymentMethod: 'Razorpay', notes: 'Automated signup payment' },
        { id: 'pay_2', subscriptionId: 'sub_2', invoiceNo: 'INV-2026-002', customerName: 'Morrow & Co.', amount: 25000, paymentDate: getPastDate(18), paymentMethod: 'Bank Transfer', notes: 'Invoiced payment' }
      ]
      payments.forEach((item) => {
        const ref = doc(collection(db, 'payments'), item.id)
        batch3.set(ref, item)
      })

      await batch3.commit()
      addLog('Batch 3 committed successfully!', 'success')

      addLog('All Firestore collections seeded successfully!', 'success')
      setStatus('success')
      setLoading(false)

      setTimeout(() => {
        if (onSetupComplete) onSetupComplete()
      }, 1500)

    } catch (err) {
      console.error(err)
      addLog(`Error seeding database: ${err.message}`, 'error')
      setStatus('error')
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      <div style={{ display: 'inline-grid', placeItems: 'center', width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,116,217,0.1)', color: 'var(--navy-accent)', marginBottom: 15 }}>
        <Database size={24} />
      </div>
      <h2>Firestore Database Setup</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8, marginBottom: 20 }}>
        Seeding Firestore database with default system parameters, demo products, salespersons, customers, and active subscriptions.
      </p>

      {status === 'idle' && (
        <button className="btn btn-primary" onClick={runSetup}>
          <Play size={16} /> Seed Database Now
        </button>
      )}

      {status === 'running' && (
        <button className="btn btn-primary" disabled style={{ opacity: 0.7 }}>
          <span className="spinner" style={{ marginRight: 8 }}>⏳</span> Seeding Data...
        </button>
      )}

      {status === 'success' && (
        <div style={{ color: 'var(--green)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <CheckCircle size={18} /> Database Seeded Successfully! Redirecting...
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginBottom: 15 }}>
          <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={18} /> Setup Failed
          </div>
          <button className="btn btn-danger" onClick={runSetup}>
            Retry Setup
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="setup-logs">
          {logs.map((log, idx) => (
            <div key={idx} className={`setup-log-line ${log.type}`}>
              [{log.time}] {log.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
