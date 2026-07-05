import { ClasseEnum } from '../../enums';
import { BeneficiosPorNivel, dadosAgente, dadosCivil } from '../dados';
import { ProgressaoAcumuladaDto, ProgressaoCalcularDto } from './agente.dtos';

/** Tabela de progressão da classe: `dadosCivil` para Civil, `dadosAgente` para as demais. */
function tabelaProgressao(classe: ClasseEnum): BeneficiosPorNivel {
  return classe === ClasseEnum.CIVIL ? dadosCivil : dadosAgente;
}

/**
 * Lista de benefícios ganhos exatamente no Nível (ou Treinamento, para Civis)
 * informado. Nível fora da faixa da tabela retorna lista vazia. Fonte única:
 * tabelas `dadosAgente`/`dadosCivil` migradas na m1-01.
 */
export function calcularBeneficiosNivel(dto: ProgressaoCalcularDto): readonly string[] {
  return tabelaProgressao(dto.classe)[dto.nivel] ?? [];
}

/**
 * Contagem acumulada dos ganhos de progressão do Nível 1 até o Nível informado,
 * agrupados por tipo. Reproduz a categorização da calculadora antiga (parsing dos
 * rótulos da tabela). Para agentes, `habilidadesCivis` fica em 0; para Civis, os
 * campos exclusivos de agente (gerais, classe/arquétipo, outra classe,
 * fortificações) ficam em 0.
 */
export function calcularProgressaoAcumulada(dto: ProgressaoCalcularDto): ProgressaoAcumuladaDto {
  const ehCivil = dto.classe === ClasseEnum.CIVIL;
  const tabela = tabelaProgressao(dto.classe);

  let atributos = 0;
  let habilidadesGerais = 0;
  let habilidadesClasse = 0;
  let habilidadesClasseOuArquetipo = 0;
  let habilidadesOutraClasse = 0;
  let fortificacoes = 0;
  let habilidadesCivis = 0;

  for (let nivelAtual = 1; nivelAtual <= dto.nivel; nivelAtual++) {
    const beneficios = tabela[nivelAtual] ?? [];
    for (const beneficio of beneficios) {
      if (beneficio === '+2 Atributos') atributos += 2;
      else if (beneficio === '+1 Atributo') atributos += 1;

      if (beneficio.includes('Habilidade Geral') && !beneficio.includes('Classe')) habilidadesGerais += 1;
      if (!ehCivil && beneficio.includes('Habilidade de Classe') && !beneficio.includes('Classe ou Arquétipo')) {
        habilidadesClasse += 1;
      }
      if (ehCivil && beneficio.includes('1 Habilidade de Classe')) habilidadesClasse += 1;
      if (beneficio.includes('Classe ou Arquétipo')) habilidadesClasseOuArquetipo += 1;
      if (beneficio.includes('outra classe')) habilidadesOutraClasse += 1;
      if (beneficio.includes('Fortificação')) fortificacoes += 1;
      if (beneficio.includes('Habilidade Civil')) habilidadesCivis += 1;
    }
  }

  return {
    atributos,
    habilidadesGerais,
    habilidadesClasse,
    habilidadesClasseOuArquetipo,
    habilidadesOutraClasse,
    fortificacoes,
    habilidadesCivis,
  };
}
