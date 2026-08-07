import type { ClasseEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { obterLimitesClasse } from './limites';
import { calcularProgressaoAcumulada } from './progressao';

export interface OrcamentoAtributosCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

export interface DistribuicaoAtributosValidarDto extends OrcamentoAtributosCalcularDto {
  readonly atributos: FichaAtributosDto;
}

export interface OrcamentoAtributosDto {
  readonly pontosCriacao: 4;
  readonly pontosNivel: number;
  readonly pontosTotais: number;
  readonly maximoNaCriacao: 3;
  readonly maximoDemaisNaCriacao: 2;
  readonly maximoFinal: number;
}

export interface DistribuicaoAtributosDto {
  readonly gastos: number;
  readonly saldo: number;
  readonly violacoes: readonly string[];
}

const CHAVES_ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor',
  'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];

export function calcularOrcamentoAtributos(dto: OrcamentoAtributosCalcularDto): OrcamentoAtributosDto {
  const pontosNivel = calcularProgressaoAcumulada(dto).atributos;
  return {
    pontosCriacao: 4,
    pontosNivel,
    pontosTotais: 4 + pontosNivel,
    maximoNaCriacao: 3,
    maximoDemaisNaCriacao: 2,
    maximoFinal: obterLimitesClasse({ classe: dto.classe }).atributoMaximo,
  };
}

export function validarDistribuicaoAtributos(dto: DistribuicaoAtributosValidarDto): DistribuicaoAtributosDto {
  const orcamento = calcularOrcamentoAtributos(dto);
  const valores = CHAVES_ATRIBUTOS.map((chave) => ({ chave, valor: dto.atributos[chave] }));
  const gastos = valores.reduce((total, { valor }) => total + (valor - 1), 0);
  const violacoes: string[] = [];
  const acimaDeDois = valores.filter(({ valor }) => valor > orcamento.maximoDemaisNaCriacao);
  const capacidadeCriacao = valores.reduce(
    (total, { valor }) => total + (Math.min(valor, orcamento.maximoDemaisNaCriacao) - 1),
    acimaDeDois.length ? 1 : 0,
  );

  for (const { chave, valor } of valores) {
    if (valor < 0) violacoes.push(`${chave}: valor abaixo de 0`);
    if (orcamento.pontosNivel === 0 && valor > orcamento.maximoNaCriacao) {
      violacoes.push(`${chave}: valor acima do máximo na criação`);
    }
    if (valor > orcamento.maximoFinal) violacoes.push(`${chave}: valor acima do máximo final`);
  }
  if (gastos > orcamento.pontosTotais) violacoes.push('total de pontos excedido');
  if (orcamento.pontosNivel === 0 && acimaDeDois.length > 1) {
    violacoes.push('apenas um atributo pode ultrapassar 2 na criação');
  }
  if (capacidadeCriacao < orcamento.pontosCriacao) {
    violacoes.push('distribuição final não contém os 4 pontos de criação em uma forma válida');
  }

  return { gastos, saldo: orcamento.pontosTotais - gastos, violacoes };
}
