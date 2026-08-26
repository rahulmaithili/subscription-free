import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function ApiValidate() {
  const [jsonResponse, setJsonResponse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Extract license key from URL parameter
    const params = new URLSearchParams(window.location.search)
    const licenseKey = params.get('key') || params.get('license_key')

    if (!licenseKey) {
      setJsonResponse({
        valid: false,
        message: 'License key parameter (?key=...) is required.'
      })
      setLoading(false)
      return
    }

    async function checkLicense() {
      try {
        const docRef = doc(db, 'license_keys', licenseKey)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setJsonResponse({
            valid: false,
            message: 'Invalid license key.'
          })
          setLoading(false)
          return
        }

        const data = docSnap.data()

        // 2. Validate Expiry Date
        let isExpired = false
        if (data.expiryDate) {
          const expiry = new Date(data.expiryDate)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (today > expiry) {
            isExpired = true;
          }
        }

        // 3. Validation Rules (Must be Paid and Active)
        if (data.paymentStatus !== 'Paid') {
          setJsonResponse({
            valid: false,
            status: 'unpaid',
            message: 'Subscription payment status is Unpaid or Partial.',
            customer: data.customerName,
            product: data.productName
          })
        } else if (data.subscriptionStatus !== 'active') {
          setJsonResponse({
            valid: false,
            status: data.subscriptionStatus,
            message: `Subscription contract is currently ${data.subscriptionStatus}.`,
            customer: data.customerName,
            product: data.productName
          })
        } else if (isExpired) {
          setJsonResponse({
            valid: false,
            status: 'expired',
            message: 'Subscription contract has expired.',
            customer: data.customerName,
            product: data.productName,
            expiryDate: data.expiryDate
          })
        } else {
          setJsonResponse({
            valid: true,
            status: 'active',
            message: 'License key is valid and active.',
            customer: data.customerName,
            product: data.productName,
            expiryDate: data.expiryDate || 'lifetime'
          })
        }

      } catch (err) {
        console.error(err)
        setJsonResponse({
          valid: false,
          message: 'Error connecting to license validation database.'
        })
      } finally {
        setLoading(false)
      }
    }

    checkLicense()
  }, [])

  // When rendering, output raw preformatted JSON to simulate standard REST response
  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13 }}>
        Checking license verification...
      </div>
    )
  }

  return (
    <pre style={{
      margin: 0,
      padding: 20,
      background: '#0f172a',
      color: '#38bdf8',
      fontSize: 14,
      fontFamily: 'Consolas, monospace',
      height: '100vh',
      boxSizing: 'border-box',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all'
    }}>
      {JSON.stringify(jsonResponse, null, 2)}
    </pre>
  )
}
