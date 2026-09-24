import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';

import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { AutoFocus } from '../auto-focus/auto-focus.directive';
import { Icone } from '../icone/icone.component';
import { OverflowFade } from '../overflow-fade/overflow-fade.directive';
import { montarAutoriaRolagem } from "../cartao-rolagem/autoria-rolagem.util";
import { CartaoRolagem } from '../cartao-rolagem/cartao-rolagem.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { EstadoVazio } from '../ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../ui/esqueleto/esqueleto.component';
import {
  HistoricoRolagensJanelaService,
  type OrigemJanelaCampanha,
} from './historico-rolagens-janela.service';

/**
 * Barra lateral de histórico de rolagens — substitui a antiga listagem embutida no painel da
 * campanha (card "Rolagens Recentes", pouco legível numa faixa estreita) e reusa a mesma UI
 * dentro da ficha do jogador. As duas telas consomem o mesmo `RolagemResumoDto` (`shared/dtos/
 * rolagem`), então o componente é puramente apresentacional — quem chama já resolveu o
 * carregamento/paginação (feed ao vivo da campanha ou histórico paginado da ficha).
 *
 * **Autocontido**: o gatilho (ícone D20) e o painel moram os dois aqui dentro — quem consome só
 * declara `<app-historico-rolagens-sidebar [itens]="..." />` uma vez, tipicamente no cabeçalho da
 * página (mesmo padrão de `CalculadoraFlutuante`/`BandejaDados`, `:host { display: contents }`).
 *
 * O painel é `position: fixed`; a tag **não pode** viver dentro de um ancestral com `overflow` +
 * `mask-image` (`appOverflowFade`), senão a pintura recorta o painel mesmo sendo `fixed` — mesma
 * armadilha documentada em `CampanhaDetalhe` (`menuFichaAberto`).
 */
@Component({
  selector: 'app-historico-rolagens-sidebar',
  imports: [
    Icone,
    CartaoRolagem,
    OverflowFade,
    AutoFocus,
    Tooltip,
    Botao,
    BotaoIcone,
    EstadoVazio,
    Esqueleto,
  ],
  templateUrl: './historico-rolagens-sidebar.component.html',
  styleUrl: './historico-rolagens-sidebar.component.scss',
})
export class HistoricoRolagensSidebar {
  private readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  readonly titulo = input('Histórico de Rolagens');
  readonly itens = input.required<readonly RolagemResumoDto[]>();
  readonly carregando = input(false);
  readonly carregandoMais = input(false);
  readonly temMais = input(false);
  /** `false` na ficha (o nome dela já é óbvio pelo contexto — evita "· <mesmo nome>" repetido). */
  readonly mostrarFicha = input(true);
  /**
   * `true` só na ficha (m3-61) — o gatilho flutuante do desktop empilha 60px mais alto, acima do
   * gatilho de `CalculadoraFlutuante`, que só existe naquela tela. No painel da campanha (padrão,
   * `false`) não há calculadora para dar espaço, então o gatilho fica direto no rodapé, sem o vão.
   */
  readonly acimaDaCalculadora = input(false);
  /** Oculta o gatilho próprio quando a página oferece a ação pela coluna lateral. */
  readonly mostrarGatilho = input(true);
  /**
   * Coluna fixa da página (`ui-37`, Iniciativa do mestre) em vez de painel sobreposto: sempre
   * renderizada, sem gatilho, sem fundo, sem botão de fechar, sem animação e sem foco automático.
   * O painel preenche o container posicionado que o hospeda (`position: absolute; inset: 0`), então
   * quem hospeda define a largura e a altura — a lista rola por dentro, sem alargar a linha.
   */
  readonly fixo = input(false);
  /** ID presente apenas quando o painel sobreposto pertence a uma ficha. */
  readonly fichaIdJanela = input<number | null>(null);
  readonly tipoFichaJanela = input<'jogador' | 'criatura'>('jogador');
  /** ID presente quando o histórico pertence ao feed da campanha, inclusive em colunas fixas. */
  readonly campanhaIdJanela = input<number | null>(null);
  /** Só muda o "Voltar" da janela da campanha; `espectador` nas visões do espectador. */
  readonly origemJanela = input<OrigemJanelaCampanha>('campanha');

  readonly carregarMais = output<void>();
  /**
   * P-021: no mobile este painel é full-bleed e cobre o gatilho da calculadora, que mora no
   * cabeçalho da página — sem jeito de abri-la enquanto o histórico está aberto. Só emitido quando
   * há um botão "Abrir calculadora" pra clicar (mobile, `acimaDaCalculadora` true — mesmo sinal já
   * usado pra saber que existe uma calculadora pareada nesta tela); quem consome decide o que abrir.
   */
  readonly abrirCalculadora = output<void>();

  /** Estado bidirecional para a página reservar a faixa da barra lateral quando ela está aberta. */
  readonly aberto = model(false);
  /** Mantém o DOM durante a saída, mesmo depois de devolver a coluna para a página. */
  protected readonly painelRenderizado = signal(false);
  protected readonly saindo = signal(false);
  /** O painel existe no DOM: sempre na coluna fixa; no modo sobreposto, só enquanto aberto/saindo. */
  protected readonly emJanela = computed(() => {
    const fichaId = this.fichaIdJanela();
    const campanhaId = this.campanhaIdJanela();
    return fichaId !== null
      ? this.janelaHistorico.estaAbertaFicha(fichaId)
      : campanhaId !== null && this.janelaHistorico.estaAbertaCampanha(campanhaId);
  });
  protected readonly renderizado = computed(
    () => !this.emJanela() && (this.fixo() || this.painelRenderizado()),
  );
  private encerramentoPendente: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Reage a `aberto` mudar por QUALQUER via — clique do próprio gatilho ou a página fechando
    // este painel de fora (mútua exclusão com outra barra lateral, ex. `CampanhaDetalhe`) —, não
    // só pelo antigo par `abrir`/`fechar` interno. Sem isto, um fechamento externo (via
    // `[(aberto)]`) nunca desmontava o painel: `painelRenderizado` ficava preso em `true` e o
    // painel continuava renderizado por baixo do que abriu depois, reaparecendo se aquele outro
    // fosse fechado.
    effect(() => {
      if (this.aberto()) {
        if (this.encerramentoPendente) {
          clearTimeout(this.encerramentoPendente);
          this.encerramentoPendente = null;
        }
        this.painelRenderizado.set(true);
        this.saindo.set(false);
        return;
      }
      untracked(() => {
        if (!this.painelRenderizado()) {
          return;
        }
        this.saindo.set(true);
        this.encerramentoPendente = setTimeout(() => {
          this.painelRenderizado.set(false);
          this.saindo.set(false);
          this.encerramentoPendente = null;
        }, 260);
      });
    });
  }

  protected alternar(): void {
    this.aberto.update((atual) => !atual);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  protected abrirEmJanela(): void {
    const fichaId = this.fichaIdJanela();
    const campanhaId = this.campanhaIdJanela();
    if (fichaId !== null) this.janelaHistorico.abrirFicha(fichaId, this.tipoFichaJanela());
    else if (campanhaId !== null) {
      this.janelaHistorico.abrirCampanha(campanhaId, this.origemJanela());
    }
  }

  /** Autor + (opcionalmente) a origem da rolagem — ver `montarAutoriaRolagem`. */
  protected metaAutor(item: RolagemResumoDto): string {
    return montarAutoriaRolagem(item, this.mostrarFicha());
  }
}
