import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, filter, finalize, of, switchMap } from 'rxjs';

import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
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
 * papéis. Provido por `PainelEncontroShell` (`providers`, escopo de rota — uma instância por
 * navegação para `/campanhas/:campanhaId/iniciativa`), nunca `providedIn: 'root'`.
 *
 * **Nenhuma regra vive aqui.** A ordem da rodada e a intercalação de Cadência chegam prontas do
 * backend (`ordemRodada`, `shared/regras/encontro`); o que o serviço deriva é só apresentação — de
 * quem é a vez, quem já agiu, quantas ações restam.
 *
 * **Tempo real (§9, broadcast-only):** toda escrita é REST; o estado volta pelo próprio retorno da
 * chamada e, para os demais participantes, pelo broadcast `encontro:alterado` na sala
 * `campanha:<id>`. A reconexão refaz o fetch, como nas telas de ficha.
 */
@Injectable()
export class EncontroPainelDadosService {
  private readonly encontroService = inject(EncontroService);
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

  /**
   * `encontroId` da rota — presente só quando se abre um encontro **do histórico**. Sem ele a tela
   * resolve sozinha o encontro aberto da campanha, que é o caso normal de mesa.
   */
  private readonly encontroIdDaRota = signal<string | null>(null);

  private readonly carregandoEncontro = signal(true);
  private readonly encontroAtual = signal<EncontroRecuperadoDto | null>(null);
  private readonly fichasDaCampanha = signal<readonly FichaResumoDto[]>([]);
  private readonly encontrosDaCampanhaInterno = signal<readonly EncontroResumoDto[]>([]);
  private readonly membrosInterno = signal<readonly CampanhaMembroResumoDto[] | null>(null);
  private readonly campanhaNomeInterno = signal('');
  private readonly rolagensDoFeed = signal<readonly RolagemResumoDto[]>([]);
  private readonly carregandoFeed = signal(true);
  private readonly emOperacaoInterno = signal(false);

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

    // `paramMap` (e não o `snapshot`) porque abrir um encontro do histórico troca só o parâmetro:
    // o Angular reusa o componente, e um `snapshot` lido no construtor ficaria congelado no
    // primeiro valor. Emite de imediato, então também faz a carga inicial.
    this.rotaAtiva.paramMap.pipe(takeUntilDestroyed()).subscribe({
      next: (parametros) => {
        this.encontroIdDaRota.set(parametros.get('encontroId'));
        this.carregar();
      },
    });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    this.tempoRealService.encontroAlterado$
      .pipe(
        filter((evento) => evento.encontro.campanhaId === this.campanhaId),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (evento) => {
          // Quem está lendo um encontro do histórico não é arrastado para o combate corrente.
          if (this.vendoHistorico() && evento.encontro.id !== this.encontro()?.id) {
            return;
          }
          this.encontroAtual.set(evento.encontro);
        },
      });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        untracked(() => this.carregar());
      }
    });

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
        next: (excluida) =>
          this.rolagensDoFeed.update((atuais) => atuais.filter((rolagem) => rolagem.id !== excluida.id)),
      });
  }

  /**
   * Carrega o encontro da tela e o contexto de apresentação. Sem `:encontroId` na rota, o encontro
   * é o **aberto** da campanha (o caso de mesa); com ele, é o do histórico que o usuário escolheu.
   */
  private carregar(): void {
    this.carregandoEncontro.set(true);
    // A carga só termina quando o encontro em si chega — encadeado, e não disparado de dentro do
    // `next` da lista: entre a lista e o encontro a tela já não "carrega" e ainda não tem encontro,
    // e piscaria o estado vazio ("Nenhum combate em andamento" / "Novo combate") por uma ida à rede.
    this.encontroService
      .listarPorCampanha(this.campanhaId)
      .pipe(
        switchMap((encontros) => {
          this.encontrosDaCampanhaInterno.set(encontros);
          const idDaRota = this.encontroIdDaRota();
          const pedido = idDaRota === null ? null : Number(idDaRota);
          const alvo =
            pedido === null
              ? encontros.find((resumo) => resumo.status !== EncontroStatusEnum.ENCERRADO)
              : encontros.find((resumo) => resumo.id === pedido);
          return alvo ? this.encontroService.recuperarEncontro(alvo.id) : of(null);
        }),
        finalize(() => this.carregandoEncontro.set(false)),
      )
      .subscribe({ next: (estado) => this.encontroAtual.set(estado) });

    this.fichaService
      .listarFichas(this.campanhaId)
      .subscribe({ next: (fichas) => this.fichasDaCampanha.set(fichas) });
    this.campanhaService
      .listarMembros(this.campanhaId)
      .subscribe({ next: (membros) => this.membrosInterno.set(membros) });
  }

  /** Busca inicial do feed. A permissão e o recorte de privadas pertencem ao backend. */
  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoFeed.set(false)))
      .subscribe({ next: (itens) => this.rolagensDoFeed.set(itens), error: () => undefined });
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
