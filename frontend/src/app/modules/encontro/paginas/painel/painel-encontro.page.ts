import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, filter, finalize } from 'rxjs';

import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAtributosDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CadenciaEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { nomeCadencia } from '../../../ficha/rotulos-criatura';
import { CartaoCombatente } from '../../componentes/cartao-combatente/cartao-combatente.component';
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

/**
 * Painel de combate do mestre — a tela **"Iniciativa"** (m7-05), fiel a
 * `docs/design/examples/iniciativa-desktop.html`. Monta o encontro (adicionar ficha da campanha ou
 * avulso, atribuir iniciativa), conduz (avançar/voltar turno, dano/cura) e encerra.
 *
 * **Nenhuma regra vive aqui.** A ordem da rodada e a intercalação de Cadência chegam prontas do
 * backend (`ordemRodada`, calculada por `shared/regras/encontro`); o que a tela deriva é só
 * apresentação — de quem é a vez, quem já agiu, quantas ações restam. O `Rolar tudo` usa o motor de
 * rolagem do shared (`rolarFormula`), não um `Math.random` local.
 *
 * **Tempo real (§9, broadcast-only):** toda escrita é REST; o estado volta pelo próprio retorno da
 * chamada e, para os demais participantes, pelo broadcast `encontro:alterado` na sala
 * `campanha:<id>`. A reconexão refaz o fetch, como nas telas de ficha.
 */
