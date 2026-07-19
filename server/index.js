import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import { getAllArticles, getArticles } from './articles.js'
const app = express(); app.use(cors()); app.use(express.json())
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const clean = value => String(value || '').trim()
const serializeComment = comment => ({ id: comment.id, articleId: comment.external_id, name: comment.author_name, body: comment.body, createdAt: comment.created_at })
app.get('/api/articles', async (req,res) => { try { res.json(await getArticles(Number(req.query.page)||1, req.query.category||'all')) } catch { res.status(502).json({ error:'Unable to retrieve the latest news.' }) } })
app.get('/api/articles/:id', async (req,res) => { try { const articles = await getAllArticles(); const article = articles.find(a => a.id === req.params.id); article ? res.json(article) : res.status(404).json({ error:'Article not found' }) } catch { res.status(502).json({ error:'Unable to retrieve the article.' }) } })
app.get('/api/articles/:id/comments', async (req,res) => { try { const { rows } = await pool.query('SELECT id, external_id, author_name, body, created_at FROM article_comments WHERE external_id = $1 ORDER BY created_at DESC', [req.params.id]); res.json(rows.map(serializeComment)) } catch { res.status(503).json({ error:'Unable to load comments right now.' }) } })
app.post('/api/articles/:id/comments', async (req,res) => { try { const name = clean(req.body.name).slice(0, 80) || 'Anonymous reader'; const body = clean(req.body.body); if (body.length < 2) return res.status(400).json({ error:'Please enter a comment before posting.' }); if (body.length > 1000) return res.status(400).json({ error:'Comments must be 1,000 characters or fewer.' }); const { rows } = await pool.query('INSERT INTO article_comments (external_id, author_name, body) VALUES ($1,$2,$3) RETURNING id, external_id, author_name, body, created_at', [req.params.id, name, body]); res.status(201).json(serializeComment(rows[0])) } catch { res.status(503).json({ error:'Unable to post your comment right now.' }) } })
app.post('/api/articles/:id/save', async (req,res) => { try { await pool.query('INSERT INTO saved_articles (external_id, title) VALUES ($1,$2) ON CONFLICT (external_id) DO NOTHING',[req.params.id, req.body.title || 'Untitled']); res.status(201).json({ saved:true }) } catch { res.status(503).json({ error:'Database unavailable' }) } })
app.listen(process.env.PORT || 4000, () => console.log('API listening on 4000'))
