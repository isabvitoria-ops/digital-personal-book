/**
 * Ícones desenhados à mão, em traço — sem biblioteca, sem fonte externa.
 * Funciona sem internet e não quebra se um pacote sumir daqui a anos.
 */
const DESENHOS = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  buscar: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM21 21l-5.2-5.2",
  mais: "M12 5v14M5 12h14",
  cadernos: "M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 7h7",
  menu: "M4 7h16M4 12h16M4 17h16",
  pontos: "M5 12h.01M12 12h.01M19 12h.01",
  estrela: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z",
  revisar: "M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2",
  curso: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  livro: "M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14",
  artigo: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  tempo: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 3",
  arquivo: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  lixeira: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  backup: "M12 3v12M7 10l5 5 5-5M4 17v3h16v-3",
  voltar: "M15 5l-7 7 7 7",
  seta: "M9 5l7 7-7 7",
  clipe: "M20 11.5 12.2 19.3a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3",
  imagem: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  lista: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  numerada: "M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5c0-1 2.5-1.5 2.5 0 0 1-2.5 2.5-2.5 3.5H6",
  checklist: "M4 5h5v5H4zM5.5 7.5l1 1 2-2M12 7.5h8M4 14h5v5H4zM12 16.5h8",
  citacao: "M5 7v10M9 8h10M9 12h10M9 16h6",
  tabela: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  desfazer: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  refazer: "M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3",
  pagina: "M7 3h7l4 4v14H7zM10 12h5M10 16h5",
  fechar: "M6 6l12 12M18 6 6 18",
  mover: "M3 12h14M13 7l5 5-5 5M21 4v16",
  imprimir: "M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  editar: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  subir: "M12 19V5M6 11l6-6 6 6",
  descer: "M12 5v14M6 13l6 6 6-6",
  abrir: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
} as const;

export type NomeIcone = keyof typeof DESENHOS;

export function Icone({ nome, tamanho = 20, cheio = false }: { nome: NomeIcone; tamanho?: number; cheio?: boolean }) {
  return (
    <svg
      className="icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={cheio ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={DESENHOS[nome]} />
    </svg>
  );
}
