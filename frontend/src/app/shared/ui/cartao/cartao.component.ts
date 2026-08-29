import { Component, input } from '@angular/core';

/**
 * Nível do heading do título. `h2` cobre a maioria das 15 cópias auditadas (`ui-03`), onde o
 * cartão é uma seção dentro de uma página que já tem seu próprio `h1`. `h1` cobre os dois casos
 * (`perfil.page`, `gestao.page`) em que o cartão É o cabeçalho da página.
 */
export type CartaoNivelTitulo = 'h1' | 'h2';

/**
 * Primitivo de cartão de seção (`ui-03` · `P-034`). Substitui as **15** cópias locais completas
 * do bloco `.card` de `docs/design/tema/_componentes.scss` (container + cabeçalho com índice,
 * título e régua) — número medido na auditoria da `ui-03`, não os 5 estimados na spec original.
 *
 * O cabeçalho é opcional: sem `[titulo]`, o cartão é só a caixa (fundo, borda, raio, respiro) ao
 * redor do `<ng-content>`.
 *
 * O índice do cabeçalho entra por projeção (`[cartaoIndice]`), não por input de texto: das 15
 * cópias, a maioria usa um número ou `//`, mas duas usam um ícone (`<app-icone nome="agente" />`)
 * — um único mecanismo de projeção cobre os dois casos sem duplicar API.
 */
@Component({
  selector: 'app-cartao',
  templateUrl: './cartao.component.html',
  styleUrl: './cartao.component.scss',
})
export class Cartao {
  /** Título do cabeçalho. Sem valor, nenhum cabeçalho é renderizado. */
  readonly titulo = input<string>();

  /** Nível do heading do título. */
  readonly nivelTitulo = input<CartaoNivelTitulo>('h2');

  /** Permite que conteúdo projetado no fim do cabeçalho ocupe uma segunda linha no mobile. */
  readonly cabecalhoQuebravel = input(false);
}
