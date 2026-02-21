# 🚀 Guia de Instalação Rápida - Lúmina

## Pré-requisitos

### 1. Node.js
- Baixe e instale do site oficial: https://nodejs.org/
- Versão recomendada: 16.x ou superior
- Verifique a instalação: `node --version`

### 2. Python
- Baixe e instale do site oficial: https://www.python.org/
- Versão recomendada: 3.8 ou superior
- **IMPORTANTE:** Durante a instalação, marque a opção "Add Python to PATH"
- Verifique a instalação: `python --version` (Windows) ou `python3 --version` (Linux/Mac)

### 3. Piper TTS (voz pt-BR)
Após instalar Python, execute no terminal:

```bash
pip install piper-tts
```

**Nota:** Na primeira narração, o Lúmina baixará automaticamente a voz **pt_BR-faber-medium** (Português do Brasil, ~63 MB). A narração usa sotaque brasileiro.

## Instalação do Projeto

1. **Navegue até a pasta do projeto:**
```bash
cd voxbook
```

2. **Instale as dependências Node.js:**
```bash
npm install
```

Isso instalará:
- Electron (framework desktop)
- sql.js (banco de dados SQLite em JavaScript puro - **não requer compilação nativa**)

**Vantagem:** Este projeto usa `sql.js` em vez de `better-sqlite3`, então **NÃO é necessário instalar Visual Studio Build Tools** no Windows!

## Executar o Aplicativo

```bash
npm start
```

## Testando

1. Ao abrir o aplicativo, clique em "+ Carregar Livro"
2. Selecione o arquivo `books/exemplo.txt` (já incluído)
3. Clique em qualquer parágrafo para iniciar a narração

## Troubleshooting

### Erro: "python não é reconhecido"
- Windows: Verifique se Python está no PATH do sistema
- Linux/Mac: Use `python3` em vez de `python`

### Erro: "Piper TTS não está instalado"
```bash
pip install piper-tts
# ou
pip3 install piper-tts
```

### Erro ao gerar áudio
- Verifique se Python está instalado corretamente
- Verifique se Piper TTS está instalado: `pip list | grep piper`
- Na primeira narração, aguarde o download do modelo pt_BR-faber-medium

### Performance lenta na primeira narração
- Normal! O modelo TTS é carregado na primeira execução
- Narrações subsequentes serão mais rápidas

## Estrutura Criada

Após a instalação, você terá:

```
voxbook/
├── node_modules/          # Dependências Node.js (criado após npm install)
├── database/
│   └── voxbook.db         # Banco SQLite (criado na primeira execução)
└── ...
```

## Próximos Passos

- Adicione seus próprios arquivos .txt na pasta `books/`
- Explore as funcionalidades: marcadores, ajuste de fonte, etc.
- Personalize o modelo TTS editando `python/tts_service.py`
