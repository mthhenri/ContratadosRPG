import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';

import { SeveridadeLesaoEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaLesaoDto,
  FichaSequelaDto,
  FichaTraumaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';

/** As três listas de Sanidade do `estado`, emitidas juntas a cada mutação (a página persiste o trio). */
export interface EstadoSanidade {
  readonly sequelas: readonly FichaSequelaDto[];
  readonly traumas: readonly FichaTraumaDto[];
  readonly lesoes: readonly FichaLesaoDto[];
}

/** Qual das três listas um editor aberto está tocando. */
type ListaSanidade = 'sequela' | 'trauma' | 'lesao';

/** Atributo afetável por lesão — chave do documento + rótulo legível para o `<select>`. */
interface OpcaoAtributo {
  readonly chave: keyof FichaAtributosDto;
  readonly nome: string;
}

/** Severidade + rótulo + pontos de origem (sugestão ao trocar — `sistema-v4.1.0.md`, não trava). */
interface OpcaoSeveridade {
  readonly valor: SeveridadeLesaoEnum;
  readonly rotulo: string;
  readonly pontos: number;
}

const ATRIBUTOS: readonly OpcaoAtributo[] = [
  { chave: 'destreza', nome: 'Destreza' },
  { chave: 'forca', nome: 'Força' },
  { chave: 'luta', nome: 'Luta' },
  { chave: 'pontaria', nome: 'Pontaria' },
  { chave: 'vigor', nome: 'Vigor' },
  { chave: 'intelecto', nome: 'Intelecto' },
  { chave: 'medicina', nome: 'Medicina' },
  { chave: 'sentidos', nome: 'Sentidos' },
  { chave: 'social', nome: 'Social' },
  { chave: 'vontade', nome: 'Vontade' },
];

const SEVERIDADES: readonly OpcaoSeveridade[] = [
  { valor: SeveridadeLesaoEnum.LEVE, rotulo: 'Leve', pontos: 1 },
  { valor: SeveridadeLesaoEnum.GRAVE, rotulo: 'Grave', pontos: 3 },
  { valor: SeveridadeLesaoEnum.MORTAL, rotulo: 'Mortal', pontos: 5 },
];

/** Rótulo singular de cada lista — alimenta o título do diálogo (`apresentacao="dialog"`). */
const ROTULO_LISTA: Record<ListaSanidade, string> = {
  sequela: 'Sequela',
  trauma: 'Trauma',
  lesao: 'Lesão',
};

/**
 * Editor **no próprio lugar** da aba Sanidade (m3-12): as três listas de `estado` — **sequelas**
 * (temporárias), **traumas** (permanentes, tratáveis) e **lesões** (removem pontos de atributo). Cada
 * lista adiciona/edita/remove com um formulário inline (Reactive Forms); um único editor por vez.
 *
 * **Controlado**: as listas vêm sempre dos inputs; cada mutação emite o **trio inteiro** por
 * `sanidadeMudou` e a página persiste otimista (`alterarFicha`, m3-10). Sem estado de lista duplicado
 * aqui — só o rascunho transitório do formulário. **Nenhuma regra trava** (liberdade total, m3-10): o
 * documento sugere pontos por severidade, mas não impede. Estilos só com tokens do tema (proibição #29).
 */
@Component({
  selector: 'app-ficha-sanidade',
  imports: [NgTemplateOutlet, ReactiveFormsModule, HoldRepeat, Icone, OverflowFade, Tooltip, Dialog],
  templateUrl: './ficha-sanidade.component.html',
  styleUrl: './ficha-sanidade.component.scss',
})
export class FichaSanidade {
  readonly sequelas = input.required<readonly FichaSequelaDto[]>();
  readonly traumas = input.required<readonly FichaTraumaDto[]>();
  readonly lesoes = input.required<readonly FichaLesaoDto[]>();
  /** Dono/mestre edita; para os demais é só leitura (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);
  /**
   * `'inline'` (padrão, aba Sanidade & Lesões): o formulário abre dentro da própria lista, como
   * sempre foi. `'dialog'`: abre num `p-dialog` centralizado — pro card de Status (redesenho de
   * comparação visual), cuja coluna é estreita demais pro formulário/botão "+ Adicionar" caber
   * inline sem quebrar. Mesmo estado/lógica dos dois modos; só a moldura do editor muda.
   */
  readonly apresentacao = input<'inline' | 'dialog'>('inline');

  /** Emite as três listas (o trio inteiro) após qualquer mutação — a página persiste. */
  readonly sanidadeMudou = output<EstadoSanidade>();

  protected readonly atributos = ATRIBUTOS;
  protected readonly severidades = SEVERIDADES;

  /** Lista do editor aberto, ou `null` fora de edição. */
  protected readonly listaEmEdicao = signal<ListaSanidade | null>(null);
  /** Índice em edição: `-1` = adicionando um novo item. */
  protected readonly indiceEmEdicao = signal<number>(-1);

  /** Lista com a confirmação de remoção aberta (inline), ou `null`. */
  protected readonly listaRemovendo = signal<ListaSanidade | null>(null);
  /** Índice com a confirmação de remoção aberta. */
  protected readonly indiceRemovendo = signal<number>(-1);

  protected readonly sequelaForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
  });
  protected readonly traumaForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
    tratado: new FormControl(false, { nonNullable: true }),
  });
  protected readonly lesaoForm = new FormGroup({
    atributo: new FormControl<keyof FichaAtributosDto>('vigor', { nonNullable: true }),
    pontos: new FormControl(1, { nonNullable: true }),
    severidade: new FormControl(SeveridadeLesaoEnum.LEVE, { nonNullable: true }),
    permanente: new FormControl(false, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true }),
  });

  protected readonly totalMarcas = computed(
    () => this.sequelas().length + this.traumas().length + this.lesoes().length,
  );

  /** Título do `p-dialog` (`apresentacao="dialog"`) — "Adicionar"/"Editar" + o nome da lista. */
  protected readonly tituloEditor = computed(() => {
    const lista = this.listaEmEdicao();
    if (lista === null) {
      return '';
    }
    const verbo = this.indiceEmEdicao() < 0 ? 'Adicionar' : 'Editar';
    return `${verbo} ${ROTULO_LISTA[lista]}`;
  });

  /** `true` quando o editor aberto é desta lista e deste índice (`-1` = adicionar). */
  protected editando(lista: ListaSanidade, indice: number): boolean {
    return this.listaEmEdicao() === lista && this.indiceEmEdicao() === indice;
  }

  /** Abre o formulário de **adição** de uma lista, semeando os defaults. */
  protected adicionar(lista: ListaSanidade): void {
    this.abrirEditor(lista, -1);
  }

  /** Abre o formulário de **edição**, semeando o item existente. */
  protected editar(lista: ListaSanidade, indice: number): void {
    this.abrirEditor(lista, indice);
  }

  private abrirEditor(lista: ListaSanidade, indice: number): void {
    this.cancelarRemocao();
    this.listaEmEdicao.set(lista);
    this.indiceEmEdicao.set(indice);
    if (lista === 'sequela') {
      const item = indice >= 0 ? this.sequelas()[indice] : null;
      this.sequelaForm.reset({ nome: item?.nome ?? '', descricao: item?.descricao ?? '' });
    } else if (lista === 'trauma') {
      const item = indice >= 0 ? this.traumas()[indice] : null;
      this.traumaForm.reset({
        nome: item?.nome ?? '',
        descricao: item?.descricao ?? '',
        tratado: item?.tratado ?? false,
      });
    } else {
      const item = indice >= 0 ? this.lesoes()[indice] : null;
      this.lesaoForm.reset({
        atributo: item?.atributo ?? 'vigor',
        pontos: item?.pontos ?? 1,
        severidade: item?.severidade ?? SeveridadeLesaoEnum.LEVE,
        permanente: item?.permanente ?? false,
        descricao: item?.descricao ?? '',
      });
    }
  }

  /** Fecha o editor sem alterar. */
  protected cancelar(): void {
    this.listaEmEdicao.set(null);
    this.indiceEmEdicao.set(-1);
  }

  /** Sugere os pontos de origem ao trocar a severidade (documento) — sugestão, não trava. */
  protected sugerirPontos(): void {
    const severidade = this.lesaoForm.controls.severidade.value;
    const opcao = SEVERIDADES.find((item) => item.valor === severidade);
    if (opcao) {
      this.lesaoForm.controls.pontos.setValue(opcao.pontos);
    }
  }

  /** Passo − / + nos pontos da lesão em edição (piso 0, sem teto — liberdade total). */
  protected ajustarPontos(delta: number): void {
    const atual = this.lesaoForm.controls.pontos.value;
    this.lesaoForm.controls.pontos.setValue(Math.max(0, atual + delta));
  }

  /** Confirma o editor aberto: adiciona (índice −1) ou substitui, e emite o trio. */
  protected confirmar(): void {
    const lista = this.listaEmEdicao();
    const indice = this.indiceEmEdicao();
    if (lista === null) {
      return;
    }
    if (lista === 'sequela') {
      if (this.sequelaForm.invalid) {
        return;
      }
      const bruto = this.sequelaForm.getRawValue();
      const item: FichaSequelaDto = { nome: bruto.nome.trim(), ...this.opcionalDescricao(bruto.descricao) };
      this.emitir({ sequelas: this.substituir(this.sequelas(), indice, item) });
    } else if (lista === 'trauma') {
      if (this.traumaForm.invalid) {
        return;
      }
      const bruto = this.traumaForm.getRawValue();
      const item: FichaTraumaDto = {
        nome: bruto.nome.trim(),
        tratado: bruto.tratado,
        ...this.opcionalDescricao(bruto.descricao),
      };
      this.emitir({ traumas: this.substituir(this.traumas(), indice, item) });
    } else {
      const bruto = this.lesaoForm.getRawValue();
      const item: FichaLesaoDto = {
        atributo: bruto.atributo,
        pontos: bruto.pontos,
        severidade: bruto.severidade,
        permanente: bruto.permanente,
        ...this.opcionalDescricao(bruto.descricao),
      };
      this.emitir({ lesoes: this.substituir(this.lesoes(), indice, item) });
    }
    this.cancelar();
  }

  /** `true` quando a confirmação de remoção aberta é desta lista e deste índice. */
  protected removendo(lista: ListaSanidade, indice: number): boolean {
    return this.listaRemovendo() === lista && this.indiceRemovendo() === indice;
  }

  /** Pede confirmação antes de remover — abre a área de confirmação inline (fecha editor aberto). */
  protected pedirRemocao(lista: ListaSanidade, indice: number): void {
    this.cancelar();
    this.listaRemovendo.set(lista);
    this.indiceRemovendo.set(indice);
  }

  /** Fecha a confirmação de remoção sem remover. */
  protected cancelarRemocao(): void {
    this.listaRemovendo.set(null);
    this.indiceRemovendo.set(-1);
  }

  /** Confirma a remoção: remove o item da lista e emite o trio. */
  protected remover(lista: ListaSanidade, indice: number): void {
    if (lista === 'sequela') {
      this.emitir({ sequelas: this.sequelas().filter((_, i) => i !== indice) });
    } else if (lista === 'trauma') {
      this.emitir({ traumas: this.traumas().filter((_, i) => i !== indice) });
    } else {
      this.emitir({ lesoes: this.lesoes().filter((_, i) => i !== indice) });
    }
    this.cancelarRemocao();
    // Se o item removido estava em edição, fecha o editor.
    if (this.listaEmEdicao() === lista) {
      this.cancelar();
    }
  }

  /** Alterna o "tratado" de um trauma **no próprio lugar** (o trauma permanece; só a penalidade cai). */
  protected alternarTratado(indice: number): void {
    const traumas = this.traumas().map((trauma, i) =>
      i === indice ? { ...trauma, tratado: !trauma.tratado } : trauma,
    );
    this.emitir({ traumas });
  }

  /** Efeito derivado de uma lesão ("−N Atributo") — exibição, não persistido. A marca de
   * "permanente" vira o ícone `infinito` no template (mesmo texto sempre cabendo numa linha). */
  protected efeitoLesao(lesao: FichaLesaoDto): string {
    const nome = ATRIBUTOS.find((opcao) => opcao.chave === lesao.atributo)?.nome ?? lesao.atributo;
    return `−${lesao.pontos} ${nome}`;
  }

  /** Rótulo legível da severidade. */
  protected rotuloSeveridade(severidade: SeveridadeLesaoEnum): string {
    return SEVERIDADES.find((opcao) => opcao.valor === severidade)?.rotulo ?? severidade;
  }

  /** Só inclui `descricao` quando há texto (o campo é opcional no contrato). */
  private opcionalDescricao(texto: string): { descricao?: string } {
    const aparado = texto.trim();
    return aparado ? { descricao: aparado } : {};
  }

  /**
   * Substitui o item no índice, ou **insere no topo** quando `indice < 0` (adição): o mais recente
   * fica sempre acima — sequelas/traumas/lesões antigas descem. Editar (índice ≥ 0) mantém a posição.
   */
  private substituir<T>(lista: readonly T[], indice: number, item: T): T[] {
    if (indice < 0) {
      return [item, ...lista];
    }
    return lista.map((atual, i) => (i === indice ? item : atual));
  }

  /** Emite o trio inteiro, com as listas atuais dos inputs para as que não mudaram. */
  private emitir(parcial: Partial<EstadoSanidade>): void {
    this.sanidadeMudou.emit({
      sequelas: parcial.sequelas ?? this.sequelas(),
      traumas: parcial.traumas ?? this.traumas(),
      lesoes: parcial.lesoes ?? this.lesoes(),
    });
  }
}
