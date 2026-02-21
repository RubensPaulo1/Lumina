const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let SQL = null;

/**
 * Inicializa o banco de dados SQLite usando sql.js
 * Cria o arquivo se não existir e executa o schema
 */
async function init() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  const dbPath = path.join(__dirname, 'voxbook.db');
  
  // Tenta carregar banco existente ou cria novo
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Lê e executa o schema SQL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.run(schema);
  
  // Salva o banco
  saveDatabase();
  
  console.log('Banco de dados inicializado:', dbPath);
}

/**
 * Salva o banco de dados no disco
 */
function saveDatabase() {
  if (!db) return;
  
  const dbPath = path.join(__dirname, 'voxbook.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Obtém a instância do banco (singleton)
 */
function getDB() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame init() primeiro.');
  }
  return db;
}

/**
 * Adiciona um novo livro ao banco de dados
 */
function addBook(title, filePath) {
  const db = getDB();
  const stmt = db.prepare('INSERT INTO books (title, file_path) VALUES (?, ?)');
  stmt.run([title, filePath]);
  stmt.free();
  
  // Obtém o último ID inserido
  const resultStmt = db.prepare('SELECT last_insert_rowid() as id');
  resultStmt.step();
  const result = resultStmt.getAsObject();
  resultStmt.free();
  
  saveDatabase();
  return result.id;
}

/**
 * Obtém todos os livros
 */
function getAllBooks() {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM books ORDER BY created_at DESC');
  
  const books = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    books.push({ ...row });
  }
  stmt.free();
  
  return books;
}

/**
 * Obtém um livro específico por ID
 */
function getBook(bookId) {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
  stmt.bind([bookId]);
  
  let book = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    book = { ...row };
  }
  stmt.free();
  
  return book;
}

/**
 * Atualiza a posição de leitura de um livro
 */
function updateBookPosition(bookId, position) {
  const db = getDB();
  const stmt = db.prepare('UPDATE books SET last_position = ? WHERE id = ?');
  stmt.run([position, bookId]);
  stmt.free();
  saveDatabase();
}

/**
 * Adiciona um marcador
 */
function addBookmark(bookId, position, note = '') {
  const db = getDB();
  const stmt = db.prepare('INSERT INTO bookmarks (book_id, position, note) VALUES (?, ?, ?)');
  stmt.run([bookId, position, note]);
  stmt.free();
  
  // Obtém o último ID inserido
  const resultStmt = db.prepare('SELECT last_insert_rowid() as id');
  resultStmt.step();
  const result = resultStmt.getAsObject();
  resultStmt.free();
  
  saveDatabase();
  return result.id;
}

/**
 * Obtém todos os marcadores de um livro
 */
function getBookmarks(bookId) {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY position ASC');
  stmt.bind([bookId]);
  
  const bookmarks = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    bookmarks.push({ ...row });
  }
  stmt.free();
  
  return bookmarks;
}

/**
 * Remove um marcador
 */
function removeBookmark(bookmarkId) {
  const db = getDB();
  const stmt = db.prepare('DELETE FROM bookmarks WHERE id = ?');
  stmt.run([bookmarkId]);
  stmt.free();
  saveDatabase();
}

/**
 * Remove um livro (e seus marcadores via ON DELETE CASCADE)
 */
function deleteBook(bookId) {
  const db = getDB();
  const stmt = db.prepare('DELETE FROM books WHERE id = ?');
  stmt.run([bookId]);
  stmt.free();
  saveDatabase();
}

module.exports = {
  init,
  addBook,
  getAllBooks,
  getBook,
  updateBookPosition,
  addBookmark,
  getBookmarks,
  removeBookmark,
  deleteBook
};
