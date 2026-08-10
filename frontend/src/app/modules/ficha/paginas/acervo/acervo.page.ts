import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { rotuloClasseCompleto } from '../../rotulos-ficha';

/** Ficha do acervo já enriquecida pro cartão — recorte de `FichaResumoDto` + o rótulo de classe. */
interface ItemAcervo {
  readonly id: number;
  readonly nome: string;
  /** Avatar da ficha (m3-62) — `null` sem imagem definida (cai no placeholder decorativo do cartão). */
  readonly imagemUrl: string | null;
  readonly classeTexto: string;
  readonly nivel: number;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly energiaAtual: number;
  readonly energiaMaxima?: number;
  readonly campanhaId: number | null;
  readonly campanhaNome: string | null;
}

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
 * A visualização (`/fichas/:id`) reusa o `FichaVisualizar` campanha-scoped — ver a nota na rota
 * (`ficha-acervo.routes.ts`) e no próprio componente sobre como ele resolve `campanhaId` sem o
 * parâmetro de rota.
 */
@Component({
  selector: 'app-ficha-acervo',
  imports: [RouterLink, Icone, OverflowFade],
  templateUrl: './acervo.page.html',
  styleUrl: './acervo.page.scss',
})
export class FichaAcervo {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carregando = signal(true);
  private readonly fichas = signal<readonly FichaResumoDto[]>([]);
  protected readonly campanhas = signal<readonly CampanhaResumoDto[]>([]);

  /** Ficha cujo menu de ações (kebab) está aberto — mesmo padrão de `CampanhaDetalhe` (m3-52). */
  protected readonly menuFichaAberto = signal<{
    id: number;
    nome: string;
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
  protected readonly confirmandoAtribuir = signal<{ id: number; nome: string } | null>(null);
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
  protected readonly confirmandoExcluirFicha = signal<{ id: number; nome: string } | null>(null);
  protected readonly excluindoFicha = signal<number | null>(null);

  protected readonly itens = computed<readonly ItemAcervo[]>(() =>
    this.fichas().map((ficha) => ({
      id: ficha.id,
      nome: ficha.nome,
      imagemUrl: ficha.imagemUrl,
      classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
      nivel: ficha.nivel,
      vidaAtual: ficha.vidaAtual,
      vidaMaxima: ficha.vidaMaxima,
      energiaAtual: ficha.energiaAtual,
      energiaMaxima: ficha.energiaMaxima,
      campanhaId: ficha.campanhaId,
      campanhaNome: ficha.campanhaNome,
    })),
  );

  constructor() {
    this.carregar();

    // Mesmo tratamento de `CampanhaDetalhe` (m3-52): o menu é `position: fixed` calculado no
    // clique — sem fechar ao rolar/redimensionar, ele descolaria visualmente do botão que o abriu.
    const fecharMenuAoRolarOuRedimensionar = () => this.fecharMenuFicha();
    window.addEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
    window.addEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', fecharMenuAoRolarOuRedimensionar, true);
      window.removeEventListener('resize', fecharMenuAoRolarOuRedimensionar);
    });
  }

  private carregar(): void {
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

  /** Navega pro guia de criação campanha-less (`/fichas/nova`) — mesmo padrão de `CampanhaDetalhe.abrirCriarFicha`. */
  protected abrirCriarFicha(): void {
    void this.router.navigate(['/fichas', 'nova']);
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
    this.menuFichaAberto.set({ id: item.id, nome: item.nome, campanhaId: item.campanhaId });
  }

  protected fecharMenuFicha(): void {
    this.menuFichaAberto.set(null);
    this.menuFichaPosicao.set(null);
  }

  /** Abre a dialog de atribuição, pré-selecionando a primeira campanha do usuário. */
  protected pedirAtribuir(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.campanhaEscolhida.set(this.campanhas()[0]?.id ?? null);
    this.confirmandoAtribuir.set({ id: fichaId, nome: fichaNome });
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
        next: () => {
          this.confirmandoAtribuir.set(null);
          this.carregar();
        },
      });
  }

  /** Desatribui a ficha (volta ao acervo) — ação direta, sem dialog; some o chip na hora. */
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
          this.fichas.update((lista) =>
            lista.map((ficha) =>
              ficha.id === fichaId ? { ...ficha, campanhaId: null, campanhaNome: null } : ficha,
            ),
          );
        },
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
          this.carregar();
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

  /** Exclui a ficha (soft delete) e some da lista na hora — sem refetch (m3-52). */
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
