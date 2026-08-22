import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, filter, finalize, of, switchMap } from 'rxjs';

import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAtributosDto,
  FichaRecuperadaDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  CadenciaEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { FichaVisualizacao } from '../../../ficha/componentes/ficha-visualizacao/ficha-visualizacao.component';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { FichaService } from '../../../ficha/ficha.service';
import { rolarIniciativaDaFicha } from '../../../ficha/rolar-iniciativa';
import { nomeCadencia } from '../../../ficha/rotulos-criatura';
import { CartaoCombatente } from '../../componentes/cartao-combatente/cartao-combatente.component';
import { FichaFlutuante } from '../../componentes/ficha-flutuante/ficha-flutuante.component';
import { SeletorCombatentes } from '../../componentes/seletor-combatentes/seletor-combatentes.component';
import { RolagemAvulso } from '../../componentes/rolagem-avulso/rolagem-avulso.component';
import { EncontroService } from '../../encontro.service';
import { rotuloStatusEncontro } from '../../rotulos-encontro';

/**
 * Ambiente de atributos da rolagem de `Rolar tudo`. A fórmula montada (`XD6+N`) **não referencia
 * nenhuma fonte de atributo** — a quantidade de dados já vem resolvida da Destreza efetiva do
 * combatente —, então o mapa existe só para satisfazer o contrato de `rolarFormula` e todos os
 * valores podem ser zero sem afetar o resultado.
 */
const ATRIBUTOS_NEUTROS: FichaAtributosDto = {
  destreza: 0,
  forca: 0,
  luta: 0,
  pontaria: 0,
  vigor: 0,
  intelecto: 0,
  medicina: 0,
  sentidos: 0,
  social: 0,
  vontade: 0,
};

/** Uma posição visual da rodada, mantendo o estado no combatente original. */
interface CombatenteVisualDto extends EncontroCombatenteResumoDto {
  readonly ocorrencia: number;
  readonly totalOcorrencias: number;
  readonly indiceOrdem: number | null;
  readonly chaveVisual: string;
}

/**
 * A tela **"Iniciativa"** (m7-05/m7-06), fiel a `docs/design/examples/iniciativa-desktop.html` —
 * **uma** tela com duas leituras, como o mockup previu no `visaoJogador`:
 *
 * - **Mestre:** monta o encontro (adicionar ficha da campanha ou avulso, atribuir iniciativa),
 *   conduz (avançar/voltar turno, dano/cura) e encerra.
 * - **Jogador:** espectador. Vê a ordem, a rodada, o turno e o estado de quem ele já podia ver
 *   fora do combate — e nada mais. A única coisa que ele **escreve** é a própria iniciativa,
 *   quando o mestre a pede (a rolagem sai do preset da ficha dele, não de um motor daqui).
 *
 * A separação é de UI; quem barra de verdade é o backend (§14), que recorta o próprio payload por
 * usuário antes de responder e de transmitir. Esconder botão nenhum aqui mudaria isso.
 *
 * **Nenhuma regra vive aqui.** A ordem da rodada e a intercalação de Cadência chegam prontas do
 * backend (`ordemRodada`, calculada por `shared/regras/encontro`); o que a tela deriva é só
 * apresentação — de quem é a vez, quem já agiu, quantas ações restam. O `Rolar iniciativas` usa o
 * motor de rolagem do shared (`rolarFormula`), não um `Math.random` local.
 *
 * **Tempo real (§9, broadcast-only):** toda escrita é REST; o estado volta pelo próprio retorno da
 * chamada e, para os demais participantes, pelo broadcast `encontro:alterado` na sala
 * `campanha:<id>`. A reconexão refaz o fetch, como nas telas de ficha.
 */
