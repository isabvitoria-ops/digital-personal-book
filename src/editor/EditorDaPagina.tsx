import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { extensoesDoEditor } from "./extensoes";
import { abrirAnexo, enderecoDoAnexo } from "./anexos";
import { criarPagina, guardarAnexo } from "../dados/operacoes";
import { novoId } from "../dados/ids";
import { EscolherPagina, type PaginaEscolhida } from "../componentes/EscolherPagina";
import { Icone, type NomeIcone } from "../componentes/Icone";
import { useDialogos } from "../app/Dialogos";
import { nomeComExtensaoJpg, prepararImagem } from "../util/arquivos";

const PLACEHOLDER = "Escreva aqui…  Digite [[ para citar outra página.";

/**
 * O editor da página.
 *
 * Ele não salva sozinho: avisa `aoMudar` a cada alteração, e quem salva (com
 * pausa, para não gravar a cada letra) é a tela da página. Assim o salvamento
 * mora num lugar só.
 */
export function EditorDaPagina({
  paginaId,
  conteudoInicial,
  aoCriar,
  aoMudar,
  abrirPagina,
}: {
  paginaId: string;
  conteudoInicial: string;
  aoCriar: (editor: Editor) => void;
  aoMudar: () => void;
  abrirPagina: (id: string) => void;
}) {
  const [escolhendoPagina, definirEscolhendoPagina] = useState(false);
  const { avisar } = useDialogos();
  const entradaImagem = useRef<HTMLInputElement>(null);
  const entradaAnexo = useRef<HTMLInputElement>(null);
  // As funções mudam a cada render; o editor é criado uma vez. As refs fazem
  // a ponte para ele sempre chamar a versão atual.
  const aoMudarRef = useRef(aoMudar);
  aoMudarRef.current = aoMudar;
  const abrirPaginaRef = useRef(abrirPagina);
  abrirPaginaRef.current = abrirPagina;
  const anexarRef = useRef<(arquivos: File[]) => void>(() => {});

  const editor = useEditor({
    extensions: extensoesDoEditor(enderecoDoAnexo, PLACEHOLDER),
    content: conteudoInicial,
    contentType: "markdown",
    immediatelyRender: true,
    onCreate: ({ editor }) => aoCriar(editor as Editor),
    onUpdate: () => aoMudarRef.current(),
    editorProps: {
      attributes: { class: "texto-da-pagina", spellcheck: "true", "aria-label": "Texto da página" },
      // [[ abre a janela de citar página.
      handleTextInput: (view, from, _to, texto) => {
        if (texto !== "[") return false;
        const antes = view.state.doc.textBetween(Math.max(0, from - 1), from, "", "");
        if (antes !== "[") return false;
        view.dispatch(view.state.tr.delete(from - 1, from));
        definirEscolhendoPagina(true);
        return true;
      },
      // Tocar num link abre: página do caderno, anexo ou site.
      handleClick: (_view, _pos, evento) => {
        const link = (evento.target as HTMLElement).closest("a");
        const href = link?.getAttribute("href");
        if (!href) return false;
        evento.preventDefault();
        if (href.startsWith("pagina:")) abrirPaginaRef.current(href.slice(7));
        else if (href.startsWith("anexo:")) void abrirAnexo(href.slice(6)).then((ok) => !ok && avisar("Este anexo não está mais neste aparelho."));
        else if (/^(https?:|mailto:)/i.test(href)) window.open(href, "_blank", "noopener");
        return true;
      },
      handlePaste: (_view, evento) => {
        const arquivos = [...(evento.clipboardData?.files ?? [])];
        if (arquivos.length === 0) return false;
        anexarRef.current(arquivos);
        return true;
      },
      handleDrop: (_view, evento) => {
        const arquivos = [...((evento as DragEvent).dataTransfer?.files ?? [])];
        if (arquivos.length === 0) return false;
        evento.preventDefault();
        anexarRef.current(arquivos);
        return true;
      },
    },
  });

  async function anexar(arquivos: File[]) {
    if (!editor) return;
    for (const arquivo of arquivos) {
      const ehImagem = arquivo.type.startsWith("image/");
      const dados = ehImagem ? await prepararImagem(arquivo) : arquivo;
      const nome = ehImagem ? nomeComExtensaoJpg(arquivo.name || "imagem", dados) : arquivo.name || "arquivo";
      const anexo = await guardarAnexo(paginaId, dados, nome);
      const cadeia = editor.chain().focus();
      if (ehImagem) cadeia.setImage({ src: `anexo:${anexo.id}`, alt: nome }).run();
      else
        cadeia
          .insertContent([
            { type: "text", text: `📎 ${nome}`, marks: [{ type: "link", attrs: { href: `anexo:${anexo.id}` } }] },
            { type: "text", text: " " },
          ])
          .run();
    }
  }
  anexarRef.current = (arquivos) => void anexar(arquivos);

  function citarPagina(escolhida: PaginaEscolhida) {
    definirEscolhendoPagina(false);
    if (!editor) return;
    // O id da página nova nasce aqui, antes de gravar: o link entra no texto
    // na hora, e o que ela digitar em seguida não se perde esperando o banco.
    const id = escolhida.nova ? novoId() : escolhida.id;
    editor.view.focus();
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "text", text: escolhida.titulo, marks: [{ type: "link", attrs: { href: `pagina:${id}` } }] },
        { type: "text", text: " " },
      ])
      .run();
    if (escolhida.nova) void criarPagina({ cadernoId: null }, { id, titulo: escolhida.titulo });
  }

  // Ao sair do app no celular (trocar de app, bloquear a tela), o texto
  // precisa já estar salvo: o sistema pode fechar o navegador sem avisar.
  useEffect(() => {
    const aoEsconder = () => document.visibilityState === "hidden" && aoMudarRef.current();
    document.addEventListener("visibilitychange", aoEsconder);
    return () => document.removeEventListener("visibilitychange", aoEsconder);
  }, []);

  if (!editor) return null;

  return (
    <div className="editor">
      <BarraDoEditor
        editor={editor}
        citarPagina={() => definirEscolhendoPagina(true)}
        escolherImagem={() => entradaImagem.current?.click()}
        escolherAnexo={() => entradaAnexo.current?.click()}
      />
      <EditorContent editor={editor} />
      <input
        ref={entradaImagem}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void anexar([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <input
        ref={entradaAnexo}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void anexar([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {escolhendoPagina && (
        <EscolherPagina
          ignorar={paginaId}
          aoEscolher={citarPagina}
          aoFechar={() => {
            definirEscolhendoPagina(false);
            editor.view.focus();
          }}
        />
      )}
    </div>
  );
}

function BarraDoEditor({
  editor,
  citarPagina,
  escolherImagem,
  escolherAnexo,
}: {
  editor: Editor;
  citarPagina: () => void;
  escolherImagem: () => void;
  escolherAnexo: () => void;
}) {
  const { perguntar } = useDialogos();
  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      negrito: e.isActive("bold"),
      italico: e.isActive("italic"),
      lista: e.isActive("bulletList"),
      numerada: e.isActive("orderedList"),
      checklist: e.isActive("taskList"),
      citacao: e.isActive("blockquote"),
      link: e.isActive("link"),
      tabela: e.isActive("table"),
      podeDesfazer: e.can().undo(),
      podeRefazer: e.can().redo(),
    }),
  });

  async function link() {
    if (estado.link) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const endereco = await perguntar({
      titulo: "Link",
      rotulo: "Endereço do site",
      placeholder: "https://…",
      confirmar: "Pôr link",
    });
    if (!endereco) return;
    const href = /^(https?:|mailto:)/i.test(endereco) ? endereco : `https://${endereco}`;
    const { empty } = editor.state.selection;
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent([{ type: "text", text: endereco, marks: [{ type: "link", attrs: { href } }] }, { type: "text", text: " " }])
        .run();
    } else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const b = (icone: NomeIcone | string, rotulo: string, acao: () => void, ativo = false, desligado = false) => (
    <button
      type="button"
      className="botao-barra"
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo}
      disabled={desligado}
      // mousedown, não click: o click tira o foco do texto antes de agir.
      onMouseDown={(e) => e.preventDefault()}
      onClick={acao}
    >
      {icone.length <= 3 ? <span className="letra-barra">{icone}</span> : <Icone nome={icone as NomeIcone} tamanho={19} />}
    </button>
  );
  const c = () => editor.chain().focus();

  return (
    <div className="barra-editor" role="toolbar" aria-label="Formatação">
      <div className="barra-grupo">
        {b("T", "Título", () => c().toggleHeading({ level: 2 }).run(), estado.h2)}
        {b("t", "Subtítulo", () => c().toggleHeading({ level: 3 }).run(), estado.h3)}
        {b("B", "Negrito", () => c().toggleBold().run(), estado.negrito)}
        {b("I", "Itálico", () => c().toggleItalic().run(), estado.italico)}
      </div>
      <div className="barra-grupo">
        {b("lista", "Lista", () => c().toggleBulletList().run(), estado.lista)}
        {b("numerada", "Lista numerada", () => c().toggleOrderedList().run(), estado.numerada)}
        {b("checklist", "Checklist", () => c().toggleTaskList().run(), estado.checklist)}
        {b("citacao", "Citação", () => c().toggleBlockquote().run(), estado.citacao)}
        {b("tabela", "Tabela", () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), estado.tabela)}
      </div>
      <div className="barra-grupo">
        {b("link", estado.link ? "Tirar link" : "Link", () => void link(), estado.link)}
        {b("pagina", "Citar outra página ([[)", citarPagina)}
        {b("imagem", "Imagem", escolherImagem)}
        {b("clipe", "Anexar arquivo (PDF…)", escolherAnexo)}
      </div>
      <div className="barra-grupo">
        {b("desfazer", "Desfazer", () => c().undo().run(), false, !estado.podeDesfazer)}
        {b("refazer", "Refazer", () => c().redo().run(), false, !estado.podeRefazer)}
      </div>
      {estado.tabela && (
        <div className="barra-grupo barra-tabela">
          <button type="button" className="botao-texto" onMouseDown={(e) => e.preventDefault()} onClick={() => c().addRowAfter().run()}>+ linha</button>
          <button type="button" className="botao-texto" onMouseDown={(e) => e.preventDefault()} onClick={() => c().addColumnAfter().run()}>+ coluna</button>
          <button type="button" className="botao-texto" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteRow().run()}>− linha</button>
          <button type="button" className="botao-texto" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteColumn().run()}>− coluna</button>
          <button type="button" className="botao-texto perigo" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteTable().run()}>apagar tabela</button>
        </div>
      )}
    </div>
  );
}
