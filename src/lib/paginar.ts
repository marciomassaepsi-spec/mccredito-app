/**
 * O Supabase devolve no máximo 1000 linhas por consulta (configuração "Max rows"
 * da API), sem avisar quando corta o resto. Numa carteira com muitas parcelas em
 * aberto, o Painel somava só uma parte delas e o total quase não mudava depois de
 * um pagamento: a parcela paga saía da lista e outra, que antes ficava de fora,
 * entrava no lugar.
 *
 * `lerTodas` pede de página em página até uma página vir vazia, então funciona
 * com qualquer limite configurado no Supabase. A consulta precisa ter ordem
 * estável (por exemplo `.order("id")`) para nenhuma linha se repetir ou sumir.
 */
export type Pagina<T, E> = { data: T[] | null; error: E | null };

export const TAMANHO_PAGINA = 1000;
/** Trava de segurança: 200 páginas = 200 mil linhas */
const MAXIMO_PAGINAS = 200;

export async function lerTodas<T, E>(
  pagina: (de: number, ate: number) => PromiseLike<Pagina<T, E>>,
  tamanho = TAMANHO_PAGINA,
): Promise<{ data: T[]; error: E | null }> {
  const linhas: T[] = [];
  for (let i = 0; i < MAXIMO_PAGINAS; i++) {
    const { data, error } = await pagina(linhas.length, linhas.length + tamanho - 1);
    if (error) return { data: linhas, error };
    if (!data || data.length === 0) return { data: linhas, error: null };
    linhas.push(...data);
  }
  return { data: linhas, error: null };
}
