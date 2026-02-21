-- Schema do banco de dados SQLite para Lúmina

-- Tabela de livros
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    last_position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Tabela de marcadores
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_books_file_path ON books(file_path);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
