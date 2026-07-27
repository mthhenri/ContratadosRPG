import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { FichaCriarDialog } from '../../componentes/ficha-criar-dialog/ficha-criar-dialog.component';
import { construirFichaInicial, type FichaAssistenteResultado } from '../../ficha-padrao';
import { rotuloClasseCompleto } from '../../rotulos-ficha';

/** Ficha do acervo já enriquecida pro cartão — recorte de `FichaResumoDto` + o rótulo de classe. */
interface ItemAcervo {
  readonly id: number;
  readonly nome: string;
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
 * sem campanha, cada uma num bloquinho com o chip da campanha atual (ou "Sem campanha"). Cria
 * ficha **solta** reusando o mesmo `FichaCriarDialog` do painel da campanha (que já não conhece
 * campanha — `criarFicha` sem `campanhaId`); a ação move a ficha entre o acervo e uma campanha
 * (`atribuirCampanha`, PUT `/ficha/:id/campanha`) via o menu de ações (kebab) de cada cartão,
 * mesmo padrão visual de `CampanhaDetalhe` (m3-52): o dropdown mora na raiz do template, fora da
 * lista com `overflow-y`/`mask-image` (`appOverflowFade`), que cortaria um `position: fixed`
 * comum na pintura.
 *
 * A visualização (`/fichas/:id`) reusa o `FichaVisualizar` campanha-scoped — ver a nota na rota
 * (`ficha-acervo.routes.ts`) e no próprio componente sobre como ele resolve `campanhaId` sem o
 * parâmetro de rota.
 */
@Component({
  selector: 'app-ficha-acervo',
  imports: [RouterLink, Icone, OverflowFade, FichaCriarDialog],
  templateUrl: './acervo.page.html',
  styleUrl: './acervo.page.scss',
})
export class FichaAcervo {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carregando = signal(true);
  private readonly fichas = signal<readonly FichaResumoDto[]>([]);
  protected readonly campanhas = signal<readonly CampanhaResumoDto[]>([]);

  protected readonly dialogCriar = signal(false);
  protected readonly criando = signal(false);

  /** Ficha cujo menu de ações (kebab) está aberto — mesmo padrão de `CampanhaDetalhe` (m3-52). */
  protected readonly menuFichaAberto = signal<{
    id: number;
    nome: string;
    campanhaId: number | null;
  } | null>(null);
  protected readonly menuFichaPosicao = signal<{ top: number; right: number } | null>(null);

  /** Ficha pendente de escolher a campanha-alvo (dialog "Atribuir a campanha"). */
  protected readonly confirmandoAtribuir = signal<{ id: number; nome: string } | null>(null);
  protected readonly campanhaEscolhida = signal<number | null>(null);
  protected readonly atribuindo = signal<number | null>(null);
  /** `id` da ficha sendo desatribuída (ação direta, sem dialog) — desabilita só aquele item. */
  protected readonly removendo = signal<number | null>(null);

  protected readonly itens = computed<readonly ItemAcervo[]>(() =>
    this.fichas().map((ficha) => ({
      id: ficha.id,
      nome: ficha.nome,
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
   * Confirma o assistente: monta a ficha (`construirFichaInicial`) e cria **sem campanha**
   * (m3-28 — nasce solta no acervo). Sem seletor de dono aqui (`podeEscolherDono` fica em
   * `false`): sem campanha não há mestre para criar em nome de outro membro (§14).
   */
  protected criarFicha(resultado: FichaAssistenteResultado): void {
    if (this.criando()) {
      return;
    }
    this.criando.set(true);
    const ficha = construirFichaInicial(resultado.opcoes);
    this.fichaService
      .criarFicha({ nome: ficha.nome, dados: ficha.dados })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: () => {
          this.dialogCriar.set(false);
          this.carregar();
        },
      });
  }

  /** Abre/fecha o menu de ações (kebab) de uma ficha — posição `fixed` calculada no clique. */
  protected alternarMenuFicha(item: ItemAcervo, evento: MouseEvent): void {
    if (this.menuFichaAberto()?.id === item.id) {
      this.fecharMenuFicha();
      return;
    }
    const retangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuFichaPosicao.set({
      top: retangulo.bottom + 6,
      right: window.innerWidth - retangulo.right,
    });
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
}
