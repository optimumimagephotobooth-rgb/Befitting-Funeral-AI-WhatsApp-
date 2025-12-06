CREATE TABLE IF NOT EXISTS training_modules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL
);

