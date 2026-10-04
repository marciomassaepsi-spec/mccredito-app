import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Bloco, DadosContrato } from "./contrato";
import { formatCentavos, formatCPF, formatData } from "./format";

const A4: [number, number] = [595.28, 841.89];
const MARGEM = 56;
const LARGURA = A4[0] - MARGEM * 2;
const VERDE = rgb(0.122, 0.498, 0.361);
const CINZA = rgb(0.37, 0.43, 0.4);
const TEXTO = rgb(0.08, 0.13, 0.11);

type Fontes = { normal: PDFFont; negrito: PDFFont };

/**
 * As fontes padrão do PDF usam a codificação WinAnsi: cobrem acentos do
 * português, mas não emojis ou setas. Caracteres sem suporte viram "?".
 */
function seguro(texto: string, fonte: PDFFont): string {
  let saida = "";
  for (const ch of texto.replace(/ /g, " ")) {
    try {
      fonte.encodeText(ch);
      saida += ch;
    } catch {
      saida += "?";
    }
  }
  return saida;
}

class Escritor {
  pagina: PDFPage;
  y: number;

  constructor(
    private doc: PDFDocument,
    private f: Fontes,
    private rodape: string,
  ) {
    this.pagina = this.novaPagina();
    this.y = A4[1] - MARGEM;
  }

  private novaPagina() {
    const p = this.doc.addPage(A4);
    const n = this.doc.getPageCount();
    const texto = seguro(`${this.rodape} · página ${n}`, this.f.normal);
    p.drawText(texto, { x: MARGEM, y: 28, size: 8, font: this.f.normal, color: CINZA });
    return p;
  }

  espaco(altura: number) {
    if (this.y - altura < MARGEM) {
      this.pagina = this.novaPagina();
      this.y = A4[1] - MARGEM;
      return true;
    }
    return false;
  }

  /** Texto com **negrito**, quebrado em linhas. */
  paragrafo(texto: string, tamanho = 10.5, alinhar: "esquerda" | "centro" = "esquerda") {
    const entrelinha = tamanho * 1.45;
    const palavras: Array<{ t: string; negrito: boolean }> = [];
    texto.split("**").forEach((trecho, i) => {
      for (const t of trecho.split(/\s+/).filter(Boolean)) palavras.push({ t, negrito: i % 2 === 1 });
    });

    const linhas: Array<typeof palavras> = [];
    let atual: typeof palavras = [];
    let largura = 0;
    const espaco = this.f.normal.widthOfTextAtSize(" ", tamanho);
    for (const p of palavras) {
      const fonte = p.negrito ? this.f.negrito : this.f.normal;
      const w = fonte.widthOfTextAtSize(seguro(p.t, fonte), tamanho);
      if (atual.length && largura + espaco + w > LARGURA) {
        linhas.push(atual);
        atual = [];
        largura = 0;
      }
      largura += (atual.length ? espaco : 0) + w;
      atual.push(p);
    }
    if (atual.length) linhas.push(atual);

    for (const linha of linhas) {
      this.espaco(entrelinha);
      const larguraLinha = linha.reduce((s, p, i) => {
        const fonte = p.negrito ? this.f.negrito : this.f.normal;
        return s + fonte.widthOfTextAtSize(seguro(p.t, fonte), tamanho) + (i ? espaco : 0);
      }, 0);
      let x = alinhar === "centro" ? MARGEM + (LARGURA - larguraLinha) / 2 : MARGEM;
      for (const p of linha) {
        const fonte = p.negrito ? this.f.negrito : this.f.normal;
        const t = seguro(p.t, fonte);
        this.pagina.drawText(t, { x, y: this.y - tamanho, size: tamanho, font: fonte, color: TEXTO });
        x += fonte.widthOfTextAtSize(t, tamanho) + espaco;
      }
      this.y -= entrelinha;
    }
  }

  titulo(texto: string) {
    this.espaco(40);
    const t = seguro(texto, this.f.negrito);
    const tamanho = 15;
    const w = this.f.negrito.widthOfTextAtSize(t, tamanho);
    this.pagina.drawText(t, { x: MARGEM + (LARGURA - w) / 2, y: this.y - tamanho, size: tamanho, font: this.f.negrito, color: VERDE });
    this.y -= tamanho + 8;
    this.pagina.drawLine({ start: { x: MARGEM, y: this.y }, end: { x: MARGEM + LARGURA, y: this.y }, thickness: 1, color: VERDE });
    this.y -= 14;
  }

