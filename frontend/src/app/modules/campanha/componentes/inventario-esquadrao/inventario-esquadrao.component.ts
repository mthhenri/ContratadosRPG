import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type { CampanhaInventarioItemDto } from '@contratados-rpg/shared/dtos/campanha';
import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import {
  CATALOGO_CATEGORIAS,
  CATALOGO_ITENS,
  descreverEfeitosModificacao,
  type ItemCatalogo,
  type ModificacaoAplicadaDto,
} from '@contratados-rpg/shared/regras/compras';

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
  [ItemCategoriaEnum.SEM_CATEGORIA]: 'sem-categoria',
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
  readonly somenteLeitura = input(false);
  readonly atualizado = output<readonly CampanhaInventarioItemDto[]>();

  protected readonly catalogoAberto = signal(false);
  protected readonly criandoItem = signal(false);
  protected readonly categoriaItemSelectAberta = signal(false);
  protected readonly busca = new FormControl('', { nonNullable: true });
  protected readonly categoriaAtiva = new FormControl(ItemCategoriaEnum.OPERACIONAL, { nonNullable: true });
  private readonly termoBusca = toSignal(this.busca.valueChanges, { initialValue: '' });
  private readonly categoriaSelecionada = toSignal(this.categoriaAtiva.valueChanges, {
    initialValue: ItemCategoriaEnum.OPERACIONAL,
  });
  /** Abas do catálogo comprável — sem Amplificador, Fragmentos e Sem Categoria (sem item de catálogo). */
  protected readonly categorias = CATALOGO_CATEGORIAS.filter(({ categoria }) =>
    ![ItemCategoriaEnum.AMPLIFICADOR, ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, ItemCategoriaEnum.SEM_CATEGORIA].includes(categoria),
  );
  /** Categorias disponíveis para um item custom — inclui Sem Categoria, ao contrário das abas. */
  protected readonly categoriasItem = CATALOGO_CATEGORIAS.filter(({ categoria }) =>
    ![ItemCategoriaEnum.AMPLIFICADOR, ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR].includes(categoria),
  );
  protected readonly iconesCategoria = ICONES_CATEGORIA;
  protected readonly itemCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria: new FormControl(ItemCategoriaEnum.OPERACIONAL, { nonNullable: true }),
    custo: new FormControl(0, { nonNullable: true }),
    peso: new FormControl(1, { nonNullable: true }),
    quantidade: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
    descricao: new FormControl('', { nonNullable: true }),
    dano: new FormControl('', { nonNullable: true }),
    informacao: new FormControl('', { nonNullable: true }),
    resistencia: new FormControl('', { nonNullable: true }),
    bonus: new FormControl('', { nonNullable: true }),
  });
  protected readonly categoriaCustom = toSignal(this.itemCustomForm.controls.categoria.valueChanges, {
    initialValue: this.itemCustomForm.controls.categoria.value,
  });
  protected readonly mostraDano = computed(() => [
    ItemCategoriaEnum.CORPO_A_CORPO,
    ItemCategoriaEnum.EXPLOSIVOS,
    ItemCategoriaEnum.ARMAS_DE_FOGO,
    ItemCategoriaEnum.EXOTICOS,
  ].includes(this.categoriaCustom()));
  protected readonly mostraResistencia = computed(() =>
    this.categoriaCustom() === ItemCategoriaEnum.PROTECOES,
  );
  protected readonly mostraBonus = computed(() =>
    this.categoriaCustom() === ItemCategoriaEnum.ARMAZENAMENTO,
  );
  protected readonly operando = signal(false);
  protected readonly itemAdicionado = signal<string | null>(null);
  protected readonly itemConfirmandoRemocao = signal<string | null>(null);
  protected readonly transferencia = signal<CampanhaInventarioItemDto | null>(null);
  protected readonly fichaDestino = new FormControl<number | null>(null);
  protected readonly quantidade = new FormControl(1, { nonNullable: true });
  protected readonly itensCatalogo = computed(() => {
    const termo = this.termoBusca().trim().toLocaleLowerCase('pt-BR');
    const itens = CATALOGO_ITENS[this.categoriaSelecionada()] ?? [];
    return termo
      ? itens.filter((item) => `${item.nome} ${item.descricao ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo))
      : itens;
  });

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((item) => item.categoria === categoria)?.rotulo ?? categoria;
  }

  protected resumoMecanico(item: ItemCatalogo): string | null {
    return item.dano ?? item.resistencia ?? item.bonus ?? item.informacao ?? null;
  }

  protected descricaoModificacao(modificacao: ModificacaoAplicadaDto): string | null {
    return descreverEfeitosModificacao(modificacao.efeitos, modificacao.empilhamentos)
      || modificacao.descricao
      || null;
  }

  protected alternarCatalogo(): void {
    if (this.somenteLeitura()) return;
    this.catalogoAberto.update((aberto) => !aberto);
    if (this.catalogoAberto()) {
      this.criandoItem.set(false);
      this.categoriaItemSelectAberta.set(false);
    }
  }

  protected alternarCriarItem(): void {
    if (this.somenteLeitura()) return;
    if (this.criandoItem()) {
      this.cancelarCriarItem();
      return;
    }
    this.itemCustomForm.reset({
      nome: '', categoria: ItemCategoriaEnum.OPERACIONAL, custo: 0, peso: 1, quantidade: 1,
      descricao: '', dano: '', informacao: '', resistencia: '', bonus: '',
    });
    this.catalogoAberto.set(false);
    this.criandoItem.set(true);
  }

  protected cancelarCriarItem(): void {
    this.criandoItem.set(false);
    this.categoriaItemSelectAberta.set(false);
  }

  protected alternarCategoriaItemSelect(): void {
    this.categoriaItemSelectAberta.update((aberta) => !aberta);
  }

  protected escolherCategoriaItem(categoria: ItemCategoriaEnum): void {
    this.itemCustomForm.controls.categoria.setValue(categoria);
    this.categoriaItemSelectAberta.set(false);
  }

  protected ajustarCampoItem(campo: 'custo' | 'peso' | 'quantidade', delta: number): void {
    const controle = this.itemCustomForm.controls[campo];
    const minimo = campo === 'quantidade' ? 1 : 0;
    controle.setValue(Math.max(minimo, controle.value + delta));
  }

  protected confirmarCriarItem(): void {
    if (this.somenteLeitura() || this.itemCustomForm.invalid || this.operando()) return;
    const bruto = this.itemCustomForm.getRawValue();
    const descricao = bruto.descricao.trim();
    const dano = bruto.dano.trim();
    const informacao = bruto.informacao.trim();
    const resistencia = bruto.resistencia.trim();
    const bonus = bruto.bonus.trim();
    const categoria = bruto.categoria;
    const comDano = this.mostraDano();
    this.operando.set(true);
    this.campanhaService.adicionarItemInventario(this.campanhaId(), {
      nome: bruto.nome.trim(), categoria, custo: Math.max(0, bruto.custo), peso: Math.max(0, bruto.peso),
      quantidade: Math.max(1, bruto.quantidade),
      ...(descricao ? { descricao } : {}),
      ...(comDano && dano ? { dano } : {}),
      ...(comDano && informacao ? { informacao } : {}),
      ...(this.mostraResistencia() && resistencia ? { resistencia } : {}),
      ...(this.mostraBonus() && bonus ? { bonus } : {}),
    }).pipe(finalize(() => this.operando.set(false))).subscribe((resultado) => {
      this.atualizado.emit(resultado.itens);
      this.cancelarCriarItem();
    });
  }

  protected adicionar(item: ItemCatalogo): void {
    if (this.somenteLeitura() || this.operando()) return;
    this.operando.set(true);
    this.campanhaService.adicionarItemInventario(this.campanhaId(), {
      nome: item.nome, categoria: this.categoriaSelecionada(), custo: item.custo, peso: item.peso,
      quantidade: 1, descricao: item.descricao, dano: item.dano, informacao: item.informacao,
      resistencia: item.resistencia, bonus: item.bonus,
    }).pipe(finalize(() => this.operando.set(false))).subscribe((resultado) => {
      this.atualizado.emit(resultado.itens);
      this.itemAdicionado.set(item.nome);
      setTimeout(() => {
        if (this.itemAdicionado() === item.nome) this.itemAdicionado.set(null);
      }, 900);
    });
  }

  protected ajustar(itemId: string, delta: number): void {
    if (this.somenteLeitura()) return;
    this.campanhaService.ajustarQuantidadeItemInventario(this.campanhaId(), itemId, delta)
      .subscribe((resultado) => this.atualizado.emit(resultado.itens));
  }

  protected solicitarRemocao(itemId: string): void {
    if (this.somenteLeitura()) return;
    this.itemConfirmandoRemocao.set(itemId);
  }

  protected cancelarRemocao(): void {
    this.itemConfirmandoRemocao.set(null);
  }

  protected confirmarRemocao(itemId: string): void {
    if (this.somenteLeitura()) return;
    this.campanhaService.removerItemInventario(this.campanhaId(), itemId)
      .subscribe((resultado) => {
        this.itemConfirmandoRemocao.set(null);
        this.atualizado.emit(resultado.itens);
      });
  }

  protected abrirTransferencia(item: CampanhaInventarioItemDto): void {
    if (this.somenteLeitura()) return;
    this.transferencia.set(item);
    this.fichaDestino.setValue(this.fichas()[0]?.id ?? null);
    this.quantidade.setValue(item.quantidade);
  }

  protected confirmarTransferencia(): void {
    if (this.somenteLeitura()) return;
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
