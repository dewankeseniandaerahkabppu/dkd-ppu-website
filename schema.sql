CREATE TABLE IF NOT EXISTS submissions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 category TEXT NOT NULL,
 nama TEXT NOT NULL,
 data_json TEXT NOT NULL,
 photo_url TEXT,
 logo_url TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_submissions_category_status ON submissions(category,status);
