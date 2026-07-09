import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, filter, finalize, forkJoin, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  calcularAreaPercepcao,
  calcularDanoCorpo,
  calcularDefesa,
  calcularDeslocamento,
  calcularEnergia,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  calcularVida,
  contarMarcosDanoFurtivo,
  incrementarDanoFurtivo,
  obterBonusAtributos,
  type BonusAtributos,
} from '@contratados-rpg/shared/regras/agente';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaAtributosDto,
  FichaDerivadosDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { lerParamRota } from '../../ler-param-rota';
import { normalizarEntrada, type EntradaAgente } from '../../status-derivado';

import {
  AjusteAtributos,
  AjusteCampoDados,
  AjusteClasse,
  AjusteDerivado,
  AjusteVitalidade,
  FichaVisualizacao,
} from '../../componentes/ficha-visualizacao/ficha-visualizacao.component';

/**
 * A **ficha** de jogador numa tela só (`/painel/:campanhaId/ficha/:id`, m3-10): **edição no próprio
 * lugar, campo a campo** — cada trecho tem seu lápis no `FichaVisualizacao` (identidade, classe,
 * atributos+Maestria, Vida/Energia atual e máxima, derivados). **Não há botão global de editar nem
 * formulário separado**; cada confirmação persiste otimista e em lote (`alterarFicha`, debounced).
 * A autoridade é sempre o backend (§14): permissões e a regra de Maestria são revalidadas; um erro
 * (403/400) chega pelo `error-handler.interceptor`. O painel de **gestão de acesso** (m3-04) aparece
 * para dono/mestre.
 *
 * Estado em Signals; carrega a ficha e os membros da campanha (para o nome do dono, a checagem de
 * mestre e a lista de candidatos à concessão). Os acessos só são buscados quando o usuário pode
 * geri-los. Os `id`s vêm dos parâmetros de rota (`lerParamRota` sobe até a rota-pai).
 */
