import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { filter, finalize, map, of, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAcessoResumoDto, FichaCriaturaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { FichaEdicaoCriaturaService } from '../../ficha-edicao-criatura.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { lerParamRota } from '../../ler-param-rota';
import { mesclarDocumento } from '../../mesclar-ficha';
import { RolagemService } from '../../rolagem.service';

import { CriaturaVisualizacao } from '../../componentes/criatura-visualizacao/criatura-visualizacao.component';

/** Tamanho de página do histórico de rolagens da barra lateral. */
const ITENS_POR_PAGINA_HISTORICO = 20;

/**
 * A **ficha de criatura** numa tela só (m4-04b) — mirror de `FichaVisualizar` (m3-07), mas para
 * `FichaCriaturaRecuperadaDto`: edição no próprio lugar via `CriaturaVisualizacao`, sem abas (o
 * documento cabe numa coluna rolável).
 *
 * **Duas rotas, um componente (m4-11).** Como `FichaVisualizar`: sob
 * `/painel/:campanhaId/criatura/:id`, `campanhaId` vem do parâmetro de rota (síncrono); sob
 * `/fichas/criatura/:id` (acervo, sem `:campanhaId` na URL) só se resolve **depois** da ficha
 * carregar, lendo `ficha.campanhaId` do próprio payload (`null` para uma criatura solta). Sem
 * campanha (solta, ou ainda carregando sob a rota do acervo) não há membros a buscar —
 * `ehMestre()` cai em `false` naturalmente e a gestão de acesso vira dono-apenas.
 */
@Component({
  selector: 'app-criatura-visualizar',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icone,
    CriaturaVisualizacao,
    IndicadorTempoReal,
    CalculadoraFlutuante,
    HistoricoRolagensSidebar,
    Tooltip,
  ],
  providers: [FichaEdicaoCriaturaService, FichaRolagemRegistroService],
  templateUrl: './visualizar-criatura.page.html',
  styleUrl: './visualizar-criatura.page.scss',
})
export class CriaturaVisualizar {
  private readonly fichaService = inject(FichaService);
  protected readonly fichaEdicao = inject(FichaEdicaoCriaturaService);
  private readonly fichaRolagemRegistro = inject(FichaRolagemRegistroService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly bandejaDados = inject(BandejaDadosService);
  private readonly messageService = inject(MessageService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** `campanhaId` da rota-pai (`/painel/:campanhaId/criatura/:id`), ou `null` sob `/fichas/criatura/:id`. */
  private readonly campanhaIdRota = lerParamRota(this.rotaAtiva, 'campanhaId');
  protected readonly fichaId = Number(lerParamRota(this.rotaAtiva, 'id'));

  /**
   * `campanhaId` efetivo (m4-11): sob a rota campanha-scoped, conhecido de imediato; sob
   * `/fichas/criatura/:id`, `null` até a ficha carregar — o `constructor` então o resolve do
   * próprio payload (`ficha.campanhaId`).
   */
  protected readonly campanhaId = signal<number | null>(
    this.campanhaIdRota !== null ? Number(this.campanhaIdRota) : null,
  );

  protected readonly carregando = signal(true);
  protected readonly ficha = signal<FichaCriaturaRecuperadaDto | null>(null);
  private readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly acessos = signal<FichaAcessoResumoDto[]>([]);

  /** Histórico de rolagens desta ficha (barra lateral do cabeçalho, gatilho D20) — mesmo padrão de `FichaVisualizar`. */
  protected readonly historicoRolagens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly historicoCarregando = signal(true);
  protected readonly historicoCarregandoMais = signal(false);
  protected readonly historicoTemMais = signal(false);
  private readonly historicoPagina = signal(0);

  /** P-021: botão "Abrir calculadora" de dentro do painel do histórico (só existe no mobile). */
  protected readonly calculadoraAberta = signal(false);

  /** Rolagens desta tela ainda em voo no REST (m3-77) — ver `onRolagemRemota`. */
  private rolagensLocaisEmVoo = 0;

  /** Menu de ações no cabeçalho (kebab) aberto. */
  protected readonly menuAberto = signal(false);
  /** Dialog de gestão de acesso aberta. */
  protected readonly dialogAcesso = signal(false);
  /** Dialog de confirmação de exclusão aberta. */
  protected readonly dialogExclusao = signal(false);
  protected readonly excluindo = signal(false);

  /** Membro selecionado para receber acesso (Reactive Forms — sem `ngModel`). */
  protected readonly membroParaConceder = new FormControl<number | null>(null);
  protected readonly concedendo = signal(false);
  /** `usuarioId` cuja revogação está em voo (para desabilitar só a linha correspondente). */
  protected readonly revogando = signal<number | null>(null);

  /** `true` quando o usuário autenticado é o dono (criador) desta criatura. */
  protected readonly ehDono = computed(
    () => this.ficha()?.usuarioId === this.sessaoService.usuario()?.id,
  );

  /** `true` quando o usuário autenticado é o `MESTRE` desta campanha (deriva dos membros). */
  protected readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return this.membros().some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  /** Dono ou mestre: pode editar e gerir o acesso (§14). Só apresentação — o backend arbitra. */
  protected readonly podeGerenciar = computed(() => this.ehDono() || this.ehMestre());

  /** Membros elegíveis a receber acesso: exclui o dono (já vê), o mestre (já vê tudo) e quem já tem concessão ativa. */
  protected readonly membrosElegiveis = computed<readonly CampanhaMembroResumoDto[]>(() => {
    const fichaAtual = this.ficha();
    const jaConcedido = new Set(this.acessos().map((acesso) => acesso.usuarioId));
    return this.membros().filter(
      (membro) =>
        membro.usuarioId !== fichaAtual?.usuarioId &&
        membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE &&
        !jaConcedido.has(membro.usuarioId),
    );
  });

  constructor() {
    this.carregarHistoricoPagina(1);

    // Sob `/fichas/criatura/:id` (sem `:campanhaId` na URL), o `campanhaId` só é conhecido depois
    // da ficha carregar (m4-11) — daí a ficha vir primeiro e os membros serem buscados só quando
    // há campanha (`switchMap` para `of([])` sem ela: criatura solta, ou ainda sem sala).
    this.fichaService
      .recuperarFichaCriatura(this.fichaId)
      .pipe(
        switchMap((ficha) => {
          const campanhaId = this.campanhaIdRota !== null ? Number(this.campanhaIdRota) : ficha.campanhaId;
          this.campanhaId.set(campanhaId);
          const membros$ =
            campanhaId !== null ? this.campanhaService.listarMembros(campanhaId) : of([]);
          return membros$.pipe(map((membros) => ({ ficha, membros })));
        }),
        finalize(() => this.carregando.set(false)),
      )
      .subscribe({
        next: ({ ficha, membros }) => {
          this.ficha.set(ficha);
          this.fichaEdicao.definirBase(ficha);
          this.membros.set(membros);
          if (this.podeGerenciar()) {
            this.carregarAcessos();
          }

          // Tempo real de rolagem (m3-77): ver o mesmo bloco em `FichaVisualizar` — rolagem de
          // ficha com campanha só chega em `campanha:<id>`, então entra nela também; ficha solta
          // já basta a sala `ficha:<id>` de sempre.
          const campanhaId = this.campanhaId();
          if (campanhaId !== null) {
            this.tempoRealService.entrarSalaCampanha(campanhaId);
            this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(campanhaId));
          }
        },
      });

    this.fichaEdicao.inicializar(this.ficha, () => this.fichaId);

    // `true` — rolagens de criatura nascem ocultas (privadas): os jogadores não podem ver os
    // testes/danos da Ameaça, diferente da ficha de jogador (default público).
    this.fichaRolagemRegistro.inicializar(() => this.fichaId, true);
    this.fichaRolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.onRolagemRegistrada(rolagem) });

