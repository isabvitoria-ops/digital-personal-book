# Meu Caderno

Caderno pessoal digital. Um lugar para anotar sem atrito e achar de novo daqui
a anos.

**Endereço:** https://isabvitoria-ops.github.io/digital-personal-book/

## O que é

- Áreas → Cadernos → (Seções) → Páginas, e uma **Inbox** para anotar sem
  decidir onde guardar.
- Editor com títulos, listas, checklist, citação, tabela, link, imagem e
  anexo (PDF). `[[` cita outra página; a página citada mostra "Mencionada em".
- Busca sem acento e sem maiúscula, no título, no texto, na fonte, no nome dos
  anexos e no nome do caderno.
- Favoritas, "Continue de onde parou", Revisar (hoje / 1 semana / 1 mês /
  6 meses), Cursos, Biblioteca, Artigos (salvo → lido → estudado), Linha do
  tempo, Arquivados, Lixeira.
- Funciona sem internet (app instalável).

## Onde ficam as anotações

**No aparelho** (IndexedDB do navegador) e, se ela ligar a sincronização, num
**segundo repositório, privado**, só de dados. Este repositório é público e
tem **apenas o código** — nenhuma anotação passa por aqui.

O backup é um .zip que se lê sem o app: cada página é um arquivo `.md` (texto
comum) na pasta da sua organização, com os anexos ao lado. Restaurar **junta**
com o que já existe; nunca apaga.

## Para quem mexe no código

```bash
npm install
npm run dev        # http://localhost:5173/digital-personal-book/
npm test           # testes
npm run typecheck
npm run build      # gera dist/
```

A publicação é automática: todo push na `main` roda os testes e, se passarem,
publica na branch `gh-pages`. A arquitetura está em `ARQUITETURA.md`.
