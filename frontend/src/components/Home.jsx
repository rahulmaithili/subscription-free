import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import '../home.css'

export default function Home({ onNavigate, currencySymbol = '₹' }) {
  const [products, setProducts] = useState([])
  const [portfolioItems, setPortfolioItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Youtube Modal Preview States
  const [previewVideo, setPreviewVideo] = useState(null) // { title: string, url: string }

  // Default Fallback Portfolio Items if Firestore is empty
  const defaultPortfolio = [
    {
      id: 'p-1',
      title: 'WhatsApp Bulk Messaging Tool in Google Sheets',
      plans_included: 'Premium Plan, Developer Plan',
      tags: 'Google Sheets, WhatsApp API, Automation',
      episode_tag: '</> Episode 48',
      preview_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // placeholder or real link
    },
    {
      id: 'p-2',
      title: 'Google Sheets Automated Invoice Generator (PDF + Email)',
      plans_included: 'Premium Plan',
      tags: 'Google Sheets, Gmail App, PDF Builder',
      episode_tag: '</> Episode 32',
      preview_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'p-3',
      title: 'Bulk Gmail Mail Merge with Tracking Report',
      plans_included: 'Bronze, Silver, Gold',
      tags: 'Gmail Merge, Google Sheets, HTML Email',
      episode_tag: '</> Episode 25',
      preview_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'p-4',
      title: 'Telegram Bot Integration for Inventory Logging',
      plans_included: 'Premium Plan, Custom Developer',
      tags: 'Telegram API, Firestore, Apps Script',
      episode_tag: '</> Episode 14',
      preview_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }
  ]

  // Default Testimonials
  const testimonials = [
    {
      name: 'Sarah K.',
      country: 'United States',
      project: 'Sheets Automation',
      text: 'Rahul delivered the script ahead of schedule! It automated hours of manual client copy-paste work into a single click.',
      avatar: 'SK'
    },
    {
      name: 'Rajesh P.',
      country: 'India',
      project: 'WhatsApp Bulk Sender',
      text: 'Perfect integration! The WhatsApp sender runs smoothly in our Google Sheets. Excellent customer support too.',
      avatar: 'RP'
    },
    {
      name: 'Michael G.',
      country: 'United Kingdom',
      project: 'Invoice PDF automation',
      text: 'Very professional. The PDFs generate in real-time and send to customers automatically. 5 stars all the way!',
      avatar: 'MG'
    }
  ]

  useEffect(() => {
    async function loadFrontendData() {
      try {
        const prodSnap = await getDocs(collection(db, 'products'))
        const activeProds = prodSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.isActive !== false)
        setProducts(activeProds)

        // Try load portfolio items
        const portSnap = await getDocs(collection(db, 'portfolio_items'))
        if (!portSnap.empty) {
          const list = portSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          setPortfolioItems(list)
        } else {
          setPortfolioItems(defaultPortfolio)
        }
      } catch (err) {
        console.error(err)
        setPortfolioItems(defaultPortfolio)
      } finally {
        setLoading(false)
      }
    }
    loadFrontendData()
  }, [])

  // Helper to extract YouTube ID
  const getYouTubeId = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const openPreview = (title, url) => {
    const ytId = getYouTubeId(url)
    if (ytId) {
      setPreviewVideo({ title, embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1` })
    } else {
      // open directly
      window.open(url, '_blank')
    }
  }

  return (
    <div className="home-body">
      {/* Header navbar */}
      <header className="home-header">
        <div className="home-container home-navbar">
          <a href="#" className="home-logo-section" onClick={(e) => e.preventDefault()}>
            <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg" alt="Logo" className="home-logo-img" />
            <span className="home-logo-text">Mr.Rahul Scripts</span>
          </a>

          <ul className="home-nav-links">
            <li><a href="#portfolio">Portfolio</a></li>
            <li><a href="#support">Support</a></li>
            <li><a href="#products">Products</a></li>
            <li><a href="#reviews">Testimonials</a></li>
            <li><a href="#membership">Membership</a></li>
          </ul>

          <div className="home-nav-btns">
            <button className="home-btn home-btn-outline" onClick={() => onNavigate('login')}>
              <i className="fas fa-sign-in-alt"></i> Login
            </button>
            <button className="home-btn home-btn-primary" onClick={() => onNavigate('signup')}>
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-container home-hero-grid">
          <div className="home-hero-content">
            <span className="home-hero-badge">
              <i className="fas fa-circle" style={{ color: 'var(--primary)', fontSize: 8 }}></i>
              BUILDING SINCE 2022 · 400+ PROJECTS SHIPPED
            </span>
            <h1>Hire a Google Apps Script Developer</h1>
            <p>
              If your team is wasting hours on manual spreadsheet work or disconnected systems — we can fix that.
              We build Google Sheets automations, Apps Script add-ons, and custom PHP web applications. 
              400+ projects shipped across 50+ countries, with 6 months of post-delivery support included.
            </p>

            <div className="home-hero-btn-group">
              <a href="https://wa.me/923394100600" className="home-btn home-btn-success" target="_blank" rel="noreferrer">
                <i className="fab fa-whatsapp"></i> Get a Free Quote on WhatsApp
              </a>
              <a href="#portfolio" className="home-btn home-btn-outline">Apps Script Projects</a>
              <a href="#products" className="home-btn home-btn-outline">PHP MySQL Projects</a>
            </div>

            <div className="home-hero-stats-row">
              <div className="home-hero-stat-item"><i className="fab fa-youtube"></i> 27,400+ Subscribers</div>
              <div className="home-hero-stat-item"><i className="fas fa-star"></i> 4.9/5 Client Rating</div>
              <div className="home-hero-stat-item"><i className="fas fa-headset"></i> 6 Months Support</div>
              <div className="home-hero-stat-item"><i className="fas fa-bolt"></i> 24h Free Quote</div>
            </div>
          </div>

          {/* Orbit spinner matching index.php */}
          <div className="home-hero-graphic-wrap">
            <div className="home-orbit-container">
              <div className="home-center-logo-hub">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg" alt="Logo" />
                <span>Mr.Rahul Scripts</span>
              </div>

              <div className="home-orbit-node home-node-1" title="Python"><i className="fab fa-python" style={{ color: '#3776AB' }}></i></div>
              <div className="home-orbit-node home-node-2" title="JavaScript"><i className="fab fa-js" style={{ color: '#F7DF1E' }}></i></div>
              <div className="home-orbit-node home-node-3" title="Google Sheets"><i className="fas fa-table" style={{ color: '#0F9D58' }}></i></div>
              <div className="home-orbit-node home-node-4" title="HTML5"><i className="fab fa-html5" style={{ color: '#E34F26' }}></i></div>
              <div className="home-orbit-node home-node-5" title="React"><i className="fab fa-react" style={{ color: '#61DAFB' }}></i></div>
              <div className="home-orbit-node home-node-6" title="PHP"><i className="fab fa-php" style={{ color: '#777BB4' }}></i></div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="home-portfolio-sec" id="portfolio">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-section-tag">PORTFOLIO</span>
            <h2>Popular Apps Script Templates & Source Code</h2>
            <p>These are our most downloaded scripts — each one has a full video walkthrough on YouTube.</p>
            <div className="home-section-accent-line"></div>
          </div>

          <div className="home-portfolio-grid">
            {portfolioItems.map((item) => {
              const ytId = getYouTubeId(item.preview_url)
              const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''
              const planTags = (item.plans_included || 'Premium Plan').split(',')
              const listTags = (item.tags || 'Google Apps Script').split(',')

              return (
                <div className="home-portfolio-card" key={item.id}>
                  <div
                    className="home-portfolio-img-wrap"
                    onClick={() => item.preview_url && openPreview(item.title, item.preview_url)}
                    style={{ cursor: item.preview_url ? 'pointer' : 'default' }}
                  >
                    {thumbUrl ? (
                      <>
                        <img src={thumbUrl} className="home-portfolio-thumb-img" alt="Thumbnail" />
                        <div className="home-portfolio-play-overlay">
                          <i className="fas fa-play" style={{ fontSize: 10, color: '#ef4444' }}></i> Watch Preview
                        </div>
                      </>
                    ) : (
                      <i className="fas fa-laptop-code" style={{ fontSize: 54, color: 'var(--primary)' }}></i>
                    )}
                    <span className="home-portfolio-episode-tag">{item.episode_tag || '</> Code'}</span>
                  </div>

                  <div className="home-portfolio-info">
                    <div>
                      <h3>{item.title}</h3>
                      <div className="home-portfolio-plans">
                        {planTags.map((p, idx) => (
                          <span key={idx}><i className="fas fa-star"></i> {p.trim()}</span>
                        ))}
                      </div>
                      <div className="home-portfolio-tags">
                        {listTags.map((t, idx) => (
                          <span className="home-portfolio-tag" key={idx}>{t.trim()}</span>
                        ))}
                      </div>
                    </div>

                    <div className="home-portfolio-btns">
                      {item.preview_url ? (
                        <button className="home-btn home-btn-outline" style={{ background: '#ef4444', color: '#fff', border: 0, fontSize: 12 }} onClick={() => openPreview(item.title, item.preview_url)}>
                          <i className="fas fa-eye"></i> Preview
                        </button>
                      ) : (
                        <a href="https://wa.me/923394100600" className="home-btn home-btn-outline" target="_blank" rel="noreferrer" style={{ background: '#ef4444', color: '#fff', border: 0, fontSize: 12 }}>
                          <i className="fas fa-eye"></i> Preview
                        </a>
                      )}
                      <a href={`https://wa.me/923394100600?text=${encodeURIComponent(`Hi, I am interested in your project: ${item.title}`)}`} className="home-btn home-btn-outline" target="_blank" rel="noreferrer" style={{ background: '#10b981', color: '#fff', border: 0, fontSize: 12 }}>
                        <i className="fab fa-whatsapp"></i> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="home-support-sec" id="support">
        <div className="home-container">
          <div className="home-section-header">
            <h2>Direct Developer Support</h2>
            <p>Real humans, real answers — before you buy, while we build, and long after delivery. Any timezone, any day of the week.</p>
          </div>

          <div className="home-support-grid">
            <div className="home-support-card whatsapp">
              <div className="home-support-icon-wrap"><i className="fab fa-whatsapp"></i></div>
              <h3>WhatsApp</h3>
              <p>The fastest way to reach us. Quotes, project questions, bug reports, or plan activation — message anytime.</p>
              <span className="home-support-badge">Avg reply under 2 hours</span>
              <a href="https://wa.me/923394100600" className="home-btn home-btn-success" target="_blank" rel="noreferrer">
                <i className="fab fa-whatsapp"></i> Chat on WhatsApp
              </a>
            </div>

            <div className="home-support-card email">
              <div className="home-support-icon-wrap"><i className="fas fa-envelope"></i></div>
              <h3>Email</h3>
              <p>Prefer writing it all down? Send your requirements, screenshots, or files — you get a detailed reply.</p>
              <span className="home-support-badge">Replies within a few hours</span>
              <a href="mailto:contact@Mr.RahulScripts.com" className="home-btn home-btn-primary" style={{ background: '#dc3545', boxShadow: 'none' }}>
                <i className="fas fa-paper-plane"></i> contact@Mr.RahulScripts.com
              </a>
            </div>

            <div className="home-support-card chat">
              <div className="home-support-icon-wrap"><i className="fas fa-headset"></i></div>
              <h3>Support Chat Desk</h3>
              <p>Open a ticket as a guest and chat with us right on the page — you get a private tracking link.</p>
              <span className="home-support-badge">Tracked until resolved</span>
              <button className="home-btn home-btn-outline" onClick={() => onNavigate('login')}>
                <i className="fas fa-comment-dots"></i> Start Support Chat
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products catalog section */}
      <section className="home-showcase" id="products">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-section-tag">PRODUCTS</span>
            <h2>Dynamic Tools & Templates Catalog</h2>
            <p>Ready to deploy solutions for your automated workflows and sheets integrations.</p>
            <div className="home-section-accent-line"></div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
            </div>
          ) : (
            <div className="home-product-grid">
              {products.map((p) => (
                <div className="home-product-card" key={p.id}>
                  <div className="home-product-header-banner" style={{ background: `linear-gradient(135deg, ${p.colorCode || '#0078D4'} 0%, rgba(0,0,0,0.5) 100%)` }}>
                    <i className="fas fa-box"></i>
                    <span className="home-product-price-tag">{currencySymbol}{p.sellingPrice.toLocaleString()}</span>
                  </div>
                  <div className="home-product-info-wrap">
                    <div>
                      <h3>{p.productName}</h3>
                      <p>{p.description || 'No description provided.'}</p>
                      <ul className="home-product-features-list">
                        <li><i className="fas fa-check"></i> Standard updates included</li>
                        <li><i className="fas fa-check"></i> Full source code access</li>
                        <li><i className="fas fa-check"></i> 6 Months Developer support</li>
                      </ul>
                    </div>
                    <div className="home-product-card-btns">
                      <button className="home-btn home-btn-outline" onClick={() => onNavigate('login')}>
                        <i className="fas fa-download"></i> Buy Now
                      </button>
                      <a href={`https://wa.me/923394100600?text=${encodeURIComponent(`Hi, I want to purchase product: ${p.productName}`)}`} className="home-btn home-btn-success" target="_blank" rel="noreferrer">
                        <i className="fab fa-whatsapp"></i> Buy on WA
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No active products setup.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials section */}
      <section className="home-reviews-sec" id="reviews">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-section-tag">TESTIMONIALS</span>
            <h2>Loved by clients worldwide</h2>
            <p>Here is what our international clients say about our automated workflow deliveries.</p>
          </div>

          <div className="home-testimonials-wrapper">
            {testimonials.map((t, idx) => (
              <div className="home-review-card" key={idx}>
                <div>
                  <div className="stars-row">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                  </div>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    {t.project}
                  </h4>
                  <p className="review-text" style={{ fontSize: 14, color: 'var(--text-main)', marginBottom: 24, lineHeight: 1.6, minHeight: 120 }}>
                    "{t.text}"
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-color)', background: '#0a0202', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{t.name}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      <i className="fas fa-check-circle" style={{ color: 'var(--green-glow)', marginRight: 4 }}></i> Verified client · {t.country}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Licensing explanation */}
      <section className="home-features-sec" id="licensing" style={{ background: '#f8fafc', padding: '60px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="home-container">
          <div className="home-section-header" style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="home-section-tag" style={{ background: 'rgba(0,116,217,0.1)', color: '#0074D9', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>API LICENSING ENGINE</span>
            <h2 style={{ fontSize: 28, color: '#001f3f', marginTop: 12 }}>How Our Software Licensing Works</h2>
            <p style={{ color: '#666', fontSize: 15, marginTop: 8 }}>Deploy your Apps Script automation, Chrome extension or web app with confidence. Authenticate users instantly.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, marginTop: 40 }}>
            <div style={{ background: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,116,217,0.1)', color: '#0074D9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: 24, fontWeight: 800 }}>1</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#001f3f', marginBottom: 10 }}>Choose a Software Plan</h3>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: 0 }}>Purchase any software script or subscribe to our developer membership to activate license configurations.</p>
            </div>

            <div style={{ background: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(40,167,69,0.1)', color: '#28a745', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: 24, fontWeight: 800 }}>2</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#001f3f', marginBottom: 10 }}>Retrieve Your API Key</h3>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: 0 }}>Log in to your Customer Portal to find your unique license key (<code>SMS-XXXX-XXXX</code>). Copy it with one click.</p>
            </div>

            <div style={{ background: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: 24, fontWeight: 800 }}>3</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#001f3f', marginBottom: 10 }}>Unlock & Authenticate</h3>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: 0 }}>Paste the API Key into your software config. Our validation endpoint verifies active status in real-time.</p>
            </div>
          </div>

          {/* Code snippet display */}
          <div style={{ marginTop: 50, background: '#0f172a', padding: 25, borderRadius: 8, border: '1px solid #1e293b', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #334155', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}><i className="fas fa-code"></i> GOOGLE APPS SCRIPT INTEGRATION EXAMPLE</span>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', boxShadow: '20px 0 0 #ffbd2e, 40px 0 0 #27c93f' }}></span>
            </div>
            <pre style={{ margin: 0, color: '#38bdf8', fontFamily: 'Consolas, monospace', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre' }}>{`// Place this function inside your Google Sheets Script to restrict unauthorized usage
function checkUserSubscription() {
  var userLicenseKey = "SMS-XXXX-XXXX-XXXX-XXXX"; // Let user input their key
  var url = "https://your-domain.com/api/validate?key=" + encodeURIComponent(userLicenseKey);
  
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var result = JSON.parse(response.getContentText());
    
    if (result.valid) {
      Logger.log("Authentication successful! Customer: " + result.customer);
      return true; // Grant access
    } else {
      SpreadsheetApp.getUi().alert("License Error: " + result.message);
      return false; // Lock sheets
    }
  } catch (e) {
    Logger.log("Validation server error: " + e.toString());
    return false;
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Membership pricing tables */}
      <section className="home-membership-sec" id="membership">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-section-tag">MEMBERSHIP</span>
            <h2>Select a membership plan to unlock assets</h2>
            <p>Access our popular scripts templates instantly and hire dedicated developer hours.</p>
          </div>

          <div className="home-membership-grid">
            <div className="home-membership-card">
              <div>
                <h3>Basic Developer License</h3>
                <div className="home-membership-price">{currencySymbol}999<span>/mo</span></div>
                <ul className="home-membership-features">
                  <li><i className="fas fa-check"></i> 1 Active Web App / Script License</li>
                  <li><i className="fas fa-check"></i> 500 Daily API verification calls</li>
                  <li><i className="fas fa-check"></i> Auto generated keys in dashboard</li>
                  <li><i className="fas fa-check"></i> Standard Email Support</li>
                </ul>
              </div>
              <button className="home-btn home-btn-outline" style={{ width: '100%', marginTop: 20 }} onClick={() => onNavigate('login')}>Subscribe</button>
            </div>

            <div className="home-membership-card premium">
              <div>
                <h3>Developer Pro License</h3>
                <div className="home-membership-price">{currencySymbol}2,499<span>/mo</span></div>
                <ul className="home-membership-features">
                  <li><i className="fas fa-check"></i> 5 Active Web App / Script Licenses</li>
                  <li><i className="fas fa-check"></i> 5,000 Daily API verification calls</li>
                  <li><i className="fas fa-check"></i> Key regeneration & reset tools</li>
                  <li><i className="fas fa-check"></i> Priority Email Support (under 12h)</li>
                </ul>
              </div>
              <button className="home-btn home-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => onNavigate('login')}>Subscribe Now</button>
            </div>

            <div className="home-membership-card">
              <div>
                <h3>Enterprise License</h3>
                <div className="home-membership-price">{currencySymbol}4,999<span>/mo</span></div>
                <ul className="home-membership-features">
                  <li><i className="fas fa-check"></i> Unlimited Web App / Script Licenses</li>
                  <li><i className="fas fa-check"></i> Unlimited API verification calls</li>
                  <li><i className="fas fa-check"></i> Multi-user client management portal</li>
                  <li><i className="fas fa-check"></i> Dedicated WhatsApp hotline support</li>
                </ul>
              </div>
              <button className="home-btn home-btn-outline" style={{ width: '100%', marginTop: 20 }} onClick={() => onNavigate('login')}>Subscribe</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ list */}
      <section className="home-faq-sec">
        <div className="home-container">
          <div className="home-section-header">
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="home-faq-list">
            <div className="home-faq-item">
              <h3><i className="fas fa-question-circle"></i> How do I get the download links?</h3>
              <p>Once you purchase or subscribe to any membership plan, your assets links will appear directly inside your Customer Portal dashboard immediately.</p>
            </div>
            <div className="home-faq-item">
              <h3><i className="fas fa-question-circle"></i> What payment methods do you accept?</h3>
              <p>We support all major payment providers including UPI (Razorpay), Credit cards (Stripe), Cash payments, Bank Transfers and PayPal checkout.</p>
            </div>
            <div className="home-faq-item">
              <h3><i className="fas fa-question-circle"></i> Can you customize the sheets code for my business?</h3>
              <p>Yes, we offer custom development hours! Click the WhatsApp support button to describe your workflow requirement and get a fast quote.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer list */}
      <footer className="home-site-footer">
        <div className="home-container home-footer-grid">
          <div className="home-footer-brand">
            <h3>Mr.Rahul Scripts</h3>
            <p>Providing professional developer tools, custom Google Apps Script automations, spreadsheet integrations and dashboard templates since 2022.</p>
          </div>

          <div className="home-footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#portfolio">YouTube Portfolio</a></li>
              <li><a href="#products">Scripts Shop</a></li>
              <li><a href="#membership">Membership Pricing</a></li>
            </ul>
          </div>

          <div className="home-footer-col">
            <h4>Support Hub</h4>
            <ul>
              <li><a href="https://wa.me/923394100600" target="_blank" rel="noreferrer">WhatsApp Chat</a></li>
              <li><a href="mailto:contact@Mr.RahulScripts.com">Email Support</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login') }}>Tickets Help Desk</a></li>
            </ul>
          </div>

          <div className="home-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Refund Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="home-container home-footer-bottom">
          <p className="copyright">© {new Date().getFullYear()} Mr.Rahul Scripts. All rights reserved.</p>
        </div>
      </footer>

      {/* Floating WhatsApp Widget */}
      <div className="floating-whatsapp">
        <a href="https://wa.me/923394100600" className="floating-whatsapp-btn" target="_blank" rel="noreferrer">
          <i className="fab fa-whatsapp"></i>
        </a>
      </div>

      {/* YouTube Preview Video Modal Popup */}
      {previewVideo && (
        <div className="modal-overlay active" style={{ zIndex: 10000000 }} onClick={() => setPreviewVideo(null)}>
          <div className="modal-container" style={{ maxWidth: 800, background: '#000', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'var(--bg-dark)', color: '#fff' }}>
              <h4 style={{ margin: 0, fontSize: 14 }}>{previewVideo.title}</h4>
              <button className="icon-button" style={{ color: '#fff' }} onClick={() => setPreviewVideo(null)}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                title="Preview"
                src={previewVideo.embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
