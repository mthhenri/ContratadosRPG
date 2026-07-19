import { Component, signal } from '@angular/core';

/** Uma linha do guia: um trecho de fórmula + o que ele significa. */
interface LinhaGuia {
  readonly codigo: string;
  readonly texto: string;
}

/** Uma seção do guia (um aspecto da gramática de fórmula). */
interface SecaoGuia {
  readonly titulo: string;
  readonly linhas: readonly LinhaGuia[];
}

/** Abreviações de atributo aceitas nas fórmulas (para a nota final). */
const ATRIBUTOS = 'DES FOR LUT PON VIG · INT MED SEN SOC VON';

/**
 * Guia da gramática de fórmula, redigido a partir do motor `shared/regras/rolagem` (m3-16/18/27) e
 * conferido contra `docs/core/sistema-v4.1.0.md` — "Atributos"/"Testes"/"Tipos de Dano". Não há "modo":
 * a fórmula especifica tudo. Texto de interface (não é regra nova).
 */
const SECOES: readonly SecaoGuia[] = [
  {
    titulo: 'Dados',
    linhas: [
      { codigo: '2d6', texto: 'Dois dados de seis faces.' },
      { codigo: 'd20', texto: 'Um dado de vinte (o 1 da frente é opcional).' },
    ],
  },
  {
    titulo: 'Teste de atributo',
    linhas: [
      { codigo: 'LUTd20kh1 + PROF', texto: 'O teste: rola (Luta) d20, mantém o maior (kh1) e soma a Proficiência.' },
      { codigo: 'FORd6', texto: 'Rola (valor de Força) dados de seis — a quantidade vem do atributo.' },
    ],
  },
  {
    titulo: 'Manter maior / menor',
    linhas: [
      { codigo: 'kh1', texto: 'Mantém o 1 maior do pool (keep highest). Bare kh = 1.' },
      { codigo: 'kl2', texto: 'Mantém os 2 menores (keep lowest) — é a desvantagem.' },
    ],
  },
  {
    titulo: 'Margem de crítico',
    linhas: [
      { codigo: 'cm1', texto: 'Conta os dados no valor máximo (d20 → só o 20). Só informa; não altera o total.' },
      { codigo: 'cm2', texto: 'Abre a margem (d20 → 19 e 20).' },
    ],
  },
  {
    titulo: 'Explosão e implosão',
    linhas: [
      { codigo: '4d6!', texto: 'Explode: cada dado no máximo (6) rola outro dado extra. !>=5 explode em 5+.' },
      { codigo: '4d6?', texto: 'Implode: cada dado no mínimo (1) rola outro extra. ?<=2 implode em 2−.' },
    ],
  },
  {
    titulo: 'Atributo como modificador',
    linhas: [
      { codigo: '+LUT', texto: 'Soma o valor de Luta ao total.' },
      { codigo: '-VIG', texto: 'Subtrai o valor de Vigor.' },
    ],
  },
  {
    titulo: 'Multiplicar e dividir atributo',
    linhas: [
      { codigo: 'FOR*3', texto: 'Força vezes três (é o que a Força Bruta soma ao dano).' },
      { codigo: 'LUT/2', texto: 'Metade de Luta, arredondando para baixo.' },
    ],
  },
  {
    titulo: 'Proficiência e Nível',
    linhas: [
      { codigo: '+PROF', texto: 'Soma a Proficiência (= o Nível; Civil = 0). Escreva-a no teste — não entra sozinha.' },
      { codigo: '+NIV', texto: 'Soma o Nível do agente. Valem como atributo: PROFd6, NIV*2, NIV/2.' },
    ],
  },
  {
    titulo: 'Números fixos',
    linhas: [
      { codigo: '+2', texto: 'Soma dois ao total.' },
      { codigo: '-1', texto: 'Subtrai um.' },
    ],
  },
  {
    titulo: 'Tipo de dano',
    linhas: [
      { codigo: '2d8 [Balístico]', texto: 'Marca o dano como Balístico; o total sai separado por tipo.' },
      { codigo: '[Físico-Químico]', texto: 'Dano Composto: metade de cada tipo (a sobra vai para o primeiro).' },
    ],
  },
];

/**
 * Guia de fórmula (m3-22): um botão de info (`?`) ao lado do campo de fórmula que abre um modal
 * ensinando a sintaxe (dados, atributo-como-dado, `× ÷`, tipos de dano, Composto, Teste × Soma).
 *
 * **Componente autocontido** — gerencia o próprio estado de aberto/fechado e não recebe inputs; o
 * conteúdo é estático (a gramática do motor). Reusa o padrão `.ajuda-modal` da calculadora (m1-12):
 * fecha **só por botão** (o "×" ou "Fechar"), sem clique-fora, para não acionar as regras de
 * acessibilidade do lint. Consome apenas os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-guia-formula',
  imports: [],
  templateUrl: './guia-formula.component.html',
  styleUrl: './guia-formula.component.scss',
})
export class GuiaFormula {
  /** Se o modal está aberto. */
  protected readonly aberto = signal(false);

  /** Seções do guia (gramática). */
  protected readonly secoes = SECOES;

  /** Nota final com os atributos aceitos. */
  protected readonly atributos = ATRIBUTOS;

  protected abrir(): void {
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }
}
