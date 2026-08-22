CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  hotel_name TEXT,
  hotel_phone TEXT,
  city TEXT,
  monument TEXT,
  days INT,
  created_at TIMESTAMP DEFAULT NOW()
);
