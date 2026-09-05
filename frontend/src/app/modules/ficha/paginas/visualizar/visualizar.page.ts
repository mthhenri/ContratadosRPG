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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { filter, finalize, map, of, switchMap } from 'rxjs';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { normalizarPresetLegado } from '@contratados-rpg/shared/regras/rolagem';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAcessoResumoDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { CalculadoraFlutuante } from '../../../../shared/calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { FichaEdicaoService } from '../../ficha-edicao.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { lerParamRota } from '../../ler-param-rota';
import { mesclarFicha } from '../../mesclar-ficha';
import { RolagemService } from '../../rolagem.service';

import {
  AbaFicha,
  AbaStatus,
  FichaVisualizacao,
  ehAbaFicha,
  ehAbaStatus,
  type DestinoMobile,
} from '../../componentes/ficha-visualizacao/ficha-visualizacao.component';

/** Tamanho de página do histórico de rolagens da barra lateral. */
const ITENS_POR_PAGINA_HISTORICO = 20;

/**
 * A **ficha** de jogador numa tela só — montada em **duas rotas** (`/campanhas/:campanhaId/ficha/:id`,
 * m3-10, e `/fichas/:id`, o acervo campanha-agnóstico, m3-28): **edição no próprio lugar, campo a
 * campo** — cada trecho tem seu lápis no `FichaVisualizacao` (identidade, classe, atributos+
 * Maestria, Vida/Energia atual e máxima, derivados). **Não há botão global de editar nem
 * formulário separado**; cada confirmação persiste otimista e em lote (`alterarFicha`, debounced).
 * A autoridade é sempre o backend (§14): permissões e a regra de Maestria são revalidadas; um erro
 * (403/400) chega pelo `error-handler.interceptor`. O painel de **gestão de acesso** (m3-04) aparece
 * para dono/mestre.
 *
 * **Duas rotas, um componente (m3-28).** A spec `m3-28` aceita a duplicação das *rotas* como
 * dívida temporária (até a `m3-26` aposentar a tela campanha-scoped), mas não exige duplicar o
 * *componente* — `campanhaId` é opcional: sob `/campanhas/:campanhaId/ficha/:id` vem do parâmetro de
 * rota (síncrono); sob `/fichas/:id` (sem `:campanhaId` na URL) só se resolve **depois** da ficha
 * carregar, lendo `ficha.campanhaId` do próprio payload (`null` para uma ficha solta no acervo).
 * Enquanto não há campanha (ficha solta, ou ainda carregando sob `/fichas/:id`), não há membros
 * a buscar — `ehMestre()` cai em `false` naturalmente (nenhum membro no array) e a gestão de acesso
 * vira dono-apenas, sem código condicional extra.
 *
 * Estado em Signals; carrega a ficha e, só quando há campanha, os membros dela (para o nome do
 * dono, a checagem de mestre e a lista de candidatos à concessão). Os acessos só são buscados
 * quando o usuário pode geri-los. Os `id`s vêm dos parâmetros de rota (`lerParamRota` sobe até a
 * rota-pai).
 */
