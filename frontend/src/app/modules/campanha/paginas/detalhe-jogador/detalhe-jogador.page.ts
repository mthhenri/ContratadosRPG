import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAcessoResumoDto, FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { InventarioEsquadrao } from '../../componentes/inventario-esquadrao/inventario-esquadrao.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { FichaService } from '../../../ficha/ficha.service';
import { FichaEdicaoService } from '../../../ficha/ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../../ficha/ficha-rolagem-registro.service';
import { mesclarFicha } from '../../../ficha/mesclar-ficha';
import { FichaRolagensPainel } from '../../../ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component';
import {
  FichaVisualizacao,
  type DestinoMobile,
} from '../../../ficha/componentes/ficha-visualizacao/ficha-visualizacao.component';
import {
  montarEquipeExibicao,
  type EquipeFichaExibicao,
} from '../../campanha-equipe.util';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

/** Janela da tira "Rolagens Recentes" da coluna Sessão — só rolagens feitas na última hora. */
const UMA_HORA_MS = 60 * 60 * 1000;

/** Hover sustentado antes do preview ampliado do avatar de um colega abrir ("um segundinho"). */
const MS_PREVIEW_AVATAR = 600;

/** Tamanho do preview ampliado do avatar (px, quadrado) — `object-fit: contain`, sem recorte. */
const PX_PREVIEW_AVATAR = 300;

/**
 * Visão do JOGADOR em `/campanhas/:id` — reprodução byte a byte do antigo ramo `@else` de
 * `ehMestre()` em `CampanhaDetalhe` (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1):
 * ficha própria embutida (edição no próprio lugar), Equipe ⇄ Inventário do esquadrão, Rolagens,
 * Sessão e o menu "⋯" de ações de ficha. Nenhuma mudança visual ou funcional aqui — o redesenho é
 * só da visão de mestre (`CampanhaDetalheMestre`). Dado e tempo real compartilhados vêm de
 * `CampanhaDetalheDadosService`, injetado (provido pelo `CampanhaDetalheShell`).
 */
