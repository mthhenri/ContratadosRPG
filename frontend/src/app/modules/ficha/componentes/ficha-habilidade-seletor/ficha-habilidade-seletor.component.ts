import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '@contratados-rpg/shared/enums';
import {
  ehHabilidadeInicial,
  type GrupoHabilidades,
  type HabilidadeCatalogoItemDto,
  type SubgrupoHabilidades,
} from '@contratados-rpg/shared/regras/agente';

import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { rotuloArquetipo, rotuloClasse } from '../../rotulos-ficha';

/** Rótulo de cada aba (grupo) do seletor. */
const ROTULO_ABA: Record<GrupoHabilidades['id'], string> = {
  gerais: 'Gerais',
  classe: 'Classe',
  arquetipo: 'Arquétipo',
};

const VALORES_CLASSE = new Set<string>(Object.values(ClasseEnum));

/**
 * Seletor **do sistema** (m3-13): navega o catálogo de habilidades (`shared/regras`) por aba
 * (Gerais / Classe / Arquétipo) + **sub-filtro inline** (chips), com o subgrupo da própria ficha
 * destacado e ativo por padrão. O "＋" **adiciona a habilidade direto na ficha** (o seletor
 * permanece aberto) e a marca como "Na ficha"; o "✕" ali mesmo a remove — dá para montar a lista
 * sem fechar o diálogo. Habilidades gerais melhoradas ganham um selo, pois convivem com as do
 * arquétipo na mesma lista.
 *
 * **Sem regra de jogo aqui**: os grupos e a visibilidade (melhoradas só do próprio arquétipo;
 * subclasses nunca cruzam) vêm prontos de `catalogoHabilidades`. Só tokens do tema (proibição #29).
 */
@Component({
  selector: 'app-ficha-habilidade-seletor',
  imports: [ReactiveFormsModule, OverflowFade],
  templateUrl: './ficha-habilidade-seletor.component.html',
  styleUrl: './ficha-habilidade-seletor.component.scss',
})
export class FichaHabilidadeSeletor {
  /** Grupos de filtro já resolvidos para a ficha (`catalogoHabilidades`). */
  readonly grupos = input.required<readonly GrupoHabilidades[]>();
  /** Nomes das habilidades já na ficha — marca os itens como "Na ficha". */
  readonly nomesNaFicha = input<ReadonlySet<string>>(new Set());

  /** Adiciona a habilidade direto na ficha — o seletor permanece aberto. */
  readonly adicionar = output<HabilidadeCatalogoItemDto>();
  /** Remove da ficha (por nome) a habilidade já adicionada. */
  readonly remover = output<string>();
  /** Fecha o seletor. */
  readonly fechar = output<void>();

  /** Aba (grupo) ativa — re-deriva para a primeira aba disponível, gravável no clique. */
  protected readonly abaAtiva = linkedSignal<GrupoHabilidades['id']>(
    () => this.grupos()[0]?.id ?? 'gerais',
  );

  /**
   * Chave do subgrupo ativo (sub-filtro inline). Re-deriva para o subgrupo da ficha (ou o primeiro)
   * sempre que a aba muda; permanece gravável quando o usuário escolhe outro chip.
   */
  protected readonly subgrupoAtivo = linkedSignal<ClasseEnum | ArquetipoEnum | null>(() => {
    const subgrupos = this.grupos().find((grupo) => grupo.id === this.abaAtiva())?.subgrupos ?? [];
    const alvo = subgrupos.find((subgrupo) => subgrupo.ehDaFicha) ?? subgrupos[0];
    return alvo ? alvo.chave : null;
  });

  /** Texto de busca (filtra por nome no escopo ativo). */
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = signal('');

  constructor() {
    this.busca.valueChanges.subscribe((valor) => this.buscaTexto.set(valor));
  }

  protected readonly grupoAtivo = computed(() =>
    this.grupos().find((grupo) => grupo.id === this.abaAtiva()),
  );

  protected readonly subgrupos = computed<readonly SubgrupoHabilidades[]>(
    () => this.grupoAtivo()?.subgrupos ?? [],
  );

  /** Subgrupo em foco — o do sub-filtro ativo, ou o da ficha, ou o primeiro. */
  protected readonly subgrupoSelecionado = computed<SubgrupoHabilidades | undefined>(() => {
    const subgrupos = this.subgrupos();
    return (
      subgrupos.find((subgrupo) => subgrupo.chave === this.subgrupoAtivo()) ??
      subgrupos.find((subgrupo) => subgrupo.ehDaFicha) ??
      subgrupos[0]
    );
  });

  /** Habilidades do subgrupo em foco, filtradas pela busca. */
  protected readonly habilidades = computed<readonly HabilidadeCatalogoItemDto[]>(() => {
    const termo = this.buscaTexto().trim().toLowerCase();
    const lista = this.subgrupoSelecionado()?.habilidades ?? [];
    return termo ? lista.filter((habilidade) => habilidade.nome.toLowerCase().includes(termo)) : lista;
  });

  /** `true` quando a aba tem sub-filtro (Classe/Arquétipo); Gerais tem subgrupo único. */
  protected readonly temSubfiltro = computed(() => this.abaAtiva() !== 'gerais');

  protected rotuloAba(id: GrupoHabilidades['id']): string {
    return ROTULO_ABA[id];
  }

  /** Rótulo legível de um subgrupo (classe/arquétipo/subclasse). */
  protected rotuloSubgrupo(chave: ClasseEnum | ArquetipoEnum | null): string {
    if (chave === null) {
      return 'Gerais';
    }
    return VALORES_CLASSE.has(chave)
      ? rotuloClasse(chave as ClasseEnum)
      : rotuloArquetipo(chave as ArquetipoEnum);
  }

  protected selecionarAba(id: GrupoHabilidades['id']): void {
    this.abaAtiva.set(id);
    this.busca.setValue('');
  }

  protected selecionarSubgrupo(chave: ClasseEnum | ArquetipoEnum | null): void {
    this.subgrupoAtivo.set(chave);
    this.busca.setValue('');
  }

  protected estaNaFicha(nome: string): boolean {
    return this.nomesNaFicha().has(nome);
  }

  /** `true` para uma habilidade geral melhorada — ganha selo por conviver com as do arquétipo. */
  protected ehGeralMelhorada(habilidade: HabilidadeCatalogoItemDto): boolean {
    return habilidade.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA;
  }

  /** `true` para a Habilidade Inicial do arquétipo/subclasse (`shared/regras`) — ganha selo próprio. */
  protected ehInicial(habilidade: HabilidadeCatalogoItemDto): boolean {
    return ehHabilidadeInicial(habilidade.origem, habilidade.nome);
  }

  protected adicionarHabilidade(habilidade: HabilidadeCatalogoItemDto): void {
    this.adicionar.emit(habilidade);
  }

  protected removerHabilidade(nome: string): void {
    this.remover.emit(nome);
  }
}
