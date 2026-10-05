import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import { CartaoFichaAcervo, type ItemAcervo } from '../../componentes/cartao-ficha-acervo/cartao-ficha-acervo.component';
import { confirmarRemocaoDaCampanha } from '../../ficha-confirmacoes';
import { FichaService } from '../../ficha.service';
import { montarItemNpc } from "../../npc-acervo";
import { montarItemCriatura } from "../../criatura-acervo";
import { rotuloClasseCompleto } from '../../rotulos-ficha';
import { rotuloPatente } from '../../status-derivado';

/** Hover sustentado antes do preview ampliado do avatar abrir (mesmo tempo de `CampanhaDetalhe`). */
const MS_PREVIEW_AVATAR = 600;

/** Tamanho do preview ampliado do avatar (px, quadrado) — `object-fit: contain`, sem recorte. */
const PX_PREVIEW_AVATAR = 300;

/** Valor do `<select>` de visão quando nenhum tipo está filtrado — os blocos aparecem todos. */
const FILTRO_TODOS = 'TODOS' as const;
type FiltroAcervo = typeof FILTRO_TODOS | TipoFichaEnum;

/**
 * Um tipo de ficha do acervo — alimenta o `<select>` de filtro e o texto do estado vazio de cada
 * tipo (m4-11/m4-12). A lista exibida é **única** e mistura os tipos; esta tabela não define mais
 * blocos de renderização.
 */
interface DefinicaoTipoAcervo {
  readonly tipo: TipoFichaEnum;
  readonly titulo: string;
  readonly estadoVazio: string;
}

const TIPOS_ACERVO: readonly DefinicaoTipoAcervo[] = [
  { tipo: TipoFichaEnum.JOGADOR, titulo: 'Agentes', estadoVazio: 'Nenhum agente ainda.' },
  { tipo: TipoFichaEnum.CRIATURA, titulo: 'Criaturas', estadoVazio: 'Nenhuma criatura ainda.' },
  { tipo: TipoFichaEnum.NPC, titulo: "NPCs", estadoVazio: "Nenhum NPC ainda." },
];

/**
 * Ordem alfabética do acervo (m4-12): `pt-BR`, sem diferenciar acento nem caixa ("Álvaro" antes de
 * "Bruno"). O `ORDER BY ficha.nome` do backend não tem essa colação, então a ordem de apresentação
 * é aplicada aqui, sobre o que o backend devolve.
 */
const COMPARADOR_NOME = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/**
 * O **acervo** de fichas do usuário (`/fichas`, m3-28) — todas as fichas do autenticado, com e
 * sem campanha, cada uma num bloquinho com o chip da campanha atual (ou "Sem campanha"). "Criar
 * ficha" navega pro mesmo guia de criação passo a passo campanha-scoped (`FichaCriar`,
 * `m3-57`/`m3-58`/`m3-59`), montado de novo aqui sob `/fichas/nova` (sem `:campanhaId` na rota —
 * o guia lê `null` e pula os passos de esquadrão), mesmo padrão de `CampanhaDetalhe.abrirCriarFicha`;
 * a ação move a ficha entre o acervo e uma campanha (`atribuirCampanha`, PUT `/ficha/:id/campanha`)
 * via o menu de ações (kebab) de cada cartão, mesmo padrão visual de `CampanhaDetalhe` (m3-52): o
 * dropdown mora na raiz do template, fora da lista com `overflow-y`/`mask-image`
 * (`appOverflowFade`), que cortaria um `position: fixed` comum na pintura.
 *
 * A visualização reusa `FichaVisualizar` (`/fichas/:id`) ou `CriaturaVisualizar`
 * (`/fichas/criatura/:id`), campanha-scoped — ver a nota na rota (`ficha-acervo.routes.ts`) e no
 * próprio componente sobre como cada um resolve `campanhaId` sem o parâmetro de rota.
 *
 * **Lista única e filtro por tipo (m4-11/m4-12).** O acervo mistura agentes, criaturas e NPCs numa
 * só lista em ordem alfabética por nome (`itensExibidos`), com um `<select>` de visão (Todos/
 * Agentes/Criaturas/NPCs) que filtra essa lista. Card único (`CartaoFichaAcervo`) com recorte e
 * etiqueta por tipo. "Criar criatura" só aparece para quem é mestre de alguma campanha
 * (`podeCriarCriatura`) — o backend (`FichaService.criarFichaCriatura`) continua sendo a
 * autoridade; esta checagem só evita oferecer o que seria recusado.
 */