@Component({
  selector: 'app-campanha-detalhe-jogador',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icone,
    OverflowFade,
    HistoricoRolagensSidebar,
    InventarioEsquadrao,
    BandejaDados,
    CalculadoraFlutuante,
    CadernoFlutuante,
    FichaVisualizacao,
    FichaRolagensPainel,
    Tooltip,
    Botao,
    BotaoIcone,
    Cartao,
    Modal,
    Esqueleto,
  ],
  providers: [FichaEdicaoService, FichaRolagemRegistroService],
  templateUrl: './detalhe-jogador.page.html',
  styleUrl: './detalhe-jogador.page.scss',
})
export class CampanhaDetalheJogador {
  protected readonly dados = inject(CampanhaDetalheDadosService);
  private readonly bandejaDadosService = inject(BandejaDadosService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly fichaService = inject(FichaService);
  /** Handlers `ajustar*` da ficha embutida — mesmo composable de `VisualizarPage`. */
  protected readonly fichaEdicao = inject(FichaEdicaoService);
  /**
   * Flag "Rolagem oculta" + registro do histórico — **uma instância por página**, compartilhada
   * pelo card da ficha (teste de atributo, dano) e pelo painel de Rolagens da coluna lateral, que
   * é onde o toggle mora agora.
   */
  protected readonly fichaRolagemRegistro = inject(FichaRolagemRegistroService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Exposto ao template só para o chip "Mestre" na lista de Equipe. */
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly exibindoInventarioJogador = signal(false);

  /** Bloqueia os botões enquanto a bandeja de dados está aberta — ver `mostrarPreviaRolagem`. */
  protected readonly calculadoraAberta = signal(false);
  /** A página reserva a faixa da direita enquanto uma das consultas laterais está aberta. */
  protected readonly historicoSidebarAberto = signal(false);
  protected readonly inventarioSidebarAberto = signal(false);
  /** Destino da barra inferior da ficha compacta; Rolagens mora fora do card. */
  protected readonly destinoMobileFicha = signal<DestinoMobile>('agente');

  /**
   * `id` da ficha exibida na coluna principal — inicializada com a própria ficha do usuário assim
   * que `dados.fichas()` carrega (ver o `effect` no construtor); trocada pelo "Ver ficha" de um
   * colega. `null` antes do primeiro carregamento, ou quando o usuário não tem ficha visível.
   */
  protected readonly fichaExibidaId = signal<number | null>(null);
  /** Documento completo da ficha exibida — buscado via `recuperarFicha` sempre que `fichaExibidaId` muda. */
  protected readonly fichaExibidaDados = signal<FichaRecuperadaDto | null>(null);
  protected readonly carregandoFichaExibida = signal(false);

  /** `true` quando o usuário autenticado pode editar a ficha exibida — dono ou mestre. */
  protected readonly podeAjustarFichaExibida = computed(() => {
    const fichaExibida = this.fichaExibidaDados();
    return (
      fichaExibida !== null &&
      (this.dados.ehMestre() || fichaExibida.usuarioId === this.dados.usuarioAtivoId())
    );
  });

  /** Ficha exibida quando ela é sua (dono) — controla o `[disabled]` das ações do menu do cabeçalho. */
  protected readonly minhaFichaExibida = computed<FichaRecuperadaDto | null>(() => {
    const fichaExibida = this.fichaExibidaDados();
    return fichaExibida && fichaExibida.usuarioId === this.dados.usuarioAtivoId() ? fichaExibida : null;
  });

  /** Dialog "Acesso de visualização" da ficha exibida (menu do cabeçalho) aberta. */
  protected readonly dialogAcessoFicha = signal(false);
  protected readonly acessosFichaExibida = signal<readonly FichaAcessoResumoDto[]>([]);
  protected readonly membroParaConcederAcesso = new FormControl<number | null>(null);
  protected readonly concedendoAcesso = signal(false);
  protected readonly revogandoAcesso = signal<number | null>(null);

  /**
   * Membros elegíveis a receber acesso à ficha exibida: exclui o mestre (já vê tudo), o próprio
   * dono e quem já tem concessão ativa.
   */
  protected readonly membrosElegiveisAcesso = computed<readonly CampanhaMembroResumoDto[]>(() => {
    const jaConcedido = new Set(this.acessosFichaExibida().map((acesso) => acesso.usuarioId));
    return this.dados.membros().filter(
      (membro) =>
        membro.usuarioId !== this.dados.usuarioAtivoId() &&
        membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE &&
        !jaConcedido.has(membro.usuarioId),
    );
  });

  /**
   * Fichas visíveis agrupadas por dono e vitrine da Equipe: `completa` (clicável, com dado
   * completo — mesmo recorte de `dados.fichasPorMembro()`) ou `teaser` (só carteirinha, sem
   * clique).
   */
  protected readonly equipeExibicao = computed<
    readonly { readonly membro: CampanhaMembroResumoDto; readonly fichas: readonly EquipeFichaExibicao[] }[]
  >(() => montarEquipeExibicao(this.dados.membrosOrdenados(), this.dados.fichasPorMembro()));

  /** Card "Rolagens" da coluna lateral — alvo do destino `'rolagens'` da barra inferior do mobile. */
  private readonly cardRolagens = viewChild<ElementRef<HTMLElement>>('cardRolagens');

  protected aoMudarDestinoFicha(destino: DestinoMobile): void {
    this.destinoMobileFicha.set(destino);
    if (destino !== 'rolagens') {
      return;
    }
    const alvo = this.cardRolagens()?.nativeElement;
    if (!alvo || typeof window === 'undefined') {
      return;
    }
    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
  }

  /**
   * Energia gasta por um passo de preset rolado no painel da lateral — mesmo caminho de
   * `FichaVisualizacao.aoUtilizarHabilidade`: reusa a persistência de vitalidade em vez de abrir
   * um canal novo. Pode **negativar** — regra do documento.
   */
  protected gastarEnergiaFichaExibida(custo: number): void {
    const ficha = this.fichaExibidaDados();
    if (!ficha) {
      return;
    }
    this.fichaEdicao.ajustarVitalidade({
      campo: 'energiaAtual',
      valor: ficha.dados.estado.energiaAtual - custo,
    });
  }

  /** Troca a ficha exibida na coluna principal ("Ver ficha") — dispara o fetch do documento completo. */
  protected selecionarFichaExibida(fichaId: number): void {
    if (this.fichaExibidaId() === fichaId) {
      return;
    }
    this.fichaExibidaId.set(fichaId);
  }

  /**
   * Absorve um documento vindo do servidor (broadcast `ficha:alterada` da ficha exibida agora) —
   * sem edição local pendente, substitui; com pendência, mescla campo a campo (o que o usuário
   * mexeu no card compacto prevalece, o resto do documento remoto entra).
   */
  private absorverFichaExibidaRemota(remoto: FichaRecuperadaDto): void {
    const base = this.fichaEdicao.fichaBase();
    const local = this.fichaExibidaDados();
    this.fichaExibidaDados.set(
      this.fichaEdicao.edicaoPendente() && base && local ? mesclarFicha(base, local, remoto) : remoto,
    );
    this.fichaEdicao.definirBase(remoto);
  }

  /**
   * Prepend local de uma rolagem feita na ficha exibida — pelo card **ou** pelo painel de
   * Rolagens da coluna lateral. Escreve direto no feed **compartilhado**
   * (`CampanhaDetalheDadosService.rolagensFeed`, um `signal()` público) — feedback imediato na
   * coluna "Sessão" sem esperar o broadcast (que nunca chega para rolagens `PRIVADA`, §9). Mesmo
   * array que recebe o prepend de rolagens públicas via socket (dono do serviço compartilhado);
   * não existe cópia local — um espelho local reescrito a cada mudança do feed apagaria uma
   * rolagem privada só-local antes dela ser lida.
   */
  private onRolagemRegistradaEmbutida(rolagem: RolagemResumoDto): void {
    this.dados.rolagensFeed.update((atuais) =>
      atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais],
    );
  }

  constructor() {
    effect(() => {
      this.fichaExibidaId();
      this.destinoMobileFicha.set('agente');
    });
    effect(() => {
      if (this.historicoSidebarAberto()) {
        this.inventarioSidebarAberto.set(false);
      }
    });
    effect(() => {
      if (this.inventarioSidebarAberto()) {
        this.historicoSidebarAberto.set(false);
      }
    });

    // Semeia `fichaExibidaId` com a própria ficha do usuário assim que `dados.fichas()` carrega
    // pela 1ª vez — só quando ainda não há seleção (não sobrescreve uma troca via "Ver ficha" numa
    // ressincronização em tempo real posterior).
    effect(() => {
      const fichas = this.dados.fichas();
      if (this.fichaExibidaId() !== null || fichas.length === 0) {
        return;
      }
      const propria = fichas.find((ficha) => ficha.usuarioId === this.dados.usuarioAtivoId());
      if (propria) {
        untracked(() => this.fichaExibidaId.set(propria.id));
      }
    });

    // Handlers `ajustar*` da ficha embutida — mesmo composable de `VisualizarPage`.
    // `fichaExibidaId` muda sem recriar o componente, daí a função constante em vez de capturar o
    // valor síncrono do parâmetro de rota.
    this.fichaEdicao.inicializar(this.fichaExibidaDados, () => this.fichaExibidaId()!);

    // Registro do histórico de rolagens — mesma ficha exibida, mesmo motivo da função constante
    // acima. O prepend local na coluna "Sessão" chega por aqui: assim a rolagem feita **pela
    // lateral** (fora do card) também aparece na hora no feed.
    this.fichaRolagemRegistro.inicializar(() => this.fichaExibidaId());
    this.fichaRolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.onRolagemRegistradaEmbutida(rolagem) });

