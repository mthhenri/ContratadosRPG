import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, filter, finalize, merge, switchMap } from 'rxjs';

import type { CenaCriadaDto, CenaResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import { CenaStatusEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { CenaCriarDialog } from '../../componentes/cena-criar-dialog/cena-criar-dialog.component';
import { CenaService } from '../../cena.service';
import { rotuloTipoCena } from '../../rotulos-cena';

/**
 * Hub de cenas da campanha (m7-23) — `/campanhas/:campanhaId/cenas`, a porta de entrada que
 * substitui a antiga tela "Iniciativa" sem encontro.
 *
 * **Mestre:** três blocos, na ordem em que o backend já devolve a lista (m7-22): a cena **ativa**
 * em destaque, as **planejadas** na ordem manual e o **histórico** de encerradas.
 *
 * **Jogador** (`jogador-acesso-somente-cena-atual`): o hub não é uma lista, é o resolvedor da cena
 * atual. O backend só lhe devolve a `ATIVA`; havendo uma, a tela entra nela (`replaceUrl`, para o
 * "voltar" do navegador não cair de novo aqui); sem nenhuma, mostra "Nenhuma cena no momento". Não
 * há ciclo: o hub só navega para a cena que o backend acabou de listar como ativa, e o painel só
 * devolve ao hub quando o backend recusa a cena ou ela deixa de ser a ativa.
 *
 * O papel sai dos membros + sessão e só decide o que aparece. Quem barra é o backend (§14).
 *
 * **Tempo real:** qualquer `cena:alterada` da campanha (e a reconexão) refaz a listagem — é ela
 * que traz a ordem das planejadas, que o evento não carrega, e o recorte do jogador continua sendo
 * do backend. O evento é só o sinal: o jogador no vazio entra sozinho na cena que o mestre abrir.
 */
@Component({
  selector: 'app-hub-cenas',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icone,
    Tooltip,
    Botao,
    BotaoIcone,
    Chip,
    Esqueleto,
    EstadoVazio,
    CenaCriarDialog,
  ],
  templateUrl: './hub-cenas.page.html',
  styleUrl: './hub-cenas.page.scss',
})
export class HubCenas {
  private readonly cenaService = inject(CenaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly roteador = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  private readonly cenas = signal<readonly CenaResumoDto[]>([]);
  private readonly carregandoCenas = signal(true);
  private readonly membros = signal<readonly CampanhaMembroResumoDto[] | null>(null);
  protected readonly campanhaNome = signal('');
  /** Uma escrita em voo — trava os controles para não repetir a mutação. */
  protected readonly emOperacao = signal(false);
  /** Dialog "Nova cena" aberto. */
  protected readonly criandoCena = signal(false);

  /** Pedidos de recarga da lista (broadcast, reconexão, depois de uma escrita). */
  private readonly recarregar$ = new Subject<void>();

  /** A tela só desenha quando sabe **quem** olha: sem isso o mestre veria a visão do jogador piscar. */
  protected readonly carregando = computed(
    () => this.carregandoCenas() || this.membros() === null,
  );

  protected readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return (this.membros() ?? []).some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  protected readonly ativa = computed(
    () => this.cenas().find((cena) => cena.status === CenaStatusEnum.ATIVA) ?? null,
  );

  /** Na ordem manual do mestre — a listagem já chega ordenada pela `ordem`. */
  protected readonly planejadas = computed(() =>
    this.cenas().filter((cena) => cena.status === CenaStatusEnum.PLANEJADA),
  );

  /** Da mais recente para a mais antiga — a ordem em que a listagem as devolve. */
  protected readonly encerradas = computed(() =>
    this.cenas().filter((cena) => cena.status === CenaStatusEnum.ENCERRADA),
  );

  /**
   * Jogador com uma cena ativa: a tela está a caminho dela — segue no esqueleto em vez de piscar um
   * cartão que ele não usaria.
   */
  protected readonly resolvendoCenaAtual = computed(
    () => !this.carregando() && !this.ehMestre() && this.ativa() !== null,
  );

  protected readonly rotuloTipoCena = rotuloTipoCena;

  constructor() {
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    // `?nova=1` — o "Nova cena" do painel de uma cena chega aqui com o dialog já aberto. O
    // parâmetro sai da URL em seguida para um recarregar da página não reabrir o dialog.
    if (this.rotaAtiva.snapshot.queryParamMap.has('nova')) {
      this.criandoCena.set(true);
      void this.roteador.navigate([], {
        relativeTo: this.rotaAtiva,
        queryParams: {},
        replaceUrl: true,
      });
    }

    this.campanhaService.recuperarCampanha(this.campanhaId).subscribe({
      next: (campanha) => {
        this.campanhaNome.set(campanha.nome);
        this.topbarContexto.definir(campanha.nome);
      },
    });
    this.campanhaService
      .listarMembros(this.campanhaId)
      .subscribe({ next: (membros) => this.membros.set(membros) });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    merge(
      this.recarregar$,
      this.tempoRealService.cenaAlterada$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
      ),
      // `reconexao$` (P-083): só reconexões futuras à montagem, nunca uma já ocorrida antes de
      // abrir o hub — direto no `merge`, sem o `effect()`+`untracked()` que isso pedia antes.
      this.tempoRealService.reconexao$,
    )
      .pipe(
        // `switchMap`: numa rajada (abrir uma cena emite a antiga e a nova), só a última lista vale.
        switchMap(() => this.cenaService.listarPorCampanha(this.campanhaId)),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (cenas) => this.cenas.set(cenas) });

    this.cenaService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoCenas.set(false)))
      .subscribe({ next: (cenas) => this.cenas.set(cenas) });

    // Jogador: entra na cena atual assim que ela é conhecida — na carga, ou quando o mestre abre
    // uma enquanto ele espera no vazio (`cena:alterada`/reconexão refazem a lista acima).
    effect(() => {
      const ativa = this.resolvendoCenaAtual() ? this.ativa() : null;
      if (ativa) {
        untracked(
          () =>
            void this.roteador.navigate(['/campanhas', this.campanhaId, 'cenas', ativa.id], {
              replaceUrl: true,
            }),
        );
      }
    });
  }

  protected abrirNovaCena(): void {
    this.criandoCena.set(true);
  }

  protected fecharNovaCena(): void {
    this.criandoCena.set(false);
  }

  /** Aberta agora, a cena vira o palco da mesa: entra direto nela. Planejada, fica no hub. */
  protected aoCriarCena(cena: CenaCriadaDto): void {
    this.criandoCena.set(false);
    if (cena.status === CenaStatusEnum.ATIVA) {
      void this.roteador.navigate(['/campanhas', this.campanhaId, 'cenas', cena.id]);
      return;
    }
    this.recarregar$.next();
    this.notificacaoService.notificar({
      severidade: 'sucesso',
      resumo: 'Cena planejada',
      detalhe: `${cena.nome} fica só com você até ser aberta.`,
    });
  }

  /**
   * Sobe (`-1`) ou desce (`+1`) uma planejada uma posição. O backend exige a lista **inteira** das
   * planejadas (m7-22), então a troca é feita sobre ela e enviada completa.
   */
  protected moverPlanejada(cena: CenaResumoDto, deslocamento: -1 | 1): void {
    const ordem = this.planejadas().map((planejada) => planejada.id);
    const origem = ordem.indexOf(cena.id);
    const destino = origem + deslocamento;
    if (origem < 0 || destino < 0 || destino >= ordem.length || this.emOperacao()) {
      return;
    }
    [ordem[origem], ordem[destino]] = [ordem[destino], ordem[origem]];
    this.executar(this.cenaService.reordenarCenas(this.campanhaId, ordem), (cenas) =>
      this.cenas.set(cenas),
    );
  }

  /** Abre uma planejada — havendo cena ativa, confirma antes, porque ela será encerrada. */
  protected async abrirPlanejada(cena: CenaResumoDto): Promise<void> {
    if (this.emOperacao()) {
      return;
    }
    const ativa = this.ativa();
    if (ativa) {
      const confirmado = await this.confirmacaoService.confirmar({
        titulo: 'Abrir cena',
        mensagem: `Abrir ${cena.nome} encerra a cena em andamento (${ativa.nome}) — e o combate dela, se houver.`,
        entidade: cena.nome,
        rotuloConfirmar: 'Abrir',
      });
      if (!confirmado) {
        return;
      }
    }
    this.executar(this.cenaService.abrirCena(cena.id), () =>
      void this.roteador.navigate(['/campanhas', this.campanhaId, 'cenas', cena.id]),
    );
  }

  /** Encerra a cena ativa (e o encontro dela) — depois disso ela é só histórico. */
  protected async encerrarAtiva(cena: CenaResumoDto): Promise<void> {
    if (this.emOperacao()) {
      return;
    }
    const confirmado = await this.confirmacaoService.confirmar({
      titulo: 'Encerrar cena',
      mensagem: `Encerrar ${cena.nome}? Ela vai para o histórico e fica só de leitura.`,
      entidade: cena.nome,
      rotuloConfirmar: 'Encerrar',
    });
    if (confirmado) {
      this.executar(this.cenaService.encerrarCena(cena.id), () => this.recarregar$.next());
    }
  }

  /** Trava os controles enquanto a chamada está em voo e destrava no fim, dê certo ou não. */
  private executar<T>(chamada: Observable<T>, aoConcluir: (resultado: T) => void): void {
    this.emOperacao.set(true);
    chamada.pipe(finalize(() => this.emOperacao.set(false))).subscribe({ next: aoConcluir });
  }
}
