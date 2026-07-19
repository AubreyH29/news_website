import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import './styles.css'

const cats = ['all', 'world', 'business', 'technology', 'science', 'culture', 'sports']
const pretty = value => value === 'all' ? 'All stories' : value[0].toUpperCase() + value.slice(1)
const age = date => {
  const hours = Math.max(1, Math.round((Date.now() - new Date(date)) / 36e5))
  return hours < 24 ? `${hours}h ago` : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const commentDate = date => new Date(date).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

const youtubePreview = url => {
  const id = url?.match(/[?&]v=([^&]+)/i)?.[1]
    || url?.match(/youtu\.be\/([^?&/]+)/i)?.[1]
    || url?.match(/youtube\.com\/shorts\/([^?&/]+)/i)?.[1]
    || url?.match(/youtube\.com\/embed\/([^?&/]+)/i)?.[1]
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
}

const previewFor = article => article.image || (article.video?.provider === 'youtube' ? youtubePreview(article.video.url) : '')

function SourceLogo({ article }) {
  const [showLogo, setShowLogo] = useState(Boolean(article.sourceLogo))
  return (
    <span className="source">
      {showLogo && (
        <img
          className="source-logo"
          src={article.sourceLogo}
          alt={`${article.source} logo`}
          onError={() => setShowLogo(false)}
        />
      )}
      <span className={showLogo ? 'source-name visually-hidden' : 'source-name'}>{article.source}</span>
    </span>
  )
}

function Header() {
  return (
    <>
      <header>
        <Link className="wordmark" to="/">THE DAILY<br /><i>LEDGER</i></Link>
        <nav>
          <NavLink to="/feed">Latest</NavLink>
          <a href="#edition">The Edition</a>
          <a href="#about">About</a>
        </nav>
        <div className="header-actions">
          <span className="search">⌕</span>
          <Link className="subscribe" to="/feed">Read the news <b>→</b></Link>
        </div>
      </header>
      <div className="rule" />
    </>
  )
}

function VideoBadge({ video }) {
  return video && <span className="video-badge"><b>▶</b> Video</span>
}

function Media({ article, feature = false }) {
  const preview = previewFor(article)
  const [hasImage, setHasImage] = useState(Boolean(preview))

  if (article.video?.type === 'direct') {
    return (
      <div className="image-wrap video-wrap">
        <video src={article.video.url} poster={preview} muted autoPlay loop playsInline controls={!feature} />
        <span className="category">{article.category}</span>
        <VideoBadge video={article.video} />
      </div>
    )
  }

  if (hasImage) {
    return (
      <div className="image-wrap">
        <img src={preview} alt="" onError={() => setHasImage(false)} />
        <span className="category">{article.category}</span>
        <VideoBadge video={article.video} />
        {article.video?.type === 'external' && <span className="play-button">▶</span>}
      </div>
    )
  }

  return article.video?.type === 'external' && (
    <div className="image-wrap no-image">
      <span className="category">{article.category}</span>
      <VideoBadge video={article.video} />
      <span className="play-button">▶</span>
    </div>
  )
}

function Card({ article, feature = false, size = '' }) {
  const isExternalVideo = article.video?.type === 'external'

  const content = (
    <>
      <Media article={article} feature={feature} />
      <div className="card-copy">
        <p className="meta"><SourceLogo article={article} /> <em>·</em> {age(article.publishedAt)}</p>
        <h2>{article.title}</h2>
        <p className="dek">{article.description}</p>
        <span className="read">{article.video ? 'Watch story' : 'Read story'} <b>→</b></span>
      </div>
    </>
  )

  return (
    <article className={`card ${feature ? 'feature' : ''} ${size}`.trim()}>
      {isExternalVideo
        ? <a href={article.url} target="_blank" rel="noreferrer">{content}</a>
        : <Link to={`/article/${article.id}`}>{content}</Link>}
    </article>
  )
}

function useArticles(category = 'all') {
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetch(`/api/articles?category=${category}`)
      .then(response => response.json())
      .then(data => setArticles(data))
      .finally(() => setLoading(false))
  }, [category])

  const more = () => {
    if (loading) return
    setLoading(true)
    const next = page + 1
    fetch(`/api/articles?page=${next}&category=${category}`)
      .then(response => response.json())
      .then(data => {
        setArticles(existing => [...existing, ...data])
        setPage(next)
      })
      .finally(() => setLoading(false))
  }

  return { articles, loading, more }
}