@Component({
  selector: 'app-ficha-visualizar',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Botao,
    BotaoIcone,
    Icone,
    FichaVisualizacao,
    CalculadoraFlutuante,
    HistoricoRolagensSidebar,
    Tooltip,
    Modal,
    Esqueleto,
  ],
  providers: [FichaEdicaoService, FichaRolagemRegistroService],
  templateUrl: './visualizar.page.html',
  styleUrl: './visualizar.page.scss',
})
export class FichaVisualizar {
  private readonly fichaVisualizacao = viewChild(FichaVisualizacao);
  private readonly fichaService = inject(FichaService);
  /** Handlers `ajustar*` (m2-20) — reusados por `CampanhaDetalhe` na visão do jogador. */
  protected readonly fichaEdicao = inject(FichaEdicaoService);
  /** Flag "Rolagem oculta" + registro do histórico (m3-27), compartilhados na página (m2-21). */
  private readonly fichaRolagemRegistro = inject(FichaRolagemRegistroService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly bandejaDados = inject(BandejaDadosService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** `campanhaId` da rota-pai (`/campanhas/:campanhaId/ficha/:id`), ou `null` sob `/fichas/:id`. */
  private readonly campanhaIdRota = lerParamRota(this.rotaAtiva, 'campanhaId');
  protected readonly fichaId = Number(lerParamRota(this.rotaAtiva, 'id'));

  /**
   * `campanhaId` efetivo (m3-28): sob a rota campanha-scoped, conhecido de imediato; sob
   * `/fichas/:id`, `null` até a ficha carregar — o `constructor` então o resolve do próprio
   * payload (`ficha.campanhaId`).
   */
  protected readonly campanhaId = signal<number | null>(
    this.campanhaIdRota !== null ? Number(this.campanhaIdRota) : null,
  );

  /**
   * Aba inicialmente ativa (m3-11): lida do `?aba=` da URL para deep-link/refresh. Parâmetro inválido
   * ou ausente cai em "Visão Geral". `?aba=rolagens` (compatibilidade com links antigos de antes da
   * m3-37, quando Rolagens era uma aba própria) vai para `combate`, que a absorveu. A aba ativa vive
   * no `FichaVisualizacao` (`linkedSignal`); esta página só semeia o valor inicial e reflete as
   * trocas de volta na URL (`mudarAba`).
   */
  protected readonly abaInicial: AbaFicha = (() => {
    const parametro = this.rotaAtiva.snapshot.queryParamMap.get('aba');
    if (parametro === 'rolagens') {
      return 'combate';
    }
    return ehAbaFicha(parametro) ? parametro : 'visao-geral';
  })();

  /**
   * Aba inicialmente ativa da mini barra do card de **Status** (Informações/Inventário/
   * Habilidades/Rolagens/Extras): lida do `#` (fragmento) da URL para deep-link/refresh —
   * canal próprio, distinto do `?aba=` acima, para não colidir com a navegação por abas de
   * página inteira. Fragmento inválido ou ausente cai em "Informações".
   */
  protected readonly abaStatusInicial: AbaStatus = (() => {
    const fragmento = this.rotaAtiva.snapshot.fragment;
    return ehAbaStatus(fragmento) ? fragmento : 'informacoes';
  })();

  /**
   * Destino inicial da barra de navegação **mobile** (m3-60). Sem fragmento na URL, abrir a ficha
   * no celular cai no agente (Identidade + Atributos) — é o que a pessoa foi ver. Com fragmento
   * (deep-link para uma aba de Status), respeita o link. `abaStatusInicial` acima não distingue
   * "sem fragmento" de "#informacoes", por isso o cálculo é separado e não derivado dele.
   */
  protected readonly destinoMobileInicial: DestinoMobile = (() => {
    const fragmento = this.rotaAtiva.snapshot.fragment;
    return ehAbaStatus(fragmento) ? fragmento : 'agente';
  })();

  protected readonly carregando = signal(true);
  protected readonly ficha = signal<FichaRecuperadaDto | null>(null);
  private readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly acessos = signal<FichaAcessoResumoDto[]>([]);

  /**
   * Histórico de rolagens desta ficha (`HistoricoRolagensSidebar` no cabeçalho da página, gatilho
   * D20) — carregado aqui, na página, porque a barra lateral fica visível em qualquer aba, não só
   * numa aba específica do card de Status. `fichaId` já é conhecido de forma síncrona (parâmetro
   * de rota), então a 1ª página carrega direto no constructor.
   */
  protected readonly historicoRolagens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly historicoCarregando = signal(true);
  protected readonly historicoCarregandoMais = signal(false);
  protected readonly historicoTemMais = signal(false);
  private readonly historicoPagina = signal(0);

  /** P-021: botão "Abrir calculadora" de dentro do painel do histórico (só existe no mobile). */
  protected readonly calculadoraAberta = signal(false);
  /** A página reserva a faixa da direita enquanto o histórico está aberto. */
  protected readonly historicoSidebarAberto = signal(false);

  /** Rolagens desta tela ainda em voo no REST (m3-77) — ver `onRolagemRemota`. */
  private rolagensLocaisEmVoo = 0;

  /** Menu de ações no cabeçalho (kebab) aberto. */
  protected readonly menuAberto = signal(false);
  /** Dialog de gestão de acesso aberta (m3-10 — tira o painel do corpo da tela). */
  protected readonly dialogAcesso = signal(false);
  /** Dialog de confirmação de exclusão aberta (m3-52). */
  protected readonly dialogExclusao = signal(false);
  /** Desatribuição da campanha em voo. */
  protected readonly removendoDaCampanha = signal(false);
  protected readonly excluindo = signal(false);

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
    // Slot de contexto da topbar (ui-21) — some ao sair da tela, como `tempoRealService.sairSala*`.
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    // Histórico de rolagens (barra lateral do cabeçalho) — `fichaId` já é conhecido de forma
    // síncrona (parâmetro de rota), então a 1ª página carrega direto aqui, sem esperar um `effect`.
    this.carregarHistoricoPagina(1);

    // Sob `/fichas/:id` (sem `:campanhaId` na URL), o `campanhaId` só é conhecido depois da ficha
    // carregar (m3-28) — daí a ficha vir primeiro e os membros serem buscados só quando há
    // campanha (`switchMap` para `of([])` sem ela: ficha solta ou ainda sem sala de campanha).
    this.fichaService
      .recuperarFicha(this.fichaId)
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
          const normalizada = this.normalizarRolagens(ficha);
          this.ficha.set(normalizada);
          this.fichaEdicao.definirBase(normalizada);
          this.membros.set(membros);
          // Slot de contexto da topbar (ui-21): dizer em qual ficha o usuário está agora.
          this.topbarContexto.definir(normalizada.nome);
          if (this.podeGerenciar()) {
            this.carregarAcessos();
          }

          // Tempo real de rolagem (m3-77): `rolagem:registrada` de uma ficha com campanha só
          // chega na sala `campanha:<id>` (o gateway não duplica em `ficha:<id>` — ver
          // `CampanhaGateway.emitirRolagemRegistrada`), então esta tela precisa entrar nela
          // também para ver rolar quem não está com a ficha aberta (outra aba do dono, o mestre
          // rolando por ela, o Encontro). Ficha solta (`campanhaId === null`) não precisa disso:
          // o gateway emite direto em `ficha:<id>`, sala em que a tela já está (`entrarSalaFicha`
          // acima) — daí este `if` só entrar quando há campanha de fato.
          const campanhaId = this.campanhaId();
          if (campanhaId !== null) {
            this.tempoRealService.entrarSalaCampanha(campanhaId);
            this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(campanhaId));
          }
        },
      });

    // Handlers `ajustar*` (Vida/Energia, atributos, inventário…) e a persistência debounced em lote
    // moraram aqui até a m2-20 — extraídos para `FichaEdicaoService` (reusado por `CampanhaDetalhe`
    // na visão do jogador). `inicializar` liga o composable a este `ficha` signal e ao `fichaId`
    // (síncrono, parâmetro de rota — daí a função constante em vez de um signal).
    this.fichaEdicao.inicializar(this.ficha, () => this.fichaId);

    // Registro do histórico de rolagens (m3-27) — extraído de `FichaVisualizacao` na m2-21 pelo
    // mesmo motivo do `FichaEdicaoService`: o painel de Rolagens passou a ter dois lugares. Aqui a
    // ficha é uma só, então `inicializar` recebe o `fichaId` da rota; o prepend local no histórico
    // da barra lateral, que antes vinha do output `(rolagemRegistrada)`, agora chega por aqui.
    this.fichaRolagemRegistro.inicializar(() => this.fichaId);
    this.fichaRolagemRegistro.registrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.onRolagemRegistrada(rolagem) });

    // Contagem de rolagens locais em voo (m3-77) — ver `onRolagemRemota`: enquanto uma rolagem
    // desta própria tela ainda não voltou do REST, um eco do broadcast que chegue antes (a sala é
    // mais rápida que a resposta HTTP em alguns casos, confirmado ao vivo) não deve abrir a
    // bandeja de novo.
    this.fichaRolagemRegistro.enviando$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.rolagensLocaisEmVoo++ });
    this.fichaRolagemRegistro.finalizada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => (this.rolagensLocaisEmVoo = Math.max(0, this.rolagensLocaisEmVoo - 1)) });

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

    // Expulsão em tempo real (m3-51, item 27): se o acesso revogado é o do próprio autenticado nesta
    // ficha, sai da tela — dono/mestre nunca são alvo de uma revogação (só concedida a "outro
    // membro"), o `podeGerenciar()` é só uma segunda trava defensiva.
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

    // Rolagem feita por outro caminho (m3-77): ficha solta chega por `ficha:<id>` (sempre
    // ingressada), ficha de campanha chega por `campanha:<id>` (ingressada acima) — os dois casos
    // convergem no mesmo `Observable`, então basta filtrar pela ficha desta tela.
    this.tempoRealService.rolagemRegistrada$
      .pipe(
        filter((rolagem) => rolagem.fichaId === this.fichaId),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (rolagem) => this.onRolagemRemota(rolagem) });

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
    const base = this.fichaEdicao.fichaBase();
    const local = this.ficha();

    this.ficha.set(
      this.fichaEdicao.edicaoPendente() && base && local ? mesclarFicha(base, local, remoto) : remoto,
    );
    this.fichaEdicao.definirBase(remoto);
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

  /**
   * Redireciona pra fora da tela da ficha após a revogação do próprio acesso (m3-51, item 27) —
   * volta ao detalhe da campanha (ou ao acervo, m3-28, se a ficha não tem campanha), com um toast
   * avisando o motivo (o REST já negaria um refetch daqui pra frente, mas o usuário continuaria
   * vendo o último estado carregado sem isso).
   */
  private expulsar(): void {
    this.notificacaoService.notificar({
      severidade: 'aviso',
      resumo: 'Acesso revogado',
      detalhe: 'Seu acesso a esta ficha foi revogado.',
    });
    void this.router.navigate(this.rotaDeSaida());
  }

  /** Abre/fecha o menu de ações do cabeçalho. */
  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  /** Fecha o menu de ações. */
  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  /** No mobile, encaminha a ação do menu para a mesma confirmação da ficha. */
  protected solicitarAlteracaoVisibilidade(): void {
    this.fecharMenu();
    this.fichaVisualizacao()?.solicitarAlteracaoVisibilidade();
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
   * Desatribui a ficha da campanha e volta ao acervo solto do dono. Ação direta, igual aos
   * menus análogos do painel da campanha e do acervo; o backend confirma a permissão de dono/mestre.
   */
  protected removerDaCampanha(): void {
    if (this.campanhaId() === null || this.removendoDaCampanha()) {
      return;
    }
    this.fecharMenu();
    this.removendoDaCampanha.set(true);
    this.fichaService
      .atribuirCampanha(this.fichaId, null)
      .pipe(finalize(() => this.removendoDaCampanha.set(false)))
      .subscribe({ next: () => void this.router.navigate(['/fichas']) });
  }

  /** Abre a dialog de confirmação de exclusão (a partir do menu, m3-52). */
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

  /**
   * Exclui a ficha (soft delete no backend, só dono/mestre — §14) e volta ao detalhe da campanha
   * (ou ao acervo, m3-28, se a ficha não tem campanha), de onde a ficha some da lista (m3-52). Sem
   * affordance de duplicar aqui — só no painel da campanha (`CampanhaDetalhe`), a pedido do autor.
   */
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

  /** Rota de saída da tela (excluir/expulsão, m3-28): a campanha atual, ou o acervo sem ela. */
  private rotaDeSaida(): (string | number)[] {
    const campanhaId = this.campanhaId();
    return campanhaId !== null ? ['/campanhas', campanhaId] : ['/fichas'];
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

  /**
   * Reflete o destino escolhido — uma aba de Status ou `'agente'` (m3-60, barra inferior do
   * mobile) — no `#` (fragmento) da URL (deep-link/refresh) sem recarregar a ficha: mesmo padrão
   * de `mudarAba`, mas em canal próprio (fragmento). Sem isso, um F5 na aba Agente caía de volta
   * na última aba de Status marcada (o fragmento nunca tinha sido atualizado para 'agente').
   */
  protected mudarAbaStatus(destino: AbaStatus | DestinoMobile): void {
    this.router.navigate([], {
      relativeTo: this.rotaAtiva,
      fragment: destino,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
  }

  /** Busca uma página do histórico de rolagens e acrescenta ao final (a 1ª já vem mais recente primeiro). */
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

  /**
   * Prepend local (`registrada$` do {@link FichaRolagemRegistroService}, m2-21 — antes era o output
   * `(rolagemRegistrada)` de `FichaVisualizacao`) — uma rolagem feita em qualquer aba aparece na
   * hora no topo da barra lateral, sem esperar reabri-la. Guarda contra duplicata do mesmo id.
   */
  private onRolagemRegistrada(rolagem: RolagemResumoDto): void {
    this.historicoRolagens.update((atuais) =>
      atuais[0]?.id === rolagem.id ? atuais : [rolagem, ...atuais],
    );
  }

  /**
   * Rolagem chegada por `rolagemRegistrada$` (m3-77) — feita por outro caminho enquanto esta tela
   * está aberta (outra aba do dono, o mestre rolando por ela, o Encontro). Reusa
   * `onRolagemRegistrada` pro prepend (mesmo dedupe pelo topo do array). A bandeja só abre quando
   * a rolagem **não** é provavelmente a própria: (a) já está no histórico local — o caminho
   * síncrono já mostrou a bandeja e já prependou antes deste evento chegar; (b) há uma rolagem
   * desta tela em voo no REST (`rolagensLocaisEmVoo`) — confirmado ao vivo que o eco do broadcast
   * pode chegar **antes** da resposta HTTP voltar, e nesse caso (a) ainda não é verdade (o id real
   * só existe depois do REST resolver) — sem (b), a bandeja abriria duas vezes pra quem acabou de
   * rolar.
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


  // Os ~19 handlers `ajustar*` (Vida/Energia, atributos, classe, sanidade, condições, inventário…)
  // e os helpers de progressão (`aplicarProgressao`/`recalcularSaude`/`progredir*`) moraram aqui
  // até a m2-20 — extraídos para `FichaEdicaoService` (`../../ficha-edicao.service.ts`), reusado
  // por `CampanhaDetalhe` na visão do jogador. O template chama `fichaEdicao.ajustar*($event)`.

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
