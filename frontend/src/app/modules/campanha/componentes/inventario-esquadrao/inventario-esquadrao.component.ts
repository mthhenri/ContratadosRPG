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
  escalarDescricaoCatalogoPorCompras,
  listarModificacoesDisponiveis,
  verificarConflitoModificacao,
  type CarrinhoItemDto,
  type ItemCatalogo,
  type ModificacaoAplicadaDto,
  type ModificacaoDados,
} from '@contratados-rpg/shared/regras/compras';

import { Icone, type IconeNome } from '../../../../shared/icone/icone.component';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';

interface FichaDestinoInventario { readonly id: number; readonly nome: string; }

interface DadosItemRascunho {
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly descricao?: string;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
  readonly modificacoes?: readonly ModificacaoAplicadaDto[];
}

interface ConfiguracaoModificacoes {
  readonly origem: 'catalogo' | 'custom';
  readonly item: CarrinhoItemDto;
  readonly itemCatalogo?: ItemCatalogo;
}

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
  protected readonly escalarDescricaoCatalogoPorCompras = escalarDescricaoCatalogoPorCompras;
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
  protected readonly configuracaoModificacoes = signal<ConfiguracaoModificacoes | null>(null);
  protected readonly modificacoesItemCustom = signal<readonly ModificacaoAplicadaDto[]>([]);
  protected readonly fichaDestino = new FormControl<number | null>(null);
  protected readonly quantidade = new FormControl(1, { nonNullable: true });
  protected readonly itensCatalogo = computed(() => {
    const termo = this.termoBusca().trim().toLocaleLowerCase('pt-BR');
    const itens = CATALOGO_ITENS[this.categoriaSelecionada()] ?? [];
    return termo
      ? itens.filter((item) => `${item.nome} ${item.descricao ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo))
      : itens;
  });
  protected readonly modificacoesEmConfiguracao = computed(() =>
    this.configuracaoModificacoes()?.item.modificacoes ?? [],
  );
  protected readonly modificacoesDisponiveis = computed(() => {
    const configuracao = this.configuracaoModificacoes();
    return configuracao ? listarModificacoesDisponiveis(configuracao.item) : [];
  });

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((item) => item.categoria === categoria)?.rotulo ?? categoria;
  }

  protected resumoMecanico(item: ItemCatalogo): string | null {
    return item.dano ?? item.resistencia ?? item.bonus ?? item.informacao ?? null;
  }

  protected descricaoModificacao(modificacao: ModificacaoAplicadaDto, item?: DadosItemRascunho): string | null {
    const descricaoCatalogo = item
      ? listarModificacoesDisponiveis(this.criarRascunho(item)).find(({ nome }) => nome === modificacao.nome)?.descricao
      : undefined;
    return descreverEfeitosModificacao(modificacao.efeitos, modificacao.empilhamentos)
      || modificacao.descricao
      || (descricaoCatalogo
        ? escalarDescricaoCatalogoPorCompras(modificacao.nome, descricaoCatalogo, modificacao.empilhamentos)
        : null)
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
    this.modificacoesItemCustom.set([]);
    this.catalogoAberto.set(false);
    this.criandoItem.set(true);
  }

  protected cancelarCriarItem(): void {
    this.criandoItem.set(false);
    this.categoriaItemSelectAberta.set(false);
    this.modificacoesItemCustom.set([]);
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
      ...(this.modificacoesItemCustom().length ? { modificacoes: this.modificacoesItemCustom() } : {}),
    }).pipe(finalize(() => this.operando.set(false))).subscribe((resultado) => {
      this.atualizado.emit(resultado.itens);
      this.cancelarCriarItem();
    });
  }

  protected adicionar(
    item: ItemCatalogo,
    modificacoes: readonly ModificacaoAplicadaDto[] = [],
    categoria = this.categoriaSelecionada(),
  ): void {
    if (this.somenteLeitura() || this.operando()) return;
    this.operando.set(true);
    this.campanhaService.adicionarItemInventario(this.campanhaId(), {
      nome: item.nome, categoria, custo: item.custo, peso: item.peso,
      quantidade: 1, descricao: item.descricao, dano: item.dano, informacao: item.informacao,
      resistencia: item.resistencia, bonus: item.bonus,
      ...(modificacoes.length ? { modificacoes } : {}),
    }).pipe(finalize(() => this.operando.set(false))).subscribe((resultado) => {
      this.atualizado.emit(resultado.itens);
      this.itemAdicionado.set(item.nome);
      setTimeout(() => {
        if (this.itemAdicionado() === item.nome) this.itemAdicionado.set(null);
      }, 900);
    });
  }

  protected abrirConfiguracaoCatalogo(item: ItemCatalogo): void {
    if (this.somenteLeitura() || this.operando()) return;
    this.configuracaoModificacoes.set({
      origem: 'catalogo',
      itemCatalogo: item,
      item: this.criarRascunho({ ...item, categoria: this.categoriaSelecionada(), quantidade: 1 }),
    });
  }

  protected abrirConfiguracaoItemCustom(): void {
    if (this.somenteLeitura() || this.itemCustomForm.invalid || this.operando()) return;
    const bruto = this.itemCustomForm.getRawValue();
    this.configuracaoModificacoes.set({
      origem: 'custom',
      item: this.criarRascunho({
        nome: bruto.nome.trim(), categoria: bruto.categoria, custo: Math.max(0, bruto.custo), peso: Math.max(0, bruto.peso),
        quantidade: Math.max(1, bruto.quantidade), descricao: bruto.descricao.trim() || undefined,
        dano: bruto.dano.trim() || undefined, informacao: bruto.informacao.trim() || undefined,
        resistencia: bruto.resistencia.trim() || undefined, bonus: bruto.bonus.trim() || undefined,
        modificacoes: this.modificacoesItemCustom(),
      }),
    });
  }

  protected adicionarModificacao(modificacao: ModificacaoDados): void {
    const configuracao = this.configuracaoModificacoes();
    if (!configuracao) return;
    const atual = configuracao.item.modificacoes.find(({ nome }) => nome === modificacao.nome);
    if (atual) {
      if (atual.empilhamentos >= modificacao.empilhamentoMaximo) return;
      this.definirModificacoesConfiguracao(configuracao.item.modificacoes.map((item) => item.nome === modificacao.nome
        ? { ...item, empilhamentos: item.empilhamentos + 1 }
        : item));
      return;
    }
    if (verificarConflitoModificacao({ item: configuracao.item, modificacao: modificacao.nome }).bloqueada) return;
    this.definirModificacoesConfiguracao([
      ...configuracao.item.modificacoes,
      { nome: modificacao.nome, empilhamentos: modificacao.empilhamentosIniciais },
    ]);
  }

  protected removerModificacao(modificacao: ModificacaoDados): void {
    const configuracao = this.configuracaoModificacoes();
    if (!configuracao) return;
    const atual = configuracao.item.modificacoes.find(({ nome }) => nome === modificacao.nome);
    if (!atual) return;
    this.definirModificacoesConfiguracao(atual.empilhamentos > modificacao.empilhamentosIniciais
      ? configuracao.item.modificacoes.map((item) => item.nome === modificacao.nome
        ? { ...item, empilhamentos: item.empilhamentos - 1 }
        : item)
      : configuracao.item.modificacoes.filter((item) => item.nome !== modificacao.nome));
  }

  protected quantidadeModificacao(modificacao: ModificacaoDados): number {
    return this.modificacoesEmConfiguracao().find(({ nome }) => nome === modificacao.nome)?.empilhamentos ?? 0;
  }

  protected conflitoModificacao(modificacao: ModificacaoDados): boolean {
    const configuracao = this.configuracaoModificacoes();
    return !!configuracao && !this.quantidadeModificacao(modificacao)
      && verificarConflitoModificacao({ item: configuracao.item, modificacao: modificacao.nome }).bloqueada;
  }

  protected confirmarModificacoes(): void {
    const configuracao = this.configuracaoModificacoes();
    if (!configuracao) return;
    if (configuracao.origem === 'catalogo' && configuracao.itemCatalogo) {
      this.configuracaoModificacoes.set(null);
      this.adicionar(configuracao.itemCatalogo, configuracao.item.modificacoes, configuracao.item.categoria);
      return;
    }
    this.modificacoesItemCustom.set(configuracao.item.modificacoes);
    this.configuracaoModificacoes.set(null);
  }

  protected cancelarConfiguracaoModificacoes(): void {
    this.configuracaoModificacoes.set(null);
  }

  private definirModificacoesConfiguracao(modificacoes: readonly ModificacaoAplicadaDto[]): void {
    this.configuracaoModificacoes.update((configuracao) => configuracao ? {
      ...configuracao,
      item: { ...configuracao.item, modificacoes },
    } : null);
  }

  private criarRascunho(item: DadosItemRascunho): CarrinhoItemDto {
    return {
      nome: item.nome,
      categoria: item.categoria,
      custo: item.custo,
      peso: item.peso,
      quantidade: item.quantidade,
      guardada: true,
      modificacoes: item.modificacoes ?? [],
      ...(item.descricao ? { descricao: item.descricao } : {}),
      ...(item.dano ? { dano: item.dano } : {}),
      ...(item.informacao ? { informacao: item.informacao } : {}),
      ...(item.resistencia ? { resistencia: item.resistencia } : {}),
      ...(item.bonus ? { bonus: item.bonus } : {}),
    };
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
