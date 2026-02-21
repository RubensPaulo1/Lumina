# Lúmina - Leitor de Livros com Narração Offline

Aplicativo desktop para leitura de livros com narração em tempo real usando Electron, SQLite e **Piper TTS** (voz em Português do Brasil).

<img width="1425" height="964" alt="Captura de tela 2026-02-21 151443" src="https://github.com/user-attachments/assets/88a51323-7e69-4480-a5e2-19d67af30827" />


## Instalação

### Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Python** (versão 12.3 ou superior)
3. **Piper TTS** instalado no Python

### Passos de Instalação

1. **Instale as dependências Node.js:**
```bash
cd Lumina
npm install
```

2. **Instale o Piper TTS no Python:**
```bash
pip install piper-tts
```

**Nota:** Na primeira narração, o Lúmina baixará automaticamente a voz **pt_BR-faber-medium** (63 MB)


## Estrutura do Projeto

```
voxbook/
├── main.js              
├── preload.js          
├── package.json        
│
├── renderer/            # Interface do usuário
│   ├── index.html       
│   ├── styles.css       
│   └── app.js           
│
├── database/            # Banco de dados SQLite
│   ├── db.js            
│   └── schema.sql       
│
├── lib/                 
│   └── bookParser.js    # Conversor TXT, EPUB e MOBI
│
├── python/             
│   └── tts_service.py   
│
└── books/             
```

Sinta-se à vontade para melhorar o projeto!
