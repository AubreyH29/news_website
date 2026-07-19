CREATE TABLE IF NOT EXISTS saved_articles (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS article_comments (
  id SERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous reader',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS article_comments_external_id_created_at_idx
  ON article_comments (external_id, created_at DESC);