@Component({
  selector: 'app-ficha-acervo',
  imports: [Botao, Campo, Cartao, Icone, CartaoFichaAcervo, Modal, EstadoVazio, Esqueleto],
  templateUrl: './acervo.page.html',
  styleUrl: './acervo.page.scss',
})
export class FichaAcervo {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly FILTRO_TODOS = FILTRO_TODOS;
  protected readonly tipos = TIPOS_ACERVO;

  protected readonly carregando = signal(true);
  private readonly fichas = signal<readonly FichaResumoDto[]>([]);
  protected readonly campanhas = signal<readonly CampanhaResumoDto[]>([]);
  protected readonly filtro = signal<FiltroAcervo>(FILTRO_TODOS);

  /** Ficha cujo menu de ações (kebab) está aberto — mesmo padrão de `CampanhaDetalhe` (m3-52). */
  protected readonly menuFichaAberto = signal<{
    id: number;
    nome: string;
    tipo: TipoFichaEnum;
    campanhaId: number | null;
  } | null>(null);
  /**
   * `top` quando o menu abre pra baixo (padrão); `bottom` quando abre pra cima (cartão perto do
   * fim da página — sem isso o menu de 4 itens saía cortado pela borda inferior da viewport, já
   * que `position: fixed` não reposiciona sozinho). Só um dos dois é setado por vez.
   */
  protected readonly menuFichaPosicao = signal<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  /** Ficha pendente de escolher a campanha-alvo (dialog "Atribuir a campanha"). */
  protected readonly confirmandoAtribuir = signal<{ id: number; nome: string; tipo: TipoFichaEnum } | null>(
    null,
  );
  protected readonly campanhaEscolhida = signal<number | null>(null);
  protected readonly atribuindo = signal<number | null>(null);
  /** `id` da ficha sendo desatribuída (ação direta, sem dialog) — desabilita só aquele item. */
  protected readonly removendo = signal<number | null>(null);

  /**
   * Duplicar/excluir (m3-52, "pendente para quando a m3-28 existir") — as duas affordances que a
   * spec original previa no acervo mas ficaram só no painel da campanha (`CampanhaDetalhe`) e na
   * própria tela da ficha (`FichaVisualizar`) enquanto `/fichas` não existia. Aqui não há
   * `donoNome` na mensagem de confirmação (diferente de `CampanhaDetalhe`, onde o mestre duplica
   * fichas de outros membros): o acervo só lista fichas do **próprio** usuário (`listarMinhasFichas`
   * filtra por dono), então toda ficha aqui já é do autenticado — sem gate extra de permissão.
   */
  protected readonly confirmandoDuplicar = signal<{ id: number; nome: string } | null>(null);
  protected readonly duplicando = signal<number | null>(null);

  /** Preview ampliado do avatar em hover sustentado (`agendarPreviewAvatar`) — mesmo padrão de `CampanhaDetalhe`. */
  protected readonly previewAvatar = signal<{ url: string; top: number; left: number } | null>(
    null,
  );
  private temporizadorPreviewAvatar: ReturnType<typeof setTimeout> | null = null;

