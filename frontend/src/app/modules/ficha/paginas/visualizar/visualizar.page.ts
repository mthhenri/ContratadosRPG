import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, filter, finalize, forkJoin, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  calcularAreaPercepcao,
  calcularAtributosEfetivos,
  calcularDanoCorpo,
  calcularDefesa,
  calcularDerivados,
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
import { normalizarPresetLegado } from '@contratados-rpg/shared/regras/rolagem';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaAtributosDto,
  FichaDerivadosDto,
  FichaHabilidadeDto,
  FichaInventarioDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { lerParamRota } from '../../ler-param-rota';
import { mesclarFicha } from '../../mesclar-ficha';
import { normalizarEntrada, type EntradaAgente } from '../../status-derivado';

import {
  AbaFicha,
  AjusteAtributos,
  AjusteCampoDados,
  AjusteClasse,
  AjusteDerivado,
  AjusteVitalidade,
  FichaVisualizacao,
  ehAbaFicha,
} from '../../componentes/ficha-visualizacao/ficha-visualizacao.component';
import type { EstadoSanidade } from '../../componentes/ficha-sanidade/ficha-sanidade.component';

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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));
  protected readonly fichaId = Number(lerParamRota(this.rotaAtiva, 'id'));

  /**
   * Aba inicialmente ativa (m3-11): lida do `?aba=` da URL para deep-link/refresh. Parâmetro inválido
   * ou ausente cai em "Visão Geral". A aba ativa vive no `FichaVisualizacao` (`linkedSignal`); esta
   * página só semeia o valor inicial e reflete as trocas de volta na URL (`mudarAba`).
   */
  protected readonly abaInicial: AbaFicha = (() => {
    const parametro = this.rotaAtiva.snapshot.queryParamMap.get('aba');
    return ehAbaFicha(parametro) ? parametro : 'visao-geral';
  })();

  protected readonly carregando = signal(true);
  protected readonly ficha = signal<FichaRecuperadaDto | null>(null);
  private readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly acessos = signal<FichaAcessoResumoDto[]>([]);

  /** Dispara a persistência (debounced) de cada edição no próprio lugar. */
  private readonly ajustePendente = new Subject<void>();
  /**
   * `true` enquanto há uma edição local não persistida (do disparo até a resposta do `alterarFicha`).
   * Enquanto verdadeiro, um `ficha:alterada` recebido por WebSocket é **mesclado** com a edição em
   * curso (m3-17) — nunca descartado, ou o `PUT` de documento inteiro apagaria a edição concorrente.
   */
  private readonly edicaoPendente = signal(false);
  /**
   * Último documento **vindo do servidor** (carga, resposta de save, refetch, evento remoto sem
   * edição pendente). É a `base` do merge de três vias: um campo em que `ficha()` divergiu dela é,
   * por definição, um campo que o usuário editou.
   */
  private readonly fichaBase = signal<FichaRecuperadaDto | null>(null);

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
          const normalizada = this.normalizarRolagens(ficha);
          this.ficha.set(normalizada);
          this.fichaBase.set(normalizada);
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
          this.fichaBase.set(fichaAlterada);
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
        filter((ficha) => ficha.id === this.fichaId),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (fichaAlterada) => this.absorverRemoto(fichaAlterada) });

    // Ressincronização ao reconectar (§9 — o Render dorme e derruba a conexão): refaz o fetch da
    // ficha aberta. O documento buscado entra pelo mesmo merge, então uma edição local pendente
    // sobrevive ao refetch em vez de bloqueá-lo.
    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.fichaService.recuperarFicha(this.fichaId).subscribe({
          // `untracked`: o `absorverRemoto` lê e escreve `ficha`/`fichaBase`. Sem isso, uma resposta
          // **síncrona** entregaria essas leituras dentro do contexto reativo do `effect`, que
          // passaria a depender do que ele mesmo escreve — laço infinito.
          next: (ficha) => untracked(() => this.absorverRemoto(ficha)),
        });
      }
    });
  }

  /**
   * Absorve um documento vindo do servidor (broadcast `ficha:alterada` ou refetch de reconexão).
   *
   * Sem edição local pendente ele simplesmente substitui o estado. Com edição pendente, é
   * **mesclado** campo a campo: o que o usuário editou prevalece, o resto do documento remoto entra.
   * O `alterarFicha` debounced serializa o resultado — é isso que impede o `PUT` de sobrescrever a
   * edição concorrente de outro usuário (m3-17). Descartar o remoto, como se fazia antes, apagava-a.
   */
  private absorverRemoto(remotoBruto: FichaRecuperadaDto): void {
    const remoto = this.normalizarRolagens(remotoBruto);
    const base = this.fichaBase();
    const local = this.ficha();

    this.ficha.set(
      this.edicaoPendente() && base && local ? mesclarFicha(base, local, remoto) : remoto,
    );
    this.fichaBase.set(remoto);
  }

  /**
   * Migra os presets de rolagem legados (m3-19 `modo:'TESTE'`) para a notação v3 (m3-29) na **carga** —
   * o boundary onde o JSONB persistido entra. `normalizarPresetLegado` é puro e idempotente; aplicá-lo a
   * todo documento vindo do servidor mantém `ficha`/`fichaBase` consistentes (o merge não vê falso diff)
   * e persiste a fórmula nova no próximo save. Sem `rolagens`, devolve a ficha intacta.
   */
  private normalizarRolagens(ficha: FichaRecuperadaDto): FichaRecuperadaDto {
    const rolagens = ficha.dados.rolagens;
    if (!rolagens?.length) {
      return ficha;
    }
    return {
      ...ficha,
      dados: { ...ficha.dados, rolagens: rolagens.map((preset) => normalizarPresetLegado(preset)) },
    };
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

  /**
   * Reflete a aba escolhida no `?aba=` da URL (deep-link/refresh, m3-11) sem recarregar a ficha:
   * `replaceUrl` não empilha histórico e `queryParamsHandling: 'merge'` preserva outros parâmetros.
   */
  protected mudarAba(aba: AbaFicha): void {
    this.router.navigate([], {
      relativeTo: this.rotaAtiva,
      queryParams: { aba },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
   * Edita Classe/Arquétipo (arquétipo já coerente com a classe). Sempre aplica o **delta dos Atributos
   * Bônus fixos** (doc — "Classes e Arquétipos"): remove o bônus do arquétipo/subclasse anterior e
   * soma o do novo (ex.: Lutador → Mercenário tira +1 Força/+1 Luta e põe +1 Pontaria/+1 Destreza),
   * preservando ajustes manuais. Depois:
   * - **Troca de arquétipo (mesma classe)** → `aplicarProgressao`: os derivados/máximas acompanham a
   *   variação de atributo por **delta**, preservando ajustes.
   * - **Troca de classe** → **recalcula** Vida/Energia máximas e o bloco de derivados **do zero** para
   *   a classe nova (as fórmulas de saúde e os campos disponíveis mudam) — ajustes manuais de saúde
   *   são descartados no reset, e a Vida/Energia atuais são clampadas ao novo teto.
   * Otimista + em lote.
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
    const dados =
      ajuste.classe === fichaAtual.dados.classe
        ? this.aplicarProgressao(fichaAtual.dados, dadosNovos)
        : this.recalcularSaude(dadosNovos);
    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  /**
   * Recomputa Vida/Energia máximas e o bloco de derivados **do zero** para a classe/nível/atributos
   * atuais — usado na **troca de classe**, onde as fórmulas de saúde e os campos disponíveis mudam
   * (ex.: Civil perde Defesa/Furtivo). Reusa `calcularVida/Energia/Derivados` (a mesma fonte do
   * snapshot de criação — proibições #26/#27); a Vida/Energia **atuais** são clampadas ao novo teto.
   */
  private recalcularSaude(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
    const entrada = normalizarEntrada(dados.classe, dados.nivel, dados.atributos);
    const vidaMaxima = calcularVida(entrada);
    const energiaMaxima = calcularEnergia(entrada);
    return {
      ...dados,
      estado: {
        ...dados.estado,
        vidaMaxima,
        energiaMaxima,
        vidaAtual: Math.min(dados.estado.vidaAtual, vidaMaxima),
        energiaAtual: Math.min(dados.estado.energiaAtual, energiaMaxima),
      },
      derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos),
    };
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

  /**
   * Edita as listas de Sanidade (sequelas/traumas/lesões, m3-12): substitui os três blocos em `estado`
   * de uma vez (o editor emite o trio inteiro), otimista na tela + persistência em lote. Só dono/mestre
   * chega aqui; o backend valida forma (camada 1) — sem trava de faixa (m3-10).
   *
   * **Lesões permanentes** afetam **todos** os cálculos que usam o atributo (`sistema-v4.1.0.md` —
   * "⬥ Lesões Permanentes": Vigor removeria vida e inventário; Destreza, deslocamento e energia). A
   * cascata usa a **mesma progressão por delta** de m3-10 (`aplicarProgressao`), tomando como entrada
   * os atributos **efetivos apenas pelas lesões permanentes** — antes vs. depois da edição —, então as
   * máximas e os derivados stored acompanham a variação preservando ajustes manuais. O valor **base**
   * (`atributos`) **nunca** é mutado — a Maestria (ligada ao base) sobrevive. Lesões **não** permanentes
   * só reduzem o atributo efetivo exibido (documento: lesão em atributo de saúde não reduz Vida/Energia).
   */
  protected ajustarSanidade(sanidade: EstadoSanidade): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const dadosAtuais = fichaAtual.dados;
    const estado = {
      ...dadosAtuais.estado,
      sequelas: sanidade.sequelas,
      traumas: sanidade.traumas,
      lesoes: sanidade.lesoes,
    };
    let dados: FichaJogadorDadosDto = { ...dadosAtuais, estado };

    // Cascata das lesões PERMANENTES: base − pontos permanentes, antes e depois; se mudou, progride.
    const permanentesAntes = dadosAtuais.estado.lesoes.filter((lesao) => lesao.permanente);
    const permanentesDepois = sanidade.lesoes.filter((lesao) => lesao.permanente);
    const efetivoAntes = calcularAtributosEfetivos(dadosAtuais.atributos, permanentesAntes);
    const efetivoDepois = calcularAtributosEfetivos(dadosAtuais.atributos, permanentesDepois);
    if (!this.mesmoMapaAtributos(efetivoAntes, efetivoDepois)) {
      const progredido = this.aplicarProgressao(
        { ...dadosAtuais, atributos: efetivoAntes },
        { ...dados, atributos: efetivoDepois },
      );
      // `aplicarProgressao` já traz o estado (listas novas + máximas) e os derivados; só devolve o base.
      dados = { ...progredido, atributos: dadosAtuais.atributos };
    }

    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  /** `true` se dois mapas de atributos são iguais em todas as chaves. */
  private mesmoMapaAtributos(a: FichaAtributosDto, b: FichaAtributosDto): boolean {
    return (Object.keys(a) as (keyof FichaAtributosDto)[]).every((chave) => a[chave] === b[chave]);
  }

  /**
   * Edita a lista de habilidades (m3-13): substitui `dados.habilidades` inteira (o editor emite a lista
   * completa), otimista na tela + persistência em lote. Só dono/mestre chega aqui; o backend valida
   * forma. Sem cascata/progressão — o custo de Energia é só registro (fora de escopo o efeito em play).
   */
  protected ajustarHabilidades(habilidades: readonly FichaHabilidadeDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, habilidades } });
    this.agendarPersistencia();
  }

  /**
   * Edita o inventário (itens + amplificadores, m3-14): substitui `dados.inventario` inteiro (o editor
   * emite o `FichaInventarioDto` completo), otimista na tela + persistência em lote. Só dono/mestre
   * chega aqui; o backend valida forma. Sem cascata/progressão — o inventário não altera derivados; o
   * Inventário máximo (`Força × 5`) é referência editável à parte (m3-10) e exceder o peso é só aviso.
   */
  protected ajustarInventario(inventario: FichaInventarioDto): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, inventario } });
    this.agendarPersistencia();
  }

  /**
   * Edita os presets de rolagem (m3-15): substitui `dados.rolagens` inteiro (o editor emite a lista
   * completa), otimista na tela + persistência em lote. Só dono/mestre chega aqui; sem cascata/derivados
   * (presets não alteram nada calculado).
   */
  protected ajustarRolagens(rolagens: readonly FichaRolagemDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, rolagens } });
    this.agendarPersistencia();
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
