/** Dados mínimos de uma modificação do catálogo para desenhar o empilhamento. */
interface DefinicaoEmpilhamento {
  readonly empilhamentosIniciais: number;
  readonly empilhamentoMaximo: number;
}

/** Entrada de `app-empilhamento` para uma modificação aplicada a um item. */
export interface EmpilhamentoModificacao {
  readonly iniciais: number;
  readonly atuais: number;
  readonly maximo: number;
}

/**
 * Resolve iniciais/atuais/máximo de uma modificação aplicada. Do catálogo (inclusive aplicada por
 * Fragmento): iniciais e teto da definição. Custom: 1 inicial e teto gravado na própria mod
 * (`empilhamentoMaximo`, ou os empilhamentos atuais se ausente). Uma mod acima do teto próprio
 * (`ignoraLimiteProprio`) estende as caixas até os empilhamentos atuais, para nunca cortar um
 * empilhamento que o item de fato tem.
 */
export function resolverEmpilhamentoModificacao(
  modificacao: { readonly empilhamentos: number; readonly empilhamentoMaximo?: number },
  definicao?: DefinicaoEmpilhamento | null,
): EmpilhamentoModificacao {
  const teto = definicao
    ? definicao.empilhamentoMaximo
    : modificacao.empilhamentoMaximo ?? modificacao.empilhamentos;
  return {
    iniciais: definicao?.empilhamentosIniciais ?? 1,
    atuais: modificacao.empilhamentos,
    maximo: Math.max(teto, modificacao.empilhamentos, 1),
  };
}
