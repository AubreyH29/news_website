const FEEDS = [
  { name: 'BBC News', category: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', logoDomain: 'bbc.com' },
  { name: 'BBC News', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', logoDomain: 'bbc.com' },
  { name: 'NPR', category: 'world', url: 'https://feeds.npr.org/1001/rss.xml', logoDomain: 'npr.org' },
  { name: 'NPR', category: 'science', url: 'https://feeds.npr.org/1007/rss.xml', logoDomain: 'npr.org' },
  { name: 'The Guardian', category: 'culture', url: 'https://www.theguardian.com/culture/rss', logoDomain: 'theguardian.com' },
  { name: 'ESPN', category: 'sports', url: 'https://www.espn.com/espn/rss/news', logoDomain: 'espn.com' }
]

const SOURCE_LOGO_DOMAINS = {
  'BBC News': 'bbc.com',
  'NPR': 'npr.org',
  'The Guardian': 'theguardian.com',
  'ESPN': 'espn.com',
  'Reuters': 'reuters.com',
  'Reuters Press Team': 'reuters.com',
  'Associated Press': 'apnews.com'
}

const X_VIDEO_FEED_SOURCES = [
  { name: 'Reuters', category: 'world', handle: 'Reuters' },
  { name: 'BBC News', category: 'world', handle: 'BBCWorld' },
  { name: 'NPR', category: 'culture', handle: 'NPR' },
  { name: 'Associated Press', category: 'world', handle: 'AP' }
]

const X_FEED_BASE_URLS = (process.env.X_FEED_BASE_URLS || 'https://rsshub.app/twitter/user').split(',').map(value => value.trim()).filter(Boolean)
const VIDEO_FEEDS = [
  { name: 'Reuters', category: 'world', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChqUTb7kYRX8-EiaN3XFrSQ' },
  { name: 'BBC News', category: 'world', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC16niRr50-MSBwiO3YDb3RA' },
  { name: 'Associated Press', category: 'world', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC52X5wxOL_s5yw0dQk7NtgA' }
]

const FALLBACK_VIDEO_POSTS = [
  { source: 'Reuters', category: 'world', title: 'Reuters World News video dispatch', description: 'A current Reuters video report available on the source video page.', url: 'https://www.youtube.com/watch?v=Z4Fpi28fj4Y', thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80', provider: 'youtube' },
  { source: 'BBC News', category: 'world', title: 'BBC One-minute World News', description: 'A BBC News video briefing available on the source video page.', url: 'https://www.youtube.com/watch?v=9d9R8kUGpSA', thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80', provider: 'youtube' },
  { source: 'Reuters Press Team', category: 'business', title: 'Reuters statement on X', description: 'A Reuters post opened directly on X for source playback and context.', url: 'https://x.com/ReutersPR/status/2078155755761394022', thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', provider: 'x' }
]

let cache = { articles: [], expiresAt: 0 }

const decode = value => value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const text = value => decode(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const tag = (item, name) => { const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i')); return match?.[1] || '' }
const atomLink = item => item.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i)?.[1] || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || ''
const attr = (value, name) => value.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] || ''
const mediaNodes = item => [...item.matchAll(/<(media:content|media:thumbnail|enclosure)[^>]+>/gi)].map(match => match[0])
const image = item => mediaNodes(item).find(node => !/^video\//i.test(attr(node, 'type')) && attr(node, 'url'))?.match(/(?:url|href)=["']([^"']+)["']/i)?.[1] || item.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || ''
const video = item => {
  const node = mediaNodes(item).find(node => /^video\//i.test(attr(node, 'type')) || /\.(mp4|m3u8|mov)(\?|$)/i.test(attr(node, 'url')))
  if (!node) return null
  return { type: 'direct', url: attr(node, 'url'), contentType: attr(node, 'type') || 'video/mp4' }
}
const youtubeThumbnail = url => {
  const id = url.match(/[?&]v=([^&]+)/i)?.[1]
    || url.match(/youtu\.be\/([^?&/]+)/i)?.[1]
    || url.match(/youtube\.com\/shorts\/([^?&/]+)/i)?.[1]
    || url.match(/youtube\.com\/embed\/([^?&/]+)/i)?.[1]
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
}
const idFor = url => Buffer.from(url).toString('base64url')
const domainFor = url => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }
const logoFor = domain => domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : ''
const sourceLogoFor = (source, url = '') => logoFor(SOURCE_LOGO_DOMAINS[source] || domainFor(url))
const canonicalXPostUrl = url => url.replace('twitter.com/', 'x.com/').replace(/\?.*$/, '')
const isXPostUrl = url => /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/\d+/i.test(url)
const isYouTubeUrl = url => /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url)
const xPostId = url => canonicalXPostUrl(url).match(/status\/(\d+)/i)?.[1] || ''
const xPreviewCache = new Map()
const looksLikeImageUrl = url => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url || '') || /ytimg\.com|twimg\.com|unsplash\.com/i.test(url || '')

async function xPreviewImage(url) {
  const id = xPostId(url)
  if (!id) return ''
  if (xPreviewCache.has(id)) return xPreviewCache.get(id)

  try {
    const response = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=1`, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'TheDailyLedger/1.0 (+local news reader)' }
    })
    if (!response.ok) {
      xPreviewCache.set(id, '')
      return ''
    }

    const json = await response.json()
    const media = json.mediaDetails?.find(item => /video|animated_gif|photo/i.test(item.type || '')) || json.mediaDetails?.[0]
    const preview = media?.media_url_https || media?.media_url || ''
    xPreviewCache.set(id, preview)
    return preview
  } catch {
    xPreviewCache.set(id, '')
    return ''
  }
}

function inferredExternalVideo(url) {
  if (isYouTubeUrl(url)) return { type: 'external', provider: 'youtube', url }
  if (isXPostUrl(url)) return { type: 'external', provider: 'x', url: canonicalXPostUrl(url) }
  return null
}

async function enrichArticleMedia(article) {
  const inferred = article.video || inferredExternalVideo(article.url)
  if (!inferred) return article

  const hasValidImage = looksLikeImageUrl(article.image)
  let imageUrl = hasValidImage ? article.image : ''
  if (!imageUrl && inferred.provider === 'youtube') imageUrl = youtubeThumbnail(inferred.url)
  if (!imageUrl && inferred.provider === 'x') imageUrl = await xPreviewImage(inferred.url)

  return {
    ...article,
    sourceLogo: article.sourceLogo || sourceLogoFor(article.source, article.url),
    image: imageUrl,
    video: {
      ...inferred,
      url: inferred.provider === 'x' ? canonicalXPostUrl(inferred.url) : inferred.url
    }
  }
}

export function classify(value = '') {
  const textValue = value.toLowerCase()
  if (/tech|ai |software|digital|internet|cyber/.test(textValue)) return 'technology'
  if (/market|business|economy|company|finance|trade/.test(textValue)) return 'business'
  if (/sport|football|tennis|game|match|olympic/.test(textValue)) return 'sports'
  if (/science|health|climate|space|research|environment/.test(textValue)) return 'science'
  if (/film|music|art|book|culture|theatre/.test(textValue)) return 'culture'
  return 'world'
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'TheDailyLedger/1.0 (+local news reader)' } })
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match => {
    const item = match[1]
    const url = text(tag(item, 'link'))
    const title = text(tag(item, 'title'))
    const description = text(tag(item, 'description'))
    const publishedAt = new Date(text(tag(item, 'pubDate')) || Date.now()).toISOString()
    const mediaVideo = video(item)
    return {
      id: idFor(url),
      title,
      description: description || 'Read the latest reporting from this source.',
      source: feed.name,
      sourceLogo: sourceLogoFor(feed.name, feed.url),
      category: classify(`${feed.category} ${title} ${description}`),
      image: image(item),
      video: mediaVideo,
      publishedAt,
      content: description || 'Continue reading at the original publisher.',
      url
    }
  }).filter(article => article.url && article.title)
}

async function fetchNewsApi() {
  if (!process.env.NEWS_API_KEY) return []
  const response = await fetch(`https://newsapi.org/v2/top-headlines?language=en&pageSize=100&apiKey=${process.env.NEWS_API_KEY}`, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) return []
  const json = await response.json()
  return json.articles.filter(article => article.title && article.url).map(article => ({
    id: idFor(article.url),
    title: article.title,
    description: article.description || 'Read the latest reporting from this source.',
    source: article.source?.name || 'News desk',
    sourceLogo: sourceLogoFor(article.source?.name || 'News desk', article.url),
    image: article.urlToImage || '',
    video: null,
    publishedAt: article.publishedAt,
    content: article.content || article.description || 'Continue reading at the original publisher.',
    url: article.url,
    category: classify(`${article.title} ${article.description}`)
  }))
}

async function fetchVideoFeed(feed) {
  const response = await fetch(feed.url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'TheDailyLedger/1.0 (+local news reader)' } })
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(match => {
    const item = match[1]
    const url = text(atomLink(item))
    const title = text(tag(item, 'title'))
    const description = text(tag(item, 'media:description')) || text(tag(item, 'summary')) || 'Watch this video from the source.'
    const thumbnail = image(item) || youtubeThumbnail(url)
    return {
      id: idFor(url),
      title,
      description,
      source: feed.name,
      sourceLogo: sourceLogoFor(feed.name, url),
      category: classify(`${feed.category} ${title} ${description}`),
      image: thumbnail,
      video: { type: 'external', provider: 'youtube', url },
      publishedAt: new Date(text(tag(item, 'published')) || Date.now()).toISOString(),
      content: `${description} Playback opens on the original video page.`,
      url
    }
  }).filter(article => article.url && article.title)
}

async function fetchXVideoFeed(source) {
  for (const baseUrl of X_FEED_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${source.handle}`, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'TheDailyLedger/1.0 (+local news reader)' } })
      if (!response.ok) continue
      const xml = await response.text()
      const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
      return items.map(match => {
        const item = match[1]
        const url = canonicalXPostUrl(text(tag(item, 'link')))
        const title = text(tag(item, 'title')) || `${source.name} video on X`
        const description = text(tag(item, 'description')) || 'Watch this video post from the source on X.'
        const thumbnail = image(item)
        const hasVideoCue = /video|pic\.x\.com|pic\.twitter\.com/i.test(item)
        return {
          id: idFor(url),
          title,
          description,
          source: source.name,
          sourceLogo: sourceLogoFor(source.name, url),
          category: source.category,
          image: thumbnail,
          video: { type: 'external', provider: 'x', url },
          publishedAt: new Date(text(tag(item, 'pubDate')) || Date.now()).toISOString(),
          content: `${description} Playback opens on the original X post.`,
          url,
          hasVideoCue
        }
      }).filter(article => isXPostUrl(article.url) && article.hasVideoCue).map(({ hasVideoCue, ...article }) => article)
    } catch {
      continue
    }
  }
  return []
}

async function getSocialVideos() {
  const xResults = await Promise.allSettled(X_VIDEO_FEED_SOURCES.map(fetchXVideoFeed))
  const videoResults = await Promise.allSettled(VIDEO_FEEDS.map(fetchVideoFeed))
  const videos = [...xResults, ...videoResults].flatMap(result => result.status === 'fulfilled' ? result.value : []).slice(0, 12)
  if (videos.length) return videos
  return FALLBACK_VIDEO_POSTS.map((item, index) => ({
    id: idFor(item.url),
    title: item.title,
    description: item.description,
    source: item.source,
    sourceLogo: sourceLogoFor(item.source, item.url),
    category: item.category,
    image: item.thumbnail || (item.provider === 'youtube' ? youtubeThumbnail(item.url) : ''),
    video: { type: 'external', provider: item.provider, url: item.url },
    publishedAt: new Date(Date.now() - (index + 1) * 15 * 60 * 1000).toISOString(),
    content: `${item.description} Playback opens on the original post or video page.`,
    url: item.url
  }))
}

export async function getAllArticles() {
  if (cache.expiresAt > Date.now()) return cache.articles
  const results = await Promise.allSettled(FEEDS.map(fetchFeed))
  const feedArticles = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  const rawArticles = [...await getSocialVideos(), ...feedArticles, ...await fetchNewsApi()]
  const withMedia = await Promise.all(rawArticles.map(enrichArticleMedia))
  const articles = withMedia
    .filter((article, index, source) => source.findIndex(other => other.url === article.url) === index)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  if (!articles.length) throw new Error('All configured news sources are unavailable')
  cache = { articles, expiresAt: Date.now() + 10 * 60 * 1000 }
  return articles
}

export async function getArticles(page = 1, category = 'all') {
  const articles = await getAllArticles()
  return articles
    .filter(article => category === 'all' || article.category === category)
    .sort((a, b) => Number(Boolean(b.image || b.video)) - Number(Boolean(a.image || a.video)) || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice((page - 1) * 6, page * 6)
}
