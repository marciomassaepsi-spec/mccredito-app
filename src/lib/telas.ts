import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Chamar numa Server Action, antes do `redirect`, depois de gravar algo que muda
 * valores (pagamento, estorno, quitação, renegociação, vencimento, empréstimo
 * novo, importação...).
 *
 * O Next guarda no navegador as telas já visitadas e as mostra de novo quando o
 * dono volta pelo botão "voltar" do celular, sem perguntar ao servidor. Sem isto,
 * o Painel aparecia com o valor de antes do pagamento. Com `revalidatePath` a
 * resposta da action leva o cabeçalho `x-action-revalidated`, e o navegador
 * descarta essas telas guardadas: Painel, Cobrança, Empréstimos, Clientes e
 * Vendas buscam os valores de novo na próxima visita, pelo menu ou pelo voltar.
 */
export function atualizarTelas() {
  revalidatePath("/", "layout");
}
