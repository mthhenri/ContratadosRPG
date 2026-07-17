import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, merge } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone, type IconeNome } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaContextoService } from '../../campanha-contexto.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { construirFichaInicial, type FichaAssistenteResultado } from '../../../ficha/ficha-padrao';
import { FichaCriarDialog } from '../../../ficha/componentes/ficha-criar-dialog/ficha-criar-dialog.component';
import { rotuloClasse } from '../../../ficha/rotulos-ficha';
import { CONDICOES_FICHA } from '../../../ficha/condicoes-ficha';

/**
 * Ficha já enriquecida para o mini-card inline (m2-16 + m2-16b): id/nome/classe legível/nível +
 * Vida/Energia e as condições ativas, direto do recorte `FichaResumoDto` (sem o documento
 * completo — §14/§10.4, mesma listagem que já alimentava nome/classe/nível).
 */
interface ItemFicha {
  readonly id: number;
  readonly nome: string;
  readonly classeTexto: string;
  readonly nivel: number;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly energiaAtual: number;
  readonly energiaMaxima?: number;
  /** Condições ativas (subconjunto de `CONDICOES_FICHA`) — vazio quando nenhuma está marcada. */
  readonly condicoesAtivas: readonly { readonly rotulo: string; readonly icone: IconeNome }[];
}

/**
 * Detalhe de uma campanha (`/painel/:id`): nome/descrição, membros com o papel e — só para o
 * mestre — o `codigoConvite` com o botão de regenerar. O papel do usuário atual é derivado da
 * lista de membros (não é regra de segurança, só apresentação: a autoridade é sempre o backend,
 * §14 — a regeneração por um jogador seria barrada com 403 e tratada pelo `error-handler`).
 * Estado em Signals; o `id` da campanha é lido do parâmetro de rota. Preenche o
 * `CampanhaContextoService` (m2-09) para o seletor da topbar e o limpa ao desmontar.
 *
 * Só o mestre vê as ações de **editar** (nome/descrição, formulário inline via Reactive Forms)
 * e **excluir** (com confirmação inline) a campanha (m2-12). A UI apenas esconde o que o
 * jogador não pode fazer — a autoridade continua no backend (§14): uma tentativa direta seria
 * barrada com 403/404 e tratada pelo `error-handler.interceptor`.
 */
