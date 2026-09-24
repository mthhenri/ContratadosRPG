import { DestroyRef, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaIdentidadeSeguraDto, CampanhaMembroResumoDto, CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaService } from '../../campanha.service';
import { agruparFichasPorMembro, ordenarMembros, type ItemFicha } from '../../campanha-equipe.util';
import { EspectadorFichaCard, type EspectadorFichaCardDados } from '../../componentes/espectador-ficha-card/espectador-ficha-card.component';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { montarAutoriaRolagem } from "../../../../shared/cartao-rolagem/autoria-rolagem.util";
import { CartaoRolagem } from '../../../../shared/cartao-rolagem/cartao-rolagem.component';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ColunaAcoes } from '../../../../shared/ui/coluna-acoes/coluna-acoes.component';
import { ColunaAcoesItem } from '../../../../shared/ui/coluna-acoes/coluna-acoes-item.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';

/** Tamanho de página do feed — mesmo degrau do histórico de rolagens da ficha (`visualizar.page.ts`). */
const ITENS_POR_PAGINA = 20;

/** Acima disso, "Última rolagem" do cartão de ficha volta a ficar vazia (rolagem velha demais). */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Painel do espectador (m8-03) — destino dedicado de quem entrou com o convite de espectador, e
 * prévia do mestre para conferir exatamente esse recorte (`espectadorCampanhaGuard`; decisão de
 * produto #5 de `m8-espectadores-campanha.spec.md`). Composição própria, não uma máscara sobre a
 * visão de mestre/jogador: cabeçalho compacto, selo "Modo espectador", e um feed dominante das
 * rolagens `PUBLICA` da campanha — sem cards de ficha, Equipe, convites, menus de gestão ou
 * qualquer controle de rolagem (o backend já recusaria; aqui eles nunca existem no template).
 *
 * O payload (`CampanhaPainelEspectadorDto`) é idêntico para `ESPECTADOR` e para o `MESTRE` em
 * prévia — quem diferencia a UI (a barra de prévia com "Sair da visualização") é
 * {@link ehMestrePreview}, resolvido à parte via `listarCampanhas` (o único jeito de saber o
 * próprio papel sem chamar uma rota que `ESPECTADOR` não pode acessar, como `listarMembros`).
 */
@Component({
  selector: 'app-campanha-espectador',
  imports: [
    RouterLink,
    Icone,
    OverflowFade,
    CartaoRolagem,
    Botao,
    BotaoIcone,
    Cartao,
    Chip,
    ColunaAcoes,
    ColunaAcoesItem,
    EspectadorFichaCard,
    EstadoVazio,
    Esqueleto,
  ],
  templateUrl: './espectador.page.html',
  styleUrl: './espectador.page.scss',
})
export class CampanhaEspectador {
  protected readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha, lido do parâmetro de rota (`/campanhas/:id/espectador`). */
  protected readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));

  protected alternarRolagensVisiveis(): void {
    if (this.janelaHistorico.estaAbertaCampanha(this.id)) {
      this.janelaHistorico.abrirCampanha(this.id, 'espectador');
      return;
    }
    this.rolagensVisiveis.update((visiveis) => !visiveis);
  }

  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly campanha = signal<CampanhaIdentidadeSeguraDto | null>(null);
  protected readonly rolagens = signal<readonly RolagemResumoDto[]>([]);
  private readonly paginaAtual = signal(0);
  protected readonly temMais = signal(false);

  /**
   * Painel de jogadores (m8-07) — `fichas`/`membros` vêm do mesmo payload do painel, sem consulta
   * própria. `fichasEsquadrao` reusa `agruparFichasPorMembro`/`ordenarMembros`
   * (`campanha-equipe.util.ts`, m8-04) — mesma composição de `CampanhaDetalhe.fichasEsquadrao` —,
   * que já exclui `CRIATURA`: o painel do espectador é só de agentes (`JOGADOR`).
   */
  protected readonly fichas = signal<readonly FichaResumoDto[]>([]);
  protected readonly membros = signal<readonly CampanhaMembroResumoDto[]>([]);
  private readonly membrosOrdenados = computed<readonly CampanhaMembroResumoDto[]>(() =>
    ordenarMembros(this.membros()),
  );
  private readonly fichasPorMembro = computed<ReadonlyMap<number, readonly ItemFicha[]>>(() =>
    agruparFichasPorMembro(this.fichas()),
  );
  protected readonly fichasEsquadrao = computed<readonly EspectadorFichaCardDados[]>(() => {
    const porMembro = this.fichasPorMembro();
    const lista: EspectadorFichaCardDados[] = [];
    for (const membro of this.membrosOrdenados()) {
      for (const ficha of porMembro.get(membro.usuarioId) ?? []) {
        lista.push({ ...ficha, donoNome: membro.nome });
      }
    }
    return lista;
  });
  protected readonly semFichas = computed(
    () => !this.carregando() && this.fichasEsquadrao().length === 0,
  );

  /**
   * "Última rolagem" de uma ficha (entregável 7) — primeira ocorrência daquele `fichaId` no feed
   * já carregado (`rolagens()` vem mais-recente-primeiro). `null` sem nenhuma rolagem carregada
   * daquela ficha — o template mostra "Nenhuma rolagem carregada ainda", nunca "nunca rolou": não
   * dá pra distinguir "nunca rolou" de "a última rolagem pública está fora desta página" sem uma
   * consulta dedicada (fora de escopo — ver spec da task). Também `null` quando a rolagem existe
   * mas passou de `UM_DIA_MS` — rolagem velha demais para valer como "última" no cartão.
   */
  protected ultimaRolagemDe(fichaId: number): RolagemResumoDto | null {
    const rolagem = this.rolagens().find((rolagem) => rolagem.fichaId === fichaId) ?? null;
    if (!rolagem || Date.now() - new Date(rolagem.createdDate).getTime() > UM_DIA_MS) {
      return null;
    }
    return rolagem;
  }

  /**
   * Tempo relativo da última rolagem de uma ficha, ou `null` sem rolagem carregada — mesmo
   * relógio de `tempoRolagem`.
   */
  protected tempoUltimaRolagem(fichaId: number): string | null {
    const rolagem = this.ultimaRolagemDe(fichaId);
    return rolagem && this.tempoRolagem(rolagem);
  }

  /** `true` quando quem abriu esta rota é o mestre da campanha, em prévia (nunca um espectador real). */
  protected readonly ehMestrePreview = signal(false);

  /** Alterna a exibição da descrição da campanha — mesmo padrão de `detalhe-jogador.page.ts`. */
  protected readonly descricaoAberta = signal(false);

  /**
   * Coluna "Rolagens públicas" visível — item "Rolagens" da coluna de ações. Escondê-la libera a
   * largura toda para a grade de fichas (`.espectador__ficha-grid--largura-cheia`).
   */
  protected readonly rolagensVisiveis = signal(true);

  /** Relógio de 5s só para recomputar o tempo relativo das rolagens, sem novo fetch. */
  private readonly agora = signal(Date.now());

  protected tempoRolagem(rolagem: RolagemResumoDto): string {
    return rotuloRelativo(new Date(rolagem.createdDate).getTime(), this.agora());
  }

  /** Autor + origem (ficha, combatente avulso ou "Mestre") — ver `montarAutoriaRolagem`. */
  protected autorRolagem(rolagem: RolagemResumoDto): string {
    return montarAutoriaRolagem(rolagem);
  }

  protected readonly semRolagens = computed(
    () => !this.carregando() && this.rolagens().length === 0,
  );

  constructor() {
    // Slot de contexto da topbar (ui-21) — mesmo padrão de `CampanhaDetalhe`: nome da campanha
    // assim que `campanha()` chega, some ao sair da tela.
    effect(() => this.topbarContexto.definir(this.campanha()?.nome ?? null));
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    const painelInicial = this.rotaAtiva.snapshot.data?.['painelEspectador'] as CampanhaPainelEspectadorDto | undefined;
    if (painelInicial) {
      this.aplicarPainel(painelInicial, 1);
      this.carregando.set(false);
    } else {
      this.carregarPainel(1);
    }
    this.carregarPapel();

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.id);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.id));

    // Feed em tempo real (m8-03) — só rolagens `PUBLICA` chegam por aqui (o backend nunca
    // broadcasta privada, §9), e a sala do espectador nunca recebe outro evento (m8-02: a sala
    // `campanha:<id>:espectador` só é alvo de `rolagem:registrada` público, por construção).
    // Guarda contra duplicata do mesmo id — a rolagem mais recente do feed inicial (REST) pode
    // coincidir com a primeira que chega pelo socket, dependendo de quando cada um resolve.
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.onRolagemRegistrada(rolagem) });
    // Exclusão por ADMIN (I-033): o evento leva só o id, sem conteúdo — mesma sala do registro.
    this.tempoRealService.rolagemExcluida$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (excluida) => this.onRolagemExcluida(excluida.id) });

    const relogio = setInterval(() => this.agora.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  private onRolagemExcluida(id: number): void {
    this.rolagens.update((atuais) => atuais.filter((rolagem) => rolagem.id !== id));
  }

  private onRolagemRegistrada(rolagem: RolagemResumoDto): void {
    this.rolagens.update((atuais) => (atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais]));
  }

  /**
   * Só o mestre consegue `listarCampanhas` retratando o próprio papel como `MESTRE`; um espectador
   * real também consegue chamar essa rota (nunca gateada por papel) e sempre vai encontrar
   * `ESPECTADOR` na própria linha — nunca `MESTRE`, então o `false` é o resultado correto para ele.
   */
  private carregarPapel(): void {
    this.campanhaService.listarCampanhas().subscribe({
      next: (campanhas) => {
        const atual = campanhas.find((campanha) => campanha.id === this.id);
        this.ehMestrePreview.set(atual?.papel === TipoCampanhaMembroPapelEnum.MESTRE);
      },
    });
  }

  private carregarPainel(pagina: number): void {
    const marcarCarregando = pagina === 1 ? this.carregando : this.carregandoMais;
    marcarCarregando.set(true);
    this.campanhaProjecaoService
      .recuperarPainelEspectador(this.id, pagina, ITENS_POR_PAGINA)
      .pipe(finalize(() => marcarCarregando.set(false)))
      .subscribe({
        next: (painel) => this.aplicarPainel(painel, pagina),
      });
  }

  private aplicarPainel(painel: CampanhaPainelEspectadorDto, pagina: number): void {
    this.campanha.set(painel.campanha);
          // `fichas`/`membros` não são paginados (o painel de jogadores devolve o recorte inteiro
          // sempre) — atualiza a cada página, inclusive em "Carregar mais", sem custo extra.
          this.fichas.set(painel.fichas);
          this.membros.set(painel.membros);
          this.rolagens.update((atuais) =>
            pagina === 1 ? painel.rolagens.itens : [...atuais, ...painel.rolagens.itens],
          );
          this.paginaAtual.set(painel.rolagens.paginaAtual);
    this.temMais.set(painel.rolagens.paginaAtual < painel.rolagens.totalPaginas);
  }

  protected carregarMais(): void {
    if (this.carregandoMais() || !this.temMais()) {
      return;
    }
    this.carregarPainel(this.paginaAtual() + 1);
  }
}
