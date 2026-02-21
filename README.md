# Lúmina - Leitor de Livros com Narração Offline

Aplicativo desktop para leitura de livros com narração em tempo real usando Electron, SQLite e **Piper TTS** (voz em Português do Brasil).

## 🚀 Instalação

### Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Python** (versão 3.9 ou superior)
3. **Piper TTS** instalado no Python

### Passos de Instalação

1. **Instale as dependências Node.js:**
```bash
cd voxbook
npm install
```

2. **Instale o Piper TTS no Python:**
```bash
pip install piper-tts
```

**Nota:** Na primeira narração, o Lúmina baixará automaticamente a voz **pt_BR-faber-medium** (Português do Brasil, ~63 MB) do Hugging Face. A narração usa sotaque brasileiro.

**Importante:** Este projeto usa `sql.js` em vez de `better-sqlite3` para evitar problemas de compilação nativa no Windows. Não é necessário instalar Visual Studio Build Tools.

## 🎯 Como Usar

1. **Inicie o aplicativo:**
```bash
npm start
```

2. **Carregue um livro:**
   - Clique em "+ Carregar Livro"
   - Selecione um arquivo **TXT**, **EPUB** ou **MOBI** (também AZW3/Kindle)
   - O livro será adicionado à biblioteca

3. **Leia e narre:**
   - Clique em qualquer parágrafo para iniciar a narração
   - O texto narrado será destacado em verde
   - Use os controles de áudio para pausar/parar

4. **Adicione marcadores:**
   - Selecione um texto ou posicione o cursor
   - Clique no botão de marcador (🔖)
   - Adicione uma nota opcional

5. **Ajuste a interface:**
   - Use o slider para ajustar o tamanho da fonte
   - O modo escuro está sempre ativo

## 📁 Estrutura do Projeto

```
voxbook/
├── main.js              # Processo principal Electron
├── preload.js           # Bridge seguro entre main e renderer
├── package.json         # Dependências e scripts
│
├── renderer/            # Interface do usuário
│   ├── index.html       # Estrutura HTML
│   ├── styles.css       # Estilos modernos
│   └── app.js           # Lógica da interface
│
├── database/            # Banco de dados SQLite
│   ├── db.js            # Funções de acesso ao banco
│   └── schema.sql       # Schema do banco
│
├── lib/                 # Utilitários
│   └── bookParser.js    # Parser para TXT, EPUB e MOBI
│
├── python/              # Serviço TTS
│   └── tts_service.py   # Script Python para gerar áudio
│
└── books/               # Pasta para armazenar livros (opcional)
```

## 🔧 Funcionalidades

- ✅ Carregamento de arquivos **TXT**, **EPUB** e **MOBI** (e AZW3)
- ✅ Biblioteca de livros persistente
- ✅ Narração em tempo real (offline)
- ✅ Destaque visual do texto narrado
- ✅ Salvamento automático de posição
- ✅ Marcadores com notas
- ✅ Ajuste de tamanho de fonte
- ✅ Design moderno minimalista
- ✅ Modo escuro sempre ativo

## 🐍 Serviço Python TTS (Piper)

O serviço usa **Piper TTS** com a voz **pt_BR-faber-medium** (Português do Brasil):
- Voz com sotaque brasileiro
- Leve e rápido (ONNX)
- Funciona offline após o download do modelo

O modelo é baixado automaticamente na primeira narração para a pasta de cache do Lúmina (sem espaços no caminho).

### Instalação manual do modelo (opcional)

Se o download automático falhar, baixe manualmente:

```bash
python -m piper.download_voices pt_BR-faber-medium
```

Ou coloque os arquivos `pt_BR-faber-medium.onnx` e `pt_BR-faber-medium.onnx.json` na pasta de cache (ex.: `%LOCALAPPDATA%\Lumina\tts` no Windows).

## 🗄️ Banco de Dados

O SQLite armazena:
- **books**: Informações dos livros e última posição de leitura
- **bookmarks**: Marcadores com posição e notas

O banco é criado automaticamente em `database/voxbook.db` na primeira execução.

## 🔐 Segurança

- Usa `preload.js` para expor APIs seguras
- `contextIsolation` habilitado
- `nodeIntegration` desabilitado no renderer
- Comunicação via IPC seguro

## 📦 Build e Distribuição

Para criar um executável:

```bash
npm install --save-dev electron-builder
npm run build
```

## 🐛 Troubleshooting

### Erro ao gerar áudio
- Verifique se Python está instalado e no PATH
- Verifique se Coqui TTS está instalado: `pip list | grep TTS`
- Na primeira execução, aguarde o download do modelo

### Erro ao carregar livro
- Verifique se o arquivo é um TXT válido
- Verifique permissões de leitura do arquivo

### Performance lenta
- O primeiro bloco de narração pode demorar (carregamento do modelo)
- Blocos subsequentes são mais rápidos

## 📝 Licença

MIT

## 🤝 Contribuições

Sinta-se à vontade para melhorar o projeto!
