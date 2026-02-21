# Changelog

## Mudanças na Instalação

### Substituição de better-sqlite3 por sql.js

**Problema resolvido:**
- `better-sqlite3` requer compilação nativa e Visual Studio Build Tools no Windows
- Isso causava erros de instalação para muitos usuários

**Solução implementada:**
- Substituído `better-sqlite3` por `sql.js` (SQLite em JavaScript puro)
- `sql.js` não requer compilação nativa
- Funciona em qualquer plataforma sem dependências adicionais

**Vantagens:**
- ✅ Instalação mais rápida e simples
- ✅ Não requer Visual Studio Build Tools
- ✅ Funciona em Windows, Linux e macOS sem configuração adicional
- ✅ Mesma funcionalidade SQLite

**Nota:** O `sql.js` carrega o banco em memória e salva explicitamente, o que é perfeitamente adequado para este aplicativo.
