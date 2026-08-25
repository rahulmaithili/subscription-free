import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Products({ currencySymbol = '₹' }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterName, setFilterName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Form Fields
  const [formProductName, setFormProductName] = useState('')
  const [formProductCode, setFormProductCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColorCode, setFormColorCode] = useState('#0078D4')
  const [formSellingPrice, setFormSellingPrice] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState('')
  const [formDownloadUrl, setFormDownloadUrl] = useState('')
  const [formScreenshotUrl, setFormScreenshotUrl] = useState('')
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState('0')
  const [formIsActive, setFormIsActive] = useState('1')

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'))
      const list = snap.docs.map((doc, index) => ({ id: doc.id, index: index + 1, ...doc.data() }))
      list.sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
      setProducts(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingProduct(null)
    setFormProductName('')
    setFormProductCode('')
    setFormDescription('')
    setFormColorCode('#0078D4')
    setFormSellingPrice('')
    setFormPurchasePrice('')
    setFormDownloadUrl('')
    setFormScreenshotUrl('')
    setFormYoutubeUrl('')
    setFormDisplayOrder('0')
    setFormIsActive('1')
    setShowModal(true)
  }

  const openEditModal = (prod) => {
    setEditingProduct(prod)
    setFormProductName(prod.productName || '')
    setFormProductCode(prod.productCode || '')
    setFormDescription(prod.description || '')
    setFormColorCode(prod.colorCode || '#0078D4')
    setFormSellingPrice(String(prod.sellingPrice || ''))
    setFormPurchasePrice(String(prod.purchasePrice || ''))
    setFormDownloadUrl(prod.downloadUrl || '')
    setFormScreenshotUrl(prod.screenshotUrl || '')
    setFormYoutubeUrl(prod.youtubeUrl || '')
    setFormDisplayOrder(String(prod.displayOrder || 0))
    setFormIsActive(prod.isActive !== false ? '1' : '0')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    let code = formProductCode.trim()
    if (!code) {
      code = formProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }

    const productData = {
      productName: formProductName,
      productCode: code,
      description: formDescription,
      colorCode: formColorCode,
      sellingPrice: Number(formSellingPrice) || 0,
      purchasePrice: Number(formPurchasePrice) || 0,
      downloadUrl: formDownloadUrl,
      screenshotUrl: formScreenshotUrl,
      youtubeUrl: formYoutubeUrl,
      displayOrder: Number(formDisplayOrder) || 0,
      isActive: formIsActive === '1',
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData)
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString()
        })
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save product configurations')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product item?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'products', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleToggleActive = async (prod, checked) => {
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        isActive: checked,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // Filter Logic
  const filteredProducts = products.filter((prod) => {
    const matchName = (prod.productName || '').toLowerCase().includes(filterName.toLowerCase())
    let matchStatus = true
    if (filterStatus === 'active') matchStatus = prod.isActive !== false
    if (filterStatus === 'inactive') matchStatus = prod.isActive === false
    return matchName && matchStatus
  })

  // Export CSV
  const exportCSV = () => {
    let csv = 'ID,Product Name,Product Code,Selling Price,Purchase Price,Display Order,Status\n'
    filteredProducts.forEach((p) => {
      csv += `"${p.index}","${p.productName || ''}","${p.productCode || ''}","${p.sellingPrice || 0}","${p.purchasePrice || 0}","${p.displayOrder || 0}","${p.isActive !== false ? 'Active' : 'Inactive'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'products_export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><i className="fas fa-box"></i> Products</h2>
        <div>
          <button className="btn btn-success" onClick={openAddModal} style={{ marginRight: 8 }}>
            <i className="fas fa-plus"></i> Add Product
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Filter by Name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select
          className="form-control"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(filterName || filterStatus) && (
          <button className="btn btn-secondary" onClick={() => { setFilterName(''); setFilterStatus('') }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--navy-accent)' }}></i>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Product Name</th>
                <th>Code Slug</th>
                <th>Selling Price</th>
                <th>Purchase Price</th>
                <th>Display Order</th>
                <th>Color</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item.id}>
                  <td>{item.index}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: item.colorCode || '#ccc' }}></span>
                      <strong>{item.productName}</strong>
                    </div>
                  </td>
                  <td><code>{item.productCode}</code></td>
                  <td><strong>{currencySymbol}{Number(item.sellingPrice || 0).toLocaleString()}</strong></td>
                  <td style={{ color: 'var(--text-muted)' }}>{currencySymbol}{Number(item.purchasePrice || 0).toLocaleString()}</td>
                  <td>{item.displayOrder || 0}</td>
                  <td><code style={{ fontSize: 11 }}>{item.colorCode}</code></td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.isActive !== false}
                      className="toggle"
                      style={{ cursor: 'pointer' }}
                      onChange={(e) => handleToggleActive(item, e.target.checked)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="action-icon edit-icon" title="Edit" style={{ color: '#ffc107', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => openEditModal(item)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="action-icon delete-icon" title="Delete" style={{ color: '#dc3545', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => handleDelete(item.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3>
                <i className={editingProduct ? 'fas fa-edit' : 'fas fa-box'}></i> {editingProduct ? 'Edit Product Item' : 'Add New Product'}
              </h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter product title"
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Product Code (Slug)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Auto-generated if blank"
                      value={formProductCode}
                      onChange={(e) => setFormProductCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Description</label>
                  <textarea
                    className="form-control"
                    placeholder="Short description of the product or plan details..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    style={{ height: 60 }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Retail Selling price"
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase / Execution Price *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Cost price from supplier"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Visual Color Tag</label>
                    <input
                      type="color"
                      className="form-control"
                      value={formColorCode}
                      onChange={(e) => setFormColorCode(e.target.value)}
                      style={{ height: 40, padding: '2px 6px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Display Priority Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Digital Delivery Download URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/download-link"
                    value={formDownloadUrl}
                    onChange={(e) => setFormDownloadUrl(e.target.value)}
                  />
                </div>

                {/* Portfolio Manager Extension Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Screenshot Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://example.com/screenshot.jpg"
                      value={formScreenshotUrl}
                      onChange={(e) => setFormScreenshotUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>YouTube Preview Video URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={formIsActive} onChange={(e) => setFormIsActive(e.target.value)}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
