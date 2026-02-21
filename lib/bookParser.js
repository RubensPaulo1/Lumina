/**
 * Módulo de extração de texto de livros
 * Suporta: TXT, EPUB e MOBI
 */

const fs = require('fs');
const path = require('path');
const { convert: htmlToText } = require('html-to-text');

/**
 * Extrai texto puro de um arquivo TXT
 */
function parseTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const title = path.basename(filePath, path.extname(filePath));
  return { title, content };
}

/**
 * Extrai texto de um arquivo EPUB (usa callback API do pacote epub)
 */
function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const EPub = require('epub');
    const epub = new EPub(filePath);

    epub.on('error', (err) => reject(err));

    epub.on('end', function () {
      const title = (epub.metadata && epub.metadata.title) || path.basename(filePath, path.extname(filePath));
      const flow = epub.flow || [];

      if (flow.length === 0) {
        return resolve({ title, content: '' });
      }

      let index = 0;
      const parts = [];

      function next() {
        if (index >= flow.length) {
          const content = parts.join('\n\n').trim();
          return resolve({ title, content });
        }

        const chapterId = flow[index].id;
        epub.getChapter(chapterId, (err, text) => {
          if (err) {
            index++;
            return next();
          }
          const plain = text ? htmlToText(text, { wordwrap: false, preserveNewlines: true }) : '';
          if (plain.trim()) parts.push(plain.trim());
          index++;
          next();
        });
      }

      next();
    });

    epub.parse();
  });
}

/**
 * Extrai texto de um arquivo MOBI (ou AZW3/KF8)
 */
async function parseMobi(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const { initMobiFile, initKf8File } = require('@lingo-reader/mobi-parser');

  const mobi = ext === '.azw3' ? await initKf8File(filePath) : await initMobiFile(filePath);
  const metadata = mobi.getMetadata();
  const title = (metadata && metadata.title) || path.basename(filePath, path.extname(filePath));
  const spine = mobi.getSpine();

  const parts = [];
  for (const chapter of spine) {
    const chapterData = mobi.loadChapter(chapter.id);
    if (chapterData && chapterData.html) {
      const plain = htmlToText(chapterData.html, { wordwrap: false, preserveNewlines: true });
      if (plain.trim()) parts.push(plain.trim());
    }
  }

  mobi.destroy && mobi.destroy();
  const content = parts.join('\n\n').trim();
  return { title, content };
}

/**
 * Detecta a extensão e chama o parser adequado.
 * Retorna Promise<{ title, content }>
 */
async function parseBook(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
      return parseTxt(filePath);
    case '.epub':
      return parseEpub(filePath);
    case '.mobi':
    case '.azw3':
      return parseMobi(filePath);
    default:
      throw new Error(`Formato não suportado: ${ext}. Use .txt, .epub ou .mobi`);
  }
}

module.exports = {
  parseTxt,
  parseEpub,
  parseMobi,
  parseBook
};
