import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, filter, finalize, merge, switchMap, tap } from 'rxjs';

import type { CenaDocumentoResumoDto, CenaRecuperadaDto } from '@contratados-rpg/shared/dtos/cena';
import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { cenaTemIniciativa } from '@contratados-rpg/shared/regras/cena';

import { mesclarFeedRolagens } from '../../../../shared/rolagem-feed.util';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { CenaService } from '../../../cena/cena.service';
import { EncontroService } from '../../encontro.service';
import {
  combatenteEhDaVez,
  combatenteJaAgiu,
  montarCombatentesVisuais,
  resolverNivelAmeaca,
  type CombatenteVisualDto,
} from '../../encontro-leitura.util';

/**
 * Dado e tempo real compartilhados entre `PainelEncontroMestre` e `PainelEncontroJogador`
 * (`ui-39`) — extraído do antigo `PainelEncontro` monolítico, no molde de
 * `CampanhaDetalheDadosService`, para não duplicar carga nem assinaturas de socket entre os dois
 * papéis. Provido por `PainelCenaShell` (`providers`, escopo de rota — uma instância por navegação
 * para `/campanhas/:campanhaId/cenas/:cenaId`), nunca `providedIn: 'root'`.
 *
 * **A tela é de uma cena (m7-23).** O `:cenaId` da rota diz qual; o encontro exibido é o dela
 * (`CenaRecuperadaDto.encontro`, já no recorte de quem pediu). O backend recusa ao jogador toda cena
 * que não seja a `ATIVA` (m7-22 + `jogador-acesso-somente-cena-atual`) — nesse caso (link antigo,
 * favorito, F5, reconexão depois de perder o evento) e em qualquer falha de carga, a tela devolve o
 * usuário ao hub (`replaceUrl`), que resolve a cena atual ou o vazio. Quando a cena desta tela deixa
 * de ser a ativa, o jogador não fica olhando o que sobrou dela: o conteúdo é descartado na hora e
 * ele volta ao hub — o `cena:alterada` é só o sinal, nunca um payload renderizado como histórico.
 *
 * **Nenhuma regra vive aqui.** A ordem da rodada e a intercalação de Cadência chegam prontas do
 * backend (`ordemRodada`, `shared/regras/encontro`); o que o serviço deriva é só apresentação — de
 * quem é a vez, quem já agiu, quantas ações restam.
 *
 * **Tempo real (§9, broadcast-only):** toda escrita é REST; o estado volta pelo próprio retorno da
 * chamada e, para os demais participantes, pelo broadcast `encontro:alterado` na sala
 * `campanha:<id>`. A reconexão refaz o fetch, como nas telas de ficha.
 */
/** A cena da tela, sem o encontro — que vive no próprio sinal, trocado a cada broadcast. */
export type CenaDoPainelDto = Omit<CenaRecuperadaDto, 'encontro'>;