function Landing() {
  const { articles, loading } = useArticles()
  if (loading) return <main className="loading">Loading today's edition…</main>

  const [lead, ...rest] = articles
  const videos = articles.filter(article => article.video).slice(0, 2)

  return (
    <>
      <main>
        <section className="edition">
          <p>Friday, July 17, 2026 <span>•</span> Independent reporting for a changing world</p>
          <h1>The stories<br />that <i>shape</i> us.</h1>
          <Link to="/feed" className="text-link">Explore today's edition <b>→</b></Link>
        </section>

        <section className="lead-grid">
          <Card article={lead} feature />
          <aside className="briefing">
            <p className="eyebrow">THE MORNING BRIEFING</p>
            <h2>The world, in<br /><i>clearer focus.</i></h2>
            <p>Essential reporting and compelling ideas, selected for the curious reader.</p>
            <Link to="/feed" className="text-link">Start reading <b>→</b></Link>
            <div className="issue">No. 07 <span>—</span> 2026</div>
          </aside>
        </section>

        {videos.length > 0 && (
          <section className="video-rail">
            <div>
              <p className="eyebrow">WATCH THE FEED</p>
              <h2>Video from trusted newsrooms and social desks</h2>
              <p>Muted autoplay is used for direct video feeds. External video items open the source for viewing.</p>
            </div>
            <div className="video-list">{videos.map(article => <Card key={article.id} article={article} />)}</div>
          </section>
        )}

        <section className="section-title">
          <div>
            <p className="eyebrow">FROM THE NEWSROOM</p>
            <h2>What we're following</h2>
          </div>
          <Link to="/feed" className="text-link">View all stories <b>→</b></Link>
        </section>

        <section className="grid">
          {rest.slice(0, 3).map(article => <Card key={article.id} article={article} />)}
        </section>
      </main>
      <Footer />
    </>
  )
}

function Feed() {
  const [category, setCategory] = useState('all')
  const { articles, loading, more } = useArticles(category)
  const sentinel = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && articles.length) more()
    }, { rootMargin: '300px' })

    if (sentinel.current) observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [articles])

  const columns = [[], [], []]
  articles.forEach((article, index) => columns[index % 3].push({ article, index }))

  return (
    <main className="feed">
      <div className="feed-title">
        <p className="eyebrow">THE DAILY LEDGER</p>
        <h1>Latest stories</h1>
        <p>A living index of the ideas and events shaping our day.</p>
      </div>

      <div className="filters">
        {cats.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={category === cat ? 'active' : ''}
          >
            {pretty(cat)}
          </button>
        ))}
      </div>

      <section className="feed-grid">
        {columns.map((column, columnIndex) => (
          <div className="feed-column" key={columnIndex}>
            {column.map(({ article, index }) => (
              <Card key={article.id} article={article} size={`feed-card feed-card--${index % 5}`} />
            ))}
          </div>
        ))}
      </section>

      <div ref={sentinel} className="load">
        {loading ? 'Gathering more stories…' : articles.length ? 'Keep scrolling for more' : "You're all caught up."}
      </div>
    </main>
  )
}

