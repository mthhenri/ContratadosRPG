import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

import { Marca } from '../marca/marca.component';

let proximoIdTitulo = 0;

/**
 * Documento de contenção — a moldura "Terminal de Contenção" de uma tela de recusa/erro (pn-04),
 * extraída da tela de Acesso negado para valer também nos estados 404/503 dos patchnotes: cabeçalho
 * `// PROTOCOLO DE CONTENÇÃO` com o código, faixa de classificação, bloco da Fundação, mensagem,
 * registro expurgado, avisos e rodapé com ações.
 *
 * Só apresenta: o consumidor decide os textos (inputs) e as ações (projetadas em `[acoes]`, cada uma
 * um `app-botao`; a de ênfase leva a classe `contencao__acao`). Não traz o `<main>` nem o
 * posicionamento — cada tela escolhe o seu (centralizado em rota isolada, dentro da coluna na
 * rota com topbar). `ViewEncapsulation.None` de propósito, como `app-campo`: as classes
 * `contencao__*` precisam alcançar os botões projetados, que pertencem ao consumidor.
 */
@Component({
  selector: 'app-documento-contencao',
  imports: [Marca],
  templateUrl: './documento-contencao.component.html',
  styleUrl: './documento-contencao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'contencao-host' },
})
export class DocumentoContencao {
  /** Código do cabeçalho, no estilo de status HTTP (`403`, `404`, `503`). */
  readonly codigo = input.required<string>();

  /** Faixa de classificação sob o cabeçalho (`CLASSE-██ // …`). */
  readonly classificacao = input.required<string>();

  /** Linha em destaque do bloco da Fundação (o "setor" que responde pela recusa). */
  readonly setor = input.required<string>();

  /** Rótulo pequeno acima do título (`AUTORIZAÇÃO INSUFICIENTE`). */
  readonly rotulo = input.required<string>();

  readonly titulo = input.required<string>();

  /** Parágrafo principal — a frase que diz o que houve e o que fazer. */
  readonly mensagem = input.required<string>();

  /** Parágrafos seguintes, opcionais. */
  readonly paragrafos = input<readonly string[]>([]);

  /** Texto do bloco "REGISTRO" (já expurgado pelo consumidor). Sem valor, o bloco não aparece. */
  readonly registro = input<string>();

  /** Avisos com filete lateral, opcionais. */
  readonly avisos = input<readonly string[]>([]);

  /** Texto miúdo à esquerda do rodapé. */
  readonly rodape = input.required<string>();

  protected readonly idTitulo = `contencao-titulo-${proximoIdTitulo++}`;
}