@Component({
  selector: 'app-ficha-visualizar',
  imports: [RouterLink, ReactiveFormsModule, Icone, FichaVisualizacao, IndicadorTempoReal],
  templateUrl: './visualizar.page.html',
  styleUrl: './visualizar.page.scss',
})
export class FichaVisualizar {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));
  protected readonly fichaId = Number(lerParamRota(this.rotaAtiva, 'id'));

  protected readonly carregando = signal(true);
  protected readonly ficha = signal<FichaRecuperadaDto | null>(null);
  private readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly acessos = signal<FichaAcessoResumoDto[]>([]);

  /** Dispara a persistência (debounced) de cada edição no próprio lugar. */
  private readonly ajustePendente = new Subject<void>();
  /**
   * `true` enquanto há uma edição local não persistida (do disparo até a resposta do `alterarFicha`).
   * Enquanto verdadeiro, um `ficha:alterada` recebido por WebSocket é **descartado** para não
   * sobrescrever o que o usuário está editando (m3-08 × m3-10) — a resposta do próprio save
   * reconcilia com o estado autoritativo do backend.
   */
  private readonly edicaoPendente = signal(false);

  /** Menu de ações no cabeçalho (kebab) aberto. */
  protected readonly menuAberto = signal(false);
  /** Dialog de gestão de acesso aberta (m3-10 — tira o painel do corpo da tela). */
  protected readonly dialogAcesso = signal(false);

  /** Membro selecionado para receber acesso (Reactive Forms — sem `ngModel`). */
  protected readonly membroParaConceder = new FormControl<number | null>(null);
  protected readonly concedendo = signal(false);
  /** `usuarioId` cuja revogação está em voo (para desabilitar só a linha correspondente). */
  protected readonly revogando = signal<number | null>(null);

  /** `true` quando o usuário autenticado é o dono desta ficha. */
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

  /**
   * Membros elegíveis a receber acesso: exclui o dono (já vê), o mestre (já vê tudo) e quem já tem
   * concessão ativa. Alimenta o `<select>` do painel de concessão.
   */
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
    forkJoin({
      ficha: this.fichaService.recuperarFicha(this.fichaId),
      membros: this.campanhaService.listarMembros(this.campanhaId),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ ficha, membros }) => {
          this.ficha.set(ficha);
          this.membros.set(membros);
          if (this.podeGerenciar()) {
            this.carregarAcessos();
          }
        },
      });

    // Ajustes rápidos de Vida/Energia (passos − / + na leitura) são otimistas na tela e persistidos
    // em lote após um respiro: cliques seguidos viram um único `alterarFicha` (o `switchMap` descarta
    // a requisição anterior, e o backend revalida o teto). A resposta reconcilia a tela.
    this.ajustePendente
      .pipe(
        debounceTime(500),
        switchMap(() => {
          const fichaAtual = this.ficha()!;
          return this.fichaService
            .alterarFicha(this.fichaId, { nome: fichaAtual.nome, dados: fichaAtual.dados })
            .pipe(
              // Um erro de save (403/400) não pode matar o stream nem prender `edicaoPendente` — isso
              // congelaria a persistência e os live-updates. Libera a flag e segue ouvindo.
              catchError(() => {
                this.edicaoPendente.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (fichaAlterada) => {
          this.ficha.set(fichaAlterada);
          this.edicaoPendente.set(false);
        },
      });

    // Tempo real (m3-08): entra na sala `ficha:<id>` e reage a `ficha:alterada`. O mestre com a ficha
    // aberta vê a edição do jogador **sem recarregar** (critério de aceite). A permissão da sala é
    // arbitrada pelo gateway (§14) — o front só apresenta. Ao sair da tela, esquece a sala.
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaFicha(this.fichaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaFicha(this.fichaId));

    this.tempoRealService.fichaAlterada$
      .pipe(
        filter((ficha) => ficha.id === this.fichaId && !this.edicaoPendente()),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (fichaAlterada) => this.ficha.set(fichaAlterada) });

    // Ressincronização ao reconectar (§9 — o Render dorme e derruba a conexão): refaz o fetch da
    // ficha aberta, exceto se houver edição local pendente (o save em voo já reconcilia).
    effect(() => {
      if (this.tempoRealService.reconexao() > 0 && !this.edicaoPendente()) {
        this.fichaService
          .recuperarFicha(this.fichaId)
          .subscribe({ next: (ficha) => this.ficha.set(ficha) });
      }
    });
  }

  /** Marca uma edição local pendente e agenda a persistência em lote (debounced). */
  private agendarPersistencia(): void {
    this.edicaoPendente.set(true);
    this.ajustePendente.next();
  }

  /** Abre/fecha o menu de ações do cabeçalho. */
  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  /** Fecha o menu de ações. */
  protected fecharMenu(): void {
    this.menuAberto.set(false);
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

  /** (Re)carrega as concessões ativas da ficha — usado no boot e após conceder/revogar. */
  private carregarAcessos(): void {
    this.fichaService
      .listarAcessos(this.fichaId)
      .subscribe({ next: (acessos) => this.acessos.set(acessos) });
  }


  /**
   * Ajuste rápido de Vida/Energia atual na leitura (passo − / +): reflete na hora (otimista) e
   * agenda a persistência em lote. Só dono/mestre chega aqui — a leitura só mostra os passos a eles;
   * o backend revalida o teto no `alterarFicha`.
   */
  protected ajustarVitalidade(ajuste: AjusteVitalidade): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const estado = { ...fichaAtual.dados.estado, [ajuste.campo]: ajuste.valor };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, estado } });
    this.agendarPersistencia();
  }

  /**
   * Edição de um derivado (Informações Extras): grava o override em `derivados[chave]`, otimista na
   * tela, e agenda a persistência em lote (mesmo `ajustePendente` da vitalidade). Só dono/mestre
   * chega aqui; o backend não trava faixa (m3-10).
   */
  protected ajustarDerivado(ajuste: AjusteDerivado): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const derivados = { ...(fichaAtual.dados.derivados ?? {}), [ajuste.chave]: ajuste.valor };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, derivados } });
    this.agendarPersistencia();
  }

  /**
   * Edição em grupo dos atributos + Maestria (m3-10): reflete na hora (otimista) e persiste em lote.
   * Aplica a **progressão** — os derivados que dependem de atributo acompanham a mudança: Vigor →
   * Vida máxima e Bloqueio; Destreza → Energia máxima, Esquiva e Deslocamento; Sentidos → Percepção;
   * Força → Inventário e Dano C.a.C. Só dono/mestre chega aqui; o backend valida a Maestria e não
   * trava faixa.
   */
  protected ajustarAtributos(ajuste: AjusteAtributos): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const dadosNovos: FichaJogadorDadosDto = {
      ...fichaAtual.dados,
      atributos: ajuste.atributos,
      maestria: ajuste.maestria,
    };
    this.ficha.set({ ...fichaAtual, dados: this.aplicarProgressao(fichaAtual.dados, dadosNovos) });
    this.agendarPersistencia();
  }

  /**
   * Edita Classe/Arquétipo (arquétipo já coerente com a classe). Ao trocar de arquétipo/subclasse,
   * aplica o **delta dos Atributos Bônus fixos** (doc — "Classes e Arquétipos"): remove o bônus do
   * anterior e soma o do novo (ex.: Lutador → Mercenário tira +1 Força/+1 Luta e põe +1 Pontaria/+1
   * Destreza). Preserva ajustes manuais (só o delta entra/sai). Como os atributos mudaram, a
   * **progressão** propaga a variação aos derivados/máximas dependentes. Otimista + em lote.
   */
  protected ajustarClasse(ajuste: AjusteClasse): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const bonusAntes = obterBonusAtributos({
      classe: fichaAtual.dados.classe,
      arquetipo: fichaAtual.dados.arquetipo,
    });
    const bonusDepois = obterBonusAtributos({ classe: ajuste.classe, arquetipo: ajuste.arquetipo });
    const dadosNovos: FichaJogadorDadosDto = {
      ...fichaAtual.dados,
      classe: ajuste.classe,
      arquetipo: ajuste.arquetipo,
      atributos: this.aplicarDeltaBonus(fichaAtual.dados.atributos, bonusAntes, bonusDepois),
    };
    this.ficha.set({ ...fichaAtual, dados: this.aplicarProgressao(fichaAtual.dados, dadosNovos) });
    this.agendarPersistencia();
  }

  /** Atributos com o delta de Atributos Bônus do arquétipo/subclasse (remove o antigo, soma o novo). */
  private aplicarDeltaBonus(
    atributos: FichaAtributosDto,
    bonusAntes: BonusAtributos,
    bonusDepois: BonusAtributos,
  ): FichaAtributosDto {
    const resultado = { ...atributos };
    (Object.keys(resultado) as (keyof FichaAtributosDto)[]).forEach((chave) => {
      resultado[chave] = resultado[chave] - (bonusAntes[chave] ?? 0) + (bonusDepois[chave] ?? 0);
    });
    return resultado;
  }

  /** Edita o Codinome (relacional) — otimista + persistência em lote. */
  protected ajustarNome(nome: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, nome });
    this.agendarPersistencia();
  }

  /**
   * Edita Nível/Prestígio. **Nível** aplica a **progressão** (m3-10): as máximas (Vida/Energia) e os
   * derivados stored que dependem do Nível — Defesa/Esquiva/Bloqueio, Proficiência, Hab./Turno e Dano
   * Furtivo (+1D6+1 por marco cruzado) — acompanham a mudança. Otimista + em lote.
   */
  protected ajustarCampoDados(ajuste: AjusteCampoDados): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    let dados: FichaJogadorDadosDto = { ...fichaAtual.dados, [ajuste.campo]: ajuste.valor };
    if (ajuste.campo === 'nivel') {
      dados = this.aplicarProgressao(fichaAtual.dados, dados);
    }
    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  /**
   * Recalcula estado (máximas) e derivados aplicando a **variação de progressão** entre `antigos` e
   * `novos` (Nível e/ou atributos mudaram). Cada campo **stored** acompanha a mudança preservando
   * ajustes manuais (m3-10): números somam `calcular(novo) − calcular(antigo)`; o Dano Furtivo soma
   * os marcos de Nível cruzados (D6 com D6, fixo com fixo); o Dano C.a.C. (tabela não-linear)
   * recalcula só quando não foi customizado. Campo ausente fica ausente (fallback ao cálculo). Fonte
   * única: fórmulas de `shared/regras` sobre a entrada já normalizada à classe (base da exibição).
   */
  private aplicarProgressao(
    antigos: FichaJogadorDadosDto,
    novos: FichaJogadorDadosDto,
  ): FichaJogadorDadosDto {
    const antes = normalizarEntrada(antigos.classe, antigos.nivel, antigos.atributos);
    const depois = normalizarEntrada(novos.classe, novos.nivel, novos.atributos);
    return {
      ...novos,
      estado: this.progredirEstado(novos.estado, antes, depois),
      derivados: this.progredirDerivados(novos.derivados, antes, depois),
    };
  }

  /** Máximas de Vida/Energia stored somadas do delta de progressão (Vigor/Destreza × Nível). */
  private progredirEstado(
    estado: FichaJogadorDadosDto['estado'],
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): FichaJogadorDadosDto['estado'] {
    const deltaVida = calcularVida(depois) - calcularVida(antes);
    const deltaEnergia = calcularEnergia(depois) - calcularEnergia(antes);
    return {
      ...estado,
      vidaMaxima: estado.vidaMaxima === undefined ? undefined : estado.vidaMaxima + deltaVida,
      energiaMaxima:
        estado.energiaMaxima === undefined ? undefined : estado.energiaMaxima + deltaEnergia,
    };
  }

  /**
   * Derivados stored acompanhando a progressão: números por delta (Defesa/Esquiva/Bloqueio,
   * Deslocamento, Proficiência, Percepção, Inventário, Hab./Turno); Dano Furtivo e Dano C.a.C. por
   * regra própria. `derivados` ausente → mantém ausente; cada campo ausente idem.
   */
  private progredirDerivados(
    derivados: FichaDerivadosDto | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): FichaDerivadosDto | undefined {
    if (!derivados) {
      return undefined;
    }
    const defesaAntes = calcularDefesa(antes);
    const defesaDepois = calcularDefesa(depois);
    const somar = (valor: number | undefined, delta: number): number | undefined =>
      valor === undefined ? undefined : valor + delta;
    return {
      ...derivados,
      defesa: somar(derivados.defesa, (defesaDepois?.defesa ?? 0) - (defesaAntes?.defesa ?? 0)),
      esquiva: somar(derivados.esquiva, (defesaDepois?.esquiva ?? 0) - (defesaAntes?.esquiva ?? 0)),
      bloqueio: somar(
        derivados.bloqueio,
        (defesaDepois?.bloqueio ?? 0) - (defesaAntes?.bloqueio ?? 0),
      ),
      deslocamento: somar(
        derivados.deslocamento,
        calcularDeslocamento(depois) - calcularDeslocamento(antes),
      ),
      proficiencia: somar(
        derivados.proficiencia,
        (calcularProficiencia(depois) ?? 0) - (calcularProficiencia(antes) ?? 0),
      ),
      percepcao: somar(
        derivados.percepcao,
        calcularAreaPercepcao(depois) - calcularAreaPercepcao(antes),
      ),
      inventarioMaximo: somar(
        derivados.inventarioMaximo,
        calcularInventario(depois) - calcularInventario(antes),
      ),
      habilidadesPorTurno: somar(
        derivados.habilidadesPorTurno,
        calcularLimiteHabilidadesPorTurno(depois) - calcularLimiteHabilidadesPorTurno(antes),
      ),
      danoFurtivo: this.progredirDanoFurtivo(derivados.danoFurtivo, antes, depois),
      danoCorpoACorpo: this.progredirDanoCorpo(derivados.danoCorpoACorpo, antes, depois),
    };
  }

  /** Dano Furtivo stored + os marcos de Nível cruzados (cada marco = +1D6+1; só depende do Nível). */
  private progredirDanoFurtivo(
    stored: string | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): string | undefined {
    if (stored === undefined) {
      return undefined;
    }
    const marcos = contarMarcosDanoFurtivo(depois.nivel) - contarMarcosDanoFurtivo(antes.nivel);
    return marcos === 0 ? stored : incrementarDanoFurtivo(stored, marcos);
  }

  /**
   * Dano C.a.C. (tabela não-linear de Força+Vigor): sem delta somável, recalcula **só quando não foi
   * customizado** (stored igual ao calculado do estado anterior); um valor editado à mão é preservado.
   */
  private progredirDanoCorpo(
    stored: string | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): string | undefined {
    if (stored === undefined) {
      return undefined;
    }
    return stored === calcularDanoCorpo(antes) ? calcularDanoCorpo(depois) : stored;
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
