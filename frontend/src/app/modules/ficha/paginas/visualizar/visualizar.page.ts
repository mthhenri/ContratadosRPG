import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, filter, finalize, forkJoin, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { calcularEnergia, calcularVida } from '@contratados-rpg/shared/regras/agente';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { lerParamRota } from '../../ler-param-rota';

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
  imports: [RouterLink, ReactiveFormsModule, Icone, FichaVisualizacao],
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
   * Só dono/mestre chega aqui; o backend valida a Maestria (6+, única) e não trava faixa.
   */
  protected ajustarAtributos(ajuste: AjusteAtributos): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({
      ...fichaAtual,
      dados: { ...fichaAtual.dados, atributos: ajuste.atributos, maestria: ajuste.maestria },
    });
    this.agendarPersistencia();
  }

  /** Edita Classe/Arquétipo — otimista + persistência em lote (arquétipo já coerente com a classe). */
  protected ajustarClasse(ajuste: AjusteClasse): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({
      ...fichaAtual,
      dados: { ...fichaAtual.dados, classe: ajuste.classe, arquetipo: ajuste.arquetipo },
    });
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
   * Edita Nível/Prestígio. **Nível** aplica o **delta de progressão** (m3-10): soma
   * `calcularVida/Energia(novo) − (antigo)` às **máximas stored** — preservando ajustes manuais, sem
   * recalcular do zero (máximas ausentes ficam ausentes → fallback derivado). Otimista + em lote.
   */
  protected ajustarCampoDados(ajuste: AjusteCampoDados): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    let dados: FichaJogadorDadosDto = { ...fichaAtual.dados, [ajuste.campo]: ajuste.valor };
    if (ajuste.campo === 'nivel') {
      dados = { ...dados, estado: this.aplicarDeltaNivel(fichaAtual.dados, ajuste.valor) };
    }
    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  /** Novo `estado` com as máximas stored somadas do delta de progressão entre o nível antigo e o novo. */
  private aplicarDeltaNivel(
    dados: FichaJogadorDadosDto,
    nivelNovo: number,
  ): FichaJogadorDadosDto['estado'] {
    const { classe, atributos, estado } = dados;
    const deltaVida =
      calcularVida({ classe, nivel: nivelNovo, vigor: atributos.vigor }) -
      calcularVida({ classe, nivel: dados.nivel, vigor: atributos.vigor });
    const deltaEnergia =
      calcularEnergia({ classe, nivel: nivelNovo, destreza: atributos.destreza }) -
      calcularEnergia({ classe, nivel: dados.nivel, destreza: atributos.destreza });
    return {
      ...estado,
      vidaMaxima: estado.vidaMaxima === undefined ? undefined : estado.vidaMaxima + deltaVida,
      energiaMaxima:
        estado.energiaMaxima === undefined ? undefined : estado.energiaMaxima + deltaEnergia,
    };
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
