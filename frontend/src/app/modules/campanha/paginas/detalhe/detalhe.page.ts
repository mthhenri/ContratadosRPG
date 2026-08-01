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
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { HistoricoRolagensSidebar } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { construirFichaInicial, type FichaAssistenteResultado } from '../../../ficha/ficha-padrao';
import { FichaCriarDialog } from '../../../ficha/componentes/ficha-criar-dialog/ficha-criar-dialog.component';
import { rotuloClasseCompleto } from '../../../ficha/rotulos-ficha';
import { rotuloPatente } from '../../../ficha/status-derivado';
import { CONDICOES_FICHA, type DescritorCondicao } from '../../../ficha/condicoes-ficha';
import { clamparVitalidade, type CampoVitalidadeAtual } from '../../../ficha/ajuste-vitalidade';
import { FichaVitalidadeRapidaService } from '../../../ficha/ficha-vitalidade-rapida.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';

/** Janela da tira "Rolagens Recentes" (item 3) — só rolagens feitas na última hora. */
const UMA_HORA_MS = 60 * 60 * 1000;

/** Uma das 3 condições no mini-card — sempre as 3, com `ativa` dizendo se está marcada (item 3). */
interface ItemFichaCondicao extends DescritorCondicao {
  readonly ativa: boolean;
}

/**
 * Ficha já enriquecida para o mini-card inline (m2-16 + m2-16b): id/nome/classe legível/nível +
 * Vida/Energia e as três condições (sempre as 3, com `ativa`), direto do recorte `FichaResumoDto`
 * (sem o documento completo — §14/§10.4, mesma listagem que já alimentava nome/classe/nível).
 * `classeTexto` já vem combinado via `rotuloClasseCompleto` ("Classe - Arquétipo" para as três
 * classes base, "Classe-base - Experimento Bestial/Artificial/Híbrido" para a subclasse — ela
 * ainda é daquela classe-base); só `CIVIL` (sem classe-base nem arquétipo) mostra a classe sozinha.
 */
interface ItemFicha {
  readonly id: number;
  /** Dono da ficha — só precisou virar campo próprio no m2-19 (Esquadrão achatado, sem o loop por membro que antes dava esse dado de graça). */
  readonly usuarioId: number;
  readonly nome: string;
  readonly classeTexto: string;
  readonly nivel: number;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly energiaAtual: number;
  readonly energiaMaxima?: number;
  readonly condicoes: readonly ItemFichaCondicao[];
  /**
   * Vida ≤ 0 (o próprio limiar documentado pra entrar em "Morrendo" — sistema-v4.1.0.md) —
   * destaque visual no cartão mesmo que ninguém tenha marcado a condição ainda (item 4: sinaliza
   * antes do dono/mestre lembrar de marcar o checkbox).
   */
  readonly critico: boolean;
  /** Patente legível, derivada do Prestígio no cliente (`rotuloPatente` — mesma fórmula da ficha completa). */
  readonly patenteTexto: string;
  /** Defesa/Esquiva/Bloqueio — `undefined` numa ficha sem `derivados` salvo ou de classe Civil (não os possui). */
  readonly defesa?: number;
  readonly esquiva?: number;
  readonly bloqueio?: number;
  /** Contra-Ataque — `undefined` numa ficha sem nenhuma habilidade que o conceda. */
  readonly contraAtaque?: number;
  /**
   * Personalidade + nome da Origem (m3-23) já combinados para exibição ("Frio · Guarda-Costas") —
   * `null` quando nenhum dos dois está definido (ficha sem Identidade ainda), pra esconder a linha
   * inteira em vez de deixar um traço solto.
   */
  readonly identidadeTexto: string | null;
  /** Peso do inventário acima do Inventário Máximo (aviso do backend — ver nota em `FichaResumoDto`). */
  readonly sobrecarregado: boolean;
}

