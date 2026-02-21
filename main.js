const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const db = require('./database/db');
const bookParser = require('./lib/bookParser');

let mainWindow;
let ttsProcess = null;

/**
 * Cria a janela principal do aplicativo
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    // icon: path.join(__dirname, 'assets', 'icon.png') // Opcional: adicione um ícone se desejar
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Abre DevTools em desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Inicializa o banco de dados quando o app inicia
 */
app.whenReady().then(async () => {
  await db.init();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handler para carregar livro (TXT, EPUB ou MOBI)
 */
ipcMain.handle('load-book-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Livros', extensions: ['txt', 'epub', 'mobi', 'azw3'] },
      { name: 'Texto', extensions: ['txt'] },
      { name: 'EPUB', extensions: ['epub'] },
      { name: 'MOBI / Kindle', extensions: ['mobi', 'azw3'] },
      { name: 'Todos', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const { title, content } = await bookParser.parseBook(filePath);
      const bookId = db.addBook(title, filePath);
      return {
        id: bookId,
        title,
        content,
        filePath
      };
    } catch (err) {
      console.error('Erro ao carregar livro:', err);
      throw err;
    }
  }

  return null;
});

/**
 * Handler para listar todos os livros
 */
ipcMain.handle('get-books', () => {
  return db.getAllBooks();
});

/**
 * Handler para obter conteúdo de um livro (TXT, EPUB ou MOBI)
 */
ipcMain.handle('get-book-content', async (event, bookId) => {
  const book = db.getBook(bookId);
  if (!book || !book.file_path) return null;
  try {
    const { title, content } = await bookParser.parseBook(book.file_path);
    return {
      ...book,
      title: title || book.title,
      content
    };
  } catch (error) {
    console.error('Erro ao ler livro:', error);
    return null;
  }
});

/**
 * Handler para salvar posição de leitura
 */
ipcMain.handle('save-position', (event, bookId, position) => {
  db.updateBookPosition(bookId, position);
});

/**
 * Handler para adicionar marcador
 */
ipcMain.handle('add-bookmark', (event, bookId, position, note) => {
  return db.addBookmark(bookId, position, note);
});

/**
 * Handler para obter marcadores de um livro
 */
ipcMain.handle('get-bookmarks', (event, bookId) => {
  return db.getBookmarks(bookId);
});

/**
 * Handler para remover um livro
 */
ipcMain.handle('delete-book', (event, bookId) => {
  db.deleteBook(bookId);
});

/**
 * Handler para gerar áudio usando o serviço Python TTS
 * - Usa arquivo temporário único por requisição (evita race quando há vários cliques).
 * - TTS_HOME em diretório sem espaços (evita "Model file not found" em caminhos como "Nova pasta").
 */
ipcMain.handle('generate-audio', async (event, text, options = {}) => {
  return new Promise((resolve, reject) => {
    const language = options.language || 'pt-BR';
    const voice = options.voice || 'default';
    const speed = options.speed != null ? String(options.speed) : '1';
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pythonScript = path.join(__dirname, 'python', 'tts_service.py');
    const tempTextPath = path.join(__dirname, `temp_tts_input_${id}.txt`);

    try {
      fs.writeFileSync(tempTextPath, text, 'utf-8');
    } catch (err) {
      return reject(new Error(`Erro ao criar arquivo temporário: ${err.message}`));
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const ttsCacheDir = process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || process.env.TEMP || __dirname, 'Lumina', 'tts')
      : path.join(process.env.HOME || process.env.TMPDIR || '/tmp', '.lumina', 'tts');
    try {
      fs.mkdirSync(ttsCacheDir, { recursive: true });
    } catch (_) {}
    const tempAudioPathNoSpaces = path.join(ttsCacheDir, `out_${id}.wav`);
    const env = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      TTS_HOME: ttsCacheDir,
      PIPER_VOICE_DIR: ttsCacheDir
    };

    ttsProcess = spawn(pythonCmd, [pythonScript, tempTextPath, tempAudioPathNoSpaces, language, voice, speed], {
      cwd: __dirname,
      shell: false,
      env
    });

    let errorOutput = '';

    ttsProcess.stderr.on('data', (data) => {
      errorOutput += (Buffer.isBuffer(data) ? data.toString('utf-8') : data);
    });

    ttsProcess.on('close', (code) => {
      const cleanup = () => {
        try { if (fs.existsSync(tempTextPath)) fs.unlinkSync(tempTextPath); } catch (_) {}
        try { if (fs.existsSync(tempAudioPathNoSpaces)) fs.unlinkSync(tempAudioPathNoSpaces); } catch (_) {}
      };
      if (code === 0) {
        if (fs.existsSync(tempAudioPathNoSpaces)) {
          try {
            const audioBuffer = fs.readFileSync(tempAudioPathNoSpaces);
            const base64Audio = audioBuffer.toString('base64');
            resolve({ success: true, audio: `data:audio/wav;base64,${base64Audio}` });
          } finally {
            cleanup();
          }
        } else {
          cleanup();
          reject(new Error('Arquivo de áudio não foi gerado'));
        }
      } else {
        cleanup();
        reject(new Error(`Erro ao gerar áudio: ${errorOutput}`));
      }
      ttsProcess = null;
    });

    ttsProcess.on('error', (error) => {
      try { if (fs.existsSync(tempTextPath)) fs.unlinkSync(tempTextPath); } catch (_) {}
      reject(new Error(`Erro ao executar TTS: ${error.message}`));
      ttsProcess = null;
    });
  });
});

/**
 * Handler para cancelar geração de áudio
 */
ipcMain.handle('cancel-audio', () => {
  if (ttsProcess) {
    ttsProcess.kill();
    ttsProcess = null;
  }
});
