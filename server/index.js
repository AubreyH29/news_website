import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import { getAllArticles, getArticles } from './articles.js'
const app = express(); app.use(cors()); app.use(express.json())
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
app.get('/api/articles', async (req,res) => { try { res.json(await getArticles(Number(req.query.page)||1, req.query.category||'all')) } catch { res.status(502).json({ error:'Unable to retrieve the latest news.' }) } })
app.get('/api/articles/:id', async (req,res) => { try { const articles = await getAllArticles(); const article = articles.find(a => a.id === req.params.id); article ? res.json(article) : res.status(404).json({ error:'Article not found' }) } catch { res.status(502).json({ error:'Unable to retrieve the article.' }) } })
app.post('/api/articles/:id/save', async (req,res) => { try { await pool.query('INSERT INTO saved_articles (external_id, title) VALUES ($1,$2) ON CONFLICT (external_id) DO NOTHING',[req.params.id, req.body.title || 'Untitled']); res.status(201).json({ saved:true }) } catch { res.status(503).json({ error:'Database unavailable' }) } })
app.listen(process.env.PORT || 4000, () => console.log('API listening on 4000'))