/**
 * Detalhe de uma campanha (`/painel/:id`): nome/descrição, membros com o papel e — só para o
 * mestre — o `codigoConvite` com o botão de regenerar. O papel do usuário atual é derivado da
 * lista de membros (não é regra de segurança, só apresentação: a autoridade é sempre o backend,
 * §14 — a regeneração por um jogador seria barrada com 403 e tratada pelo `error-handler`).
 * Estado em Signals; o `id` da campanha é lido do parâmetro de rota.
 *
 * Só o mestre vê as ações de **editar** (nome/descrição, formulário inline via Reactive Forms)
 * e **excluir** (com confirmação inline) a campanha (m2-12). A UI apenas esconde o que o
 * jogador não pode fazer — a autoridade continua no backend (§14): uma tentativa direta seria
 * barrada com 403/404 e tratada pelo `error-handler.interceptor`.
 *
 * **Redesenho m2-17 → m2-19 (visão do mestre — a do jogador é a m2-20):** o antigo card
 * "Identidade" (nome/descrição/convite/ações) ao lado de "Membros" com fichas aninhadas por dono
 * virou banner de alerta condicional (ficha crítica), tira de estatísticas (Membros/Fichas/
 * Convite/Alertas), tira horizontal de rolagens recentes e duas colunas — "Membros" (gestão, sem
 * fichas) e "Esquadrão" (grid fixo de 2 colunas com todas as fichas da campanha, achatadas por
 * `fichasEsquadrao`). As ações de campanha (editar/excluir) migraram para um menu kebab no
 * cabeçalho, já que o card que as hospedava deixou de existir. Só apresentação — nenhum endpoint
 * novo, nenhuma regra de negócio nova (o dado de `membros`/`fichas`/`rolagensFeed` já era buscado).
 */
