# Meu Caderno — como trabalhar neste projeto

Quem usa é a Isabela, que não é pessoa técnica. Ela pede; quem decide o
caminho técnico é você.

## 🚨 Projeto isolado

Este é um projeto **independente**. Não faz parte do Método Rota, da
calculadora de dieta, do Conversation in English nem de nenhum outro.

- Repositório: `isabvitoria-ops/digital-personal-book`, pasta
  `/home/user/digital-personal-book`, branch `main`.
- Antes de qualquer operação com arquivo, Git ou GitHub: confirme que está
  nesta pasta e neste repositório. **Na dúvida, pare e pergunte a ela.**
- Não copie código, componente, estilo, configuração, variável de ambiente,
  banco, armazenamento ou autenticação dos outros projetos. Não altere, não
  commite e não publique nada nos outros repositórios a partir daqui.
- Este repositório é **público**. As anotações dela **nunca** entram aqui —
  nem de exemplo, nem em teste, nem em captura de tela.

## Regra permanente: o fim de toda resposta

1. **Checklist** de tudo o que ela pediu na conversa, com uma destas marcas e
   nada de meio-termo: **✅ no ar** (publicado e deploy confirmado),
   **⏳** (pronto no código, ainda não publicado), **❌ não fiz** (sempre com
   o motivo em uma linha). Se ela pediu cinco coisas, a lista tem cinco linhas.
2. **Precisa mexer no GitHub?** Sim ou não, sempre. Quando for sim, diga
   **onde clicar** — ela não usa terminal.
3. **Precisa mexer no Supabase?** Este projeto **não usa Supabase**. A
   resposta é sempre "Não" — escreva assim mesmo, porque ela usa Supabase nos
   outros projetos e precisa saber que aqui não.

## Onde as coisas moram

| O quê | Onde |
|---|---|
| Anotações, anexos | IndexedDB do aparelho dela (nunca no GitHub) |
| Código | este repositório, `main` |
| Site publicado | branch `gh-pages`, gerada pela Action "Publicar" |
| Backup | .zip que ela baixa em Mais → Backup |

A sincronização entre aparelhos usa um **segundo repositório, privado**, só de
dados (sugerido: `isabvitoria-ops/caderno-dados`), que ela cria e liga pelo
app (Backup → Sincronizar entre aparelhos). Nunca este. Você **não** mexe no
repositório de dados — ele é das anotações dela.

**O formato no repositório de dados é contrato** (`src/sincronia/formato.ts`):
mudou? Suba `VERSAO` e trate a leitura da versão anterior.

## Publicar

`git push origin main`. A Action **Publicar** roda `npm test`,
`npm run typecheck` e `npm run build` e, se tudo passar, publica. Confirme
que a Action passou antes de dizer que está no ar. Este ambiente não abre
`isabvitoria-ops.github.io`: não diga que viu o site no ar — diga que a
Action passou.

## Antes de publicar

- `npm test`, `npm run typecheck`, `npm run build`.
- Mexeu em tela: rode o app (`npm run build && npx vite preview`) e confira
  no tamanho de celular (390 px e 320 px) e de computador.
- **Formato dos dados é contrato.** O Markdown de cada página, os ids e o
  `caderno.json` do backup precisam continuar legíveis por versões antigas e
  novas. Mudou o formato? Suba `versao` no backup e escreva a conversão.
- Não diga que testou o que não testou.

## Princípios (o que ela pediu)

- Anotar custa quase nada: o "+" nunca pergunta onde guardar.
- Achar de novo é o que importa: busca antes de etiqueta.
- Durar: tudo precisa caber em Markdown. Nada de recurso que o arquivo de
  texto não consiga guardar.
- Sem IA, sem conta, sem nuvem obrigatória. Sem kanban, agenda, painel,
  etiqueta livre ou subárea — cada um desses é um motivo para ela abandonar.

A arquitetura e o porquê de cada decisão estão em `ARQUITETURA.md`.