    // Contagem de rolagens locais em voo (m3-77) — ver `onRolagemRemota` em `FichaVisualizar`.
    this.fichaRolagemRegistro.enviando$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.rolagensLocaisEmVoo++ });
    this.fichaRolagemRegistro.finalizada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => (this.rolagensLocaisEmVoo = Math.max(0, this.rolagensLocaisEmVoo - 1)) });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaFicha(this.fichaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaFicha(this.fichaId));

    // `TempoRealService.fichaAlterada$` é tipado para `FichaAlteradaDto` (jogador) — o mesmo canal
    // WS (`ficha:alterada`, sala `ficha:<id>`) carrega o payload de criatura sem distinção de tipo
    // no gateway (`campanhaGateway.emitirFichaAlterada`, reusado por `alterarFichaCriatura` no
    // backend); a fronteira de tipo é só de apresentação, resolvida aqui com o mesmo cast em duas
    // etapas que o backend já usa nessa mesma fronteira (`ficha.service.ts`, `alterarFichaCriatura`).
    this.tempoRealService.fichaAlterada$
      .pipe(
        filter((ficha) => ficha.id === this.fichaId),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (fichaAlterada) =>
          this.absorverRemoto(fichaAlterada as unknown as FichaCriaturaRecuperadaDto),
      });

    this.tempoRealService.acessoRevogado$
      .pipe(
        filter(
          (evento) =>
            evento.fichaId === this.fichaId &&
            evento.usuarioId === this.sessaoService.usuario()?.id &&
            !this.podeGerenciar(),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({ next: () => this.expulsar() });

    // Rolagem feita por outro caminho (m3-77) — mesmo racional de `FichaVisualizar`.
    this.tempoRealService.rolagemRegistrada$
      .pipe(
        filter((rolagem) => rolagem.fichaId === this.fichaId),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (rolagem) => this.onRolagemRemota(rolagem) });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.fichaService.recuperarFichaCriatura(this.fichaId).subscribe({
          next: (ficha) => untracked(() => this.absorverRemoto(ficha)),
        });
      }
    });
  }

  /**
   * Absorve um documento vindo do servidor (broadcast `ficha:alterada` ou refetch de reconexão).
   * Sem edição local pendente, substitui o estado; com edição pendente, mescla campo a campo
   * (`mesclarDocumento`) — mesmo racional de `FichaVisualizar.absorverRemoto` (m3-17).
   */
  private absorverRemoto(remoto: FichaCriaturaRecuperadaDto): void {
    const base = this.fichaEdicao.fichaBase();
    const local = this.ficha();

    this.ficha.set(
      this.fichaEdicao.edicaoPendente() && base && local
        ? mesclarDocumento(base, local, remoto)
        : remoto,
    );
    this.fichaEdicao.definirBase(remoto);
  }

  /** Redireciona pra fora da tela após a revogação do próprio acesso, com um toast avisando o motivo. */
  private expulsar(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Acesso revogado',
      detail: 'Seu acesso a esta ficha foi revogado.',
    });
    void this.router.navigate(this.rotaDeSaida());
  }

  /** Rota de saída da tela (expulsão/exclusão, m4-11): a campanha atual, ou o acervo sem ela. */
  private rotaDeSaida(): (string | number)[] {
    const campanhaId = this.campanhaId();
    return campanhaId !== null ? ['/painel', campanhaId] : ['/fichas'];
  }

  /** Abre/fecha o menu de ações do cabeçalho. */
  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  /** Fecha o menu de ações. */
  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  /** Alterna a visibilidade da criatura (`oculta`) direto pelo menu — sem confirmação (m4-09 trata a revelação pro jogador). */
  protected alternarOculta(): void {
    this.fecharMenu();
    const fichaAtual = this.ficha();
    if (fichaAtual) {
      this.fichaEdicao.ajustarOculta(!fichaAtual.oculta);
    }
  }

  /** Abre a dialog de gestão de acesso (a partir do menu). */
  protected abrirAcesso(): void {
    this.menuAberto.set(false);
    this.dialogAcesso.set(true);
  }

  /** Fecha a dialog de gestão de acesso. */
  protected fecharAcesso(): void {
    this.dialogAcesso.set(false);
  }

  /** Abre a dialog de confirmação de exclusão (a partir do menu). */
  protected abrirExclusao(): void {
    this.menuAberto.set(false);
    this.dialogExclusao.set(true);
  }

  /** Fecha a dialog de exclusão — inócuo enquanto a exclusão está em voo. */
  protected fecharExclusao(): void {
    if (!this.excluindo()) {
      this.dialogExclusao.set(false);
    }
  }

  /** Exclui a criatura (soft delete no backend, só dono/mestre — §14) e volta ao detalhe da campanha. */
  protected confirmarExclusao(): void {
    if (this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    this.fichaService
      .excluirFicha(this.fichaId)
      .pipe(finalize(() => this.excluindo.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(this.rotaDeSaida());
        },
      });
  }

  /** Busca uma página do histórico de rolagens e acrescenta ao final. */
  private carregarHistoricoPagina(pagina: number): void {
    const marcarCarregando = pagina === 1 ? this.historicoCarregando : this.historicoCarregandoMais;
    marcarCarregando.set(true);
    this.rolagemService
      .listarPorFicha(this.fichaId, pagina, ITENS_POR_PAGINA_HISTORICO)
      .subscribe({
        next: (paginado) => {
          this.historicoRolagens.update((atuais) =>
            pagina === 1 ? paginado.itens : [...atuais, ...paginado.itens],
          );
          this.historicoPagina.set(paginado.paginaAtual);
          this.historicoTemMais.set(paginado.paginaAtual < paginado.totalPaginas);
          marcarCarregando.set(false);
        },
        error: () => marcarCarregando.set(false),
      });
  }

  /** "Carregar mais" da barra lateral de histórico. */
  protected carregarMaisHistorico(): void {
    if (this.historicoCarregandoMais() || !this.historicoTemMais()) {
      return;
    }
    this.carregarHistoricoPagina(this.historicoPagina() + 1);
  }

  /** Prepend local — uma rolagem feita nesta tela aparece na hora no topo da barra lateral. */
  private onRolagemRegistrada(rolagem: RolagemResumoDto): void {
    this.historicoRolagens.update((atuais) =>
      atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais],
    );
  }

  /**
   * Rolagem chegada por `rolagemRegistrada$` (m3-77) — mesmo racional de `FichaVisualizar.
   * onRolagemRemota`: reusa `onRolagemRegistrada` pro prepend (dedupe pelo topo do array) e só
   * abre a bandeja quando a rolagem não é provavelmente a própria (já no histórico, ou uma
   * rolagem desta tela ainda em voo no REST — o eco do broadcast pode chegar antes da resposta
   * HTTP, confirmado ao vivo).
   */
  private onRolagemRemota(rolagem: RolagemResumoDto): void {
    const jaConhecida = this.historicoRolagens().some((existente) => existente.id === rolagem.id);
    const provavelmenteMinha = this.rolagensLocaisEmVoo > 0;
    this.onRolagemRegistrada(rolagem);
    if (jaConhecida || provavelmenteMinha) {
      return;
    }
    this.bandejaDados.mostrar({
      rotulo: rolagem.rotulo,
      resultado: rolagem.resultado,
      corFicha: rolagem.corFicha,
      visibilidade: rolagem.visibilidade,
    });
  }

  /** (Re)carrega as concessões ativas da ficha — usado no boot e após conceder/revogar. */
  private carregarAcessos(): void {
    this.fichaService
      .listarAcessos(this.fichaId)
      .subscribe({ next: (acessos) => this.acessos.set(acessos) });
  }

  /** Concede a visualização ao membro selecionado e recarrega a lista de acessos. */
  protected conceder(): void {
    const usuarioId = this.membroParaConceder.value;
    if (usuarioId === null || this.concedendo()) {
      return;
    }
    this.concedendo.set(true);
    this.fichaService
      .concederAcesso(this.fichaId, usuarioId)
      .pipe(finalize(() => this.concedendo.set(false)))
      .subscribe({
        next: () => {
          this.membroParaConceder.reset(null);
          this.carregarAcessos();
        },
      });
  }

  /** Revoga a visualização de um membro e recarrega a lista de acessos. */
  protected revogar(usuarioId: number): void {
    if (this.revogando() !== null) {
      return;
    }
    this.revogando.set(usuarioId);
    this.fichaService
      .revogarAcesso(this.fichaId, usuarioId)
      .pipe(finalize(() => this.revogando.set(null)))
      .subscribe({
        next: () => this.carregarAcessos(),
      });
  }
}