function Comments({ articleId }) {
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [liking, setLiking] = useState({})

  useEffect(() => {
    setLoading(true)
    setStatus('')
    setLiking({})
    fetch(`/api/articles/${articleId}/comments`)
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data.map(comment => ({ ...comment, likes: Number(comment.likes) || 0 })))
      })
      .catch(() => setStatus('Comments are unavailable right now.'))
      .finally(() => setLoading(false))
  }, [articleId])

  const submit = event => {
    event.preventDefault()
    if (posting) return

    setPosting(true)
    setStatus('')

    fetch(`/api/articles/${articleId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body })
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to post your comment.')
        setComments(existing => [{ ...data, likes: Number(data.likes) || 0 }, ...existing])
        setBody('')
        setStatus('Thanks for adding your perspective.')
      })
      .catch(error => setStatus(error.message))
      .finally(() => setPosting(false))
  }

  const likeComment = id => {
    if (liking[id]) return

    setLiking(existing => ({ ...existing, [id]: true }))
    setStatus('')

    fetch(`/api/articles/${articleId}/comments/${id}/like`, { method: 'POST' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to like this comment.')
        setComments(existing => existing.map(comment => comment.id === id ? { ...comment, likes: Number(data.likes) || 0 } : comment))
      })
      .catch(error => setStatus(error.message))
      .finally(() => setLiking(existing => {
        const next = { ...existing }
        delete next[id]
        return next
      }))
  }

  return (
    <section className="comments">
      <div className="comments-heading">
        <p className="eyebrow">Reader discussion</p>
        <h2>Join the conversation</h2>
        <p>No account required. Share your thoughts with other Daily Ledger readers.</p>
      </div>

      <form className="comment-form" onSubmit={submit}>
        <label>
          Your name <span>(optional)</span>
          <input value={name} onChange={event => setName(event.target.value)} maxLength="80" placeholder="Anonymous reader" />
        </label>
        <label>
          Comment
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            maxLength="1000"
            placeholder="What stood out to you?"
            required
          />
        </label>
        <div className="comment-actions">
          <span>{body.length}/1000</span>
          <button disabled={posting}>{posting ? 'Posting…' : 'Post comment'}</button>
        </div>
        {status && <p className="comment-status">{status}</p>}
      </form>

      <div className="comment-list">
        {loading ? (
          <p className="empty-comments">Loading comments…</p>
        ) : comments.length ? (
          comments.map(comment => (
            <article className="comment" key={comment.id}>
              <div className="comment-head">
                <strong>{comment.name}</strong>
                <time>{commentDate(comment.createdAt)}</time>
              </div>
              <p>{comment.body}</p>
              <div className="comment-feedback">
                <button
                  type="button"
                  className="like-button"
                  disabled={Boolean(liking[comment.id])}
                  onClick={() => likeComment(comment.id)}
                >
                  {liking[comment.id] ? 'Liking…' : 'Like'}
                </button>
                <span>{Number(comment.likes) || 0} {(Number(comment.likes) || 0) === 1 ? 'like' : 'likes'}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-comments">Be the first reader to comment on this story.</p>
        )}
      </div>
    </section>
  )
}

function Article() {
  const { id } = useParams()
  const [article, setArticle] = useState()
  const [hasImage, setHasImage] = useState(true)

  useEffect(() => {
    setArticle(undefined)
    setHasImage(true)
    fetch(`/api/articles/${id}`).then(response => response.json()).then(setArticle)
  }, [id])

  if (!article) return <main className="loading">Opening story…</main>

  const preview = previewFor(article)

  return (
    <main className="article">
      <Link to="/feed" className="back">← Back to latest stories</Link>
      <p className="eyebrow accent">{article.category}</p>
      <h1>{article.title}</h1>
      <p className="standfirst">{article.description}</p>
      <div className="byline">
        <span>By {article.source}</span>
        <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <span>· {age(article.publishedAt)}</span>
      </div>

      {article.video?.type === 'direct' ? (
        <video className="hero" src={article.video.url} poster={preview} muted autoPlay playsInline controls />
      ) : hasImage && preview ? (
        <div className="article-media">
          <img className="hero" src={preview} alt="" onError={() => setHasImage(false)} />
          {article.video && <span className="play-button">▶</span>}
        </div>
      ) : null}

      <div className="story">
        <p>{article.content}</p>
        <p>
          Thoughtful reporting starts with a closer look. The Daily Ledger gathers the essential context around the world's most
          important conversations, then gives readers a clear path to the original journalism.
        </p>
        <a href={article.url} target="_blank" rel="noreferrer" className="source-link">{article.video ? 'Watch at the original source' : 'Read the original report'} <b>↗</b></a>
      </div>

      <Comments articleId={id} />
    </main>
  )
}

function Footer() {
  return (
    <footer>
      <span className="wordmark">THE DAILY<br /><i>LEDGER</i></span>
      <p>Thoughtful journalism for the curious citizen.</p>
      <span>© 2026 The Daily Ledger</span>
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/article/:id" element={<Article />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
