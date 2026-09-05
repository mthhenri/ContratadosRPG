import { DestroyRef, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type {
  CampanhaInventarioItemDto,
  CampanhaMembroResumoDto,
  CampanhaPreviaJogadorDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaService } from '../../campanha.service';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import {
  agruparFichasPorMembro,
  montarEquipeExibicao,
  ordenarMembros,
  type EquipeFichaExibicao,
  type ItemFicha,
} from '../../campanha-equipe.util';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { InventarioEsquadrao } from '../../componentes/inventario-esquadrao/inventario-esquadrao.component';
import { IniciativaLeitura } from '../../../encontro/componentes/iniciativa-leitura/iniciativa-leitura.component';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { FichaRolagensPainel } from '../../../ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component';
import { FichaVisualizacao } from '../../../ficha/componentes/ficha-visualizacao/ficha-visualizacao.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

/** Janela da tira "Sessão" — mesma janela de uma hora de `CampanhaDetalhe`. */
const UMA_HORA_MS = 60 * 60 * 1000;

/**
 * Prévia de jogador (m8-04) — o mestre confere a experiência exata de um `JOGADOR` específico da
 * campanha: ficha própria/concedida, Equipe, Rolagens e Sessão, **sourceados da projeção do
 * alvo** (`recuperarPreviaJogador`/`recuperarFichaPreviaJogador`, m8-02/m8-04 backend), nunca dos
 * dados do mestre. Reutiliza os mesmos componentes de `CampanhaDetalhe` (jogador) — `FichaVisualizacao`,
 * `FichaRolagensPainel`, `InventarioEsquadrao`, `app-cartao` — sobre dados diferentes, em vez de
 * duplicar o markup (spec, entregável 2). Substitui o antigo `previewJogador` de `CampanhaDetalhe`
 * (signals + `pointer-events: none`, insuficiente — a prévia não tinha projeção própria).
 *
 * **Sem mutação, de verdade — não só na aparência (spec, entregável 3/critério de aceite):**
 * `ajustavel`/outputs de escrita de `FichaVisualizacao` são puramente `@Output` (o pai decide o
 * que fazer) — aqui ficam **desconectados**, então mirrorar a permissão real do alvo em
 * `[ajustavel]` é seguro (nenhum clique chega a um `HttpClient`). Já `podeRolar` (em
 * `FichaVisualizacao` **e** `FichaRolagensPainel`) e `InventarioEsquadrao` fazem a própria chamada
 * HTTP **internamente** (injetam `FichaRolagemRegistroService`/`CampanhaService`/`FichaService`
 * direto, sem passar por um `@Output` que esta página possa recusar) — para esses dois, o valor é
 * **sempre** o mais restrito (`false`/`somenteLeitura`), nunca o que o alvo realmente poderia
 * fazer: não há como "desconectar" uma chamada que o próprio componente decide disparar.
 */
@Component({
  selector: 'app-campanha-previa-jogador',
  imports: [
    RouterLink,
    Icone,
    OverflowFade,
    BandejaDados,
    FichaVisualizacao,
    FichaRolagensPainel,
    InventarioEsquadrao,
    IniciativaLeitura,
    Botao,
    BotaoIcone,
    Cartao,
    Chip,
    EstadoVazio,
    Esqueleto,
    Modal,
  ],
  providers: [FichaRolagemRegistroService],
  templateUrl: './previa-jogador.page.html',
  styleUrl: './previa-jogador.page.scss',
})
export class CampanhaPreviaJogador {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly bandejaDadosService = inject(BandejaDadosService);
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha e `usuarioAlvoId` do jogador em prévia, lidos da rota (`/campanhas/:id/previa/:usuarioAlvoId`). */
  protected readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));
  protected readonly usuarioAlvoId = Number(this.rotaAtiva.snapshot.paramMap.get('usuarioAlvoId'));

  /** Exposto ao template só para o chip "Mestre" da Equipe (mesmo uso de `CampanhaDetalhe`). */
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly carregando = signal(true);
  protected readonly previa = signal<CampanhaPreviaJogadorDto | null>(null);
  protected readonly inventarioEsquadrao = signal<readonly CampanhaInventarioItemDto[]>([]);
  protected readonly exibindoInventarioJogador = signal(false);
  protected readonly rotuloAlternarInventario = computed(() =>
    this.exibindoInventarioJogador() ? 'Voltar à Equipe' : 'Inventário do esquadrão',
  );

  /** Rótulo do botão "Ver ficha" de um colega na Equipe (linha ≤ 100, evita ternário longo no template). */
  protected rotuloVerFicha(nomeFicha: string, nomeDono: string): string {
    return `Ver ficha de ${nomeFicha} (${nomeDono})`;
  }

  /** Rótulo da carteirinha (sem acesso) de um colega na Equipe — mesmo motivo de {@link rotuloVerFicha}. */
  protected rotuloFichaSemAcesso(nomeFicha: string, nomeDono: string): string {
    return `Ficha de ${nomeFicha} (${nomeDono}) — sem acesso`;
  }

  /** Nome do alvo — vem de `previa().membros`, nunca de um fetch à parte (mesmo dado, uma só chamada). */
  protected readonly nomeAlvo = computed(
    () => this.previa()?.membros.find((membro) => membro.usuarioId === this.usuarioAlvoId)?.nome ?? '',
  );

  protected readonly membrosOrdenados = computed<readonly CampanhaMembroResumoDto[]>(() =>
    ordenarMembros(this.previa()?.membros ?? []),
  );
  protected readonly fichasPorMembro = computed<ReadonlyMap<number, readonly ItemFicha[]>>(() =>
    agruparFichasPorMembro(this.previa()?.fichas ?? []),
  );
  protected readonly equipeExibicao = computed<
    readonly { readonly membro: CampanhaMembroResumoDto; readonly fichas: readonly EquipeFichaExibicao[] }[]
  >(() => montarEquipeExibicao(this.membrosOrdenados(), this.fichasPorMembro()));

  protected readonly fichasDestinoInventario = computed(() =>
    (this.previa()?.fichas ?? [])
      .filter((ficha) => ficha.usuarioId === this.usuarioAlvoId)
      .map(({ id, nome }) => ({ id, nome })),
  );

  /** Feed de rolagens do alvo (própria + públicas de todo mundo) — semeado pela projeção, atualizado ao vivo. */
  protected readonly rolagensFeed = signal<readonly RolagemResumoDto[]>([]);
  private readonly agora = signal(Date.now());
  protected readonly rolagensRecentes = computed(() => {
    const limite = this.agora() - UMA_HORA_MS;
    return this.rolagensFeed().filter((item) => new Date(item.createdDate).getTime() >= limite);
  });
  protected tempoRolagem(rolagem: RolagemResumoDto): string {
    return rotuloRelativo(new Date(rolagem.createdDate).getTime(), this.agora());
  }

  /** `id` da prévia atualmente aberta na bandeja de dados (hover no d20 de um pill) — `null` se nenhuma. */
  private previaRolagemId: number | null = null;

  /** Hover/foco no dadinho d20 de um pill da "Sessão" — mesmo mecanismo de `CampanhaDetalhe`, puramente local (`BandejaDadosService`, nunca uma chamada ao backend). */
  protected mostrarPreviaRolagem(rolagem: RolagemResumoDto): void {
    this.previaRolagemId = this.bandejaDadosService.mostrar({
      rotulo: rolagem.rotulo,
      resultado: rolagem.resultado,
      visibilidade: rolagem.visibilidade,
      corFicha: rolagem.corFicha,
      semAutoSumir: true,
    });
  }

  /** Fim do hover/foco no dadinho d20 — fecha a prévia aberta por {@link mostrarPreviaRolagem}. */
  protected esconderPreviaRolagem(): void {
    if (this.previaRolagemId !== null) {
      this.bandejaDadosService.fechar(this.previaRolagemId);
      this.previaRolagemId = null;
    }
  }

  /** `id` da ficha exibida na coluna principal — semeada com a própria ficha do alvo ao carregar. */
  protected readonly fichaExibidaId = signal<number | null>(null);
  protected readonly fichaExibidaDados = signal<FichaRecuperadaDto | null>(null);
  protected readonly carregandoFichaExibida = signal(false);

  /**
   * `true` quando a ficha exibida é do próprio alvo (mesma regra de `podeAjustarFicha` de
   * `CampanhaDetalhe`, mas para `usuarioAlvoId` — nunca para quem está de fato olhando). Só
   * controla `[ajustavel]` de `FichaVisualizacao` (saída por `@Output`, nunca conectada aqui);
   * `podeRolar` fica sempre `false` (ver doc da classe).
   */
  protected readonly podeAjustarFichaExibida = computed(
    () => this.fichaExibidaDados()?.usuarioId === this.usuarioAlvoId,
  );

  /**
   * Encontro não-encerrado da campanha, já redigido com a identidade do alvo (m8-05) — gatilha
   * "Ver Iniciativa". Vem direto de `previa()?.encontroAtivo` (a mesma projeção que já traz
   * fichas/membros/rolagens), nunca um cálculo próprio desta página.
   */
  protected readonly encontroAtivo = computed(() => this.previa()?.encontroAtivo ?? null);
  protected readonly iniciativaAberta = signal(false);

  protected selecionarFichaExibida(fichaId: number): void {
    if (this.fichaExibidaId() === fichaId) {
      return;
    }
    this.fichaExibidaId.set(fichaId);
  }

  constructor() {
    effect(() => this.topbarContexto.definir(this.previa()?.campanha.nome ?? null));
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.carregarPrevia();
    this.carregarInventario();

    // Fetch da ficha completa (mesmo padrão de `CampanhaDetalhe`) sempre que `fichaExibidaId`
    // muda — a projeção só traz `FichaResumoDto` (sem `dados`); a ficha completa vem de
    // `recuperarFichaPreviaJogador`, redigida/autorizada para o **alvo**, nunca para o mestre.
    effect(() => {
      const fichaId = this.fichaExibidaId();
      if (fichaId === null) {
        return;
      }
      this.carregandoFichaExibida.set(true);
      this.campanhaProjecaoService
        .recuperarFichaPreviaJogador(this.id, this.usuarioAlvoId, fichaId)
        .pipe(finalize(() => this.carregandoFichaExibida.set(false)))
        .subscribe({ next: (ficha) => untracked(() => this.fichaExibidaDados.set(ficha)) });
    });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.id);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.id));

    // Feed em tempo real: só rolagens `PUBLICA` chegam pela sala `campanha:<id>` (o backend nunca
    // broadcasta privada, §9) — sempre seguras de mostrar, sejam de quem forem. Dedup contra a
    // rolagem mais recente do feed inicial (REST), mesmo padrão do Painel do espectador (m8-03).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rolagem) =>
          this.rolagensFeed.update((atuais) => (atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais])),
      });

    // Membro/ficha alterados em algum lugar da campanha (spec, entregável 4: "pode recarregar a
    // projeção") — refaz a projeção inteira, nunca confia no payload do broadcast (que não é
    // redigido para o alvo — `emitirFichaAlterada` redige para *qualquer* ouvinte igual, não
    // especificamente para o alvo desta prévia).
    this.tempoRealService.membroEntrou$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.carregarPrevia() });
    this.tempoRealService.fichaVisibilidadeAlterada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.carregarPrevia() });

    // Ficha alterada: refaz a projeção (Equipe/Esquadrão) e, se for a ficha aberta agora, também
    // o fetch dedicado — via REST (nunca o payload do socket), pela mesma razão acima.
    this.tempoRealService.fichaAlterada$.pipe(takeUntilDestroyed()).subscribe({
      next: (ficha) => {
        this.carregarPrevia();
        if (ficha.id === this.fichaExibidaId()) {
          this.recarregarFichaExibida();
        }
      },
    });

    this.tempoRealService.inventarioAlterado$
      .pipe(filter((evento) => evento.campanhaId === this.id), takeUntilDestroyed())
      .subscribe({ next: () => this.carregarInventario() });

    // Encontro alterado (m8-05): mesmo racional de membroEntrou$/fichaVisibilidadeAlterada$ acima
    // — nunca confia no payload do socket (o mesmo evento carrega o recorte de MESTRE para o
    // mestre de verdade em prévia), refaz a projeção inteira via REST
    // (`recuperarEncontroAtivoParaAlvo`, sempre redigido com a identidade do alvo).
    this.tempoRealService.encontroAlterado$
      .pipe(filter((evento) => evento.encontro.campanhaId === this.id), takeUntilDestroyed())
      .subscribe({ next: () => this.carregarPrevia() });

    const relogio = setInterval(() => this.agora.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  private recarregarFichaExibida(): void {
    const fichaId = this.fichaExibidaId();
    if (fichaId === null) {
      return;
    }
    this.campanhaProjecaoService
      .recuperarFichaPreviaJogador(this.id, this.usuarioAlvoId, fichaId)
      .subscribe({ next: (ficha) => this.fichaExibidaDados.set(ficha) });
  }

  private carregarInventario(): void {
    this.campanhaService
      .recuperarInventario(this.id)
      .subscribe((inventario) => this.inventarioEsquadrao.set(inventario.itens));
  }

  private carregarPrevia(): void {
    this.carregando.set(true);
    this.campanhaProjecaoService
      .recuperarPreviaJogador(this.id, this.usuarioAlvoId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (previa) => {
          this.previa.set(previa);
          this.rolagensFeed.set(previa.rolagens);
          if (this.fichaExibidaId() === null) {
            const propria = previa.fichas.find((ficha) => ficha.usuarioId === this.usuarioAlvoId);
            if (propria) {
              this.fichaExibidaId.set(propria.id);
            }
          }
        },
      });
  }
}
