/**
 * O modelo de dados do caderno.
 *
 * Três níveis e um opcional: Área → Caderno → (Seção) → Página. A Inbox não é
 * um lugar a mais: é a página sem caderno (`cadernoId: null`). Assim, anotar
 * nunca exige decidir onde guardar antes de escrever.
 *
 * Todo registro tem um `id` que nunca muda e uma data de atualização. O id é o
 * que mantém links e anexos de pé quando algo troca de nome; a data é o que
 * permite juntar dois backups sem perder nada (vence o mais novo).
 *
 * Datas são texto ISO ("2026-09-29T14:03:00.000Z"): legíveis a olho no backup
 * e ordenáveis como texto. `revisarEm` é só o dia ("2026-10-06").
 */

export type Id = string;

export interface Area {
  id: Id;
  nome: string;
  ordem: number;
  arquivada: boolean;
  criadaEm: string;
  atualizadaEm: string;
}

export type TipoCaderno = "comum" | "curso" | "livro" | "projeto";

export type StatusCaderno = "quero" | "andamento" | "concluido" | "pausado";

/** A ficha de curso, livro ou projeto. Tudo opcional — ficha vazia não é erro. */
export interface Ficha {
  status?: StatusCaderno;
  /** Curso: professor. Livro: autor. */
  autor?: string;
  /** Curso: plataforma ou escola. */
  plataforma?: string;
  link?: string;
  inicio?: string;
  fim?: string;
}

export interface Secao {
  id: Id;
  nome: string;
}

export type Ordenacao = "recentes" | "criacao" | "alfabetica";

export interface Caderno {
  id: Id;
  areaId: Id;
  nome: string;
  tipo: TipoCaderno;
  ficha: Ficha;
  /** Módulos de um curso, capítulos de um livro. Opcional. */
  secoes: Secao[];
  ordenacao: Ordenacao;
  ordem: number;
  arquivado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoPagina = "nota" | "artigo";
export type StatusArtigo = "salvo" | "lido" | "estudado";
export type Marcador = "referencia" | "ideia" | "projeto" | "pergunta";

export const MARCADORES: Marcador[] = ["referencia", "ideia", "projeto", "pergunta"];

export interface Pagina {
  id: Id;
  /** null = está na Inbox. */
  cadernoId: Id | null;
  secaoId: Id | null;
  titulo: string;
  /** O texto, em Markdown. É a única fonte: o editor lê e grava isto. */
  conteudo: string;
  tipo: TipoPagina;
  statusArtigo: StatusArtigo | null;
  /** De onde veio o artigo: link, revista, autores. */
  fonte: string;
  marcadores: Marcador[];
  favorita: boolean;
  /** O dia em que ela quer rever esta página. null = não revisar. */
  revisarEm: string | null;
  criadaEm: string;
  atualizadaEm: string;
  /** Para "continue de onde parou". */
  abertaEm: string | null;
  /** Na lixeira desde quando. null = viva. */
  excluidaEm: string | null;
}

export interface Anexo {
  id: Id;
  paginaId: Id;
  nome: string;
  tipo: string;
  tamanho: number;
  dados: Blob;
  criadoEm: string;
}

export interface Config {
  chave: "geral";
  /** Os nomes dos quatro marcadores. Trocar o nome não mexe nas páginas. */
  nomesMarcadores: Record<Marcador, string>;
  ultimoBackupEm: string | null;
}

export const NOMES_MARCADORES_PADRAO: Record<Marcador, string> = {
  referencia: "Referência",
  ideia: "Ideia",
  projeto: "Projeto",
  pergunta: "Pergunta",
};

export const NOMES_TIPO_CADERNO: Record<TipoCaderno, string> = {
  comum: "Caderno",
  curso: "Curso",
  livro: "Livro",
  projeto: "Projeto",
};

export const NOMES_STATUS_ARTIGO: Record<StatusArtigo, string> = {
  salvo: "Salvo para ler",
  lido: "Lido",
  estudado: "Estudado",
};

export function nomesStatusCaderno(tipo: TipoCaderno): Record<StatusCaderno, string> {
  if (tipo === "livro") {
    return { quero: "Quero ler", andamento: "Lendo", concluido: "Lido", pausado: "Pausado" };
  }
  return { quero: "Quero fazer", andamento: "Em andamento", concluido: "Concluído", pausado: "Pausado" };
}