@Component({
  selector: 'app-campanha-detalhe',
  imports: [RouterLink, ReactiveFormsModule, Icone, OverflowFade, IndicadorTempoReal, FichaCriarDialog],
  templateUrl: './detalhe.page.html',
  styleUrl: './detalhe.page.scss',
})
export class CampanhaDetalhe {
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly campanhaContextoService = inject(CampanhaContextoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha, lido do parâmetro de rota (`/painel/:id`). */
  private readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));

  /** Exposto ao template só para escolher o ícone do `chip-papel` (coroa/protecoes). */
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly campanha = signal<CampanhaRecuperadaDto | null>(null);
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly regenerando = signal(false);
  /** Confirmação efêmera pós-regeneração — o botão vira "Regenerado ✓" por ~1,5 s. */
  protected readonly regenerado = signal(false);
  protected readonly copiado = signal(false);

  /** Edição inline de nome/descrição (só mestre) — alterna o card entre exibição e formulário. */
  protected readonly editando = signal(false);
  protected readonly salvando = signal(false);

  /** Exclusão com confirmação inline (só mestre) — evita o diálogo nativo, fora do tema. */
  protected readonly confirmandoExclusao = signal(false);
  protected readonly excluindo = signal(false);

  /**
   * Gestão de membros (só mestre, m2-13): qual membro tem confirmação pendente e qual ação
   * (`remover` o jogador ou `transferir` o mestre a ele). `null` quando nada está pendente.
   */
  protected readonly acaoMembro = signal<{
    usuarioId: number;
    tipo: 'remover' | 'transferir';
  } | null>(null);

  /** Bloqueia os botões enquanto a remoção/transferência do membro está em voo. */
  protected readonly processandoMembro = signal(false);

  /** Fichas visíveis da campanha (m2-16) — o backend já filtra por §14; o front só agrupa. */
  private readonly fichas = signal<FichaResumoDto[]>([]);
  /** `true` enquanto a criação da nova ficha está em voo (desabilita o botão do assistente). */
  protected readonly criando = signal(false);
  /** Assistente de criação (m3-16) aberto — agora disparado do próprio detalhe (m2-16). */
  protected readonly dialogCriar = signal(false);
  /** Donos com o disclosure de fichas expandido no mobile (ignorado no desktop — sempre aberto). */
  protected readonly fichasExpandidas = signal<ReadonlySet<number>>(new Set());

  protected readonly formularioEdicao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: [''],
  });

  /** `id` do usuário autenticado — exposto ao template para o seletor de dono do assistente. */
  protected readonly usuarioAtivoId = computed(() => this.sessaoService.usuario()?.id ?? null);

  /** `true` quando o usuário autenticado é o `MESTRE` desta campanha (deriva dos membros). */
  protected readonly ehMestre = computed(() => {
    const usuarioId = this.usuarioAtivoId();
    return this.membros().some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  /**
   * Fichas visíveis agrupadas por dono (`usuarioId`), enriquecidas com o rótulo de classe e as
   * condições ativas (m2-16b) — o backend já resolve `morrendo`/`machucado`/`inconsciente` para
   * `false` quando ausentes (`FichaResumoDto`), então aqui só filtra as marcadas.
   */
  private readonly fichasPorMembro = computed<ReadonlyMap<number, readonly ItemFicha[]>>(() => {
    const mapa = new Map<number, ItemFicha[]>();
    for (const ficha of this.fichas()) {
      const item: ItemFicha = {
        id: ficha.id,
        nome: ficha.nome,
        classeTexto: rotuloClasse(ficha.classe),
        nivel: ficha.nivel,
        vidaAtual: ficha.vidaAtual,
        vidaMaxima: ficha.vidaMaxima,
        energiaAtual: ficha.energiaAtual,
        energiaMaxima: ficha.energiaMaxima,
        condicoesAtivas: CONDICOES_FICHA.filter((condicao) => ficha[condicao.chave]).map(
          (condicao) => ({ rotulo: condicao.rotulo, icone: condicao.icone }),
        ),
      };
      const listaDoDono = mapa.get(ficha.usuarioId);
      if (listaDoDono) {
        listaDoDono.push(item);
      } else {
        mapa.set(ficha.usuarioId, [item]);
      }
    }
    return mapa;
  });

  constructor() {
    this.carregar(true);

    // Tempo real (m3-05/m3-08, trazido da extinta FichaLista pela m2-16): entra na sala
    // `campanha:<id>` para as fichas inline e novos membros atualizarem ao vivo. Uma ficha criada
    // ou um membro que entra refazem o fetch (membros + fichas) via REST — o recorte visível
    // (§14) continua **arbitrado pelo backend**, o front não duplica a regra a partir do payload
    // do broadcast.
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.id);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.sairSalaCampanha(this.id);
      this.campanhaContextoService.limpar();
    });

    merge(this.tempoRealService.fichaCriada$, this.tempoRealService.membroEntrou$)
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.recarregarMembrosEFichas() });

    // Ressincronização ao reconectar (§9 — o Render dorme e derruba a conexão): refaz o fetch.
    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.recarregarMembrosEFichas();
      }
    });
  }

  /**
   * (Re)carrega campanha, membros e fichas. `mostrarEsqueleto` liga o esqueleto só no primeiro
   * carregamento; as ressincronizações ao vivo não devem piscar a tela inteira (ver
   * `recarregarMembrosEFichas`, que atualiza só membros/fichas).
   */
  private carregar(mostrarEsqueleto: boolean): void {
    if (mostrarEsqueleto) {
      this.carregando.set(true);
    }
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.id),
      membros: this.campanhaService.listarMembros(this.id),
      fichas: this.fichaService.listarFichas(this.id),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ campanha, membros, fichas }) => {
          this.campanha.set(campanha);
          this.membros.set(membros);
          this.fichas.set(fichas);
          this.campanhaContextoService.definir({
            id: campanha.id,
            nome: campanha.nome,
            codigoConvite: campanha.codigoConvite,
          });
        },
      });
  }

  protected regenerarConvite(): void {
    if (this.regenerando()) {
      return;
    }
    this.regenerando.set(true);
    this.campanhaService
      .regenerarConvite(this.id)
      .pipe(finalize(() => this.regenerando.set(false)))
      .subscribe({
        next: (conviteRegenerado) => {
          this.campanha.update((campanhaAtual) =>
            campanhaAtual
              ? { ...campanhaAtual, codigoConvite: conviteRegenerado.codigoConvite }
              : campanhaAtual,
          );
          const campanhaAtual = this.campanha();
          if (campanhaAtual) {
            this.campanhaContextoService.definir({
              id: campanhaAtual.id,
              nome: campanhaAtual.nome,
              codigoConvite: conviteRegenerado.codigoConvite,
            });
          }
          // Confirmação visual: o botão vira "Regenerado ✓" e volta ao normal após 1,5 s.
          this.regenerado.set(true);
          setTimeout(() => this.regenerado.set(false), 1500);
        },
      });
  }

  /** Abre o formulário de edição preenchido com o nome/descrição atuais da campanha. */
  protected abrirEdicao(): void {
    const campanhaAtual = this.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.confirmandoExclusao.set(false);
    this.formularioEdicao.reset({
      nome: campanhaAtual.nome,
      descricao: campanhaAtual.descricao ?? '',
    });
    this.editando.set(true);
  }

  /** Fecha o formulário de edição descartando as mudanças não salvas. */
  protected cancelarEdicao(): void {
    this.editando.set(false);
  }

  /** Persiste nome/descrição via `alterarCampanha` e reflete o resultado na tela e na topbar. */
  protected salvarEdicao(): void {
    if (this.formularioEdicao.invalid || this.salvando()) {
      this.formularioEdicao.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const { nome, descricao } = this.formularioEdicao.getRawValue();
    this.campanhaService
      .alterarCampanha(this.id, { nome, descricao: descricao || undefined })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (campanhaAlterada) => {
          this.campanha.update((campanhaAtual) =>
            campanhaAtual
              ? { ...campanhaAtual, nome: campanhaAlterada.nome, descricao: campanhaAlterada.descricao }
              : campanhaAtual,
          );
          this.campanhaContextoService.definir({
            id: campanhaAlterada.id,
            nome: campanhaAlterada.nome,
            codigoConvite: campanhaAlterada.codigoConvite,
          });
          this.editando.set(false);
        },
      });
  }

  /** Pede confirmação antes de excluir — mostra a área de confirmação inline. */
  protected pedirExclusao(): void {
    this.editando.set(false);
    this.confirmandoExclusao.set(true);
  }

  /** Cancela a exclusão pendente. */
  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(false);
  }

  /** Exclui a campanha (soft delete) e navega de volta à lista (`/painel`). */
  protected confirmarExclusao(): void {
    if (this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    this.campanhaService
      .excluirCampanha(this.id)
      .pipe(finalize(() => this.excluindo.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/painel']);
        },
      });
  }

  /** `true` quando o mestre pode gerir este membro — só jogadores (nunca a própria linha). */
  protected podeGerenciarMembro(membro: CampanhaMembroResumoDto): boolean {
    return this.ehMestre() && membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR;
  }

  /** Abre a confirmação de remoção do jogador. */
  protected pedirRemocaoMembro(membro: CampanhaMembroResumoDto): void {
    this.acaoMembro.set({ usuarioId: membro.usuarioId, tipo: 'remover' });
  }

  /** Abre a confirmação de transferência do papel de mestre a este jogador. */
  protected pedirTransferenciaMestre(membro: CampanhaMembroResumoDto): void {
    this.acaoMembro.set({ usuarioId: membro.usuarioId, tipo: 'transferir' });
  }

  /** Cancela a ação de membro pendente. */
  protected cancelarAcaoMembro(): void {
    this.acaoMembro.set(null);
  }

  /** Remove o jogador (soft delete) e o tira da lista exibida. */
  protected confirmarRemocaoMembro(usuarioId: number): void {
    if (this.processandoMembro()) {
      return;
    }
    this.processandoMembro.set(true);
    this.campanhaService
      .removerMembro(this.id, usuarioId)
      .pipe(finalize(() => this.processandoMembro.set(false)))
      .subscribe({
        next: () => {
          this.membros.update((lista) => lista.filter((membro) => membro.usuarioId !== usuarioId));
          this.acaoMembro.set(null);
        },
      });
  }

  /**
   * Transfere o papel de mestre ao jogador e recarrega os membros — o `ehMestre` recomputa para
   * `false` e as ações de mestre (editar/excluir/convite/gestão) somem imediatamente da UI.
   */
  protected confirmarTransferenciaMestre(usuarioId: number): void {
    if (this.processandoMembro()) {
      return;
    }
    this.processandoMembro.set(true);
    this.campanhaService
      .transferirMestre(this.id, usuarioId)
      .pipe(finalize(() => this.processandoMembro.set(false)))
      .subscribe({
        next: () => {
          this.acaoMembro.set(null);
          this.recarregarMembrosEFichas();
        },
      });
  }

  /**
   * Recarrega membros e fichas (após transferir o mestre, ou ao receber `ficha:criada`/
   * `membro:entrou` em tempo real) para refletir novos papéis/fichas sem piscar a tela — só a
   * `campanha` (nome/descrição/convite) fica de fora, ela não muda por esses eventos.
   */
  private recarregarMembrosEFichas(): void {
    forkJoin({
      membros: this.campanhaService.listarMembros(this.id),
      fichas: this.fichaService.listarFichas(this.id),
    }).subscribe({
      next: ({ membros, fichas }) => {
        this.membros.set(membros);
        this.fichas.set(fichas);
      },
    });
  }

  /** Copia o código de convite para a área de transferência — puramente apresentação. */
  protected copiarConvite(): void {
    const codigoConvite = this.campanha()?.codigoConvite;
    if (!codigoConvite) {
      return;
    }
    void navigator.clipboard.writeText(codigoConvite).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1500);
    });
  }

  /** Fichas do membro (`usuarioId`) já enriquecidas para o mini-card — `[]` quando não há nenhuma. */
  protected fichasDoMembro(usuarioId: number): readonly ItemFicha[] {
    return this.fichasPorMembro().get(usuarioId) ?? [];
  }

  /** Expande/recolhe o disclosure "N fichas" do membro (só tem efeito visual no mobile — SCSS). */
  protected alternarFichas(usuarioId: number): void {
    this.fichasExpandidas.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(usuarioId)) {
        proximo.delete(usuarioId);
      } else {
        proximo.add(usuarioId);
      }
      return proximo;
    });
  }

  /** Abre o assistente de criação de ficha (m3-16), agora disparado do detalhe (m2-16). */
  protected abrirCriarFicha(): void {
    this.dialogCriar.set(true);
  }

  /** Fecha o assistente de criação (Cancelar/✕) — inócuo enquanto uma criação está em voo. */
  protected fecharCriarFicha(): void {
    if (!this.criando()) {
      this.dialogCriar.set(false);
    }
  }

  /**
   * Confirma o assistente: monta a ficha (`construirFichaInicial` — snapshot + bônus de
   * arquétipo) e cria via `FichaService`. `usuarioId` só vem preenchido quando o mestre escolheu
   * outro dono no seletor do assistente (§14 — jogador comum sempre cria a própria); o backend
   * valida a autoria/permissão e revalida forma/Maestria, um erro chega pelo
   * `error-handler.interceptor`. Ao criar, navega direto para a ficha (edição no próprio lugar,
   * sem tela de criação separada — m3-10) — o mestre pode continuar preenchendo a ficha do jogador
   * ali mesmo, já que edita qualquer ficha da campanha.
   */
  protected criarFicha(resultado: FichaAssistenteResultado): void {
    if (this.criando()) {
      return;
    }
    this.criando.set(true);
    const ficha = construirFichaInicial(resultado.opcoes);
    this.fichaService
      .criarFicha({
        campanhaId: this.id,
        usuarioId: resultado.usuarioId,
        nome: ficha.nome,
        dados: ficha.dados,
      })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: (fichaCriada) => {
          this.dialogCriar.set(false);
          void this.router.navigate(['/painel', this.id, 'ficha', fichaCriada.id]);
        },
      });
  }
}