@Component({
  selector: 'app-painel-encontro',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icone,
    IndicadorTempoReal,
    Tooltip,
    CalculadoraFlutuante,
    HistoricoRolagensSidebar,
    CadernoFlutuante,
    CartaoCombatente,
    FichaFlutuante,
    FichaVisualizacao,
    SeletorCombatentes,
    RolagemAvulso,
    BandejaDados,
  ],
  templateUrl: './painel-encontro.page.html',
  styleUrl: './painel-encontro.page.scss',
  // O jogador rola a própria iniciativa **daqui**, e essa rolagem tem de entrar no feed da campanha
  // como qualquer outra (m3-27); e a própria ficha dele fica sempre aberta na coluna lateral
  // (item novo). Nenhum dos dois serviços é `providedIn: 'root'`: cada página que hospeda uma
  // ficha declara a própria instância e a prende a uma ficha só (mesmo padrão de `CampanhaDetalhe`).
  // A ficha de um combatente **clicado** (mestre olhando qualquer um, jogador olhando um colega
  // revelado) é outra história: ela vive isolada dentro de `FichaFlutuante`, com a própria
  // instância desses serviços — ver o comentário de `FichaFlutuanteConteudo`.
  providers: [FichaRolagemRegistroService, FichaEdicaoService],
})
export class PainelEncontro {
  private readonly encontroService = inject(EncontroService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly roteador = inject(Router);
  private readonly sessaoService = inject(SessaoService);
  private readonly bandeja = inject(BandejaDadosService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);
  private readonly rolagemService = inject(RolagemService);
  /** Edição da ficha do próprio jogador, aberta na coluna lateral (item novo) — não a do combatente
   *  clicado, que vive isolada dentro de `FichaFlutuante`. */
  protected readonly fichaEdicao = inject(FichaEdicaoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Referência à janela flutuante de ficha (mestre olhando qualquer combatente; jogador, um colega
   *  revelado) — aberta imperativamente por `abrirFichaFlutuante`. */
  private readonly fichaFlutuanteRef = viewChild<FichaFlutuante>('fichaFlutuante');

  /** `campanhaId` da rota — sempre presente (a rota só existe sob `/painel/:campanhaId`). */
  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  /**
   * `encontroId` da rota — presente só quando se abre um encontro **do histórico**. Sem ele a tela
   * resolve sozinha o encontro aberto da campanha, que é o caso normal de mesa.
   */
  private readonly encontroIdDaRota = signal<string | null>(null);

  private readonly carregandoEncontro = signal(true);
  protected readonly encontro = signal<EncontroRecuperadoDto | null>(null);
  protected readonly fichasCampanha = signal<readonly FichaResumoDto[]>([]);
  /** Todos os encontros da campanha — o aberto (se houver) e o histórico dos encerrados. */
  protected readonly encontrosDaCampanha = signal<readonly EncontroResumoDto[]>([]);
  /** `null` enquanto os membros não chegaram: até lá não se sabe se quem abriu é mestre. */
  private readonly membros = signal<readonly CampanhaMembroResumoDto[] | null>(null);

  /** Nome da campanha — só existe pro input `campanhaNome` do `app-caderno-flutuante`. */
  protected readonly campanhaNome = signal('');

  /** Feed da campanha, já recortado pelo backend conforme as permissões de cada participante. */
  protected readonly rolagensFeed = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregandoRolagens = signal(true);

  /** `membros()` sem o `null` do carregamento — só existe pro input `membros` das Anotações. */
  protected readonly membrosDaCampanha = computed(() => this.membros() ?? []);

  /**
   * A tela só desenha quando sabe **quem** está olhando: renderizar antes dos membros mostraria a
   * visão de jogador ao mestre por um quadro, com todos os controles piscando na tela.
   */
  protected readonly carregando = computed(
    () => this.carregandoEncontro() || this.membros() === null,
  );

  /** O mestre pede a iniciativa e este sinal acende o chamado na tela do jogador (m7-04/m7-06). */
  protected readonly iniciativaPedida = signal(false);

  /** Lista de encontros anteriores aberta. */
  protected readonly historicoAberto = signal(false);

  /** Uma chamada de escrita em voo — desabilita os controles para não duplicar a mutação. */
  protected readonly emOperacao = signal(false);

  /** Modo de edição explícito: só nele aparecem o campo de iniciativa e o remover de cada cartão. */
  protected readonly modoEdicao = signal(false);
  protected readonly avulsoRolando = signal<EncontroCombatenteResumoDto | null>(null);
  private readonly rolagensOcultasAvulso = signal<Readonly<Record<number, boolean>>>({});

  /**
   * Seletor de combatentes aberto — os cartões sumarizados de agentes/criaturas/NPCs da campanha,
   * clicáveis para entrar ou sair do encontro. Reabrir mostra marcado quem já está em campo.
   */
  protected readonly selecionandoCombatentes = signal(false);

  /** Painel de adicionar avulso aberto — fluxo à parte, porque não há ficha nenhuma para escolher. */
  protected readonly adicionandoAvulso = signal(false);

  /**
   * Ações secundárias do mestre abertas (m7-08). Só tem efeito **no mobile**: em 360px elas ficam
   * atrás de um gatilho para não disputar espaço com a ação primária do rodapé, e no desktop o CSS
   * as mantém sempre na tela. É a folha de estilo que conhece a largura; aqui só mora a intenção.
   */
  protected readonly acoesAbertas = signal(false);

  protected readonly EncontroStatusEnum = EncontroStatusEnum;
  protected readonly CadenciaEnum = CadenciaEnum;
  protected readonly rotuloStatusEncontro = rotuloStatusEncontro;
  protected readonly nomeCadencia = nomeCadencia;
  protected readonly cadencias = Object.values(CadenciaEnum);

  /** Formulário de criação do encontro (quando a campanha ainda não tem um aberto). */
  protected readonly formularioCriacao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
  });