@Injectable()
export class EncontroPainelDadosService {
  private readonly encontroService = inject(EncontroService);
  private readonly cenaService = inject(CenaService);
  private readonly roteador = inject(Router);
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly sessaoService = inject(SessaoService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** `campanhaId` da rota — sempre presente (a rota só existe sob `/campanhas/:campanhaId`). */
  readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  /** `cenaId` da rota — a cena que a tela mostra. Sinal porque trocar de cena reusa o componente. */
  private readonly cenaIdDaRota = signal<number | null>(null);

  private readonly carregandoEncontro = signal(true);
  private readonly cenaAtual = signal<CenaDoPainelDto | null>(null);
  private readonly encontroAtual = signal<EncontroRecuperadoDto | null>(null);
  private readonly fichasDaCampanha = signal<readonly FichaResumoDto[]>([]);
  private readonly encontrosDaCampanhaInterno = signal<readonly EncontroResumoDto[]>([]);
  private readonly membrosInterno = signal<readonly CampanhaMembroResumoDto[] | null>(null);
  private readonly campanhaNomeInterno = signal('');
  private readonly rolagensDoFeed = signal<readonly RolagemResumoDto[]>([]);
  private readonly carregandoFeed = signal(true);
  private readonly emOperacaoInterno = signal(false);
  private readonly documentosDaCena = signal<readonly CenaDocumentoResumoDto[]>([]);
  private readonly carregandoDocumentosInterno = signal(true);
  private geracaoDocumentos = 0;

  /** A cena da tela — `null` só enquanto carrega. */
  readonly cena = this.cenaAtual.asReadonly();
  readonly encontro = this.encontroAtual.asReadonly();
  readonly fichasCampanha = this.fichasDaCampanha.asReadonly();
  /** Todos os encontros da campanha — o aberto (se houver) e o histórico dos encerrados. */
  readonly encontrosDaCampanha = this.encontrosDaCampanhaInterno.asReadonly();
  /** `null` enquanto os membros não chegaram: até lá não se sabe se quem abriu é mestre. */
  readonly membros = this.membrosInterno.asReadonly();
  /** Nome da campanha — cabeçalho e Caderno. */
  readonly campanhaNome = this.campanhaNomeInterno.asReadonly();
  /** Feed da campanha, já recortado pelo backend conforme as permissões de cada participante. */
  readonly rolagensFeed = this.rolagensDoFeed.asReadonly();
  readonly carregandoRolagens = this.carregandoFeed.asReadonly();
  /** Uma chamada de escrita em voo — desabilita os controles para não duplicar a mutação. */
  readonly emOperacao = this.emOperacaoInterno.asReadonly();
  /** Coluna Documentos da cena de Investigação (m7-25) — vazia para os demais tipos. */
  readonly documentosCena = this.documentosDaCena.asReadonly();
  readonly carregandoDocumentos = this.carregandoDocumentosInterno.asReadonly();

  /** `membros()` sem o `null` do carregamento — só existe pro input `membros` das Anotações. */
  readonly membrosDaCampanha = computed(() => this.membros() ?? []);

  /**
   * A tela só desenha quando sabe **quem** está olhando: renderizar antes dos membros mostraria a
   * visão de jogador ao mestre por um quadro, com todos os controles piscando na tela.
   */
  readonly carregando = computed(() => this.carregandoEncontro() || this.membros() === null);

  /**
   * `true` quando quem abriu a tela é o mestre da campanha — a mesma leitura do
   * `mestreCampanhaGuard` (membros + sessão), sem uma segunda consulta: a página já carrega os
   * membros para resolver o dono de cada ficha.
   */
  readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return (this.membros() ?? []).some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  /**
   * `true` quando a casca deve montar a visão do mestre: ele é o mestre **ou** ainda não se sabe
   * (membros a caminho) — a página do mestre carrega o esqueleto da própria tela, assim quem
   * carrega não "pula" de uma visão para outra quando o papel chega.
   */
  readonly visaoDoMestre = computed(() => this.membros() === null || this.ehMestre());

  /** `id` de quem está com a tela aberta — só existe pro input `usuarioAtivoId` das Anotações. */
  readonly usuarioAtivoId = computed(() => this.sessaoService.usuario()?.id ?? null);

  /** `true` enquanto o encontro aceita mutação — encerrado é imutável. */
  readonly mutavel = computed(() => this.encontro()?.status !== EncontroStatusEnum.ENCERRADO);

  readonly emMontagem = computed(() => this.encontro()?.status === EncontroStatusEnum.MONTAGEM);

  readonly emCombate = computed(() => this.encontro()?.status === EncontroStatusEnum.ATIVO);

  /**
   * `true` quando a cena ainda está `PLANEJADA` (só o mestre a vê): dá para montar o encontro, mas
   * pedir iniciativa e iniciar o combate exigem abri-la antes (o backend recusa, m7-22).
   */
  readonly cenaPlanejada = computed(() => this.cena()?.status === CenaStatusEnum.PLANEJADA);

  /**
   * `true` quando a cena da tela não tem trilha de turnos (Investigação/Resistência, m7-24) — o
   * palco é a grade dos agentes da campanha, que acompanha as fichas ao vivo. `false` enquanto a
   * cena carrega: o ramo com iniciativa nunca entra em sala de ficha.
   */
  readonly semIniciativa = computed(() => {
    const cena = this.cena();
    return cena !== null && !cenaTemIniciativa(cena.tipo);
  });

  /** `true` para a cena de Investigação (m7-25) — só ela tem a coluna Documentos. */
  readonly ehInvestigacao = computed(() => this.cena()?.tipo === CenaTipoEnum.INVESTIGACAO);

  /** O documento aberto no palco do mestre — `null` sem foco definido ou fora da Investigação. */
  readonly documentoEmFoco = computed(
    () => this.documentosCena().find((documento) => documento.emFoco) ?? null,
  );

  /**
   * Pedidos de carga da cena, por id. `switchMap`: trocar de cena (ou reconectar) no meio de uma
   * carga descarta a resposta antiga — ela nunca pinta a tela da cena seguinte.
   */
  private readonly cargaCena$ = new Subject<number>();

  /** Salas `ficha:<id>` em que esta tela entrou — só as da grade de agentes da cena sem iniciativa. */
  private readonly salasFichaAtivas = new Set<number>();
  /**
   * Ids de rolagens excluídas nesta instância (ADMIN) — mesma trava de
   * `CampanhaDetalheDadosService` (P-084): uma releitura do feed disparada antes da exclusão
   * chegar (reconexão) não pode ressuscitar o item quando a resposta antiga volta.
   */
  private readonly idsRolagensExcluidas = new Set<number>();

  /** `true` quando a tela está mostrando um encontro do histórico, não o combate da mesa. */
  readonly vendoHistorico = computed(
    () => this.encontro()?.status === EncontroStatusEnum.ENCERRADO,
  );

  /** Total de slots de turno da rodada — o denominador de "Turno 3/6". */
  readonly totalDeTurnos = computed(() => this.encontro()?.ordemRodada.length ?? 0);

  /** O slot da vez; nulo em montagem ou depois de encerrado. */
  private readonly slotAtual = computed(() => {
    const encontro = this.encontro();
    if (!encontro || encontro.status !== EncontroStatusEnum.ATIVO) {
      return null;
    }
    return encontro.ordemRodada[encontro.turnoIndice] ?? null;
  });

  /** Id de quem age agora — pinta o cartão e alimenta o bloco "Age agora". */
  readonly combatenteDaVezId = computed(() => this.slotAtual()?.combatenteId ?? null);

  /**
   * Posições visuais na ordem em que agem. Com a rodada calculada, cada slot vira um cartão: a
   * repetição deixa a Cadência explícita sem duplicar o estado do combatente. Derivação pura
   * (`montarCombatentesVisuais`, `encontro-leitura.util.ts`) — a mesma apresentação que a
   * composição de leitura do espectador/prévia de jogador consome (m8-05), sem duplicá-la aqui.
   */
  readonly combatentes = computed<readonly CombatenteVisualDto[]>(() =>
    montarCombatentesVisuais(this.encontro()),
  );

  /** O combatente da vez, já resolvido. */
  readonly combatenteDaVez = computed<EncontroCombatenteResumoDto | null>(() => {
    const id = this.combatenteDaVezId();
    return id === null ? null : (this.combatentes().find((c) => c.id === id) ?? null);
  });

  /**
   * Quantos turnos ainda restam **ao combatente da vez** nesta rodada, contando o atual — o
   * "· 1 ação restante" do mockup. Deriva de `ordemRodada`, não recalcula Cadência.
   */
  readonly acoesRestantesDaVez = computed(() => {
    const encontro = this.encontro();
    const id = this.combatenteDaVezId();
    if (!encontro || id === null) {
      return 0;
    }
    return encontro.ordemRodada.filter(
      (slot, indice) => slot.combatenteId === id && indice >= encontro.turnoIndice,
    ).length;
  });

  /** `true` quando falta iniciativa a alguém — o combate não pode começar assim. */
  readonly faltamIniciativas = computed(() =>
    this.combatentes().some((combatente) => combatente.iniciativa === null),
  );

  constructor() {
    // Slot de contexto da topbar (ui-21) — some ao sair da tela, como `tempoRealService.sairSala*`.
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.carregarRolagens();

    this.cargaCena$
      .pipe(
        switchMap((cenaId) =>
          this.cenaService.recuperarCena(cenaId).pipe(
            tap({
              next: (recuperada) => {
                this.definirCena(recuperada);
                this.carregandoEncontro.set(false);
              },
              // Cena que o backend recusa (403 — planejada para quem não é mestre, qualquer uma
              // que não seja a ativa para o jogador) ou inexistente (404): nada do que estava na
              // tela sobrevive (a recusa pode vir de um refetch após reconexão) e volta ao hub.
              error: () => {
                this.invalidarCena();
                this.voltarAoHub();
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    // `paramMap` (e não o `snapshot`) porque ir de uma cena a outra troca só o parâmetro: o
    // Angular reusa o componente, e um `snapshot` lido no construtor ficaria congelado no primeiro
    // valor. Emite de imediato, então também faz a carga inicial.
    this.rotaAtiva.paramMap.pipe(takeUntilDestroyed()).subscribe({
      next: (parametros) => {
        this.cenaIdDaRota.set(Number(parametros.get('cenaId')));
        this.carregar();
      },
    });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    // Só o encontro **desta** cena: o de outra cena (a que o mestre abriu depois, por exemplo) não
    // arrasta quem está nesta tela — ir até ela é pelo hub.
    this.tempoRealService.encontroAlterado$
      .pipe(
        filter(
          (evento) =>
            evento.encontro.campanhaId === this.campanhaId &&
            evento.encontro.cenaId === this.cenaIdDaRota(),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (evento) => this.encontroAtual.set(evento.encontro) });

    // Abrir/encerrar a cena desta tela (por aqui, pelo hub ou por outra aba do mestre).
    this.tempoRealService.cenaAlterada$
      .pipe(
        filter(
          (evento) =>
            evento.campanhaId === this.campanhaId && evento.cena.id === this.cenaIdDaRota(),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ cena }) => {
          if (this.ehMestre() || cena.status === CenaStatusEnum.ATIVA) {
            this.cenaAtual.update((atual) =>
              atual ? { ...atual, nome: cena.nome, tipo: cena.tipo, status: cena.status } : atual,
            );
            return;
          }
          // Papel ainda desconhecido: o refetch autorizado decide (o mestre recebe a cena; o
          // jogador, o 403 que o devolve ao hub).
          if (this.membros() === null) {
            this.carregar();
            return;
          }
          // Jogador: a cena desta tela deixou de ser a atual — nada dela fica na tela.
          this.invalidarCena();
          this.voltarAoHub();
        },
      });

    // Coluna Documentos (m7-25): dataless como `campanha:inventario-alterado` — refaz o `GET` já no
    // recorte de quem está olhando. Só a cena desta tela; anexar/remover/reordenar/apresentar de
    // outra cena não arrasta quem está aqui.
    this.tempoRealService.cenaDocumentoAlterado$
      .pipe(
        filter(
          (evento) =>
            evento.campanhaId === this.campanhaId && evento.cenaId === this.cenaIdDaRota(),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({ next: () => this.carregarDocumentos() });

    // `reconexao$` (P-083): só reconexões futuras à montagem, nunca uma já ocorrida antes de
    // abrir o painel. `carregar()` já refaz cena/encontro/fichas/membros; faltava o histórico de
    // rolagens (P-084) — sem replay de eventos, uma rolagem feita durante a queda só chega por
    // esta releitura.
    this.tempoRealService.reconexao$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.carregar();
          this.recarregarRolagensFeed();
        },
      });

    this.tempoRealService.documentoAlterado$
      .pipe(filter(evento => evento.campanhaId === this.campanhaId),
        takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregarDocumentos());

    // Fichas ao vivo na grade da cena sem iniciativa (m7-24) — o mecanismo do Esquadrão
    // (`CampanhaDetalheDadosService.sincronizarSalasFicha`): entra nas salas `ficha:<id>` das
    // fichas exibidas, sai das que deixaram de aparecer e, a cada `ficha:alterada` de uma delas,
    // refaz a listagem. Com iniciativa o conjunto é vazio: o painel de Iniciativa não assina nada.
    effect(() => {
      const donos = new Set(this.membrosDaCampanha().map((membro) => membro.usuarioId));
      const idsExibidos = this.semIniciativa()
        ? this.fichasCampanha()
            .filter((ficha) => ficha.tipo === TipoFichaEnum.JOGADOR && donos.has(ficha.usuarioId))
            .map((ficha) => ficha.id)
        : [];
      untracked(() => this.sincronizarSalasFicha(idsExibidos));
    });
    this.destroyRef.onDestroy(() => this.sincronizarSalasFicha([]));
    this.tempoRealService.fichaAlterada$
      .pipe(
        filter((ficha) => this.salasFichaAtivas.has(ficha.id)),
        takeUntilDestroyed(),
      )
      .subscribe({ next: () => this.recarregarFichas() });
    // Entrada, saída e (des)ocultação de ficha (fix-ficha-oculta-eventos-campanha): chegam só como
    // invalidadores da campanha, sem `fichaId` — `ficha:alterada` não serve, porque quem perde a
    // visão não está (ou deixa de poder estar) na sala da ficha. O GET no próprio recorte decide o
    // que aparece; a ficha que ficou oculta some da grade sem recarregar.
    merge(
      this.tempoRealService.fichaCriada$.pipe(filter((ficha) => ficha.campanhaId === this.campanhaId)),
      this.tempoRealService.fichaVisibilidadeAlterada$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
      ),
      this.tempoRealService.fichaRemovidaDaCampanha$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
      ),
      this.tempoRealService.fichaRecortesAlterados$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId && evento.fichas),
      ),
    )
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.recarregarFichas() });

    // Nome da campanha — só precisa vir uma vez, não a cada `carregar()` (a rota troca de encontro,
    // não de campanha).
    this.campanhaService.recuperarCampanha(this.campanhaId).subscribe({
      next: (campanha) => {
        this.campanhaNomeInterno.set(campanha.nome);
        this.topbarContexto.definir(campanha.nome);
      },
    });

    // O gateway só envia rolagens públicas a quem pode vê-las; privadas entram localmente pelas
    // páginas apenas para quem a fez (ou vêm do GET já recortado para o mestre).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.adicionarRolagemAoFeed(rolagem) });
    this.tempoRealService.rolagemExcluida$
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (excluida) => {
          this.idsRolagensExcluidas.add(excluida.id);
          this.rolagensDoFeed.update((atuais) => atuais.filter((rolagem) => rolagem.id !== excluida.id));
        },
      });
  }

  /**
   * Carrega a cena da rota (com o encontro dela) e o contexto de apresentação. A lista de encontros
   * da campanha só alimenta o menu de encerrados do mestre — não decide o que a tela mostra.
   */
  private carregar(): void {
    const cenaId = this.cenaIdDaRota();
    if (cenaId === null) {
      return;
    }
    this.carregandoEncontro.set(true);
    this.cargaCena$.next(cenaId);

    this.encontroService
      .listarPorCampanha(this.campanhaId)
      .subscribe({ next: (encontros) => this.encontrosDaCampanhaInterno.set(encontros) });

    this.fichaService
      .listarFichas(this.campanhaId)
      .subscribe({ next: (fichas) => this.fichasDaCampanha.set(fichas) });
    this.campanhaService
      .listarMembros(this.campanhaId)
      .subscribe({ next: (membros) => this.membrosInterno.set(membros) });
  }

  /**
   * Descarta tudo o que a tela mostra da cena — encontro, log, documentos e a própria cena (que
   * desmonta o painel sem iniciativa e, com ele, o modal de leitura aberto).
   */
  private invalidarCena(): void {
    this.geracaoDocumentos++;
    this.carregandoEncontro.set(true);
    this.cenaAtual.set(null);
    this.encontroAtual.set(null);
    this.documentosDaCena.set([]);
  }

  /**
   * Ao hub, que resolve a cena atual (jogador) ou lista as cenas (mestre). `replaceUrl`: o endereço
   * recusado não fica no histórico do navegador para o "voltar" reabri-lo.
   */
  private voltarAoHub(): void {
    void this.roteador.navigate(['/campanhas', this.campanhaId, 'cenas'], { replaceUrl: true });
  }

  /** Ingressa nas salas das fichas exibidas e sai das que deixaram de aparecer. */
  private sincronizarSalasFicha(idsExibidos: readonly number[]): void {
    const idsAtuais = new Set(idsExibidos);
    for (const fichaId of idsAtuais) {
      if (!this.salasFichaAtivas.has(fichaId)) {
        this.tempoRealService.entrarSalaFicha(fichaId);
        this.salasFichaAtivas.add(fichaId);
      }
    }
    for (const fichaId of this.salasFichaAtivas) {
      if (!idsAtuais.has(fichaId)) {
        this.tempoRealService.sairSalaFicha(fichaId);
        this.salasFichaAtivas.delete(fichaId);
      }
    }
  }

  /** Refaz só a listagem de fichas — o resumo alterado chega pelo mesmo recorte da carga (§14). */
  private recarregarFichas(): void {
    this.fichaService
      .listarFichas(this.campanhaId)
      .subscribe({ next: (fichas) => this.fichasDaCampanha.set(fichas) });
  }

  /** Busca inicial do feed. A permissão e o recorte de privadas pertencem ao backend. */
  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoFeed.set(false)))
      .subscribe({ next: (itens) => this.rolagensDoFeed.set(itens), error: () => undefined });
  }

  /**
   * Releitura do feed ao reconectar (P-084) — mesmo desenho de
   * `CampanhaDetalheDadosService.recarregarRolagensFeed`: a resposta do servidor é a base, sem
   * mesclar contra `rolagensDoFeed()` atual (pode carregar itens de antes da própria queda — uma
   * verificação ao vivo encontrou exatamente esse bug: uma rolagem excluída direto no Postgres
   * durante a queda, sem nenhum evento de socket possível, "sobrevivia" porque só faltava no GET).
   * Só é preservado como extra o que chegar por `rolagemRegistrada$` durante esta releitura
   * específica; `idsRolagensExcluidas` (permanente) ainda filtra qualquer exclusão já vista.
   */
  private recarregarRolagensFeed(): void {
    const chegadasDuranteRecuperacao: RolagemResumoDto[] = [];
    const assinatura = this.tempoRealService.rolagemRegistrada$.subscribe((rolagem) =>
      chegadasDuranteRecuperacao.push(rolagem),
    );
    this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => assinatura.unsubscribe()))
      .subscribe({
        next: (itens) =>
          this.rolagensDoFeed.set(
            mesclarFeedRolagens(itens, chegadasDuranteRecuperacao, this.idsRolagensExcluidas),
          ),
      });
  }

  /** Prepend único para a confirmação local e o broadcast público do mesmo registro. */
  adicionarRolagemAoFeed(rolagem: RolagemResumoDto): void {
    this.rolagensDoFeed.update((atuais) =>
      atuais.some((atual) => atual.id === rolagem.id) ? atuais : [rolagem, ...atuais],
    );
  }

  /** Troca o estado da tela pelo do encontro recém-criado/recuperado (fora do `executarNoEncontro`). */
  definirEncontro(estado: EncontroRecuperadoDto): void {
    this.encontroAtual.set(estado);
  }

  /** Troca a cena e o encontro dela de uma vez — carga e respostas de abrir/encerrar a cena. */
  definirCena(recuperada: CenaRecuperadaDto): void {
    const { encontro, ...cena } = recuperada;
    if (this.cenaAtual()?.id !== cena.id) {
      this.geracaoDocumentos++;
      this.documentosDaCena.set([]);
    }
    this.cenaAtual.set(cena);
    this.encontroAtual.set(encontro);
    if (cena.tipo === CenaTipoEnum.INVESTIGACAO) {
      this.carregarDocumentos();
    } else {
      this.documentosDaCena.set([]);
      this.carregandoDocumentosInterno.set(false);
    }
  }

  /** Busca a coluna Documentos da cena de Investigação. */
  private carregarDocumentos(): void {
    const geracao = ++this.geracaoDocumentos;
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || !this.ehInvestigacao()) {
      return;
    }
    this.carregandoDocumentosInterno.set(true);
    this.cenaService
      .listarDocumentos(cenaId)
      .pipe(finalize(() => {
        if (geracao === this.geracaoDocumentos) {
          this.carregandoDocumentosInterno.set(false);
        }
      }))
      .subscribe({
        // Resposta de uma cena que a tela já deixou (troca de cena, encerramento) é descartada.
        next: (itens) => {
          if (this.cenaAtual()?.id === cenaId && geracao === this.geracaoDocumentos) {
            this.documentosDaCena.set(itens);
          }
        },
        error: () => undefined,
      });
  }

  /** Uma invalidação posterior à escrita exige reler em vez de adotar seu retrato antigo. */
  private executarDocumentosCena(
    cenaId: number, operacao: Observable<CenaDocumentoResumoDto[]>,
  ): void {
    const geracao = ++this.geracaoDocumentos;
    const operacaoComRecuperacao = operacao.pipe(catchError(() => {
      if (this.cena()?.id === cenaId) {
        this.carregarDocumentos();
      }
      return EMPTY;
    }));
    this.executar(operacaoComRecuperacao, itens => {
      if (this.cena()?.id !== cenaId) {
        return;
      }
      if (geracao !== this.geracaoDocumentos) {
        this.carregarDocumentos();
        return;
      }
      this.carregandoDocumentosInterno.set(false);
      this.documentosDaCena.set(itens);
    });
  }

  /** Limpa somente o foco persistido do mestre, mantendo a Biblioteca intacta. */
  limparFocoDocumento(): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.limparFocoDocumento(cenaId));
  }

  /** Anexa um documento da biblioteca à coluna Documentos desta cena. */
  anexarDocumento(documentoId: number): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.anexarDocumento(cenaId, documentoId));
  }

  /** Remove o vínculo do documento com a cena — nunca afeta a biblioteca. */
  removerDocumentoDaCena(documentoId: number): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.removerDocumento(cenaId, documentoId));
  }

  /** Reordena a coluna Documentos — `ordem` leva os `documentoId` de todos os itens da cena. */
  reordenarDocumentosCena(ordem: readonly number[]): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.reordenarDocumentos(cenaId, ordem));
  }

  /** Abre o documento no palco do mestre — não revela. */
  focarDocumento(documentoId: number): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.focarDocumento(cenaId, documentoId));
  }

  /** Revela o documento à mesa e o marca em foco — a ação "Apresentar". */
  apresentarDocumento(documentoId: number): void {
    const cenaId = this.cena()?.id;
    if (cenaId === undefined || this.emOperacao()) {
      return;
    }
    this.executarDocumentosCena(cenaId, this.cenaService.apresentarDocumento(cenaId, documentoId));
  }

  /** `true` quando é a vez deste combatente. */
  ehDaVez(combatente: CombatenteVisualDto): boolean {
    return combatenteEhDaVez(combatente, this.encontro());
  }

  /** `true` quando esta ocorrência visual já passou na rodada. */
  jaAgiu(combatente: CombatenteVisualDto): boolean {
    return combatenteJaAgiu(combatente, this.encontro());
  }

  /** Nível de Ameaça da criatura — vem do resumo da ficha, que a listagem da campanha já traz. */
  nivelAmeaca(combatente: EncontroCombatenteResumoDto): NivelAmeacaEnum | null {
    return resolverNivelAmeaca(combatente, this.fichasCampanha());
  }

  /** Avança um turno — o backend vira a rodada sozinho ao passar do último slot. */
  avancarTurno(): void {
    const encontro = this.encontro();
    if (encontro && !this.emOperacao()) {
      this.executarNoEncontro(this.encontroService.avancarTurno(encontro.id));
    }
  }

  /**
   * Roda uma chamada que devolve o **estado completo** do encontro, troca o estado local e libera
   * os controles. O broadcast leva o mesmo payload aos demais participantes.
   */
  executarNoEncontro(
    chamada: Observable<EncontroRecuperadoDto>,
    aoConcluir?: () => void,
  ): void {
    this.executar(chamada, (estado) => {
      this.encontroAtual.set(estado);
      aoConcluir?.();
    });
  }

  /** Trava os controles enquanto a chamada está em voo e destrava no fim, dê certo ou não. */
  executar<T>(chamada: Observable<T>, aoConcluir: (resultado: T) => void): void {
    this.emOperacaoInterno.set(true);
    chamada.pipe(finalize(() => this.emOperacaoInterno.set(false))).subscribe({ next: aoConcluir });
  }
}
