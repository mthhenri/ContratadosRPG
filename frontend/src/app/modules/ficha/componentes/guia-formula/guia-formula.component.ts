import { Component, signal } from '@angular/core';

import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

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

/** Fontes escalares extras aceitas nas fórmulas — segunda linha da nota final. */
const NOTA_EXTRA = 'Também PROF (proficiência), NIV (nível), CORPO (dano corpo a corpo) e FURTIVO (dano furtivo).';

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
    titulo: 'Dano do agente',
    linhas: [
      { codigo: 'CORPO', texto: 'Vira o Dano C. a C. atual (ex.: 2D6 + FOR [Físico]) — acompanha o agente.' },
      { codigo: 'FURTIVO', texto: 'Vira o Dano Furtivo atual. Civil não tem — a palavra fica sem efeito.' },
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
      { codigo: '2d8 [B]', texto: 'Sigla de 1 letra também vale: F/B/E/Q/G (Físico/Balístico/Explosão/Químico/Geral).' },
      { codigo: '[Físico-Químico]', texto: 'Dano Composto: metade de cada tipo (a sobra vai para o primeiro).' },
    ],
  },
  {
    titulo: 'Atributo + valor como quantidade de dados',
    linhas: [
      { codigo: '(LUT+3)d20', texto: '(Luta + 3) dados de vinte — o parêntese soma antes de virar dado.' },
      { codigo: '(FOR-1)d6kh2', texto: 'Aceita os mesmos operadores por pool depois do dM (kh/kl/cm/!/?).' },
    ],
  },
  {
    titulo: 'Repetir a fórmula inteira',
    linhas: [
      { codigo: '(PONd20kh1cm1+PROF)#3', texto: 'Rola a fórmula inteira 3 vezes, cada uma independente.' },
      { codigo: '(2d6)#5', texto: 'Também vale para dano — 5 rolagens de 2d6 separadas, sem somar.' },
    ],
  },
];

/**
 * Guia de fórmula (m3-22): um botão de info (`?`) ao lado do campo de fórmula que abre um modal
 * ensinando a sintaxe (dados, atributo-como-dado, `× ÷`, tipos de dano, Composto, Teste × Soma).
 *
 * **Componente autocontido** — gerencia o próprio estado de aberto/fechado e não recebe inputs; o
 * conteúdo é estático (a gramática do motor). Sobre `app-modal` (ui-02) desde que o `<dialog>`
 * nativo passou a existir: antes disso, este era um overlay `position: fixed` com
 * `z-index: 1200` só para renderizar por cima do
 * dialog do preset de `FichaRolagens` — e mesmo esse número era um empate perdido contra
 * qualquer conteúdo `position: fixed` mais alto ainda. Como cada `showModal()` empilha no *top
 * layer* do navegador (acima de toda a árvore normal, sem depender de `z-index`), um
 * `<app-guia-formula>` aninhado dentro de outro `app-modal` já abre por cima dele sozinho — a
 * antiga ginástica de delegar pra uma cópia externa via `aoClicar`/`viewChild` deixou de ter
 * função (ver `HISTORY.md`, ui-02).
 */
@Component({
  selector: 'app-guia-formula',
  imports: [Modal, Botao],
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

  /** Segunda linha da nota final — fontes escalares extras (PROF/NIV/CORPO/FURTIVO). */
  protected readonly notaExtra = NOTA_EXTRA;

  protected abrir(): void {
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }
}
