import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";

/**
 * O que o editor sabe fazer — e, de propósito, nada além do que o Markdown
 * consegue guardar. Sublinhado, cor de letra e fonte ficam de fora: não
 * sobreviveriam ao arquivo de texto, e o arquivo de texto é o que dura.
 *
 * Dois endereços são nossos:
 *   pagina:ID  link para outra página do caderno
 *   anexo:ID   um arquivo guardado junto (PDF, imagem)
 * O ID nunca muda, então o link não quebra quando a página troca de nome.
 */
function extensoes(imagem: AnyExtension, extras: AnyExtension[] = []): AnyExtension[] {
  return [
    StarterKit.configure({
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["pagina", "anexo"],
        isAllowedUri: (url) => /^(https?:|mailto:|pagina:|anexo:)/i.test(url),
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: false } }),
    imagem,
    Markdown,
    ...extras,
  ];
}

/** Sem tela: para os testes e para converter texto fora do editor. */
export function extensoesBase(): AnyExtension[] {
  return extensoes(Image.configure({ inline: false, allowBase64: false }));
}

/**
 * No editor de verdade, a imagem guardada como "anexo:ID" precisa virar um
 * endereço que o navegador mostra. O Markdown continua com "anexo:ID" — só
 * a tela troca.
 */
export function extensoesDoEditor(
  resolverImagem: (id: string) => Promise<string | null>,
  placeholder: string,
): AnyExtension[] {
  const ImagemDoCaderno = Image.extend({
    addNodeView() {
      return ({ node }) => {
        const img = document.createElement("img");
        let atual = "";
        const aplicar = (src: string, alt: string) => {
          img.alt = alt;
          if (src === atual) return;
          atual = src;
          img.classList.remove("imagem-faltando");
          if (src.startsWith("anexo:")) {
            img.removeAttribute("src");
            void resolverImagem(src.slice(6)).then((url) => {
              if (atual !== src) return;
              if (url) img.src = url;
              else img.classList.add("imagem-faltando");
            });
          } else {
            img.src = src;
          }
        };
        aplicar(node.attrs.src ?? "", node.attrs.alt ?? "");
        return {
          dom: img,
          update: (novo) => {
            if (novo.type.name !== "image") return false;
            aplicar(novo.attrs.src ?? "", novo.attrs.alt ?? "");
            return true;
          },
        };
      };
    },
  }).configure({ inline: false, allowBase64: false });

  return extensoes(ImagemDoCaderno, [Placeholder.configure({ placeholder })]);
}
