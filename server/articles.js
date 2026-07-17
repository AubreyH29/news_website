const images = [
  'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=85'
]
export const fallbackArticles = [
  ['world','A new map of the world’s shifting alliances','Leaders are redrawing the lines of cooperation as a consequential season begins.','Global Desk'],
  ['science','The quiet revolution happening beneath the city','Researchers find new ways to make urban life cleaner, greener and more resilient.','Science & Health'],
  ['culture','In a small theater, a big idea takes the stage','A community of makers is rewriting the rules of who gets to tell a story.','Arts Review'],
  ['technology','What comes after the screen?','Designers are building more human ways to live with our devices.','Future Society'],
  ['business','The patient work of rebuilding a local economy','A town’s entrepreneurs discover that growth begins with trust.','Business'],
  ['sports','The game that brought a city together','Inside the final hours before a historic championship match.','Sports'],
  ['world','A conversation across an ocean','Two families separated by distance find a shared language.','Global Desk'],
  ['science','A field guide to the insects in your backyard','The overlooked creatures that keep our neighborhoods humming.','Science & Health'],
  ['culture','The albums that made the summer feel endless','A critic’s notes on the songs, sounds and surprises of the season.','Arts Review'],
  ['technology','The engineers making energy feel invisible','A new generation of grids promises power when and where it is needed.','Future Society'],
  ['business','Why the corner shop still matters','Independent retailers show the long view can be good business.','Business'],
  ['sports','A runner finds room to breathe','On the road to a personal best, the small moments make all the difference.','Sports']
].map(([category,title,description,source], i) => ({ id: `ledger-${i+1}`, category, title, description, source, image: images[i % images.length], publishedAt: new Date(Date.now()-i*3600000*3).toISOString(), content: `${description} This is a placeholder full article for The Daily Ledger’s local edition. In production, this space is populated from the original publisher’s available summary and directs readers to its source for complete reporting.`, url: '#' }))
export function classify(text='') { const value = text.toLowerCase(); if (/tech|ai |software|digital|internet/.test(value)) return 'technology'; if (/market|business|economy|company|finance/.test(value)) return 'business'; if (/sport|football|tennis|game|match/.test(value)) return 'sports'; if (/science|health|climate|space|research/.test(value)) return 'science'; if (/film|music|art|book|culture/.test(value)) return 'culture'; return 'world' }
export async function getArticles(page = 1, category = 'all') {
  if (!process.env.NEWS_API_KEY) return fallbackArticles.filter(a => category === 'all' || a.category === category).slice((page-1)*6, page*6)
  const response = await fetch(`https://newsapi.org/v2/top-headlines?language=en&pageSize=100&apiKey=${process.env.NEWS_API_KEY}`)
  if (!response.ok) throw new Error('News service unavailable')
  const json = await response.json()
  return json.articles.filter(a => a.title && a.urlToImage).map((a, i) => ({ id: Buffer.from(a.url).toString('base64url'), title:a.title, description:a.description || 'Read the latest reporting from this source.', source:a.source?.name || 'News desk', image:a.urlToImage, publishedAt:a.publishedAt, content:a.content || a.description, url:a.url, category:classify(`${a.title} ${a.description}`) })).filter(a => category === 'all' || a.category === category).slice((page-1)*6, page*6)
}
