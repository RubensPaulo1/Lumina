const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expõe APIs seguras para o renderer process
 * Segurança: não permite acesso direto ao Node.js
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Biblioteca de livros
  loadBookFile: () => ipcRenderer.invoke('load-book-file'),
  getBooks: () => ipcRenderer.invoke('get-books'),
  getBookContent: (bookId) => ipcRenderer.invoke('get-book-content', bookId),
  
  // Leitura e posição
  savePosition: (bookId, position) => ipcRenderer.invoke('save-position', bookId, position),
  
  // Marcadores
  addBookmark: (bookId, position, note) => ipcRenderer.invoke('add-bookmark', bookId, position, note),
  getBookmarks: (bookId) => ipcRenderer.invoke('get-bookmarks', bookId),
  deleteBook: (bookId) => ipcRenderer.invoke('delete-book', bookId),
  
  // TTS (Text-to-Speech) - options: { language, voice }
  generateAudio: (text, options) => ipcRenderer.invoke('generate-audio', text, options),
  cancelAudio: () => ipcRenderer.invoke('cancel-audio')
});