  /**
   * Ficha sem `tipo` (retrocompat — o campo é opcional no `FichaResumoDto` por fixtures
   * pré-`m4-04`) conta como `JOGADOR`, mesmo tratamento que o resto do front já dá.
   */
  protected readonly itens = computed<readonly ItemAcervo[]>(() =>
    this.fichas().map((ficha) => {
      const tipo = ficha.tipo ?? TipoFichaEnum.JOGADOR;
      if (tipo === TipoFichaEnum.NPC) return montarItemNpc(ficha);
      if (tipo === TipoFichaEnum.CRIATURA) return montarItemCriatura(ficha);
      const comum = {
        id: ficha.id,
        tipo,
        nome: ficha.nome,
        cor: ficha.cor ?? null,
        imagemUrl: ficha.imagemUrl,
        campanhaId: ficha.campanhaId,
        campanhaNome: ficha.campanhaNome,
        vidaAtual: ficha.vidaAtual,
        vidaMaxima: ficha.vidaMaxima,
      };
      return {
        ...comum,
        classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
        nivel: ficha.nivel,
        patenteTexto: rotuloPatente(ficha.prestigio ?? 0),
        energiaAtual: ficha.energiaAtual,
        energiaMaxima: ficha.energiaMaxima,
      };
    }),
  );

  /**
   * A lista exibida (m4-12): o `filtro()` aplicado e a ordem alfabética por nome, desempatada por
   * `id` para a ordem ser estável entre ficha de mesmo nome.
   */
  protected readonly itensExibidos = computed<readonly ItemAcervo[]>(() => {
    const filtroAtual = this.filtro();
    const itensDoFiltro =
      filtroAtual === FILTRO_TODOS
        ? this.itens()
        : this.itens().filter((item) => item.tipo === filtroAtual);
    return [...itensDoFiltro].sort(
      (anterior, seguinte) =>
        COMPARADOR_NOME.compare(anterior.nome, seguinte.nome) || anterior.id - seguinte.id,
    );
  });

  /** Texto do estado vazio de um tipo filtrado sem ficha ("Nenhuma criatura ainda."). */
  protected readonly estadoVazioDoFiltro = computed(
    () => this.tipos.find((definicao) => definicao.tipo === this.filtro())?.estadoVazio ?? '',
  );

  /** `true` quando o usuário é mestre de alguma campanha — condição de "Criar criatura" (m4-11). */
  protected readonly podeCriarCriatura = computed(() =>
    this.campanhas().some((campanha) => campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE),
  );

  /**
   * Campanhas elegíveis para a dialog "Atribuir a campanha": todas, para agente; só onde o
   * usuário é mestre, para criatura/NPC (§14 — coerente com quem pode criar/gerenciar o tipo).
   */
  protected readonly campanhasElegiveis = computed<readonly CampanhaResumoDto[]>(() => {
    const pendente = this.confirmandoAtribuir();
    if (!pendente) {
      return [];
    }
    return pendente.tipo === TipoFichaEnum.JOGADOR
      ? this.campanhas()
      : this.campanhas().filter((campanha) => campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE);
  });

  /** Se existe ao menos uma campanha elegível para atribuir aquele tipo — controla o item do menu (⋯). */
  protected temCampanhaElegivelParaAtribuir(tipo: TipoFichaEnum): boolean {
    return tipo === TipoFichaEnum.JOGADOR
      ? this.campanhas().length > 0
      : this.campanhas().some((campanha) => campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE);
  }

