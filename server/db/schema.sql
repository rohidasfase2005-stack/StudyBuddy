-- users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- pdfs table
CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    page_count INTEGER DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending',
    error_message TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- questions table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    pdf_id TEXT REFERENCES pdfs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    subject TEXT DEFAULT 'General',
    topic TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'Medium',
    page_number INTEGER,
    is_demo INTEGER DEFAULT 0,
    needs_review INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 1,
    attempt_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tests table
CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    test_name TEXT NOT NULL,
    test_mode TEXT DEFAULT 'random',
    total_questions INTEGER NOT NULL,
    time_limit INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0,
    time_taken INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- test_questions table
CREATE TABLE IF NOT EXISTS test_questions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id),
    question_order INTEGER NOT NULL,
    shuffled_options TEXT
);

-- answers table
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id),
    selected_answer INTEGER,
    is_correct INTEGER DEFAULT 0,
    is_marked INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    UNIQUE(test_id, question_id)
);

-- user_activity table for tracking study time & sessions
CREATE TABLE IF NOT EXISTS user_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    session_id TEXT NOT NULL,
    activity_type TEXT DEFAULT 'general',
    duration_seconds INTEGER DEFAULT 0,
    last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- chat_messages table for AI chatbot interactions
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- user_targets table for Daily Target tracking
CREATE TABLE IF NOT EXISTS user_targets (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    daily_questions INTEGER DEFAULT 20,
    daily_tests INTEGER DEFAULT 1,
    daily_study_minutes INTEGER DEFAULT 60,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- user_schedules table for daily study slots
CREATE TABLE IF NOT EXISTS user_schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_pdf_id ON questions(pdf_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON questions(subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_test_id ON answers(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_unique ON answers(test_id, question_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
