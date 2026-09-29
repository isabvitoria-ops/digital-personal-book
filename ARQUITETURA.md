# Arquitetura — Meu Caderno

Decisões e o porquê de cada uma. Aprovado pela Isabela em 29/09/2026:
repositório `digital-personal-book`, dados no aparelho + (depois) repositório
privado de dados, e as seis áreas sugeridas.

## Riscos que guiam tudo

1. **Abandono**, quando anotar dá trabalho. Resposta: Inbox, "+" sem perguntas e
   salvamento automático.
2. **Coisas divididas entre celular e computador.** Resposta: backup que junta
   (hoje) e sincronização com repositório privado (fase C2).
3. **Perder tudo.** Resposta: backup .zip legível sem o app, pedido de
   armazenamento persistente e app instalável.
4. **Etiquetas demais.** Resposta: quatro marcadores fixos, que ela pode
   renomear mas não multiplicar.
5. **Níveis demais.** Resposta: Área → Caderno → (Seção) → Página.

## Pilha

| Peça | Escolha | Por quê |
|---|---|---|
| Tela | React + TypeScript + Vite | comum, estável, fácil de manter |
| Dados | IndexedDB via Dexie | fica no aparelho, funciona sem internet |
| Editor | TipTap 3 + @tiptap/markdown | Markdown é a fonte; o teste garante ida e volta sem deformar |
| Busca | MiniSearch | sem acento, prefixo, um erro de digitação, título pesa mais |
| Backup | JSZip | .zip com .md + anexos + caderno.json |
| Offline | vite-plugin-pwa | instalável; abre sem internet |
| Impressão | marked + "Salvar como PDF" do navegador | sem biblioteca de PDF |

Sem fonte, ícone ou serviço externo: o app abre igual daqui a dez anos.

## Modelo de dados (`src/dados/tipos.ts`)

- **Área**: nome, ordem, arquivada.
- **Caderno**: área, nome, tipo (comum, curso, livro, projeto), ficha
  (situação, autor ou professor, plataforma, link, datas), seções,
  ordenação, arquivado.
- **Página**: caderno (null = Inbox), seção, título, **conteúdo em Markdown**,
  tipo (nota ou artigo), situação do artigo, fonte, marcadores, favorita,
  revisar em, datas de criação, atualização e abertura, e data de ida para a
  lixeira.
- **Anexo**: página, nome, tipo, tamanho, arquivo.

Links internos no Markdown: `[Título](pagina:ID)` e `[arquivo.pdf](anexo:ID)`.
O id nunca muda, então os links sobrevivem a renomear e a mover.

## Backup (`src/dados/backup.ts`)

```
LEIA-ME.txt
caderno.json                          ← restauração fiel
Inbox/<título> - <id>.md
<Área>/<Caderno>/[<Seção>/]<título> - <id>.md
Lixeira/…
anexos/<id>-<nome>
```

Cada `.md` tem, no topo, o id, o título, o tipo, os marcadores, a data de
revisão e as datas de criação e atualização. Os links viram caminhos
relativos que qualquer programa abre.

**Restaurar = juntar**: o que só existe no backup entra; o que existe nos dois
fica com a versão editada por último; nada é apagado.

## Sincronização (`src/sincronia/`)

Liga o celular e o computador por um repositório **privado** dela no GitHub
(só de dados; o app se recusa a usar repositório público).

```
LEIA-ME.md, INDICE.md        para ela navegar pelo GitHub
estrutura.json               áreas e cadernos
sincronia.json               manifesto: data de cada página, anexos, apagados
paginas/<id>.md              a página: informações no topo + Markdown
anexos/<id>/<nome>           PDFs e imagens
```

- A página mora em `paginas/<id>.md`: renomear não muda o caminho.
- Regra única: **vence a versão editada por último** (por página, área e
  caderno). Anexo não muda depois de criado.
- "Apagar para sempre" deixa um registro (`apagados`) para o outro aparelho
  apagar também.
- Cada sincronização é **um commit** (API de blobs/árvores/commits). Se outro
  aparelho gravou no meio, o GitHub recusa e a sincronização recomeça.
- Automática: ao abrir, a cada 3 minutos com o app aberto, ao voltar ao app e
  ao reconectar.
- Chave: *fine-grained token* só com `Contents: Read and write` no repositório
  de dados. Fica no aparelho (IndexedDB), nunca no código.

Testes: `testes/sincronia.test.ts` simula dois aparelhos num repositório em
memória (`src/sincronia/memoria.ts`).

## Fases

- **C1**: app local completo, backup e restauração.
- **C2**: sincronização com o repositório privado de dados.
- **Depois, se fizer falta**: busca dentro do texto dos PDFs.