@Component({
  selector: 'app-painel-encontro',
  imports: [RouterLink, ReactiveFormsModule, Icone, IndicadorTempoReal, Tooltip, CartaoCombatente],
  templateUrl: './painel-encontro.page.html',
  styleUrl: './painel-encontro.page.scss',
})
export class PainelEncontro {
  private readonly encontroService = inject(EncontroService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** `campanhaId` da rota — sempre presente (rota guardada pelo `mestreCampanhaGuard`). */
  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  protected readonly carregando = signal(true);
  protected readonly encontro = signal<EncontroRecuperadoDto | null>(null);
  protected readonly fichasCampanha = signal<readonly FichaResumoDto[]>([]);
  private readonly membros = signal<readonly CampanhaMembroResumoDto[]>([]);

  /** Uma chamada de escrita em voo — desabilita os controles para não duplicar a mutação. */
  protected readonly emOperacao = signal(false);

  /** Modo de edição explícito: só nele aparecem o campo de iniciativa e o remover de cada cartão. */
  protected readonly modoEdicao = signal(false);

  /** Painel de adicionar combatente aberto. */
  protected readonly adicionando = signal(false);

  protected readonly EncontroStatusEnum = EncontroStatusEnum;
  protected readonly CadenciaEnum = CadenciaEnum;
  protected readonly rotuloStatusEncontro = rotuloStatusEncontro;
  protected readonly nomeCadencia = nomeCadencia;
  protected readonly cadencias = Object.values(CadenciaEnum);

  /** Formulário de criação do encontro (quando a campanha ainda não tem um aberto). */
  protected readonly formularioCriacao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
  });

  /** Formulário de adição de combatente — ou uma ficha da campanha, ou um avulso digitado. */
  protected readonly formularioCombatente = this.formBuilder.nonNullable.group({
    fichaId: [''],
    nomeAvulso: [''],
    vidaMaximaAvulso: [10],
    cadencia: [CadenciaEnum.SINGULAR],
  });

  /** `true` enquanto o encontro aceita mutação — encerrado é imutável. */
  protected readonly mutavel = computed(
    () => this.encontro()?.status !== EncontroStatusEnum.ENCERRADO,
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
   * Combatentes na ordem em que agem. Em montagem ainda não há `ordemRodada`, então a lista sai por
   * iniciativa decrescente (nula por último) só para dar uma leitura estável ao mestre.
   */
  protected readonly combatentes = computed<readonly EncontroCombatenteResumoDto[]>(() => {
    const encontroAtual = this.encontro();
    if (!encontroAtual) {
      return [];
    }
    if (encontroAtual.ordemRodada.length === 0) {
      return [...encontroAtual.combatentes].sort(
        (a, b) => (b.iniciativa ?? -Infinity) - (a.iniciativa ?? -Infinity),
      );
    }
    const porId = new Map(encontroAtual.combatentes.map((combatente) => [combatente.id, combatente]));
    const ordenados: EncontroCombatenteResumoDto[] = [];
    const jaIncluidos = new Set<number>();
    for (const slot of encontroAtual.ordemRodada) {
      const combatente = porId.get(slot.combatenteId);
      if (combatente && !jaIncluidos.has(combatente.id)) {
        jaIncluidos.add(combatente.id);
        ordenados.push(combatente);
      }
    }
    // Quem entrou depois do cálculo da ordem só age na próxima rodada — mas continua visível.
    for (const combatente of encontroAtual.combatentes) {
      if (!jaIncluidos.has(combatente.id)) {
        ordenados.push(combatente);
      }
    }
    return ordenados;
  });

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

  /** Fichas da campanha ainda fora do encontro — as opções do seletor de adição. */
  protected readonly fichasDisponiveis = computed<readonly FichaResumoDto[]>(() => {
    const jaNoEncontro = new Set(
      this.combatentes()
        .map((combatente) => combatente.fichaId)
        .filter((fichaId): fichaId is number => fichaId !== null),
    );
    return this.fichasCampanha().filter((ficha) => !jaNoEncontro.has(ficha.id));
  });

  constructor() {
    this.carregar();

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    this.tempoRealService.encontroAlterado$
      .pipe(
        filter((evento) => evento.encontro.campanhaId === this.campanhaId),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (evento) => this.encontro.set(evento.encontro) });

    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        untracked(() => this.carregar());
      }
    });
  }

  /** Carrega o encontro aberto da campanha (se houver) e o contexto de apresentação. */
  private carregar(): void {
    this.carregando.set(true);
    this.encontroService
      .listarPorCampanha(this.campanhaId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (encontros) => {
          const aberto = encontros.find(
            (resumo) => resumo.status !== EncontroStatusEnum.ENCERRADO,
          );
          if (aberto) {
            this.encontroService
              .recuperarEncontro(aberto.id)
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

  /** `true` quando é a vez deste combatente. */
  protected ehDaVez(combatente: EncontroCombatenteResumoDto): boolean {
    return combatente.id === this.combatenteDaVezId();
  }

  /** `true` quando este combatente já gastou os turnos dele nesta rodada. */
  protected jaAgiu(combatente: EncontroCombatenteResumoDto): boolean {
    return this.jaAgiram().has(combatente.id);
  }

  /** Nome de quem joga a ficha do combatente — resolvido dos membros já carregados. */
  protected donoNome(combatente: EncontroCombatenteResumoDto): string | null {
    if (combatente.fichaId === null) {
      return null;
    }
    const dono = this.membros().find((membro) =>
      membro.fichas.some((ficha) => ficha.id === combatente.fichaId),
    );
    return dono?.nome ?? null;
  }

  /** Nível de Ameaça da criatura — vem do resumo da ficha, que a listagem da campanha já traz. */
  protected nivelAmeaca(combatente: EncontroCombatenteResumoDto): NivelAmeacaEnum | null {
    if (combatente.tipoFicha !== TipoFichaEnum.CRIATURA || combatente.fichaId === null) {
      return null;
    }
    const ficha = this.fichasCampanha().find((item) => item.id === combatente.fichaId);
    return ficha?.na ?? null;
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

  /** Abre/fecha o painel de adicionar combatente. */
  protected alternarAdicao(): void {
    this.adicionando.update((aberto) => !aberto);
  }

  /** Liga/desliga o modo de edição dos cartões (iniciativa à mão + remover). */
  protected alternarEdicao(): void {
    this.modoEdicao.update((ativo) => !ativo);
  }

  /** Adiciona a ficha selecionada, ou o avulso digitado, ao encontro. */
  protected adicionarCombatente(): void {
    const encontroAtual = this.encontro();
    const valores = this.formularioCombatente.getRawValue();
    const nomeAvulso = valores.nomeAvulso.trim();
    // O `<select>` nativo entrega string; o DTO quer `number | null`.
    const fichaId = valores.fichaId === '' ? null : Number(valores.fichaId);
    if (!encontroAtual || this.emOperacao()) {
      return;
    }
    if (fichaId === null && nomeAvulso === '') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Combatente incompleto',
        detail: 'Escolha uma ficha da campanha ou dê um nome ao avulso.',
      });
      return;
    }
    this.executarNoEncontro(
      this.encontroService.adicionarCombatente(encontroAtual.id, {
        fichaId,
        nomeAvulso: fichaId === null ? nomeAvulso : null,
        vidaMaximaAvulso: fichaId === null ? valores.vidaMaximaAvulso : null,
        cadencia: fichaId === null ? valores.cadencia : null,
      }),
      () =>
        this.formularioCombatente.reset({
          fichaId: '',
          nomeAvulso: '',
          vidaMaximaAvulso: 10,
          cadencia: CadenciaEnum.SINGULAR,
        }),
    );
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
   * `Rolar tudo` — rola `XD6 + bônus` para **cada combatente sem iniciativa**, onde `X` é a Destreza
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
    this.adicionando.set(false);
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
