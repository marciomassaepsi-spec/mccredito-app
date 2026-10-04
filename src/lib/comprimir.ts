/**
 * Reduz fotos no próprio celular antes de enviar: lado maior com até 1800 px,
 * JPEG 82%. Uma foto de 5 MB costuma virar 300 a 600 KB, ainda legível para
 * documentos. PDFs e arquivos que o navegador não consegue abrir passam como estão.
 */
export async function comprimirImagem(arquivo: File, ladoMaximo = 1800, qualidade = 0.82): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const imagem = await createImageBitmap(arquivo);
    const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
    if (escala === 1 && arquivo.size < 900 * 1024) return arquivo;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    imagem.close();

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

/** Monta o FormData de um formulário trocando o arquivo pela versão reduzida. */
export async function formDataComArquivoReduzido(form: HTMLFormElement, campo = "arquivo"): Promise<FormData> {
  const dados = new FormData(form);
  const original = dados.get(campo);
  if (original instanceof File && original.size > 0) {
    dados.set(campo, await comprimirImagem(original));
  }
  return dados;
}