    // Fetch da ficha completa sempre que `fichaExibidaId` muda (seleção inicial da própria ficha,
    // ou troca via "Ver ficha") — `dados.fichas()`/`FichaResumoDto` não tem `dados` completo pra
    // alimentar `<app-ficha-visualizacao>`.
    effect(() => {
      const fichaId = this.fichaExibidaId();
      // Acesso de visualização: as concessões carregadas por `carregarAcessosFichaExibida` ficam
      // presas à ficha antiga se não forem limpas aqui.
      this.acessosFichaExibida.set([]);
      if (fichaId === null) {
        return;
      }
      this.carregandoFichaExibida.set(true);
      this.fichaService
        .recuperarFicha(fichaId)
        .pipe(finalize(() => this.carregandoFichaExibida.set(false)))
        .subscribe({
          next: (ficha) =>
            untracked(() => {
              this.fichaExibidaDados.set(ficha);
              this.fichaEdicao.definirBase(ficha);
            }),
        });
    });

    // Ficha exibida na coluna principal em tempo real: sem isto, editar a ficha na tela completa
    // (`VisualizarPage`, outra aba/dispositivo) nunca refletia no card compacto aqui.
    this.tempoRealService.fichaAlterada$
      .pipe(
        filter((ficha) => ficha.id === this.fichaExibidaId()),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (fichaAlterada) => this.absorverFichaExibidaRemota(fichaAlterada) });

    // Cancela o agendamento do preview ampliado do avatar ao sair da página — senão um
    // `setTimeout` de hover sustentado ainda dispararia depois do destroy.
    this.destroyRef.onDestroy(() => this.cancelarPreviewAvatar());
  }

  /** `id` da prévia atualmente aberta na bandeja de dados (hover no d20 de um pill) — `null` se nenhuma. */
  private previaRolagemId: number | null = null;

  /**
   * Hover/foco no dadinho d20 de um pill da coluna Sessão: mostra o resultado completo daquela
   * rolagem já registrada na bandeja de dados flutuante, sem esperar uma nova rolagem acontecer.
   */
  protected mostrarPreviaRolagem(rolagem: RolagemResumoDto): void {
    this.previaRolagemId = this.bandejaDadosService.mostrar({
      rotulo: rolagem.rotulo,
      resultado: rolagem.resultado,
      visibilidade: rolagem.visibilidade,
      corFicha: rolagem.corFicha,
      semAutoSumir: true,
    });
  }

  /** Fim do hover/foco no dadinho d20 — fecha a prévia aberta por {@link mostrarPreviaRolagem}. */
  protected esconderPreviaRolagem(): void {
    if (this.previaRolagemId !== null) {
      this.bandejaDadosService.fechar(this.previaRolagemId);
      this.previaRolagemId = null;
    }
  }

  /** Rolagens da última hora (coluna Sessão) — reavalia a cada tick de `dados.agora()` (5s). */
  protected readonly rolagensRecentes = computed(() => {
    const limite = this.dados.agora() - UMA_HORA_MS;
    return this.dados.rolagensFeed().filter((item) => new Date(item.createdDate).getTime() >= limite);
  });

  protected tempoRolagem(rolagem: RolagemResumoDto): string {
    return rotuloRelativo(new Date(rolagem.createdDate).getTime(), this.dados.agora());
  }

  /** Fichas com Vida ≤ 0 visíveis (banner do topo — não é gated por papel, aparece pro jogador também). */
  private readonly fichasCriticas = computed(() => this.dados.fichas().filter((ficha) => ficha.vidaAtual <= 0));

  protected readonly fichaCritica = computed<{ id: number; nome: string } | null>(() => {
    const critica = this.fichasCriticas()[0];
    return critica ? { id: critica.id, nome: critica.nome } : null;
  });

  /** Preview ampliado do avatar de um colega na Equipe, sem recorte (mesmo padrão do Esquadrão do mestre). */
  protected readonly previewAvatar = signal<{ url: string; top: number; left: number } | null>(null);
  private temporizadorPreviewAvatar: ReturnType<typeof setTimeout> | null = null;

  protected agendarPreviewAvatar(evento: MouseEvent, imagemUrl: string | null): void {
    this.cancelarPreviewAvatar();
    if (!imagemUrl) {
      return;
    }
    const retangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.temporizadorPreviewAvatar = setTimeout(() => {
      const folga = 8;
      const centroVertical = retangulo.top + retangulo.height / 2 - PX_PREVIEW_AVATAR / 2;
      const top = Math.min(
        Math.max(centroVertical, folga),
        window.innerHeight - PX_PREVIEW_AVATAR - folga,
      );
      const espacoDireita = window.innerWidth - retangulo.right;
      const left =
        espacoDireita >= PX_PREVIEW_AVATAR + folga
          ? retangulo.right + folga
          : Math.max(retangulo.left - PX_PREVIEW_AVATAR - folga, folga);
      this.previewAvatar.set({ url: imagemUrl, top, left });
    }, MS_PREVIEW_AVATAR);
  }

  protected cancelarPreviewAvatar(): void {
    if (this.temporizadorPreviewAvatar !== null) {
      clearTimeout(this.temporizadorPreviewAvatar);
      this.temporizadorPreviewAvatar = null;
    }
    this.previewAvatar.set(null);
  }

  /** Menu "⋯" de ações de ficha do cabeçalho (Criar/Vincular/Acesso/Remover/Excluir). */
  protected readonly menuAberto = signal(false);

  protected alternarMenu(): void {
    this.menuAberto.update((atual) => !atual);
  }

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  /** Abre o assistente de criação de ficha, disparado do próprio detalhe. */
  protected abrirCriarFicha(): void {
    this.fecharMenu();
    void this.router.navigate(['/campanhas', this.dados.id, 'ficha', 'nova']);
  }

  // === Vincular ficha existente — o jogador que chega numa campanha sem ficha (ou que quer trazer
  // outra do acervo) resolve pelo menu "⋯" do cabeçalho, sem sair da página.

  protected readonly dialogVincular = signal(false);
  /** Fichas do acervo **sem campanha** (`campanhaId === null`) — as únicas vinculáveis. */
  protected readonly fichasSoltas = signal<readonly FichaResumoDto[]>([]);
  protected readonly carregandoFichasSoltas = signal(false);
  protected readonly fichaParaVincular = signal<number | null>(null);
  protected readonly vinculando = signal(false);

  /**
   * Abre a dialog e busca o acervo. O filtro por `campanhaId === null` é de **apresentação** — o
   * backend continua sendo a autoridade (§14): mover uma ficha que não é sua é barrado com 403.
   */
  protected abrirVincularFicha(): void {
    this.fecharMenu();
    this.fichaParaVincular.set(null);
    this.dialogVincular.set(true);
    this.carregandoFichasSoltas.set(true);
    this.fichaService
      .listarMinhasFichas()
      .pipe(finalize(() => this.carregandoFichasSoltas.set(false)))
      .subscribe({
        next: (minhas) => this.fichasSoltas.set(minhas.filter((ficha) => ficha.campanhaId === null)),
        error: () => this.fichasSoltas.set([]),
      });
  }

  protected fecharVincularFicha(): void {
    if (!this.vinculando()) {
      this.dialogVincular.set(false);
    }
  }

  protected escolherFichaParaVincular(valor: string): void {
    this.fichaParaVincular.set(valor === '' ? null : Number(valor));
  }

  /**
   * Move a ficha escolhida do acervo para esta campanha e a exibe na coluna principal — sem
   * recarregar a página: `dados.recarregarMembrosEFichas()` traz a ficha nova pra Equipe e
   * `fichaExibidaId` dispara o fetch de `recuperarFicha`.
   */
  protected confirmarVincularFicha(): void {
    const fichaId = this.fichaParaVincular();
    if (fichaId === null || this.vinculando()) {
      return;
    }
    this.vinculando.set(true);
    this.fichaService
      .atribuirCampanha(fichaId, this.dados.id)
      .pipe(finalize(() => this.vinculando.set(false)))
      .subscribe({
        next: () => {
          this.dialogVincular.set(false);
          this.dados.recarregarMembrosEFichas();
          this.fichaExibidaId.set(fichaId);
        },
      });
  }

  /**
   * Depois de remover/excluir a ficha exibida, aponta para outra ficha própria restante na
   * campanha, se houver, ou limpa a seleção — o template cai no estado vazio.
   */
  private avancarFichaExibidaApos(fichaRemovidaId: number): void {
    if (this.fichaExibidaId() !== fichaRemovidaId) {
      return;
    }
    const restante = this.dados.fichas().find((ficha) => ficha.usuarioId === this.dados.usuarioAtivoId());
    if (restante) {
      this.fichaExibidaId.set(restante.id);
    } else {
      this.fichaExibidaId.set(null);
      this.fichaExibidaDados.set(null);
    }
  }

  protected readonly removendo = signal<number | null>(null);

  protected rotuloRemoverDaCampanha(): string {
    const minha = this.minhaFichaExibida();
    return minha && this.removendo() === minha.id ? 'Removendo…' : 'Remover da campanha';
  }

  /**
   * Desatribui a ficha da campanha (ela volta ao acervo solto do dono) — ação direta, sem dialog,
   * mesmo padrão de `FichaAcervo.removerDaCampanha`. Filtro otimista direto em `dados.fichas`
   * (não um refetch): `avancarFichaExibidaApos`, logo a seguir, precisa que a ficha removida já
   * não conste na lista para não escolhê-la de novo como "restante".
   */
  protected removerDaCampanha(fichaId: number): void {
    this.fecharMenu();
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: () => {
          this.dados.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
          this.avancarFichaExibidaApos(fichaId);
        },
      });
  }

  /** Abre a confirmação de exclusão a partir do menu do cabeçalho. */
  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenu();
    this.confirmacaoService
      .confirmar({
        titulo: 'Excluir ficha',
        mensagem: `Excluir ${fichaNome}? Esta ação não pode ser desfeita.`,
        entidade: fichaNome,
        rotuloConfirmar: 'Confirmar exclusão',
      })
      .then((confirmado) => {
        if (confirmado) {
          this.excluirFicha(fichaId);
        }
      });
  }

  private excluirFicha(fichaId: number): void {
    this.fichaService.excluirFicha(fichaId).subscribe({
      next: () => {
        this.dados.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
        this.avancarFichaExibidaApos(fichaId);
      },
    });
  }

  /** Abre a dialog "Acesso de visualização" da ficha exibida e busca as concessões atuais. */
  protected abrirAcessoFicha(): void {
    const ficha = this.minhaFichaExibida();
    if (!ficha) {
      return;
    }
    this.fecharMenu();
    this.membroParaConcederAcesso.setValue(null);
    // Limpa antes de abrir: a busca abaixo é assíncrona, e sem isto a dialog abriria mostrando (por
    // uma janela) a lista de concessões da ficha exibida ANTERIOR.
    this.acessosFichaExibida.set([]);
    this.dialogAcessoFicha.set(true);
    this.carregarAcessosFichaExibida(ficha.id);
  }

  protected fecharAcessoFicha(): void {
    this.dialogAcessoFicha.set(false);
  }

  private carregarAcessosFichaExibida(fichaId: number): void {
    this.fichaService
      .listarAcessos(fichaId)
      .subscribe({ next: (acessos) => this.acessosFichaExibida.set(acessos) });
  }

  protected concederAcessoFicha(): void {
    const ficha = this.minhaFichaExibida();
    const usuarioId = this.membroParaConcederAcesso.value;
    if (!ficha || usuarioId === null || this.concedendoAcesso()) {
      return;
    }
    this.concedendoAcesso.set(true);
    this.fichaService
      .concederAcesso(ficha.id, usuarioId)
      .pipe(finalize(() => this.concedendoAcesso.set(false)))
      .subscribe({
        next: () => {
          this.membroParaConcederAcesso.setValue(null);
          this.carregarAcessosFichaExibida(ficha.id);
        },
      });
  }

  protected revogarAcessoFicha(usuarioId: number): void {
    const ficha = this.minhaFichaExibida();
    if (!ficha || this.revogandoAcesso() !== null) {
      return;
    }
    this.revogandoAcesso.set(usuarioId);
    this.fichaService
      .revogarAcesso(ficha.id, usuarioId)
      .pipe(finalize(() => this.revogandoAcesso.set(null)))
      .subscribe({
        next: () => this.carregarAcessosFichaExibida(ficha.id),
      });
  }

  protected mandarItemFichaParaBase(
    fichaId: number,
    evento: { readonly indice: number; readonly quantidade?: number },
  ): void {
    this.fichaService.mandarItemInventarioParaBase(fichaId, evento.indice, evento.quantidade)
      .subscribe(() => {
        this.fichaService.recuperarFicha(fichaId).subscribe((ficha) => {
          this.fichaExibidaDados.set(ficha);
          this.fichaEdicao.definirBase(ficha);
        });
        this.dados.carregarInventario();
      });
  }

  protected abrirAnotacoesFicha(fichaId: number): void {
    void this.router.navigate(['/campanhas', this.dados.id, 'ficha', fichaId], { fragment: 'anotacoes' });
  }
}
