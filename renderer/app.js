/**
 * Lúmina - Aplicativo Principal
 * Gerencia a interface e interações do usuário
 */

let currentBook = null;
let currentPosition = 0;
let isPlaying = false;
let currentAudio = null;
let textBlocks = [];
let currentBlockIndex = -1;
let narrationStartPosition = 0;

const VOICE_STORAGE_KEY = 'voxbook_voice';
const VOICE_SPEED_KEY = 'voxbook_voice_speed';

/**
 * Inicializa a aplicação
 */
async function init() {
  loadVoiceSettings();
  await loadBooks();
  setupEventListeners();
}

function loadVoiceSettings() {
  try {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved) {
      const { language, voice } = JSON.parse(saved);
      const langEl = document.getElementById('voiceLanguage');
      const voiceEl = document.getElementById('voiceStyle');
      if (langEl && language) langEl.value = language;
      if (voiceEl && voice) voiceEl.value = voice;
    }
    const speedSaved = localStorage.getItem(VOICE_SPEED_KEY);
    if (speedSaved) {
      const speedEl = document.getElementById('voiceSpeed');
      if (speedEl) speedEl.value = speedSaved;
    }
  } catch (_) {}
}

function saveVoiceSettings() {
  const language = document.getElementById('voiceLanguage').value;
  const voice = document.getElementById('voiceStyle').value;
  localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify({ language, voice }));
  const speed = document.getElementById('voiceSpeed').value;
  localStorage.setItem(VOICE_SPEED_KEY, speed);
}

/**
 * Carrega a lista de livros do banco de dados
 */
async function loadBooks() {
  try {
    const books = await window.electronAPI.getBooks();
    const booksList = document.getElementById('booksList');
    
    if (books.length === 0) {
      booksList.innerHTML = '<p style="padding: 20px; color: var(--text-secondary); text-align: center;">Nenhum livro carregado</p>';
      return;
    }
    
    booksList.innerHTML = books.map(book => `
      <div class="book-item" data-book-id="${book.id}">
        <div>
          <div class="book-title">${escapeHtml(book.title)}</div>
          <div class="book-meta">Posição: ${book.last_position} caracteres</div>
        </div>
        <div class="book-actions">
          <button class="book-delete-btn" data-book-id="${book.id}" title="Remover livro">Remover</button>
        </div>
      </div>
    `).join('');
    
    // Clique para abrir livro
    document.querySelectorAll('.book-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Evita abrir ao clicar no botão de remover
        if (e.target && e.target.classList.contains('book-delete-btn')) return;
        const bookId = parseInt(item.dataset.bookId);
        loadBook(bookId);
      });
    });

    // Botão remover livro
    document.querySelectorAll('.book-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = parseInt(btn.dataset.bookId);
        const bookTitle = btn.closest('.book-item').querySelector('.book-title').textContent;
        const confirmDelete = confirm(`Remover o livro "${bookTitle}" da biblioteca?\nOs marcadores associados também serão removidos.`);
        if (!confirmDelete) return;
        try {
          await window.electronAPI.deleteBook(bookId);
          // Se o livro atual foi removido, limpa o leitor
          if (currentBook && currentBook.id === bookId) {
            currentBook = null;
            currentPosition = 0;
            document.getElementById('bookTitle').textContent = 'Selecione um livro';
            document.getElementById('readerContent').innerHTML = `
              <div class="empty-state">
                <p>📖 Carregue um livro para começar a ler</p>
                <p class="empty-state-subtitle">Clique em qualquer parte do texto para iniciar a narração</p>
              </div>
            `;
          }
          await loadBooks();
        } catch (error) {
          console.error('Erro ao remover livro:', error);
          alert('Erro ao remover livro.');
        }
      });
    });
  } catch (error) {
    console.error('Erro ao carregar livros:', error);
  }
}

/**
 * Carrega um livro específico
 */