@Component({
  selector: 'app-campanha-detalhe',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icone,
    OverflowFade,
    HistoricoRolagensSidebar,
    IndicadorTempoReal,
    FichaCriarDialog,
    HoldRepeat,
  ],
  templateUrl: './detalhe.page.html',
  styleUrl: './detalhe.page.scss',
})
export class CampanhaDetalhe {
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);
  private readonly fichaVitalidadeRapidaService = inject(FichaVitalidadeRapidaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly sessaoService = inject(SessaoService);
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

  /**
   * Fichas visíveis da campanha (m2-16) — o backend já filtra por §14; o front só agrupa.
   * `protected` (era `private`) desde o m2-19: `fichas().length` alimenta a tira de estatísticas
   * direto no template ("Fichas"), sem precisar de um computed só pra contar.
   */
  protected readonly fichas = signal<FichaResumoDto[]>([]);
  /**
   * Feed de rolagens da campanha (m3-27) — mais recente primeiro; privadas já filtradas pelo
   * backend (§14: só o autor ou o mestre as veem). `carregandoRolagens` cobre só o esqueleto
   * inicial da lista — um erro nunca deveria travar o resto da tela do detalhe.
   */
  protected readonly rolagensFeed = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregandoRolagens = signal(true);
  /** `true` enquanto a criação da nova ficha está em voo (desabilita o botão do assistente). */
  protected readonly criando = signal(false);
  /** Assistente de criação (m3-16) aberto — agora disparado do próprio detalhe (m2-16). */
  protected readonly dialogCriar = signal(false);

  /**
   * Ficha cujo menu de ações (kebab) está aberto no mini-card (m3-52) — guarda `id`/`nome`/
   * `donoNome` porque o **DOM do dropdown vive na raiz do template** (fora da lista), não dentro
   * do `@for` do card; só um aberto por vez.
   *
   * **Por que na raiz, e não junto do botão que abre?** `.detalhe__fichas-lista`/`.detalhe__membros`
   * têm `overflow-y: auto` **e** `mask-image` (`appOverflowFade`, o fade do topo/base) — um elemento
   * com `mask-image` cria um novo *stacking context*, e a combinação com `overflow` recorta **na
   * pintura** qualquer descendente, mesmo `position: fixed` (que só escapa do problema de
   * *containing block* pro cálculo de posição, não da pintura recortada do ancestral). Só *fixed*
   * não bastou (tentativa anterior); o dropdown precisa morar fora dessa subárvore — mesmo lugar das
   * dialogs de confirmação abaixo, que já renderizam sem corte por isso.
   */
  protected readonly menuFichaAberto = signal<{ id: number; nome: string; donoNome: string } | null>(
    null,
  );
  /**
   * Posição do menu aberto (`position: fixed`, calculada do botão ao abrir, `getBoundingClientRect`).
   * `right` (não `left`) mantém o menu alinhado à direita do botão. `top` quando abre pra baixo
   * (padrão); `bottom` quando abre pra cima (mini-card perto do fim da página — sem isso o menu
   * saía cortado pela borda inferior da viewport). Só um dos dois é setado por vez.
   */
  protected readonly menuFichaPosicao = signal<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  /** Ficha pendente de confirmação de duplicação — guarda o nome dela e do dono pra mensagem. */
  protected readonly confirmandoDuplicar = signal<{
    id: number;
    nome: string;
    donoNome: string;
  } | null>(null);
  /** `id` da ficha cuja duplicação está em voo (m3-52) — desabilita só os botões daquela dialog. */
  protected readonly duplicando = signal<number | null>(null);
  /** Ficha pendente de confirmação de exclusão (m3-52). */
  protected readonly confirmandoExcluirFicha = signal<{ id: number; nome: string } | null>(null);
  /** `id` da ficha cuja exclusão está em voo (m3-52) — desabilita só os botões daquela dialog. */
  protected readonly excluindoFicha = signal<number | null>(null);
  /** `id` da ficha sendo desatribuída (ação direta, sem dialog) — desabilita só aquele item. */
  protected readonly removendo = signal<number | null>(null);

  /**
   * Menu de ações da campanha (kebab no cabeçalho, m2-19 item 6) — substitui o antigo card
   * "Identidade" como lugar das ações de editar/excluir. Ao contrário do menu de ficha
   * (`menuFichaAberto`), este vive dentro do próprio cabeçalho: nenhum ancestral entre eles tem
   * `overflow`+`mask-image`, então não precisa do truque de `position: fixed` calculado no clique.
   */
  protected readonly menuCampanhaAberto = signal(false);

  /**
   * Salas `ficha:<id>` já ingressadas (item 1 — tempo real de `ficha:alterada`) — uma por ficha
   * hoje visível, sincronizada a cada fetch (`sincronizarSalasFicha`). O gateway já reusa a mesma
   * checagem de visualização de `recuperarFicha` (§14) no `ficha:entrar`, então entrar na sala de
   * uma ficha que a listagem já devolveu nunca é negado — sem duplicar permissão aqui.
   */
  private readonly salasFichaAtivas = new Set<number>();

  /** Instante (epoch ms) do último fetch bem-sucedido — alimenta `textoAtualizacao` (item 9). */
  private readonly ultimaAtualizacaoEm = signal<number | null>(null);
  /** Relógio ticando a cada 5s só pra recomputar `textoAtualizacao` sem novo fetch. */
  private readonly agora = signal(Date.now());

  /** "Atualizado agora/há Xs/há X min" — `null` antes do primeiro fetch completar. */
  protected readonly textoAtualizacao = computed<string | null>(() => {
    const em = this.ultimaAtualizacaoEm();
    if (em === null) {
      return null;
    }
    return `Atualizado ${rotuloRelativo(em, this.agora())}`;
  });

  /** Tempo relativo de uma rolagem da tira do topo (item 3) — mesmo relógio de 5s do `textoAtualizacao`. */
  protected tempoRolagem(rolagem: RolagemResumoDto): string {
    return rotuloRelativo(new Date(rolagem.createdDate).getTime(), this.agora());
  }

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
   * Membros ordenados para a coluna "Membros" (item 4 — mestre primeiro, depois jogadores em
   * ordem alfabética pelo nome). O grid do "Esquadrão" ao lado acompanha esta mesma ordem
   * (`fichasEsquadrao` itera esta lista, não `membros()` cru), mantendo a decisão de design
   * original de que os dois ficam sincronizados.
   */
  protected readonly membrosOrdenados = computed<readonly CampanhaMembroResumoDto[]>(() => {
    return [...this.membros()].sort((a, b) => {
      if (a.papel !== b.papel) {
        return a.papel === TipoCampanhaMembroPapelEnum.MESTRE ? -1 : 1;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  });

  /**
   * Fichas visíveis agrupadas por dono (`usuarioId`), enriquecidas com o rótulo de classe e as
   * três condições — sempre as 3, com `ativa` (item 3: mostra também as inativas, esmaecidas, em
   * vez de sumir quando nada está marcado). O backend já resolve `morrendo`/`machucado`/
   * `inconsciente` para `false` quando ausentes (`FichaResumoDto`).
   */
  private readonly fichasPorMembro = computed<ReadonlyMap<number, readonly ItemFicha[]>>(() => {
    const mapa = new Map<number, ItemFicha[]>();
    for (const ficha of this.fichas()) {
      const item: ItemFicha = {
        id: ficha.id,
        usuarioId: ficha.usuarioId,
        nome: ficha.nome,
        classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
        nivel: ficha.nivel,
        vidaAtual: ficha.vidaAtual,
        vidaMaxima: ficha.vidaMaxima,
        energiaAtual: ficha.energiaAtual,
        energiaMaxima: ficha.energiaMaxima,
        condicoes: CONDICOES_FICHA.map((condicao) => ({ ...condicao, ativa: ficha[condicao.chave] })),
        critico: ficha.vidaAtual <= 0,
        patenteTexto: rotuloPatente(ficha.prestigio ?? 0),
        // `?? undefined`: o JSON vindo da API traz `null` (não a chave ausente) quando a ficha não
        // tem o campo salvo em `derivados` — o template abaixo só sabe esconder a linha com
        // `!== undefined`, então normaliza aqui pra nunca vazar um "Defesa " em branco.
        defesa: ficha.defesa ?? undefined,
        esquiva: ficha.esquiva ?? undefined,
        bloqueio: ficha.bloqueio ?? undefined,
        contraAtaque: ficha.contraAtaque ?? undefined,
        identidadeTexto: [ficha.personalidade, ficha.origemNome].filter(Boolean).join(' · ') || null,
        sobrecarregado: ficha.sobrecarregado ?? false,
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

  /**
   * Grid do "Esquadrão" (m2-19, item 5) — todas as fichas visíveis da campanha, achatadas (era
   * agrupado por dono na coluna "Membros"), cada uma com o nome do dono anexado (`donoNome`, pra
   * exibir no card já que ele não é mais o cabeçalho do grupo). Itera `membrosOrdenados()` (não
   * `fichas()` nem `membros()` cru) para a ordem do grid acompanhar a ordem da coluna "Membros" ao
   * lado — mesmo dado de `fichasPorMembro()`/`fichas()`, sem mudança de escopo (spec item 5).
   */
  protected readonly fichasEsquadrao = computed<readonly (ItemFicha & { readonly donoNome: string })[]>(
    () => {
      const porMembro = this.fichasPorMembro();
      const lista: (ItemFicha & { donoNome: string })[] = [];
      for (const membro of this.membrosOrdenados()) {
        for (const ficha of porMembro.get(membro.usuarioId) ?? []) {
          lista.push({ ...ficha, donoNome: membro.nome });
        }
      }
      return lista;
    },
  );

  /** Fichas com Vida ≤ 0 na campanha (mestre vê todas — m2-19 itens 1/2). */
  private readonly fichasCriticas = computed(() => this.fichas().filter((ficha) => ficha.vidaAtual <= 0));

  /**
   * Banner de alerta do topo (item 1) — a primeira ficha crítica encontrada, ou `null` quando não
   * há nenhuma (o banner some). Não há critério de desempate exigido pela spec; a ordem é a que o
   * backend já devolve.
   */
  protected readonly fichaCritica = computed<{ id: number; nome: string } | null>(() => {
    const critica = this.fichasCriticas()[0];
    return critica ? { id: critica.id, nome: critica.nome } : null;
  });

  /** Contagem de fichas críticas — alimenta a tira de estatísticas "Alertas" (item 2). */
  protected readonly alertasCount = computed(() => this.fichasCriticas().length);

  /**
   * Rolagens da última hora (item 3) — `rolagensFeed()` já vem mais recente primeiro (m3-27), então
   * é só um filtro por janela de tempo; a lista completa (sem limite de tempo) continua só na
   * sidebar de histórico, aberta pelo próprio gatilho D20 dela no cabeçalho. Reavalia a cada tick de
   * `agora()` (5s) pra rolagens saírem da tira sozinhas ao completar 1h, sem precisar de novo fetch.
   */
  protected readonly rolagensRecentes = computed(() => {
    const limite = this.agora() - UMA_HORA_MS;
    return this.rolagensFeed().filter((item) => new Date(item.createdDate).getTime() >= limite);
  });

  constructor() {
    this.carregar(true);
    this.carregarRolagens();

    // Tempo real (m3-05/m3-08, trazido da extinta FichaLista pela m2-16): entra na sala
    // `campanha:<id>` para as fichas inline e novos membros atualizarem ao vivo. Uma ficha criada
    // ou um membro que entra refazem o fetch (membros + fichas) via REST — o recorte visível
    // (§14) continua **arbitrado pelo backend**, o front não duplica a regra a partir do payload
    // do broadcast. **Item 1:** `ficha:alterada` também refaz o fetch — mas esse evento só chega
    // a quem entrou na sala `ficha:<id>` da ficha alterada, daí `sincronizarSalasFicha` (chamada a
    // cada fetch) manter o cliente inscrito em toda ficha hoje visível na tela.
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.id);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.sairSalaCampanha(this.id);
      for (const fichaId of this.salasFichaAtivas) {
        this.tempoRealService.sairSalaFicha(fichaId);
      }
    });

    merge(
      this.tempoRealService.fichaCriada$,
      this.tempoRealService.membroEntrou$,
      this.tempoRealService.fichaAlterada$,
    )
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.recarregarMembrosEFichas() });

    // Feed de rolagens em tempo real (m3-27): só rolagens `PUBLICA` chegam por aqui (o backend não
    // broadcasta privadas — §9); prepend direto, sem refetch (o payload já vem completo).
    this.tempoRealService.rolagemRegistrada$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (rolagem) => this.rolagensFeed.update((atuais) => [rolagem, ...atuais]) });

    // Ressincronização ao reconectar (§9 — o Render dorme e derruba a conexão): refaz o fetch.
    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.recarregarMembrosEFichas();
      }
    });

    // Ações rápidas de Vida/Energia no mini-card (m2-16g): o otimismo local já reflete o valor
    // certo no sucesso (mesmo clamp que o `FichaVitalidadeRapidaService` persiste); só uma falha
    // (403/400/rede) precisa de reconciliação — refaz o fetch e descarta o otimismo divergente.
    this.fichaVitalidadeRapidaService.falhou$
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.recarregarMembrosEFichas() });

    // Relógio do "Atualizado há Xs" (item 9) — só recomputa o texto, nunca refaz fetch.
    const relogio = setInterval(() => this.agora.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));

    // Menu de ficha (m3-52) é `position: fixed` calculado no clique (ver `menuFichaPosicao`) — se a
    // lista rolar (ou a janela redimensionar) com o menu aberto, ele descolaria visualmente do
    // botão que o abriu. `scroll` não borbulha, então o listener precisa de `capture: true` pra
    // pegar o scroll de qualquer ancestral rolável (`.detalhe__fichas-lista`/`.detalhe__membros`),
    // não só do `window`.
    const fecharMenuAoRolarOuRedimensionar = () => this.fecharMenuFicha();
    window.addEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
    window.addEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
      window.removeEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    });
  }

  /**
   * Ingressa nas salas `ficha:<id>` das fichas hoje visíveis e sai das que deixaram de aparecer
   * (dono removido, acesso revogado…) — mantém `ficha:alterada` chegando exatamente pro conjunto
   * de fichas que a tela mostra agora, sem acumular salas de fichas antigas indefinidamente.
   */
  private sincronizarSalasFicha(fichas: readonly FichaResumoDto[]): void {
    const idsAtuais = new Set(fichas.map((ficha) => ficha.id));
    for (const id of idsAtuais) {
      if (!this.salasFichaAtivas.has(id)) {
        this.tempoRealService.entrarSalaFicha(id);
        this.salasFichaAtivas.add(id);
      }
    }
    for (const id of this.salasFichaAtivas) {
      if (!idsAtuais.has(id)) {
        this.tempoRealService.sairSalaFicha(id);
        this.salasFichaAtivas.delete(id);
      }
    }
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
          this.sincronizarSalasFicha(fichas);
          this.ultimaAtualizacaoEm.set(Date.now());
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
          // Confirmação visual: o botão vira "Regenerado ✓" e volta ao normal após 1,5 s.
          this.regenerado.set(true);
          setTimeout(() => this.regenerado.set(false), 1500);
        },
      });
  }

  /** Abre/fecha o menu de ações da campanha (kebab no cabeçalho, item 6). */
  protected alternarMenuCampanha(): void {
    this.menuCampanhaAberto.update((atual) => !atual);
  }

  /** Fecha o menu de ações da campanha — clique fora (fundo) ou ao escolher uma ação. */
  protected fecharMenuCampanha(): void {
    this.menuCampanhaAberto.set(false);
  }

  /** Abre o formulário de edição preenchido com o nome/descrição atuais da campanha. */
  protected abrirEdicao(): void {
    const campanhaAtual = this.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.fecharMenuCampanha();
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

  /** Persiste nome/descrição via `alterarCampanha` e reflete o resultado na tela. */
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
          this.editando.set(false);
        },
      });
  }

  /** Pede confirmação antes de excluir — mostra a área de confirmação inline. */
  protected pedirExclusao(): void {
    this.fecharMenuCampanha();
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
   * `ficha:alterada`/`membro:entrou` em tempo real) para refletir novos papéis/fichas/Vida-Energia-
   * condições sem piscar a tela — só a `campanha` (nome/descrição/convite) fica de fora, ela não
   * muda por esses eventos.
   */
  private recarregarMembrosEFichas(): void {
    forkJoin({
      membros: this.campanhaService.listarMembros(this.id),
      fichas: this.fichaService.listarFichas(this.id),
    }).subscribe({
      next: ({ membros, fichas }) => {
        this.membros.set(membros);
        this.fichas.set(fichas);
        this.sincronizarSalasFicha(fichas);
        this.ultimaAtualizacaoEm.set(Date.now());
      },
    });
  }

  /**
   * Carrega o feed de rolagens recentes da campanha (m3-27) — chamado uma vez no boot; as
   * atualizações depois disso chegam por `rolagemRegistrada$` (prepend, sem refetch). Um erro
   * (ex.: 401 de sessão expirada) só deixa o feed vazio, sem travar o resto do detalhe.
   */
  private carregarRolagens(): void {
    this.rolagemService
      .listarPorCampanha(this.id)
      .pipe(finalize(() => this.carregandoRolagens.set(false)))
      .subscribe({ next: (itens) => this.rolagensFeed.set(itens), error: () => undefined });
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

  /**
   * `true` quando o usuário autenticado pode ajustar a Vida/Energia desta ficha na hora (m2-16g) —
   * mesma regra de edição da própria ficha (§14): dono ou mestre, nunca outro membro com só
   * visualização concedida.
   */
  protected podeAjustarFicha(usuarioIdDono: number): boolean {
    return this.ehMestre() || usuarioIdDono === this.usuarioAtivoId();
  }

  /**
   * Ajuste rápido de Vida/Energia direto no mini-card (m2-16g), sem abrir a ficha: aplica o mesmo
   * clamp da leitura completa (`clamparVitalidade` — Vida com piso 0, Energia sem piso),
   * atualiza o resumo local na hora (otimista) e agenda a persistência em lote no
   * `FichaVitalidadeRapidaService` (que busca o documento completo só na hora de gravar).
   */
  protected ajustarVitalidade(ficha: ItemFicha, campo: CampoVitalidadeAtual, delta: number): void {
    const atual = ficha[campo];
    const valor = clamparVitalidade(campo, atual, delta);
    if (valor === atual) {
      return;
    }
    this.fichas.update((lista) =>
      lista.map((item) => (item.id === ficha.id ? { ...item, [campo]: valor } : item)),
    );
    this.fichaVitalidadeRapidaService.ajustar(ficha.id, campo, valor);
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

  /**
   * Abre/fecha o menu de ações (kebab) de uma ficha específica no mini-card (m3-52). Calcula a
   * posição `fixed` a partir do botão clicado (`getBoundingClientRect`) — ver a nota em
   * `menuFichaAberto` sobre por que o dropdown em si vive fora desta subárvore.
   */
  protected alternarMenuFicha(ficha: ItemFicha & { donoNome: string }, evento: MouseEvent): void {
    if (this.menuFichaAberto()?.id === ficha.id) {
      this.fecharMenuFicha();
      return;
    }
    const retangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - retangulo.bottom;
    const espacoAcima = retangulo.top;
    const right = window.innerWidth - retangulo.right;
    this.menuFichaPosicao.set(
      espacoAbaixo < 130 && espacoAcima > espacoAbaixo
        ? { bottom: window.innerHeight - retangulo.top + 6, right }
        : { top: retangulo.bottom + 6, right },
    );
    this.menuFichaAberto.set({ id: ficha.id, nome: ficha.nome, donoNome: ficha.donoNome });
  }

  /** Rota da ficha — reusada pelo duplo clique (mesma aba) e pelo clique do meio (nova aba). */
  private caminhoFicha(campanhaId: number, fichaId: number): (string | number)[] {
    return ['/painel', campanhaId, 'ficha', fichaId];
  }

  /**
   * `true` quando o clique (duplo ou do meio) caiu num controle próprio do mini-card (link, passos
   * de Vida/Energia, kebab) — cada um já tem sua própria ação e não deveria também abrir a ficha
   * (ex.: martelar o "+" de Vida bem rápido não pode contar como duplo clique no card).
   */
  private cliqueEmControlePropio(evento: MouseEvent): boolean {
    return (evento.target as HTMLElement).closest('a, button') !== null;
  }

  /** Duplo clique em qualquer ponto "morto" do mini-card abre a ficha, mesmo destino do link do nome/meta. */
  protected abrirFichaDuploClique(campanhaId: number, fichaId: number, evento: MouseEvent): void {
    if (this.cliqueEmControlePropio(evento)) {
      return;
    }
    void this.router.navigate(this.caminhoFicha(campanhaId, fichaId));
  }

  /**
   * Clique do meio (roda do mouse) em qualquer ponto "morto" do mini-card abre a ficha numa nova
   * aba — mesmo comportamento nativo que o clique do meio já tem sobre o link do nome/meta (um
   * `<a>` de verdade), estendido ao resto do card (`<div>`, sem `href` próprio pra abrir sozinho).
   * `auxclick` só dispara para botões não-primários (aqui, filtrado a `button === 1`); `evento.target`
   * sobre o próprio link seria redundante com o comportamento nativo do navegador, daí o mesmo guard
   * de `cliqueEmControlePropio`.
   */
  protected abrirFichaCliqueDoMeio(campanhaId: number, fichaId: number, evento: MouseEvent): void {
    if (evento.button !== 1 || this.cliqueEmControlePropio(evento)) {
      return;
    }
    evento.preventDefault();
    const url = this.router.serializeUrl(this.router.createUrlTree(this.caminhoFicha(campanhaId, fichaId)));
    window.open(url, '_blank', 'noopener');
  }

  /** Fecha o menu de ações de ficha aberto. */
  protected fecharMenuFicha(): void {
    this.menuFichaAberto.set(null);
    this.menuFichaPosicao.set(null);
  }

  /** Abre a confirmação de duplicação a partir do menu da ficha (m3-52). */
  protected pedirDuplicar(fichaId: number, fichaNome: string, donoNome: string): void {
    this.fecharMenuFicha();
    this.confirmandoDuplicar.set({ id: fichaId, nome: fichaNome, donoNome });
  }

  /** Cancela a duplicação pendente — inócuo enquanto a duplicação está em voo. */
  protected cancelarDuplicar(): void {
    if (this.duplicando() === null) {
      this.confirmandoDuplicar.set(null);
    }
  }

  /**
   * Duplica uma ficha (m3-52, item 26) — só disponível aqui, no painel da campanha: a spec
   * original previa a ação no acervo desacoplado da `m3-28`, que ainda não existe neste código
   * (`campanha_id` continua `NOT NULL`, sem rota `/fichas`); a pedido do autor, o clone nasce na
   * **mesma campanha** (única opção possível sem a coluna nullable — ver a nota em
   * `FichaService.duplicarFicha` no backend). Ao concluir, recarrega membros/fichas para o clone
   * aparecer no mini-card de quem duplicou (o dono do clone é sempre quem duplicou — §14).
   */
  protected confirmarDuplicar(): void {
    const pendente = this.confirmandoDuplicar();
    if (!pendente || this.duplicando() !== null) {
      return;
    }
    this.duplicando.set(pendente.id);
    this.fichaService
      .duplicarFicha(pendente.id)
      .pipe(finalize(() => this.duplicando.set(null)))
      .subscribe({
        next: () => {
          this.confirmandoDuplicar.set(null);
          this.recarregarMembrosEFichas();
        },
      });
  }

  /**
   * Desatribui a ficha da campanha (ela volta ao acervo solto do dono, m3-28) — ação direta, sem
   * dialog, mesmo padrão de `FichaAcervo.removerDaCampanha`. Permissão já garantida pelo backend
   * (`validarPermissaoEdicao` — dono ou mestre, mesma regra de `podeAjustarFicha` que já esconde o
   * kebab); some da lista na hora, sem refetch, já que esta tela só lista fichas **desta**
   * campanha (`listarFichas(this.id)`).
   */
  protected removerDaCampanha(fichaId: number): void {
    this.fecharMenuFicha();
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: () => {
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
        },
      });
  }

  /** Abre a confirmação de exclusão a partir do menu da ficha (m3-52). */
  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.confirmandoExcluirFicha.set({ id: fichaId, nome: fichaNome });
  }

  /** Cancela a exclusão pendente — inócuo enquanto a exclusão está em voo. */
  protected cancelarExcluirFicha(): void {
    if (this.excluindoFicha() === null) {
      this.confirmandoExcluirFicha.set(null);
    }
  }

  /**
   * Exclui a ficha (soft delete, só dono/mestre — §14, m3-52) e some da lista na hora — sem
   * refetch, mesmo padrão otimista de `confirmarRemocaoMembro`.
   */
  protected confirmarExcluirFicha(): void {
    const pendente = this.confirmandoExcluirFicha();
    if (!pendente || this.excluindoFicha() !== null) {
      return;
    }
    this.excluindoFicha.set(pendente.id);
    this.fichaService
      .excluirFicha(pendente.id)
      .pipe(finalize(() => this.excluindoFicha.set(null)))
      .subscribe({
        next: () => {
          this.confirmandoExcluirFicha.set(null);
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== pendente.id));
        },
      });
  }
}