  subtitulo(texto: string) {
    this.espaco(36);
    const t = seguro(texto, this.f.negrito);
    this.pagina.drawText(t, { x: MARGEM, y: this.y - 11.5, size: 11.5, font: this.f.negrito, color: VERDE });
    this.y -= 20;
  }

  tabela(parcelas: DadosContrato["parcelas"]) {
    const colunas = [
      { titulo: "Parcela", x: MARGEM + 8, alinhar: "esquerda" as const },
      { titulo: "Vencimento", x: MARGEM + 150, alinhar: "esquerda" as const },
      { titulo: "Valor", x: MARGEM + LARGURA - 8, alinhar: "direita" as const },
    ];
    const altura = 18;
    const cabecalho = () => {
      this.espaco(altura * 2);
      this.pagina.drawRectangle({ x: MARGEM, y: this.y - altura, width: LARGURA, height: altura, color: rgb(0.89, 0.945, 0.918) });
      for (const c of colunas) {
        const w = this.f.negrito.widthOfTextAtSize(c.titulo, 9.5);
        this.pagina.drawText(c.titulo, { x: c.alinhar === "direita" ? c.x - w : c.x, y: this.y - 12.5, size: 9.5, font: this.f.negrito, color: TEXTO });
      }
      this.y -= altura;
    };
    cabecalho();
    for (const p of parcelas) {
      if (this.espaco(altura)) cabecalho();
      const valores = [`${p.numero}ª`, formatData(p.vencimento), formatCentavos(p.valor_centavos)];
      colunas.forEach((c, i) => {
        const t = seguro(valores[i], this.f.normal);
        const w = this.f.normal.widthOfTextAtSize(t, 9.5);
        this.pagina.drawText(t, { x: c.alinhar === "direita" ? c.x - w : c.x, y: this.y - 12.5, size: 9.5, font: this.f.normal, color: TEXTO });
      });
      this.pagina.drawLine({ start: { x: MARGEM, y: this.y - altura }, end: { x: MARGEM + LARGURA, y: this.y - altura }, thickness: 0.5, color: rgb(0.86, 0.9, 0.87) });
      this.y -= altura;
    }
    this.y -= 10;
  }

  assinaturas(credor: string, cliente: string, cpfCliente: string) {
    const bloco = (x: number, linha1: string, linha2: string) => {
      this.pagina.drawLine({ start: { x, y: this.y }, end: { x: x + 220, y: this.y }, thickness: 0.8, color: TEXTO });
      this.pagina.drawText(seguro(linha1, this.f.negrito), { x, y: this.y - 12, size: 9, font: this.f.negrito, color: TEXTO });
      this.pagina.drawText(seguro(linha2, this.f.normal), { x, y: this.y - 24, size: 8.5, font: this.f.normal, color: CINZA });
    };
    this.espaco(170);
    this.y -= 40;
    bloco(MARGEM, credor.slice(0, 45), "CREDOR");
    bloco(MARGEM + LARGURA - 220, cliente.slice(0, 45), `DEVEDOR · CPF ${formatCPF(cpfCliente)}`);
    this.y -= 70;
    bloco(MARGEM, "Testemunha 1", "Nome e CPF:");
    bloco(MARGEM + LARGURA - 220, "Testemunha 2", "Nome e CPF:");
    this.y -= 40;
  }
}

export async function gerarContratoPDF(blocos: Bloco[], dados: DadosContrato): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const credor = dados.empresa.razaoSocial || dados.empresa.nome;
  doc.setTitle(`Contrato - ${dados.cliente.nome}`);
  doc.setAuthor(credor);
  doc.setCreator(dados.empresa.nome);
  doc.setLanguage("pt-BR");

  const f: Fontes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrito: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const e = new Escritor(doc, f, `${dados.empresa.nome} · contrato de ${dados.cliente.nome} · emitido em ${formatData(dados.hoje)}`);

  for (const b of blocos) {
    if (b.tipo === "titulo") e.titulo(b.texto);
    else if (b.tipo === "subtitulo") {
      e.y -= 4;
      e.subtitulo(b.texto);
    } else if (b.tipo === "paragrafo") {
      e.paragrafo(b.texto);
      e.y -= 7;
    } else if (b.tipo === "tabela_parcelas") e.tabela(dados.parcelas);
    else e.assinaturas(credor, dados.cliente.nome, dados.cliente.cpf);
  }
  return doc.save();
}