async function loadBook(bookId) {
  try {
    const book = await window.electronAPI.getBookContent(bookId);
    
    if (!book) {
      alert('Erro ao carregar livro');
      return;
    }
    
    currentBook = book;
    currentPosition = book.last_position || 0;
    
    // Atualiza título
    document.getElementById('bookTitle').textContent = book.title;
    
    // Marca livro ativo na lista
    document.querySelectorAll('.book-item').forEach(item => {
      item.classList.remove('active');
      if (parseInt(item.dataset.bookId) === bookId) {
        item.classList.add('active');
      }
    });
    
    // Renderiza conteúdo
    renderBookContent(book.content);
    
    // Pergunta se deseja continuar de onde parou
    if (currentPosition > 0) {
      const continueReading = confirm(`Deseja continuar de onde parou? (posição ${currentPosition} caracteres)`);
      if (continueReading) {
        scrollToPosition(currentPosition);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar livro:', error);
    alert('Erro ao carregar livro: ' + error.message);
  }
}

/**
 * Renderiza o conteúdo do livro na tela
 */
function renderBookContent(content) {
  const readerContent = document.getElementById('readerContent');
  
  // Divide o texto em parágrafos preservando quebras de linha
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Calcula posições acumuladas baseadas no conteúdo original
  let htmlContent = '';
  let currentPosition = 0;
  
  // Um bloco = um parágrafo inteiro (texto único por trecho, sem divisão em partes pequenas)
  paragraphs.forEach((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) return;
    
    const paragraphStart = content.indexOf(trimmed, currentPosition);
    if (paragraphStart !== -1) {
      currentPosition = paragraphStart;
    }
    
    htmlContent += `<p data-block-index="${index}" data-start-pos="${currentPosition}">${escapeHtml(trimmed)}</p>`;
    currentPosition += trimmed.length;
    if (index < paragraphs.length - 1) {
      currentPosition += 2;
    }
  });
  
  readerContent.innerHTML = htmlContent;
  
  // Adiciona event listeners para iniciar narração ao clicar
  document.querySelectorAll('#readerContent p').forEach(p => {
    p.addEventListener('click', (e) => {
      const startPos = parseInt(p.dataset.startPos);
      startNarration(startPos);
    });
  });
  
  // Salva os blocos de texto para narração
  textBlocks = Array.from(document.querySelectorAll('#readerContent p')).map((p, idx) => ({
    element: p,
    text: p.textContent.trim(),
    startPos: parseInt(p.dataset.startPos)
  }));
}

// Texto único por parágrafo (sem divisão em blocos) para evitar demora entre trechos

/**
 * Inicia a narração a partir de uma posição específica
 */
async function startNarration(startPosition) {
  if (isPlaying) {
    stopNarration();
  }
  
  narrationStartPosition = startPosition;
  currentBlockIndex = -1;
  
  // Encontra o primeiro bloco a partir da posição
  for (let i = 0; i < textBlocks.length; i++) {
    if (textBlocks[i].startPos >= startPosition) {
      currentBlockIndex = i;
      break;
    }
  }
  
  if (currentBlockIndex === -1) {
    currentBlockIndex = 0;
  }
  
  isPlaying = true;
  document.getElementById('audioControls').style.display = 'flex';
  document.getElementById('playPauseBtn').textContent = '⏸️';
  
  await narrateNextBlock();
}

/** Máximo de caracteres por trecho TTS (1000 por vez) */
const MAX_CHARS_PER_TTS = 1000;

/** Resultado do prefetch do próximo trecho (evita demora entre reproduções) */
let prefetchedResult = null;

/**
 * Retorna { textToSpeak, endBlockIndex } para o trecho que começa em startBlockIndex.
 */
function getSegmentForBlockIndex(startBlockIndex) {
  if (startBlockIndex >= textBlocks.length) return null;
  let textToSpeak = '';
  let endBlockIndex = startBlockIndex;
  for (let i = startBlockIndex; i < textBlocks.length; i++) {
    const next = (textToSpeak ? textToSpeak + '\n\n' : '') + textBlocks[i].text;
    if (next.length > MAX_CHARS_PER_TTS && textToSpeak.length > 0) break;
    textToSpeak = next;
    endBlockIndex = i;
  }
  if (!textToSpeak.trim()) return null;
  return { textToSpeak, endBlockIndex };
}

/**
 * Inicia o prefetch do próximo trecho (quando o atual está quase terminando).
 */
function startPrefetchNextSegment(currentEndBlockIndex) {
  if (prefetchedResult !== null) return;
  const next = getSegmentForBlockIndex(currentEndBlockIndex + 1);
  if (!next || !isPlaying) return;
  const language = document.getElementById('voiceLanguage').value;
  const voice = document.getElementById('voiceStyle').value;
  const speed = parseFloat(document.getElementById('voiceSpeed').value) || 1;
  const startBlockIndex = currentEndBlockIndex + 1;
  const endBlockIndex = next.endBlockIndex;
  window.electronAPI.generateAudio(next.textToSpeak, { language, voice, speed })
    .then((result) => {
      if (isPlaying && result && result.success) {
        prefetchedResult = { audio: result.audio, startBlockIndex, endBlockIndex };
      }
    })
    .catch(() => {});
}

/**
 * Narra o próximo trecho. Usa áudio pré-renderizado se disponível (prefetch).
 */
async function narrateNextBlock() {
  if (!isPlaying || currentBlockIndex >= textBlocks.length) {
    stopNarration();
    return;
  }

  let segment = getSegmentForBlockIndex(currentBlockIndex);
  if (!segment) {
    stopNarration();
    return;
  }
  let { textToSpeak, endBlockIndex } = segment;

  if (prefetchedResult && prefetchedResult.startBlockIndex === currentBlockIndex) {
    endBlockIndex = prefetchedResult.endBlockIndex;
  }

  document.querySelectorAll('#readerContent p.narrating').forEach(p => p.classList.remove('narrating'));
  for (let i = currentBlockIndex; i <= endBlockIndex; i++) {
    textBlocks[i].element.classList.add('narrating');
  }
  textBlocks[currentBlockIndex].element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  let result;
  if (prefetchedResult && prefetchedResult.startBlockIndex === currentBlockIndex) {
    result = { success: true, audio: prefetchedResult.audio };
    prefetchedResult = null;
  } else {
    try {
      const language = document.getElementById('voiceLanguage').value;
      const voice = document.getElementById('voiceStyle').value;
      const speed = parseFloat(document.getElementById('voiceSpeed').value) || 1;
      result = await window.electronAPI.generateAudio(textToSpeak, { language, voice, speed });
    } catch (error) {
      console.error('Erro na narração:', error);
      alert(
        'Erro ao gerar narração.\n\n' +
        '1. Verifique se o Python está instalado (python --version)\n\n' +
        '2. Instale o Piper TTS:\n   pip install piper-tts\n\n' +
        '3. Na primeira vez, o modelo pt-BR será baixado automaticamente.\n\n' +
        'Reinicie o Lúmina após instalar.'
      );
      stopNarration();
      return;
    }
  }

  if (result && result.success) {
    const audio = new Audio(result.audio);
    currentAudio = audio;
    let prefetchTriggered = false;

    audio.onended = () => {
      currentBlockIndex = endBlockIndex + 1;
      if (isPlaying) {
        narrateNextBlock();
      }
    };

    audio.onerror = () => {
      console.error('Erro ao reproduzir áudio');
      stopNarration();
    };

    audio.ontimeupdate = () => {
      const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      document.getElementById('audioProgressBar').style.width = progress + '%';
      if (!prefetchTriggered && audio.duration && (audio.currentTime / audio.duration) >= 0.7) {
        prefetchTriggered = true;
        startPrefetchNextSegment(endBlockIndex);
      }
    };

    audio.play();
  } else {
    console.error('Erro ao gerar áudio');
    stopNarration();
  }
}

/**
 * Para a narração
 */
function stopNarration() {
  isPlaying = false;
  currentBlockIndex = -1;
  prefetchedResult = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  document.querySelectorAll('#readerContent p.narrating').forEach(p => {
    p.classList.remove('narrating');
  });
  
  document.getElementById('audioControls').style.display = 'none';
  document.getElementById('playPauseBtn').textContent = '▶️';
  document.getElementById('audioProgressBar').style.width = '0%';
  
  // Salva posição atual
  if (currentBook && narrationStartPosition > 0) {
    savePosition(narrationStartPosition);
  }
}

/**
 * Salva a posição de leitura
 */
function savePosition(position) {
  if (currentBook) {
    currentPosition = position;
    window.electronAPI.savePosition(currentBook.id, position);
  }
}

/**
 * Scroll para uma posição específica no texto
 */
function scrollToPosition(position) {
  const targetBlock = textBlocks.find(block => 
    block.startPos <= position && block.startPos + block.text.length >= position
  );
  
  if (targetBlock) {
    targetBlock.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Botão carregar livro
  document.getElementById('loadBookBtn').addEventListener('click', async () => {
    try {
      const book = await window.electronAPI.loadBookFile();
      if (book) {
        await loadBooks();
        await loadBook(book.id);
      }
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      alert('Erro ao carregar arquivo: ' + error.message);
    }
  });
  
  // Controles de áudio
  document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (isPlaying) {
      // Pausa
      if (currentAudio) {
        currentAudio.pause();
        document.getElementById('playPauseBtn').textContent = '▶️';
        isPlaying = false;
      }
    } else {
      // Resume
      if (currentAudio) {
        currentAudio.play();
        document.getElementById('playPauseBtn').textContent = '⏸️';
        isPlaying = true;
      } else if (currentBook) {
        // Inicia do início ou da posição salva
        startNarration(currentPosition);
      }
    }
  });
  
  document.getElementById('stopBtn').addEventListener('click', () => {
    stopNarration();
  });
  
  // Controle de tamanho de fonte
  document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    const fontSize = e.target.value + 'px';
    document.getElementById('readerContent').style.fontSize = fontSize;
  });

  document.getElementById('voiceLanguage').addEventListener('change', saveVoiceSettings);
  document.getElementById('voiceStyle').addEventListener('change', saveVoiceSettings);
  document.getElementById('voiceSpeed').addEventListener('change', saveVoiceSettings);
  
  // Botão marcador
  document.getElementById('bookmarkBtn').addEventListener('click', () => {
    if (!currentBook) {
      alert('Selecione um livro primeiro');
      return;
    }
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startPos = getTextPositionFromRange(range);
      showBookmarkModal(startPos);
    } else {
      // Usa posição atual de scroll
      const scrollPos = document.getElementById('readerContent').scrollTop;
      showBookmarkModal(currentPosition);
    }
  });
  
  // Modal de marcador
  document.getElementById('saveBookmarkBtn').addEventListener('click', async () => {
    const note = document.getElementById('bookmarkNote').value;
    const position = parseInt(document.getElementById('bookmarkModal').dataset.position);
    
    try {
      await window.electronAPI.addBookmark(currentBook.id, position, note);
      document.getElementById('bookmarkModal').style.display = 'none';
      document.getElementById('bookmarkNote').value = '';
      alert('Marcador adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar marcador:', error);
      alert('Erro ao adicionar marcador');
    }
  });
  
  document.getElementById('cancelBookmarkBtn').addEventListener('click', () => {
    document.getElementById('bookmarkModal').style.display = 'none';
    document.getElementById('bookmarkNote').value = '';
  });
  
  // Salva posição ao fechar ou mudar de livro
  window.addEventListener('beforeunload', () => {
    if (currentBook && currentPosition > 0) {
      savePosition(currentPosition);
    }
  });
}

/**
 * Mostra modal para adicionar marcador
 */
function showBookmarkModal(position) {
  document.getElementById('bookmarkModal').dataset.position = position;
  document.getElementById('bookmarkModal').style.display = 'flex';
}

/**
 * Obtém posição do texto a partir de uma seleção
 */
function getTextPositionFromRange(range) {
  const readerContent = document.getElementById('readerContent');
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(readerContent);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inicializa a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