  /**
   * Formulário do combatente avulso — a ficha da campanha entra pelo seletor de cartões
   * (`SeletorCombatentes`), não por aqui; este formulário só existe para quem não tem ficha.
   */
  protected readonly formularioAvulso = this.formBuilder.nonNullable.group({
    nomeAvulso: ['', [Validators.required, Validators.maxLength(120)]],
    vidaMaximaAvulso: [10, [Validators.required, Validators.min(1)]],
    cadencia: [CadenciaEnum.SINGULAR],
    turnosPorRodada: [4, [Validators.required, Validators.min(4)]],
    corAvulso: ['#d53030', [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
  });

  /** Arquivo e prévia locais; o upload só começa depois que o combatente recebe um id. */
  protected readonly imagemAvulsoArquivo = signal<File | null>(null);
  protected readonly imagemAvulsoPreview = signal<string | null>(null);

  /**
   * `true` quando quem abriu a tela é o mestre da campanha — a mesma leitura do
   * `mestreCampanhaGuard` (membros + sessão), sem uma segunda consulta: a página já carrega os
   * membros para resolver o dono de cada ficha.
   */
  protected readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return (this.membros() ?? []).some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  /** `id` de quem está com a tela aberta — só existe pro input `usuarioAtivoId` das Anotações. */
  protected readonly usuarioAtivoId = computed(() => this.sessaoService.usuario()?.id ?? null);

  /** Ids das fichas que **este** usuário joga nesta campanha. */
  private readonly minhasFichaIds = computed<ReadonlySet<number>>(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    const meuMembro = (this.membros() ?? []).find((membro) => membro.usuarioId === usuarioId);
    return new Set((meuMembro?.fichas ?? []).map((ficha) => ficha.id));
  });

  /**
   * O combatente do próprio jogador no encontro — o único que ele pode mexer, e só na iniciativa.
   * `null` para o mestre e para quem está assistindo sem ficha em campo.
   */
  protected readonly meuCombatente = computed<EncontroCombatenteResumoDto | null>(() => {
    const minhas = this.minhasFichaIds();
    return (
      this.combatentes().find(
        (combatente) => combatente.fichaId !== null && minhas.has(combatente.fichaId),
      ) ?? null
    );
  });

  /** `fichaId` do próprio combatente — `null` pro mestre e para quem assiste sem ficha em campo. */
  protected readonly meuFichaId = computed(() => this.meuCombatente()?.fichaId ?? null);

  /**
   * Documento completo da própria ficha — `fichasCampanha()`/`FichaResumoDto` não carrega `dados`,
   * que é o que `<app-ficha-visualizacao>` da coluna lateral (item novo) precisa. Buscado pelo
   * `effect` do construtor sempre que `meuFichaId` muda (o mesmo padrão de `CampanhaDetalhe`).
   */
  protected readonly meuFichaDados = signal<FichaRecuperadaDto | null>(null);

  /**
   * A ficha do jogador ocupa a coluna lateral de 70% (item novo) sempre que ele tem um combatente
   * em campo — durante toda a montagem/combate, não só quando é a vez dele. Mestre nunca a vê (ele
   * já tem a grade inteira); no mobile o CSS ignora esta classe e a coluna nunca aparece.
   */
  protected readonly mostrarFichaLateral = computed(
    () => !this.ehMestre() && this.meuFichaId() !== null,
  );

  /**
   * `true` quando o jogador tem o que rolar: seu combatente está em campo, ainda sem iniciativa, e
   * o encontro está em montagem. O chamado do mestre (`iniciativaPedida`) destaca o botão, mas não
   * é pré-requisito — quem chegou atrasado à mesa rola sem esperar um segundo pedido.
   */
  protected readonly possoRolarIniciativa = computed(
    () =>
      !this.ehMestre() &&
      this.emMontagem() &&
      this.meuCombatente() !== null &&
      this.meuCombatente()?.iniciativa === null,
  );

  /** `true` enquanto o encontro aceita mutação — encerrado é imutável. */
  protected readonly mutavel = computed(
    () => this.encontro()?.status !== EncontroStatusEnum.ENCERRADO,
  );

  /** Encontros já encerrados, do mais recente para o mais antigo — o histórico da campanha. */
  protected readonly historico = computed<readonly EncontroResumoDto[]>(() =>
    this.encontrosDaCampanha()
      .filter((resumo) => resumo.status === EncontroStatusEnum.ENCERRADO)
      .filter((resumo) => resumo.id !== this.encontro()?.id),
  );

  /** `true` quando a tela está mostrando um encontro do histórico, não o combate da mesa. */
  protected readonly vendoHistorico = computed(
    () => this.encontro()?.status === EncontroStatusEnum.ENCERRADO,
  );

  protected readonly emMontagem = computed(
    () => this.encontro()?.status === EncontroStatusEnum.MONTAGEM,
  );

  protected readonly emCombate = computed(
    () => this.encontro()?.status === EncontroStatusEnum.ATIVO,
  );

  /** Total de slots de turno da rodada — o denominador de "Turno 3/6". */
  protected readonly totalDeTurnos = computed(() => this.encontro()?.ordemRodada.length ?? 0);

  /** O slot da vez; nulo em montagem ou depois de encerrado. */
  private readonly slotAtual = computed(() => {
    const encontroAtual = this.encontro();
    if (!encontroAtual || encontroAtual.status !== EncontroStatusEnum.ATIVO) {
      return null;
    }
    return encontroAtual.ordemRodada[encontroAtual.turnoIndice] ?? null;
  });

  /** Id de quem age agora — pinta o cartão e alimenta a faixa "Age agora". */
  protected readonly combatenteDaVezId = computed(() => this.slotAtual()?.combatenteId ?? null);

  /** O combatente da vez, já resolvido. */
  protected readonly combatenteDaVez = computed<EncontroCombatenteResumoDto | null>(() => {
    const id = this.combatenteDaVezId();
    return id === null ? null : (this.combatentes().find((c) => c.id === id) ?? null);
  });

  /** O turno atual pertence ao combatente controlado pelo jogador que abriu a tela. */
  protected readonly ehMinhaVez = computed(() =>
    !this.ehMestre() &&
    this.combatenteDaVezId() !== null &&
    this.combatenteDaVezId() === this.meuCombatente()?.id,
  );

  /**
   * Quantos turnos ainda restam **ao combatente da vez** nesta rodada, contando o atual — o
   * "· 1 ação restante" do mockup. Deriva de `ordemRodada`, não recalcula Cadência.
   */
  protected readonly acoesRestantesDaVez = computed(() => {
    const encontroAtual = this.encontro();
    const id = this.combatenteDaVezId();
    if (!encontroAtual || id === null) {
      return 0;
    }
    return encontroAtual.ordemRodada.filter(
      (slot, indice) => slot.combatenteId === id && indice >= encontroAtual.turnoIndice,
    ).length;
  });

  /**
   * Posições visuais na ordem em que agem. Com a rodada calculada, cada slot vira um cartão: a
   * repetição deixa a Cadência explícita sem duplicar o estado do combatente.
   */
  protected readonly combatentes = computed<readonly CombatenteVisualDto[]>(() => {
    const encontroAtual = this.encontro();
    if (!encontroAtual) {
      return [];
    }
    if (encontroAtual.ordemRodada.length === 0) {
      return [...encontroAtual.combatentes]
        .sort((a, b) => (b.iniciativa ?? -Infinity) - (a.iniciativa ?? -Infinity))
        .map((combatente) => ({
          ...combatente,
          ocorrencia: 1,
          totalOcorrencias: 1,
          indiceOrdem: null,
          chaveVisual: `${combatente.id}-montagem`,
        }));
    }
    const porId = new Map(encontroAtual.combatentes.map((combatente) => [combatente.id, combatente]));
    const totais = new Map<number, number>();
    for (const slot of encontroAtual.ordemRodada) {
      totais.set(slot.combatenteId, (totais.get(slot.combatenteId) ?? 0) + 1);
    }
    const ordenados: CombatenteVisualDto[] = [];
    const jaIncluidos = new Set<number>();
    for (const [indiceOrdem, slot] of encontroAtual.ordemRodada.entries()) {
      const combatente = porId.get(slot.combatenteId);
      if (combatente) {
        jaIncluidos.add(combatente.id);
        ordenados.push({
          ...combatente,
          ocorrencia: slot.ocorrencia,
          totalOcorrencias: totais.get(combatente.id) ?? 1,
          indiceOrdem,
          chaveVisual: `${combatente.id}-${slot.ocorrencia}`,
        });
      }
    }
    // Quem entrou depois do cálculo da ordem só age na próxima rodada — mas continua visível.
    for (const combatente of encontroAtual.combatentes) {
      if (!jaIncluidos.has(combatente.id)) {
        ordenados.push({
          ...combatente,
          ocorrencia: 1,
          totalOcorrencias: 1,
          indiceOrdem: null,
          chaveVisual: `${combatente.id}-pendente`,
        });
      }
    }
    return ordenados;
  });

  /**
   * Quantidade de colunas da grade de cartões no desktop — cresce com o número de combatentes para
   * que uma Ameaça de Cadência alta ou um grupo grande não fiquem espremidos em 3 colunas fixas.
   * Tablet/mobile ignoram este valor (media query própria continua fixando 2/1 coluna).
   */
  protected readonly colunasGrade = computed(() => {
    const total = this.combatentes().length;
    if (total >= 13) return 5;
    if (total >= 9) return 4;
    return 3;
  });

  /** `true` quando a grade deve usar o cartão compacto — divisão do jogador ou grade de 4+ colunas. */
  protected readonly gradeCompacta = computed(
    () => this.mostrarFichaLateral() || this.colunasGrade() > 3,
  );

  /** Ids de quem já gastou todos os turnos desta rodada. */
  private readonly jaAgiram = computed<ReadonlySet<number>>(() => {
    const encontroAtual = this.encontro();
    if (!encontroAtual || encontroAtual.status !== EncontroStatusEnum.ATIVO) {
      return new Set<number>();
    }
    const pendentes = new Set(
      encontroAtual.ordemRodada
        .filter((_, indice) => indice >= encontroAtual.turnoIndice)
        .map((slot) => slot.combatenteId),
    );
    return new Set(
      encontroAtual.ordemRodada
        .map((slot) => slot.combatenteId)
        .filter((id) => !pendentes.has(id)),
    );
  });

  /** `true` quando falta iniciativa a alguém — o combate não pode começar assim. */
  protected readonly faltamIniciativas = computed(() =>
    this.combatentes().some((combatente) => combatente.iniciativa === null),
  );

  constructor() {
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
          this.encontro.set(evento.encontro);
        },
      });

    // O mestre chamou os jogadores a rolar. É só um chamado — nenhum estado muda por aqui (§9).
    this.tempoRealService.encontroIniciativaPedido$
      .pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          if (this.ehMestre()) {
            return;
          }
          this.iniciativaPedida.set(true);
          this.messageService.add({
            severity: 'info',
            summary: 'Role sua iniciativa',
            detail: 'O mestre pediu a iniciativa do esquadrão.',
          });
        },
      });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        untracked(() => this.carregar());
      }
    });

    // Nome da campanha — só precisa vir uma vez, não a cada `carregar()` (a rota troca de encontro,
    // não de campanha).
    this.campanhaService
      .recuperarCampanha(this.campanhaId)
      .subscribe({ next: (campanha) => this.campanhaNome.set(campanha.nome) });

    // Liga a ficha do jogador (coluna lateral, item novo) desde já: `meuFichaId` ainda não tem
    // valor no primeiro tick (falta carregar), mas `inicializar` só lê o getter depois, na hora de
    // gravar — não precisa esperar.
    this.fichaEdicao.inicializar(this.meuFichaDados, () => this.meuFichaId()!);
    this.rolagemRegistro.inicializar(() => this.meuFichaId());
    this.rolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.adicionarRolagemAoFeed(rolagem) });

    // O gateway só envia rolagens públicas a quem pode vê-las; privadas entram localmente acima
    // apenas para quem a fez (ou vêm do GET já recortado para o mestre).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.adicionarRolagemAoFeed(rolagem) });

    // Busca o documento completo sempre que `meuFichaId` muda (chegada em campo, ou o combatente
    // sai e volta) — mesmo padrão de `CampanhaDetalhe` (`fichaExibidaId`/`fichaExibidaDados`).
    effect(() => {
      const fichaId = this.meuFichaId();
      if (fichaId === null) {
        untracked(() => this.meuFichaDados.set(null));
        return;
      }
      this.fichaService.recuperarFicha(fichaId).subscribe({
        next: (ficha) =>
          untracked(() => {
            this.meuFichaDados.set(ficha);
            this.fichaEdicao.definirBase(ficha);
          }),
      });
    });

    // O painel mostra persistentemente quem joga; este toast só chama atenção quando a vez chega.
    effect(() => {
      const daVezId = this.combatenteDaVezId();
      const meuId = this.meuCombatente()?.id ?? null;
      if (
        !this.ehMestre() &&
        daVezId !== null &&
        daVezId === meuId &&
        daVezId !== this.ultimoAvisoDeVezId
      ) {
        this.ultimoAvisoDeVezId = daVezId;
        this.messageService.add({
          severity: 'info',
          summary: 'Sua vez!',
          detail: 'É a sua vez de agir no combate.',
        });
      }
    });
  }

  /** Último `combatenteDaVezId` já avisado ao jogador — evita repetir o toast a cada broadcast. */
  private ultimoAvisoDeVezId: number | null = null;

  /**
   * Carrega o encontro da tela e o contexto de apresentação. Sem `:encontroId` na rota, o encontro
   * é o **aberto** da campanha (o caso de mesa); com ele, é o do histórico que o usuário escolheu.
   */
  private carregar(): void {
    this.carregandoEncontro.set(true);
    this.encontroService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoEncontro.set(false)))
      .subscribe({
        next: (encontros) => {
          this.encontrosDaCampanha.set(encontros);
          const idDaRota = this.encontroIdDaRota();
          const pedido = idDaRota === null ? null : Number(idDaRota);
          const alvo =
            pedido === null
              ? encontros.find((resumo) => resumo.status !== EncontroStatusEnum.ENCERRADO)
              : encontros.find((resumo) => resumo.id === pedido);
          if (alvo) {
            this.encontroService
              .recuperarEncontro(alvo.id)
              .subscribe({ next: (estado) => this.encontro.set(estado) });
          } else {
            this.encontro.set(null);
          }
        },
      });

    this.fichaService
      .listarFichas(this.campanhaId)
      .subscribe({ next: (fichas) => this.fichasCampanha.set(fichas) });
    this.campanhaService
      .listarMembros(this.campanhaId)
      .subscribe({ next: (membros) => this.membros.set(membros) });
  }

  /** Busca inicial do feed. A permissão e o recorte de privadas pertencem ao backend. */
  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
      .subscribe({ next: (itens) => this.rolagensFeed.set(itens), error: () => undefined });
  }

  /** Prepend único para a confirmação local e o broadcast público do mesmo registro. */
  protected adicionarRolagemAoFeed(rolagem: RolagemResumoDto): void {
    this.rolagensFeed.update((atuais) =>
      atuais.some((atual) => atual.id === rolagem.id) ? atuais : [rolagem, ...atuais],
    );
  }

  /** `true` quando é a vez deste combatente. */
  protected ehDaVez(combatente: CombatenteVisualDto): boolean {
    const encontroAtual = this.encontro();
    return encontroAtual?.status === EncontroStatusEnum.ATIVO
      && combatente.indiceOrdem === encontroAtual.turnoIndice;
  }

  /** `true` quando esta ocorrência visual já passou na rodada. */
  protected jaAgiu(combatente: EncontroCombatenteResumoDto & { indiceOrdem?: number | null }): boolean {
    const encontroAtual = this.encontro();
    if (combatente.indiceOrdem !== undefined && combatente.indiceOrdem !== null && encontroAtual) {
      return encontroAtual.status === EncontroStatusEnum.ATIVO
        && combatente.indiceOrdem < encontroAtual.turnoIndice;
    }
    return this.jaAgiram().has(combatente.id);
  }

  /** Nível de Ameaça da criatura — vem do resumo da ficha, que a listagem da campanha já traz. */
  protected nivelAmeaca(combatente: EncontroCombatenteResumoDto): NivelAmeacaEnum | null {
    if (combatente.tipoFicha !== TipoFichaEnum.CRIATURA || combatente.fichaId === null) {
      return null;
    }
    const ficha = this.fichasCampanha().find((item) => item.id === combatente.fichaId);
    return ficha?.na ?? null;
  }

  /** Abre a ficha do combatente clicado na janela flutuante (item novo). */
  protected abrirFichaFlutuante(combatente: EncontroCombatenteResumoDto): void {
    if (combatente.fichaId === null) {
      return;
    }
    this.tentarAbrirFichaFlutuante(combatente.fichaId, combatente.tipoFicha);
  }

  /** "Ver ficha" disparado de dentro das Anotações (`app-caderno-flutuante`) — só o `fichaId`. */
  protected abrirFichaFlutuanteDeAnotacoes(fichaId: number): void {
    const tipo = this.fichasCampanha().find((ficha) => ficha.id === fichaId)?.tipo ?? null;
    this.tentarAbrirFichaFlutuante(fichaId, tipo);
  }

  /** Abre a própria ficha pelo atalho persistente do jogador no mobile. */
  protected abrirMinhaFicha(): void {
    const combatente = this.meuCombatente();
    if (combatente === null) return;

    // Mantém o mesmo caminho do botão do cartão: tipo e dono continuam
    // resolvidos pela lista de fichas já usada pelas demais aberturas.
    this.abrirFichaFlutuante(combatente);
  }

  /**
   * Avulso (`tipoFicha: null`) e NPC (sem ficha na campanha ainda) não têm o que abrir; o dono vem
   * do resumo já carregado (`fichasCampanha()`), não de uma nova consulta.
   */
  private tentarAbrirFichaFlutuante(fichaId: number, tipo: TipoFichaEnum | null): void {
    if (tipo !== TipoFichaEnum.JOGADOR && tipo !== TipoFichaEnum.CRIATURA) {
      return;
    }
    const usuarioIdDono = this.fichasCampanha().find((ficha) => ficha.id === fichaId)?.usuarioId;
    if (usuarioIdDono === undefined) {
      return;
    }
    this.fichaFlutuanteRef()?.abrir({ fichaId, tipo, usuarioIdDono });
  }

  // ── Montagem ───────────────────────────────────────────────────────────────

  /** Cria o encontro da campanha e já abre o painel de montagem. */
  protected criarEncontro(): void {
    if (this.formularioCriacao.invalid || this.emOperacao()) {
      return;
    }
    this.executar(
      this.encontroService.criarEncontro(this.campanhaId, {
        nome: this.formularioCriacao.getRawValue().nome.trim(),
      }),
      (criado) => {
        this.formularioCriacao.reset({ nome: '' });
        this.encontroService
          .recuperarEncontro(criado.id)
          .subscribe({ next: (estado) => this.encontro.set(estado) });
      },
    );
  }

  /** Abre/fecha o seletor de combatentes (cartões de agente/criatura/NPC). */
  protected alternarSelecaoCombatentes(): void {
    this.selecionandoCombatentes.update((aberto) => !aberto);
  }

  /** Abre/fecha o formulário do avulso. */
  protected alternarAdicaoAvulso(): void {
    this.adicionandoAvulso.update((aberto) => !aberto);
  }

  /** Cancela o avulso em digitação: limpa o formulário e fecha o painel. */
  protected cancelarAvulso(): void {
    this.formularioAvulso.reset({
      nomeAvulso: '',
      vidaMaximaAvulso: 10,
      cadencia: CadenciaEnum.SINGULAR,
      turnosPorRodada: 4,
      corAvulso: '#d53030',
    });
    this.imagemAvulsoArquivo.set(null);
    this.imagemAvulsoPreview.set(null);
    this.adicionandoAvulso.set(false);
  }

  /** Abre/fecha a gaveta de ações secundárias (só o mobile as esconde). */
  protected alternarAcoes(): void {
    this.acoesAbertas.update((aberto) => !aberto);
  }

  /** Liga/desliga o modo de edição dos cartões (iniciativa à mão + remover). */
  protected alternarEdicao(): void {
    this.modoEdicao.update((ativo) => !ativo);
  }

  /**
   * O clique num cartão do seletor: se a ficha já tem um combatente no encontro, remove; senão,
   * adiciona. É o próprio `SeletorCombatentes` que já decide o "marcado" — aqui só se espelha essa
   * mesma leitura para escolher a chamada certa.
   */
  protected alternarFichaNoEncontro(ficha: FichaResumoDto): void {
    const encontroAtual = this.encontro();
    if (!encontroAtual || this.emOperacao()) {
      return;
    }
    const jaNoEncontro = this.combatentes().find((combatente) => combatente.fichaId === ficha.id);
    if (jaNoEncontro) {
      this.executarNoEncontro(this.encontroService.removerCombatente(jaNoEncontro.id));
      return;
    }
    this.executarNoEncontro(
      this.encontroService.adicionarCombatente(encontroAtual.id, {
        fichaId: ficha.id,
        nomeAvulso: null,
        vidaMaximaAvulso: null,
        cadencia: null,
      }),
    );
  }

  /** Adiciona o combatente avulso digitado no formulário. */
  protected adicionarAvulso(): void {
    const encontroAtual = this.encontro();
    if (!encontroAtual || this.formularioAvulso.invalid || this.emOperacao()) {
      return;
    }
    const valores = this.formularioAvulso.getRawValue();
    const idsAnteriores = new Set(encontroAtual.combatentes.map((combatente) => combatente.id));
    const arquivo = this.imagemAvulsoArquivo();
    const adicao = this.encontroService.adicionarCombatente(encontroAtual.id, {
        fichaId: null,
        nomeAvulso: valores.nomeAvulso.trim(),
        vidaMaximaAvulso: valores.vidaMaximaAvulso,
        cadencia: valores.cadencia,
        corAvulso: valores.corAvulso,
        ...(valores.cadencia === CadenciaEnum.FRENETICA
          ? { turnosPorRodada: valores.turnosPorRodada }
          : {}),
      });
    this.emOperacao.set(true);
    adicao
      .pipe(
        switchMap((estado) => {
          const novoAvulso = estado.combatentes.find(
            (combatente) => !idsAnteriores.has(combatente.id) && combatente.fichaId === null,
          );
          return arquivo && novoAvulso
            ? this.encontroService.alterarImagemAvulso(novoAvulso.id, arquivo)
            : of(estado);
        }),
        finalize(() => this.emOperacao.set(false)),
      )
      .subscribe({
        next: (estado) => {
          this.encontro.set(estado);
          this.formularioAvulso.reset({
            nomeAvulso: '',
            vidaMaximaAvulso: 10,
            cadencia: CadenciaEnum.SINGULAR,
            turnosPorRodada: 4,
            corAvulso: '#d53030',
          });
          this.imagemAvulsoArquivo.set(null);
          this.imagemAvulsoPreview.set(null);
        },
      });
  }

  /** Valida e prepara a prévia da imagem opcional do formulário. */
  protected selecionarImagemAvulso(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    if (!arquivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      entrada.value = '';
      this.messageService.add({ severity: 'warn', summary: 'Imagem inválida', detail: 'Use JPEG, PNG ou WEBP de até 2MB.' });
      return;
    }
    this.imagemAvulsoArquivo.set(arquivo);
    const leitor = new FileReader();
    leitor.onload = () => this.imagemAvulsoPreview.set(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  /** Persiste a cor escolhida no cartão editável do avulso. */
  protected alterarCorAvulso(combatente: EncontroCombatenteResumoDto, cor: string): void {
    this.executarNoEncontro(this.encontroService.alterarIdentidadeAvulso(combatente.id, cor));
  }

  /** Valida e substitui a imagem do cartão editável do avulso. */
  protected alterarImagemAvulso(combatente: EncontroCombatenteResumoDto, arquivo: File): void {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      this.messageService.add({ severity: 'warn', summary: 'Imagem inválida', detail: 'Use JPEG, PNG ou WEBP de até 2MB.' });
      return;
    }
    this.executarNoEncontro(this.encontroService.alterarImagemAvulso(combatente.id, arquivo));
  }

  /** Remove a imagem do cartão editável do avulso. */
  protected removerImagemAvulso(combatente: EncontroCombatenteResumoDto): void {
    this.executarNoEncontro(this.encontroService.excluirImagemAvulso(combatente.id));
  }

  /** Visibilidade das próximas rolagens, preservada por avulso durante esta sessão da página. */
  protected rolagemAvulsoOculta(combatenteId: number): boolean {
    return this.rolagensOcultasAvulso()[combatenteId] ?? true;
  }

  protected alterarVisibilidadeRolagemAvulso(combatenteId: number, oculta: boolean): void {
    this.rolagensOcultasAvulso.update((atuais) => ({ ...atuais, [combatenteId]: oculta }));
  }

  /** Remove um combatente do encontro. */
  protected removerCombatente(combatente: EncontroCombatenteResumoDto): void {
    this.executarNoEncontro(this.encontroService.removerCombatente(combatente.id));
  }

  /** Grava a iniciativa digitada à mão pelo mestre. */
  protected atribuirIniciativa(combatente: EncontroCombatenteResumoDto, valor: number): void {
    this.executarNoEncontro(
      this.encontroService.atribuirIniciativa({ id: combatente.id, iniciativa: valor }),
    );
  }

  /**
   * `Rolar iniciativas` — rola `XD6 + bônus` para **cada combatente sem iniciativa**, onde `X` é a Destreza
   * efetiva e o bônus é o fixo da criatura. O backend ignora quem já tem valor, então a iniciativa
   * que um jogador rolou nunca é sobrescrita.
   *
   * É o **fallback do mestre** (jogador ausente), não o caminho principal: o bônus de Iniciativa do
   * agente são **dados extras** (amplificador `Atento`, Formação da Origem) que só o documento
   * completo da ficha resolve — por isso a decisão do milestone é o jogador rolar a própria (m7-06).
   */
  protected rolarTudo(): void {
    const encontroAtual = this.encontro();
    if (!encontroAtual || this.emOperacao()) {
      return;
    }
    const iniciativaPorCombatente: Record<number, number> = {};
    for (const combatente of this.combatentes()) {
      if (combatente.iniciativa !== null) {
        continue;
      }
      const dados = Math.max(1, combatente.destreza);
      const resultado = rolarFormula({
        formula: `${dados}D6+${combatente.iniciativaBonus}`,
        atributos: ATRIBUTOS_NEUTROS,
      });
      if (resultado) {
        iniciativaPorCombatente[combatente.id] = resultado.total;
      }
    }
    if (Object.keys(iniciativaPorCombatente).length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Nada a rolar',
        detail: 'Todo mundo já tem iniciativa.',
      });
      return;
    }
    this.executarNoEncontro(
      this.encontroService.rolarIniciativasFaltantes(encontroAtual.id, iniciativaPorCombatente),
    );
  }

  /** Chama os jogadores a rolar a própria iniciativa (broadcast, sem mudar estado). */
  protected pedirIniciativa(): void {
    const encontroAtual = this.encontro();
    if (!encontroAtual || this.emOperacao()) {
      return;
    }
    this.executarNoEncontro(this.encontroService.pedirIniciativa(encontroAtual.id), () =>
      this.messageService.add({
        severity: 'success',
        summary: 'Iniciativa pedida',
        detail: 'Os jogadores foram chamados a rolar a própria iniciativa.',
      }),
    );
  }

  // ── Condução ───────────────────────────────────────────────────────────────

  /** Inicia o combate — exige todo mundo com iniciativa. */
  protected iniciarCombate(): void {
    const encontroAtual = this.encontro();
    if (!encontroAtual || this.emOperacao()) {
      return;
    }
    this.modoEdicao.set(false);
    this.selecionandoCombatentes.set(false);
    this.adicionandoAvulso.set(false);
    this.executarNoEncontro(this.encontroService.iniciarEncontro(encontroAtual.id));
  }

  /** Avança um turno — o backend vira a rodada sozinho ao passar do último slot. */
  protected avancarTurno(): void {
    const encontroAtual = this.encontro();
    if (encontroAtual && !this.emOperacao()) {
      this.executarNoEncontro(this.encontroService.avancarTurno(encontroAtual.id));
    }
  }

  /** Volta um turno. */
  protected voltarTurno(): void {
    const encontroAtual = this.encontro();
    if (encontroAtual && !this.emOperacao()) {
      this.executarNoEncontro(this.encontroService.voltarTurno(encontroAtual.id));
    }
  }

  /** Encerra o combate — depois disso o encontro fica só de leitura. */
  protected encerrarCombate(): void {
    const encontroAtual = this.encontro();
    if (encontroAtual && !this.emOperacao()) {
      this.executarNoEncontro(this.encontroService.encerrarEncontro(encontroAtual.id));
    }
  }

  /** Aplica dano/cura de 1 ponto pelos steppers do cartão. */
  protected ajustarVida(combatente: EncontroCombatenteResumoDto, delta: number): void {
    this.executarNoEncontro(
      this.encontroService.ajustarVida({ id: combatente.id, delta, origemTexto: null }),
    );
  }

  /** Gasta/recupera 1 de Energia pelos steppers do cartão. */
  protected ajustarEnergia(combatente: EncontroCombatenteResumoDto, delta: number): void {
    this.executarNoEncontro(
      this.encontroService.ajustarEnergia({ id: combatente.id, delta, origemTexto: null }),
    );
  }

  // ── Jogador ────────────────────────────────────────────────────────────────

  /**
   * O jogador rola a **própria** iniciativa e a atribui ao seu combatente.
   *
   * A rolagem sai do preset "Iniciativa" da ficha dele (`rolarIniciativaDaFicha`), com o dado extra
   * de `Atento` e da Formação da Origem já embutido — o mesmo caminho do botão de Iniciativa dentro
   * da ficha, e por isso o mesmo número. É esta a razão de o jogador rolar em vez do mestre: o
   * bônus dele são **dados**, e só o documento completo os resolve (o `Rolar tudo` do mestre, que
   * enxerga só o resumo do combatente, é fallback para jogador ausente).
   *
   * O resultado aparece na bandeja e entra no feed da campanha como qualquer outra rolagem (m3-27),
   * antes de virar a iniciativa do combatente.
   */
  protected rolarMinhaIniciativa(): void {
    const combatente = this.meuCombatente();
    if (!combatente || combatente.fichaId === null || this.emOperacao()) {
      return;
    }
    this.emOperacao.set(true);
    this.fichaService
      .recuperarFicha(combatente.fichaId)
      .pipe(finalize(() => this.emOperacao.set(false)))
      .subscribe({
        next: (ficha) => {
          const executado = rolarIniciativaDaFicha(ficha.dados);
          if (!executado) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Sem preset de Iniciativa',
              detail: 'Sua ficha não tem a rolagem "Iniciativa" — peça ao mestre para atribuí-la.',
            });
            return;
          }
          this.bandeja.mostrar({
            rotulo: executado.rotulo,
            formula: executado.formula,
            resultado: executado.resultado,
            corFicha: ficha.cor,
            visibilidade: this.rolagemRegistro.oculta()
              ? RolagemVisibilidadeEnum.PRIVADA
              : RolagemVisibilidadeEnum.PUBLICA,
          });
          this.rolagemRegistro.inicializar(() => combatente.fichaId);
          this.rolagemRegistro.registrar({
            rotulo: executado.rotulo,
            formula: executado.formula,
            resultado: executado.resultado,
          });
          this.iniciativaPedida.set(false);
          this.executarNoEncontro(
            this.encontroService.atribuirIniciativa({
              id: combatente.id,
              iniciativa: executado.resultado.total,
            }),
          );
        },
      });
  }

  // ── Histórico ──────────────────────────────────────────────────────────────

  /** Abre/fecha a lista de encontros anteriores. */
  protected alternarHistorico(): void {
    this.historicoAberto.update((aberto) => !aberto);
  }

  /**
   * Abre um encontro do histórico. Navega em vez de trocar o sinal para que a URL identifique o que
   * está na tela — o combate encerrado é um documento, e um documento tem endereço.
   */
  protected abrirDoHistorico(resumo: EncontroResumoDto): void {
    void this.roteador.navigate(['/painel', this.campanhaId, 'iniciativa', resumo.id]);
  }

  /** Volta do histórico para o combate corrente da campanha. */
  protected voltarAoCorrente(): void {
    void this.roteador.navigate(['/painel', this.campanhaId, 'iniciativa']);
  }

  // ── Plumbing ───────────────────────────────────────────────────────────────

  /**
   * Roda uma chamada que devolve o **estado completo** do encontro, troca o estado local e libera
   * os controles. O broadcast leva o mesmo payload aos demais participantes.
   */
  private executarNoEncontro(
    chamada: Observable<EncontroRecuperadoDto>,
    aoConcluir?: () => void,
  ): void {
    this.executar(chamada, (estado) => {
      this.encontro.set(estado);
      aoConcluir?.();
    });
  }

  /** Trava os controles enquanto a chamada está em voo e destrava no fim, dê certo ou não. */
  private executar<T>(
    chamada: Observable<T>,
    aoConcluir: (resultado: T) => void,
  ): void {
    this.emOperacao.set(true);
    chamada.pipe(finalize(() => this.emOperacao.set(false))).subscribe({ next: aoConcluir });
  }
}
