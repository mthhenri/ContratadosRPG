import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, finalize, merge, Subscription } from 'rxjs';

import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { EncontroStatusEnum, RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { CampanhaProjecaoService } from '../../../campanha/campanha-projecao.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { CartaoCombatente } from '../../componentes/cartao-combatente/cartao-combatente.component';
import { TrilhaTurnos } from '../../componentes/trilha-turnos/trilha-turnos.component';
import {
  combatenteEhDaVez,
  combatenteJaAgiu,
  montarCombatentesVisuais,
  resolverNivelAmeaca,
  type CombatenteVisualDto,
} from '../../encontro-leitura.util';
import { rotuloStatusEncontro } from '../../rotulos-encontro';
import type { CenaRecuperadaDto } from "@contratados-rpg/shared/dtos/cena";
import { CenaTipoEnum } from "@contratados-rpg/shared/enums";
import { cenaTemIniciativa } from "@contratados-rpg/shared/regras/cena";
import { rotuloStatusCena, rotuloTipoCena } from "../../../cena/rotulos-cena";
import { DocumentosCenaEspectador } from "../../../cena/componentes/documentos-cena-espectador/documentos-cena-espectador.component";
import { EspectadorFichaCard } from "../../../campanha/componentes/espectador-ficha-card/espectador-ficha-card.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { agruparFichasPorMembro, ordenarMembros } from "../../../campanha/campanha-equipe.util";

/**
 * Cena atual no recorte próprio do espectador, também usado pela prévia do mestre.
 * A composição preserva a Iniciativa existente e acrescenta o palco de agentes e os
 * documentos da Investigação sem consultar rotas de gestão, fichas completas ou cadernos.
 * Análogos: PainelCenaSemIniciativaJogador e a casca própria PainelEncontroEspectador.
 */
@Component({
  selector: 'app-painel-encontro-espectador',
  imports: [
    RouterLink,
    Icone,
    Tooltip,
    BotaoIcone,
    Chip,
    Esqueleto,
    EstadoVazio,
    TrilhaTurnos,
    CartaoCombatente,
    HistoricoRolagensSidebar,
    DocumentosCenaEspectador,
    EspectadorFichaCard,
    Botao,
  ],
  templateUrl: './painel-espectador.page.html',
  styleUrl: './painel-espectador.page.scss',
})
export class PainelEncontroEspectador {
  protected readonly janelaHistorico = inject(HistoricoRolagensJanelaService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly campanhaProjecaoService = inject(CampanhaProjecaoService);
  private readonly rolagemService = inject(RolagemService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha, lido do parâmetro de rota (`/campanhas/:id/espectador/iniciativa`). */
  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('id'));
  protected readonly rotuloStatusEncontro = rotuloStatusEncontro;

  protected readonly carregando = signal(true);
  protected readonly falha = signal(false);
  protected readonly cena = signal<CenaRecuperadaDto | null>(null);
  protected readonly painel = signal<CampanhaPainelEspectadorDto | null>(null);
  protected readonly temIniciativa = computed(() => {
    const cena = this.cena();
    return cena !== null && cenaTemIniciativa(cena.tipo);
  });
  protected readonly ehInvestigacao = computed(() => this.cena()?.tipo === CenaTipoEnum.INVESTIGACAO);
  protected readonly rotuloTipoCena = rotuloTipoCena;
  protected readonly rotuloStatusCena = rotuloStatusCena;
  protected readonly agentes = computed(() => {
    const painel = this.painel();
    if (!painel) { return []; }
    const porMembro = agruparFichasPorMembro(painel.fichas);
    return ordenarMembros(painel.membros).flatMap((membro) =>
      (porMembro.get(membro.usuarioId) ?? []).map((ficha) => ({
        ...ficha, donoNome: membro.nome,
      })),
    );
  });
  private cargaCena?: Subscription;
  private geracaoCena = 0;
  private cargaPainel?: Subscription;
  private cargaRolagens?: Subscription;
  private geracaoPainel = 0;
  protected readonly campanhaNome = signal<string | null>(null);
  protected readonly encontro = signal<EncontroRecuperadoDto | null>(null);
  protected readonly emCombate = computed(
    () => this.encontro()?.status === EncontroStatusEnum.ATIVO,
  );

  protected readonly rolagens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregandoRolagens = signal(true);

  /**
   * Achata `combatentes` + `ordemRodada` numa lista visual — mesma derivação de
   * `IniciativaLeitura`.
   */
  protected readonly combatentesVisuais = computed<readonly CombatenteVisualDto[]>(() =>
    montarCombatentesVisuais(this.encontro()),
  );

  constructor() {
    effect(() => this.topbarContexto.definir(this.campanhaNome()));
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    const painelInicial = this.rotaAtiva.snapshot.data?.['painelEspectador'] as
      | CampanhaPainelEspectadorDto
      | undefined;
    if (painelInicial) {
      this.aplicarPainel(painelInicial);
    } else {
      this.carregarPainel();
    }

    this.cargaRolagens = this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(takeUntilDestroyed(), finalize(() => this.carregandoRolagens.set(false)))
      // Espectador real só recebe públicas; o mestre em prévia recebe também as privadas — a
      // prévia mostra o recorte do espectador, então só as públicas entram.
      .subscribe({
        next: (itens) =>
          this.rolagens.set(
            itens.filter((rolagem) => rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA),
          ),
      });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    // Feed em tempo real (m8-03): só rolagens `PUBLICA` chegam pela sala do espectador — o backend
    // nunca broadcasta privada por ali (§9). O mestre em prévia, porém, está na sala
    // `campanha:<id>:mestre`, que recebe as privadas: o filtro mantém o recorte do espectador.
    // Guarda contra duplicata do id mais recente, igual `espectador.page.ts`.
    this.tempoRealService.rolagemRegistrada$
      .pipe(
        filter((rolagem) => rolagem.campanhaId === this.campanhaId
          && rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA),
        takeUntilDestroyed(),
      )
      .subscribe({
      next: (rolagem) =>
        this.rolagens.update((atuais) =>
          atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais],
        ),
    });

    // Encontro alterado (m8-05): nunca confia no payload do socket (pode carregar o recorte de
    // MESTRE, para quem está em prévia) — só o refetch via REST garante o mesmo resultado para
    // ESPECTADOR real e MESTRE em prévia.
    this.tempoRealService.encontroAlterado$
      .pipe(
        filter((evento) => evento.encontro.campanhaId === this.campanhaId),
        takeUntilDestroyed(),
      )
      .subscribe({ next: () => this.recarregarCena() });

    merge(
      this.tempoRealService.cenaAlterada$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
      ),
      this.tempoRealService.reconexao$,
    ).pipe(takeUntilDestroyed()).subscribe(() => {
      this.recarregarCena();
      this.carregarPainel(false);
    });
    this.tempoRealService.campanhaAcessoAlterado$
      .pipe(filter((evento) => evento.campanhaId === this.campanhaId), takeUntilDestroyed())
      .subscribe(() => {
        ++this.geracaoPainel;
        this.cargaPainel?.unsubscribe();
        this.cargaRolagens?.unsubscribe();
        this.aplicarCena(null);
        this.painel.set(null);
        this.rolagens.set([]);
        this.recarregarCena();
      });
  }

  private aplicarPainel(painel: CampanhaPainelEspectadorDto): void {
    this.campanhaNome.set(painel.campanha.nome);
    this.painel.set(painel);
    this.aplicarCena(painel.cenaAtiva ?? null);
    this.carregando.set(false);
  }

  private carregarPainel(reconciliarCena = true): void {
    const geracao = ++this.geracaoPainel;
    this.cargaPainel?.unsubscribe();
    this.cargaPainel = this.campanhaProjecaoService
      .recuperarPainelEspectador(this.campanhaId, 1, 20)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (painel) => {
        if (geracao !== this.geracaoPainel) { return; }
        if (reconciliarCena) { this.aplicarPainel(painel); }
        else {
          this.painel.set(painel);
          this.campanhaNome.set(painel.campanha.nome);
          this.rolagens.set(painel.rolagens.itens);
        }
      },
      error: () => {
        this.aplicarCena(null);
        this.carregando.set(false);
        this.falha.set(true);
      },
    });
  }

  protected recarregarCena(): void {
    const geracao = ++this.geracaoCena;
    this.cargaCena?.unsubscribe();
    this.falha.set(false);
    this.cargaCena = this.campanhaProjecaoService
      .recuperarCenaAtivaPainelEspectador(this.campanhaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cena) => {
          if (geracao !== this.geracaoCena) { return; }
          this.aplicarCena(cena);
          this.carregando.set(false);
        },
        error: () => {
          if (geracao !== this.geracaoCena) { return; }
          this.aplicarCena(null);
          this.carregando.set(false);
          this.falha.set(true);
        },
      });
  }

  private aplicarCena(cena: CenaRecuperadaDto | null): void {
    this.cena.set(cena);
    this.encontro.set(cena && cenaTemIniciativa(cena.tipo) ? cena.encontro : null);
  }

  protected ehDaVez(combatente: CombatenteVisualDto): boolean {
    return combatenteEhDaVez(combatente, this.encontro());
  }

  protected jaAgiu(combatente: CombatenteVisualDto): boolean {
    return combatenteJaAgiu(combatente, this.encontro());
  }

  protected nivelAmeaca(combatente: CombatenteVisualDto) {
    // Espectador não recebe fichas de `CRIATURA` no payload (`m8-07` — só agentes); sem lista pra
    // cruzar, o Nível de Ameaça sai `null`, igual `IniciativaLeitura` já faz hoje no modal.
    return resolverNivelAmeaca(combatente, []);
  }
}
