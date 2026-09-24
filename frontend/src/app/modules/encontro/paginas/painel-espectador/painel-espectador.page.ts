import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';

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

/**
 * A tela "Iniciativa" — visão do espectador (corrige `P-073`). Mesma casca de
 * `PainelEncontroMestre`/`PainelEncontroJogador` (cabeçalho, trilha de turnos, Rolagens e o palco
 * com a grade de combatentes), mas **arquivo próprio e separado** dos dois — nunca compartilha
 * componente com eles, mesma separação que já existe entre mestre e jogador.
 *
 * **Sem `app-coluna-acoes` e sem condução.** O espectador não gerencia combate nem tem
 * Calculadora/Caderno nesta tela (o Painel do espectador já cobre isso); `app-trilha-turnos`
 * recebe `combatentes` sem `[comAcao]` e `app-cartao-combatente` sem `[ehMestre]`/`[podeAjustar]`
 * — os dois caem no default somente-leitura dos próprios componentes, a mesma composição que
 * `IniciativaLeitura` já usa hoje dentro do modal do Painel do espectador (nunca um segundo motor
 * de leitura da ordem).
 *
 * **Corrige o `P-073`.** A causa raiz do bug era esta tela reusar a rota/dados de
 * `PainelEncontroMestre` (`EncontroPainelDadosService`), que chama `listarMembros`/
 * `GET /ficha?campanhaId`/`GET /campanha/:id` — todos recusados (403) para o papel `ESPECTADOR`.
 * Esta página nunca chama esses endpoints: usa só `CampanhaProjecaoService`
 * (`recuperarPainelEspectador`/`recuperarEncontroAtivoPainelEspectador`, já redigidos pelo
 * backend para quem não vê ficha nenhuma) e `RolagemService.listarPorCampanha` (qualquer membro,
 * inclusive `ESPECTADOR` — o backend já filtra pra só `PUBLICA` de terceiros).
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

    this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
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
        filter((rolagem) => rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA),
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
      .subscribe({ next: () => this.atualizarEncontro() });
  }

  private aplicarPainel(painel: CampanhaPainelEspectadorDto): void {
    this.campanhaNome.set(painel.campanha.nome);
    this.encontro.set(painel.encontroAtivo);
    this.carregando.set(false);
  }

  private carregarPainel(): void {
    this.campanhaProjecaoService.recuperarPainelEspectador(this.campanhaId, 1, 20).subscribe({
      next: (painel) => this.aplicarPainel(painel),
    });
  }

  private atualizarEncontro(): void {
    this.campanhaProjecaoService
      .recuperarEncontroAtivoPainelEspectador(this.campanhaId)
      .subscribe({ next: (encontro) => this.encontro.set(encontro) });
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