  constructor() {
    this.carregarDadosIniciais();

    // Mesmo tratamento de `CampanhaDetalhe` (m3-52): o menu é `position: fixed` calculado no
    // clique — sem fechar ao rolar/redimensionar, ele descolaria visualmente do botão que o abriu.
    const fecharMenuAoRolarOuRedimensionar = () => this.fecharMenuFicha();
    window.addEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
    window.addEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
      window.removeEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    });

    // Preview ampliado do avatar (ver `previewAvatar`) — cancela o temporizador pendente ao sair.
    this.destroyRef.onDestroy(() => this.cancelarPreviewAvatar());
  }

  private carregarDadosIniciais(): void {
    this.carregando.set(true);
    forkJoin({
      fichas: this.fichaService.listarMinhasFichas(),
      campanhas: this.campanhaService.listarCampanhas(),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ fichas, campanhas }) => {
          this.fichas.set(fichas);
          this.campanhas.set(campanhas);
        },
      });
  }

  /** Recarrega somente os resumos de ficha, que mudam após duplicar uma ficha. */
  private recarregarFichas(): void {
    this.fichaService.listarMinhasFichas().subscribe({ next: (fichas) => this.fichas.set(fichas) });
  }

  /** Navega pro guia de criação campanha-less (`/fichas/nova`) — mesmo padrão de `CampanhaDetalhe.abrirCriarFicha`. */
  protected abrirCriarFicha(): void {
    void this.router.navigate(['/fichas', 'nova']);
  }

  /** Navega pro guia de criação de criatura solta (`/fichas/criatura/nova`, m4-11). */
  protected abrirCriarCriatura(): void {
    void this.router.navigate(['/fichas', 'criatura', 'nova']);
  }

  protected abrirCriarNpc(): void {
    void this.router.navigate(["/fichas", "npc", "novo"]);
  }

  /** Troca o filtro de visão do `<select>` — "Todos" ou um `TipoFichaEnum`. */
  protected mudarFiltro(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.filtro.set(valor === FILTRO_TODOS ? FILTRO_TODOS : (valor as TipoFichaEnum));
  }

  /**
   * Abre/fecha o menu de ações (kebab) de uma ficha — posição `fixed` calculada no clique. Abre
   * pra baixo por padrão; se não houver espaço suficiente até o fim da viewport (o menu tem até 4
   * itens, ~180px), e houver mais espaço acima do botão do que abaixo, abre pra cima em vez de
   * cortar na borda inferior.
   */
  protected alternarMenuFicha(item: ItemAcervo, evento: MouseEvent): void {
    if (this.menuFichaAberto()?.id === item.id) {
      this.fecharMenuFicha();
      return;
    }
    const retangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - retangulo.bottom;
    const espacoAcima = retangulo.top;
    const right = window.innerWidth - retangulo.right;
    this.menuFichaPosicao.set(
      espacoAbaixo < 190 && espacoAcima > espacoAbaixo
        ? { bottom: window.innerHeight - retangulo.top + 6, right }
        : { top: retangulo.bottom + 6, right },
    );
    this.menuFichaAberto.set({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      campanhaId: item.campanhaId,
    });
  }

  protected fecharMenuFicha(): void {
    this.menuFichaAberto.set(null);
    this.menuFichaPosicao.set(null);
  }

  /**
   * Agenda a abertura do preview ampliado do avatar (`MS_PREVIEW_AVATAR` de hover sustentado) —
   * só quando a ficha tem `imagemUrl` (sem foto, o cartão mostra só o placeholder listrado, nada
   * pra ampliar). Posição calculada do avatar no momento em que o mouse entra, centrada e travada
   * dentro da janela nos dois eixos — mesmo cálculo de `CampanhaDetalhe.agendarPreviewAvatar`.
   */
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

  /** Cancela o agendamento e fecha o preview ampliado do avatar, se aberto. */
  protected cancelarPreviewAvatar(): void {
    if (this.temporizadorPreviewAvatar !== null) {
      clearTimeout(this.temporizadorPreviewAvatar);
      this.temporizadorPreviewAvatar = null;
    }
    this.previewAvatar.set(null);
  }

  /**
   * Abre a dialog de atribuição, pré-selecionando a primeira campanha elegível — para criatura/
   * NPC, só onde o usuário é mestre (`campanhasElegiveis`).
   */
  protected pedirAtribuir(fichaId: number, fichaNome: string, tipo: TipoFichaEnum): void {
    this.fecharMenuFicha();
    this.confirmandoAtribuir.set({ id: fichaId, nome: fichaNome, tipo });
    const elegiveis =
      tipo === TipoFichaEnum.JOGADOR
        ? this.campanhas()
        : this.campanhas().filter((campanha) => campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE);
    this.campanhaEscolhida.set(elegiveis[0]?.id ?? null);
  }

  /** Cancela a atribuição pendente — inócuo enquanto ela está em voo. */
  protected cancelarAtribuir(): void {
    if (this.atribuindo() === null) {
      this.confirmandoAtribuir.set(null);
    }
  }

  /** Troca a campanha escolhida no `<select>` da dialog de atribuição. */
  protected mudarCampanhaEscolhida(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.campanhaEscolhida.set(valor === '' ? null : Number(valor));
  }

  /** Move a ficha para a campanha escolhida (§14 — o backend confirma que o dono é membro dela). */
  protected confirmarAtribuir(): void {
    const pendente = this.confirmandoAtribuir();
    const campanhaId = this.campanhaEscolhida();
    if (!pendente || campanhaId === null || this.atribuindo() !== null) {
      return;
    }
    this.atribuindo.set(pendente.id);
    this.fichaService
      .atribuirCampanha(pendente.id, campanhaId)
      .pipe(finalize(() => this.atribuindo.set(null)))
      .subscribe({
        next: (resultado) => {
          this.confirmandoAtribuir.set(null);
          this.aplicarCampanhaAtribuida(resultado.id, resultado.campanhaId);
        },
      });
  }

  /** Pede a confirmação e, se aceita, desatribui a ficha da campanha (ver `removerDaCampanha`). */
  protected pedirRemoverDaCampanha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    if (this.removendo() !== null) {
      return;
    }
    void confirmarRemocaoDaCampanha(this.confirmacaoService, fichaNome).then((confirmado) => {
      if (confirmado) {
        this.removerDaCampanha(fichaId);
      }
    });
  }

  /** Desatribui a ficha (volta ao acervo solto do dono); some o chip na hora. */
  private removerDaCampanha(fichaId: number): void {
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: (resultado) => this.aplicarCampanhaAtribuida(resultado.id, resultado.campanhaId),
      });
  }

  /** Abre a confirmação de duplicação a partir do menu da ficha (m3-52, mesmo padrão de `CampanhaDetalhe`). */
  protected pedirDuplicar(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.confirmandoDuplicar.set({ id: fichaId, nome: fichaNome });
  }

  /** Cancela a duplicação pendente — inócuo enquanto a duplicação está em voo. */
  protected cancelarDuplicar(): void {
    if (this.duplicando() === null) {
      this.confirmandoDuplicar.set(null);
    }
  }

  /**
   * Duplica a ficha (m3-52): o clone nasce solto se a original estiver solta, ou na mesma
   * campanha da original caso contrário (`FichaService.duplicarFicha` repassa `campanhaId` da
   * ficha original — backend). Recarrega o acervo pro clone aparecer.
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
          this.recarregarFichas();
        },
      });
  }

  /** Abre a confirmação de exclusão a partir do menu da ficha (m3-52 · ui-15). */
  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
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

  /** Exclui a ficha (soft delete) e some da lista na hora — sem refetch (m3-52). */
  private excluirFicha(fichaId: number): void {
    this.fichaService.excluirFicha(fichaId).subscribe({
      next: () => {
        this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
      },
    });
  }

  /** Atualiza o chip pelo retorno autoritativo da mutação e pelo nome da campanha já carregada. */
  private aplicarCampanhaAtribuida(fichaId: number, campanhaId: number | null): void {
    const campanhaNome =
      campanhaId === null ? null : this.campanhas().find((campanha) => campanha.id === campanhaId)?.nome ?? null;
    this.fichas.update((lista) =>
      lista.map((ficha) =>
        ficha.id === fichaId ? { ...ficha, campanhaId, campanhaNome } : ficha,
      ),
    );
  }
}
