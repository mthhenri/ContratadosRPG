import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type { CampanhaInventarioItemDto } from '@contratados-rpg/shared/dtos/campanha';
import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import { CATALOGO_CATEGORIAS, CATALOGO_ITENS, type ItemCatalogo } from '@contratados-rpg/shared/regras/compras';

import { Icone, type IconeNome } from '../../../../shared/icone/icone.component';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';

interface FichaDestinoInventario { readonly id: number; readonly nome: string; }

const ICONES_CATEGORIA: Readonly<Record<ItemCategoriaEnum, IconeNome>> = {
  [ItemCategoriaEnum.CORPO_A_CORPO]: 'corpo-a-corpo',
  [ItemCategoriaEnum.EXPLOSIVOS]: 'explosivos',
  [ItemCategoriaEnum.ARMAS_DE_FOGO]: 'armas-de-fogo',
  [ItemCategoriaEnum.MUNICOES]: 'municoes',
  [ItemCategoriaEnum.PROTECOES]: 'protecoes',
  [ItemCategoriaEnum.EXOTICOS]: 'exoticos',
  [ItemCategoriaEnum.ARMAZENAMENTO]: 'armazenamento',
  [ItemCategoriaEnum.OPERACIONAL]: 'operacional',
  [ItemCategoriaEnum.MEDICINAL]: 'medicinal',
  [ItemCategoriaEnum.AMPLIFICADOR]: 'amplificador',
  [ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR]: 'fragmento-construtor',
  [ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR]: 'fragmento-potencializador',
};

@Component({
  selector: 'app-inventario-esquadrao',
  imports: [ReactiveFormsModule, Icone],
  templateUrl: './inventario-esquadrao.component.html',
  styleUrl: './inventario-esquadrao.component.scss',
})
export class InventarioEsquadrao {
  private readonly campanhaService = inject(CampanhaService);
  private readonly fichaService = inject(FichaService);

  readonly campanhaId = input.required<number>();
  readonly itens = input.required<readonly CampanhaInventarioItemDto[]>();
  readonly fichas = input<readonly FichaDestinoInventario[]>([]);
  readonly bloqueado = input(false);
  readonly atualizado = output<readonly CampanhaInventarioItemDto[]>();

  protected readonly catalogoAberto = signal(false);
  protected readonly categoriaAtiva = new FormControl(ItemCategoriaEnum.OPERACIONAL, { nonNullable: true });
  private readonly categoriaSelecionada = toSignal(this.categoriaAtiva.valueChanges, {
    initialValue: ItemCategoriaEnum.OPERACIONAL,
  });
  protected readonly categorias = CATALOGO_CATEGORIAS.filter(({ categoria }) =>
    ![ItemCategoriaEnum.AMPLIFICADOR, ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR].includes(categoria),
  );
  protected readonly iconesCategoria = ICONES_CATEGORIA;
  protected readonly operando = signal(false);
  protected readonly transferencia = signal<CampanhaInventarioItemDto | null>(null);
  protected readonly fichaDestino = new FormControl<number | null>(null);
  protected readonly quantidade = new FormControl(1, { nonNullable: true });
  protected readonly itensCatalogo = computed(() => CATALOGO_ITENS[this.categoriaSelecionada()] ?? []);

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((item) => item.categoria === categoria)?.rotulo ?? categoria;
  }

  protected resumoMecanico(item: ItemCatalogo): string | null {
    return item.dano ?? item.resistencia ?? item.bonus ?? item.informacao ?? null;
  }

  protected adicionar(item: ItemCatalogo): void {
    if (this.operando()) return;
    this.operando.set(true);
    this.campanhaService.adicionarItemInventario(this.campanhaId(), {
      nome: item.nome, categoria: this.categoriaSelecionada(), custo: item.custo, peso: item.peso,
      quantidade: 1, descricao: item.descricao, dano: item.dano, informacao: item.informacao,
      resistencia: item.resistencia, bonus: item.bonus,
    }).pipe(finalize(() => this.operando.set(false))).subscribe((resultado) => {
      this.atualizado.emit(resultado.itens);
      this.catalogoAberto.set(false);
    });
  }

  protected ajustar(itemId: string, delta: number): void {
    this.campanhaService.ajustarQuantidadeItemInventario(this.campanhaId(), itemId, delta)
      .subscribe((resultado) => this.atualizado.emit(resultado.itens));
  }

  protected remover(itemId: string): void {
    this.campanhaService.removerItemInventario(this.campanhaId(), itemId)
      .subscribe((resultado) => this.atualizado.emit(resultado.itens));
  }

  protected abrirTransferencia(item: CampanhaInventarioItemDto): void {
    this.transferencia.set(item);
    this.fichaDestino.setValue(this.fichas()[0]?.id ?? null);
    this.quantidade.setValue(item.quantidade);
  }

  protected confirmarTransferencia(): void {
    const item = this.transferencia();
    const fichaId = this.fichaDestino.value;
    if (!item || fichaId === null || this.quantidade.value < 1 || this.quantidade.value > item.quantidade) return;
    this.operando.set(true);
    this.fichaService.pegarItemInventario(fichaId, item.id, this.quantidade.value)
      .pipe(finalize(() => this.operando.set(false)))
      .subscribe(() => {
        const restantes = item.quantidade - this.quantidade.value;
        this.atualizado.emit(restantes <= 0
          ? this.itens().filter((atual) => atual.id !== item.id)
          : this.itens().map((atual) => atual.id === item.id ? { ...atual, quantidade: restantes } : atual));
        this.transferencia.set(null);
      });
  }
}
