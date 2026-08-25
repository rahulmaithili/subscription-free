import { useEffect, useState } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { Search, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'

export default function Products({ currencySymbol = '₹' }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Filters
  const [search, setSearch] = useState('')

  // Form Fields
  const [formProductName, setFormProductName] = useState('')
  const [formProductCode, setFormProductCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColorCode, setFormColorCode] = useState('#0078D4')
  const [formSellingPrice, setFormSellingPrice] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState('')
  const [formDownloadUrl, setFormDownloadUrl] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState('0')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'))
      setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a,b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)))
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
    setFormDisplayOrder('0')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (prod) => {
    setEditingProduct(prod)
    setFormProductName(prod.productName || '')
    setFormProductCode(prod.productCode || '')
    setFormDescription(prod.description || '')
    setFormColorCode(prod.colorCode || '#0078D4')
    setFormSellingPrice(prod.sellingPrice || '')
    setFormPurchasePrice(prod.purchasePrice || '')
    setFormDownloadUrl(prod.downloadUrl || '')
    setFormDisplayOrder(String(prod.displayOrder || 0))
    setFormIsActive(prod.isActive !== false)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Auto-generate code slug if empty
    let slug = formProductCode.trim()
    if (!slug) {
      slug = formProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }

    const productData = {
      productName: formProductName,
      productCode: slug,
      description: formDescription,
      colorCode: formColorCode,
      sellingPrice: Number(formSellingPrice) || 0,
      purchasePrice: Number(formPurchasePrice) || 0,
      downloadUrl: formDownloadUrl,
      displayOrder: Number(formDisplayOrder) || 0,
      isActive: formIsActive,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData)
      } else {
        await addDoc(collection(db, 'products'), productData)
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to save product details')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'products', id))
      fetchData()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (prod) => {
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        isActive: !prod.isActive,
        updatedAt: new Date().toISOString()
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredProducts = products.filter((p) => {
    const needle = search.toLowerCase()
    return (
      (p.productName || '').toLowerCase().includes(needle) ||
      (p.productCode || '').toLowerCase().includes(needle)
    )
  })

  return (
    <div>
      <div className="heading-row">
        <div>
          <p className="eyebrow">Workspace / Products</p>
          <h1>Products & Services</h1>
          <p className="subheading">Configure items, set default pricing plans, custom card labels, and license URLs.</p>
        </div>
        <button className="add-button" onClick={openAddModal}>
          <Plus size={17} /> <span>Add Product</span>
        </button>
      </div>

      <section className="table-section" style={{ minHeight: '60vh' }}>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by product name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
            <RefreshCw className="spinner" size={24} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Code Identifier</th>
                  <th>Selling Price</th>
                  <th>Cost Price</th>
                  <th>Display Order</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                            backgroundColor: item.colorCode || '#0074D9', border: '1px solid rgba(0,0,0,0.1)'
                          }} />
                          <strong>{item.productName}</strong>
                        </div>
                      </td>
                      <td><code>{item.productCode}</code></td>
                      <td><strong>{currencySymbol}{item.sellingPrice.toLocaleString()}</strong></td>
                      <td>{currencySymbol}{item.purchasePrice.toLocaleString()}</td>
                      <td>{item.displayOrder}</td>
                      <td>
                        <button
                          className={`status ${item.isActive ? 'active' : 'paused'}`}
                          style={{ cursor: 'pointer', border: 0 }}
                          onClick={() => toggleActiveStatus(item)}
                          title="Click to toggle status"
                        >
                          <i />
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button className="icon-button" onClick={() => openEditModal(item)} aria-label="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-button" onClick={() => handleDelete(item.id)} aria-label="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="empty-state">No products found matching your query.</div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product Details' : 'Add New Product'}</h3>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Software Pro"
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product Code / Slug (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. software-pro (auto-generated if blank)"
                    value={formProductCode}
                    onChange={(e) => setFormProductCode(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price ({currencySymbol}) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost / Purchase Price ({currencySymbol})</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Label Theme Color</label>
                    <input
                      type="color"
                      className="form-control"
                      style={{ padding: '4px 10px', height: 42 }}
                      value={formColorCode}
                      onChange={(e) => setFormColorCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Display Sorting Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Download URL / Resource Link</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/download/..."
                    value={formDownloadUrl}
                    onChange={(e) => setFormDownloadUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Product Description</label>
                  <textarea
                    className="form-control"
                    placeholder="Details about licensing cycles, Support SLAs, etc."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-control-checkbox">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                    />
                    Mark product as active and enabled
                  </label>
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
