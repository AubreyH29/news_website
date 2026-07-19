import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import { getAllArticles, getArticles } from './articles.js'
const app = express(); app.use(cors()); app.use(express.json())
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const clean = value => String(value || '').trim()
const serializeComment = comment => ({ id: comment.id, articleId: comment.external_id, name: comment.author_name, body: comment.body, likes: Number(comment.likes_count) || 0, createdAt: comment.created_at })

async function ensureDatabaseSchema() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS article_comments (
			id SERIAL PRIMARY KEY,
			external_id TEXT NOT NULL,
			author_name TEXT NOT NULL DEFAULT 'Anonymous reader',
			body TEXT NOT NULL,
			likes_count INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)

	await pool.query('ALTER TABLE article_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0')

	await pool.query(`
		CREATE INDEX IF NOT EXISTS article_comments_external_id_created_at_idx
			ON article_comments (external_id, created_at DESC)
	`)
}
app.get('/api/articles', async (req,res) => { try { res.json(await getArticles(Number(req.query.page)||1, req.query.category||'all')) } catch { res.status(502).json({ error:'Unable to retrieve the latest news.' }) } })
app.get('/api/articles/:id', async (req,res) => { try { const articles = await getAllArticles(); const article = articles.find(a => a.id === req.params.id); article ? res.json(article) : res.status(404).json({ error:'Article not found' }) } catch { res.status(502).json({ error:'Unable to retrieve the article.' }) } })
app.get('/api/articles/:id/comments', async (req,res) => { try { const { rows } = await pool.query('SELECT id, external_id, author_name, body, likes_count, created_at FROM article_comments WHERE external_id = $1 ORDER BY created_at DESC', [req.params.id]); res.json(rows.map(serializeComment)) } catch { res.status(503).json({ error:'Unable to load comments right now.' }) } })
app.post('/api/articles/:id/comments', async (req,res) => { try { const name = clean(req.body.name).slice(0, 80) || 'Anonymous reader'; const body = clean(req.body.body); if (body.length < 2) return res.status(400).json({ error:'Please enter a comment before posting.' }); if (body.length > 1000) return res.status(400).json({ error:'Comments must be 1,000 characters or fewer.' }); const { rows } = await pool.query('INSERT INTO article_comments (external_id, author_name, body) VALUES ($1,$2,$3) RETURNING id, external_id, author_name, body, likes_count, created_at', [req.params.id, name, body]); res.status(201).json(serializeComment(rows[0])) } catch { res.status(503).json({ error:'Unable to post your comment right now.' }) } })
app.post('/api/articles/:articleId/comments/:commentId/like', async (req,res) => { try { const commentId = Number(req.params.commentId); if (!Number.isInteger(commentId) || commentId < 1) return res.status(400).json({ error:'Invalid comment id.' }); const { rows } = await pool.query('UPDATE article_comments SET likes_count = likes_count + 1 WHERE id = $1 AND external_id = $2 RETURNING id, external_id, author_name, body, likes_count, created_at', [commentId, req.params.articleId]); if (!rows.length) return res.status(404).json({ error:'Comment not found.' }); res.json(serializeComment(rows[0])) } catch { res.status(503).json({ error:'Unable to like this comment right now.' }) } })
app.post('/api/articles/:id/save', async (req,res) => { try { await pool.query('INSERT INTO saved_articles (external_id, title) VALUES ($1,$2) ON CONFLICT (external_id) DO NOTHING',[req.params.id, req.body.title || 'Untitled']); res.status(201).json({ saved:true }) } catch { res.status(503).json({ error:'Database unavailable' }) } })
ensureDatabaseSchema()
	.then(() => {
		app.listen(process.env.PORT || 4000, () => console.log('API listening on 4000'))
	})
	.catch(error => {
		console.error('Failed to initialize database schema', error)
		process.exit(1)
	})
