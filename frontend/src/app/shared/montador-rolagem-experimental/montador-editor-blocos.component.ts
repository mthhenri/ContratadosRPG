import { Component, computed, input, output, signal } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import { type FormulaTokenizadaDto, montarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { Icone, type IconeNome } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { Campo } from '../ui/campo/campo.component';
import { CartaoReceita } from '../ui/cartao-receita/cartao-receita.component';
import { type FichaTermoCor, FichaTermo } from '../ui/ficha-termo/ficha-termo.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import {
  BLOCO_VAZIO,
  BLOCOS_MAXIMO_DANO,
  BLOCOS_MAXIMO_LIVRES,
  type BlocoMontador,
  escreverBlocos,
  type FormulaBlocos,
  lerBlocos,
  modoDosBlocos,
} from './montador-blocos';
import { MontadorEditorPecas } from './montador-editor-pecas.component';
import type { AmbienteMontador } from './montador-leitura';
import { type AtalhosDanoMontador, listarAtalhosDisponiveis, type MontadorModo } from './montador-modelo';
import {
  ATRIBUTOS_MONTADOR,
  type DadoExtra,
  FACES_MONTADOR,
  fonteDaSigla,
  FONTES_EXTRA_MONTADOR,
  lerTeste,
  type ManterDado,
  MARGEM_CRITICO_MAXIMA,
  QUANTIDADE_DADOS_MONTADOR,
  REPETICOES_MONTADOR,
  TIPOS_DANO_MONTADOR,
  tipoPadraoDoModo,
} from './montador-pecas';

const ICONE_POR_FACES: Readonly<Record<number, IconeNome>> = {
  3: 'd3',
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

/**
 * Editor da versão **Blocos** do montador (`montador-exp-04`, E3.2): formulário por blocos de dano, sem bandeja de
 * termos. Cada bloco tem o próprio tipo e segundo tipo, uma contagem com sinal por dado, atributos com sinal, bônus
 * fixo e — nos dados livres — opções do bloco; a seção fixa traz Repetir e os atalhos do agente (que vão no início do
 * texto). O teste de atributo é o mesmo editor de teste do Completo (tudo à vista, como na E3.2).
 *
 * O texto da barra continua a fonte de verdade: os blocos são lidos dele (`lerBlocos`) e cada edição escreve o texto
 * inteiro de novo (`escreverBlocos`). Um bloco recém-adicionado e ainda vazio não tem texto — fica só aqui até ganhar
 * conteúdo.
 */
@Component({
  selector: 'app-montador-editor-blocos',
  imports: [
    Botao,
    BotaoIcone,
    Campo,
    CartaoReceita,
    FichaTermo,
    Icone,
    MontadorEditorPecas,
    Segmentado,
    SegmentadoItem,
    StepInput,
    Tooltip,
  ],
  templateUrl: './montador-editor-blocos.component.html',
  styleUrl: './montador-editor-blocos.component.scss',
})
export class MontadorEditorBlocos {
  readonly tokenizada = input.required<FormulaTokenizadaDto>();
  readonly modo = input<MontadorModo | null>(null);
  readonly atalhosDano = input<AtalhosDanoMontador>({});
  readonly ambiente = input.required<AmbienteMontador>();

  readonly editar = output<string>();

  protected readonly faces = FACES_MONTADOR;
  protected readonly fontes = [...ATRIBUTOS_MONTADOR, ...FONTES_EXTRA_MONTADOR];
  protected readonly tiposDano = TIPOS_DANO_MONTADOR;
  protected readonly tiposComposto = TIPOS_DANO_MONTADOR.filter((tipo) => tipo.tipo !== TipoDanoEnum.GERAL);
  protected readonly quantidadeMaxima = QUANTIDADE_DADOS_MONTADOR;
  protected readonly repeticoesMaxima = REPETICOES_MONTADOR;
  protected readonly margens = Array.from({ length: MARGEM_CRITICO_MAXIMA + 1 }, (_, indice) => indice);

  /** Teste de atributo: usa o editor de teste do Completo. */
  protected readonly ehTeste = computed(() => {
    const modo = this.modo();
    if (modo === 'DANO' || modo === 'LIVRE') return lerBlocos(this.tokenizada()) === null && lerTeste(this.tokenizada()) !== null;
    return lerTeste(this.tokenizada()) !== null;
  });

  /** Blocos lidos do texto (vazio = nenhum bloco ainda). */
  private readonly lidos = computed<FormulaBlocos>(
    () => lerBlocos(this.tokenizada()) ?? { blocos: [], atalhos: [], repeticoes: 1 },
  );

  protected readonly modoEfetivo = computed(() => modoDosBlocos(this.lidos(), this.modo()));
  protected readonly limite = computed(() =>
    this.modoEfetivo() === 'DANO' ? BLOCOS_MAXIMO_DANO : BLOCOS_MAXIMO_LIVRES,
  );

  /** Bloco adicionado e ainda vazio — só existe na tela até ganhar conteúdo. */
  private readonly blocoNovo = signal<BlocoMontador | null>(null);

  private blocoPadrao(): BlocoMontador {
    const tipo = tipoPadraoDoModo(this.modoEfetivo());
    return { ...BLOCO_VAZIO, tipo: { primeiro: tipo, segundo: null } };
  }

  /** Blocos na tela: os do texto, mais o novo (ou um vazio quando ainda não há nenhum). */
  protected readonly blocos = computed<readonly BlocoMontador[]>(() => {
    const lidos = this.lidos().blocos;
    const novo = this.blocoNovo();
    if (novo) return [...lidos, novo];
    return lidos.length > 0 ? lidos : [this.blocoPadrao()];
  });

  protected readonly podeAdicionarBloco = computed(
    () => this.blocos().length < this.limite() && this.blocoNovo() === null && this.lidos().blocos.length > 0,
  );

  protected readonly atalhosDisponiveis = computed(() => listarAtalhosDisponiveis(this.atalhosDano()));

  /** Opções do bloco abertas (por índice). */
  protected readonly opcoesAbertas = signal<ReadonlySet<number>>(new Set());

  // ── Apresentação ─────────────────────────────────────────────────────────
  protected iconeDado(faces: number): IconeNome {
    return ICONE_POR_FACES[faces] ?? 'dado';
  }

  protected corDoTipo(tipo: TipoDanoEnum | null): FichaTermoCor | null {
    return this.tiposDano.find((item) => item.tipo === tipo)?.classe ?? null;
  }

  protected subtitulo(indice: number): string {
    if (this.modoEfetivo() === 'DANO') return indice === 0 ? 'dano de arma' : 'segundo tipo de dano';
    return indice === 0 ? 'dados' : 'outro segmento';
  }

  protected valorFonte(sigla: string): number {
    const ambiente = this.ambiente();
    const fonte = fonteDaSigla(sigla);
    if (fonte === 'proficiencia') return ambiente.proficiencia ?? 0;
    if (fonte === 'nivel') return ambiente.nivel;
    return ambiente.atributos[fonte] ?? 0;
  }

  protected nomeFonte(sigla: string): string {
    return this.fontes.find((item) => item.sigla === sigla)?.nome ?? sigla;
  }

  protected contagem(bloco: BlocoMontador, faces: number): number {
    return (bloco.dados as Partial<Record<number, number>>)[faces] ?? 0;
  }

  protected expansaoAtalho(atalho: 'CORPO' | 'FURTIVO'): string | null {
    return (atalho === 'CORPO' ? this.atalhosDano().corpo : this.atalhosDano().furtivo) ?? null;
  }

  protected temFonte(bloco: BlocoMontador, sigla: string): boolean {
    return bloco.fontes.some((fonte) => fonte.sigla === sigla);
  }

  protected podeDividir(bloco: BlocoMontador): boolean {
    return bloco.tipo.primeiro !== null && bloco.tipo.primeiro !== TipoDanoEnum.GERAL;
  }

  protected nomeMargem(margem: number): string {
    return margem === 0 ? 'Sem' : margem === 1 ? 'Máximo' : `${margem} maiores`;
  }

  protected opcoesVisiveis(indice: number): boolean {
    return this.opcoesAbertas().has(indice);
  }

  protected alternarOpcoes(indice: number): void {
    this.opcoesAbertas.update((atual) => {
      const nova = new Set(atual);
      if (nova.has(indice)) nova.delete(indice);
      else nova.add(indice);
      return nova;
    });
  }

  // ── Edição ───────────────────────────────────────────────────────────────
  private vazio(bloco: BlocoMontador): boolean {
    return Object.values(bloco.dados).every((contagem) => !contagem) && bloco.fontes.length === 0 && bloco.bonus === 0;
  }

  /** Escreve o texto com os blocos dados (os vazios não geram texto). */
  private publicar(blocos: readonly BlocoMontador[], extras?: Partial<Pick<FormulaBlocos, 'atalhos' | 'repeticoes'>>): void {
    const lidos = this.lidos();
    const formula: FormulaBlocos = {
      blocos: blocos.filter((bloco) => !this.vazio(bloco)),
      atalhos: extras?.atalhos ?? lidos.atalhos,
      repeticoes: extras?.repeticoes ?? lidos.repeticoes,
    };
    this.editar.emit(montarFormula(escreverBlocos(formula)));
  }

  private alterarBloco(indice: number, mudanca: Partial<BlocoMontador>): void {
    const blocos = this.blocos().map((bloco, posicao) => (posicao === indice ? { ...bloco, ...mudanca } : bloco));
    const lidos = this.lidos().blocos.length;
    const alterado = blocos[indice];
    if (indice >= lidos && this.vazio(alterado)) {
      // Bloco ainda sem conteúdo (ex.: só o tipo mudou): fica só na tela.
      this.blocoNovo.set(alterado);
      return;
    }
    this.blocoNovo.set(null);
    this.publicar(blocos);
  }

  protected definirTipo(indice: number, evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    const bloco = this.blocos()[indice];
    const primeiro = valor ? (valor as TipoDanoEnum) : null;
    const segundo = primeiro && primeiro !== TipoDanoEnum.GERAL && bloco.tipo.segundo !== primeiro ? bloco.tipo.segundo : null;
    this.alterarBloco(indice, { tipo: { primeiro, segundo } });
  }

  protected definirSegundoTipo(indice: number, evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    const bloco = this.blocos()[indice];
    this.alterarBloco(indice, { tipo: { primeiro: bloco.tipo.primeiro, segundo: valor ? (valor as TipoDanoEnum) : null } });
  }

  protected definirContagem(indice: number, faces: number, contagem: number): void {
    const bloco = this.blocos()[indice];
    this.alterarBloco(indice, { dados: { ...bloco.dados, [faces]: contagem } });
  }

  protected alternarFonte(indice: number, sigla: string): void {
    const bloco = this.blocos()[indice];
    const fontes = this.temFonte(bloco, sigla)
      ? bloco.fontes.filter((fonte) => fonte.sigla !== sigla)
      : [...bloco.fontes, { sigla, sinal: 1 as const }];
    this.alterarBloco(indice, { fontes });
  }

  protected alternarSinalFonte(indice: number, sigla: string): void {
    const bloco = this.blocos()[indice];
    const fontes = bloco.fontes.map((fonte) =>
      fonte.sigla === sigla ? { ...fonte, sinal: (fonte.sinal === 1 ? -1 : 1) as 1 | -1 } : fonte,
    );
    this.alterarBloco(indice, { fontes });
  }

  protected definirBonus(indice: number, bonus: number): void {
    this.alterarBloco(indice, { bonus });
  }

  protected definirOpcoes(indice: number, opcoes: { manter?: ManterDado; extra?: DadoExtra; margem?: number }): void {
    this.alterarBloco(indice, opcoes);
  }

  protected adicionarBloco(): void {
    if (!this.podeAdicionarBloco()) return;
    this.blocoNovo.set(this.blocoPadrao());
  }

  protected removerBloco(indice: number): void {
    if (indice >= this.lidos().blocos.length) {
      this.blocoNovo.set(null);
      return;
    }
    this.publicar(this.lidos().blocos.filter((_, posicao) => posicao !== indice));
  }

  protected definirRepeticoes(repeticoes: number): void {
    this.publicar(this.lidos().blocos, { repeticoes });
  }

  protected alternarAtalho(atalho: 'CORPO' | 'FURTIVO'): void {
    const atuais = this.lidos().atalhos;
    const atalhos = atuais.includes(atalho) ? atuais.filter((item) => item !== atalho) : [...atuais, atalho];
    this.publicar(this.lidos().blocos, { atalhos });
  }

  protected temAtalho(atalho: 'CORPO' | 'FURTIVO'): boolean {
    return this.lidos().atalhos.includes(atalho);
  }

  protected repeticoes(): number {
    return this.lidos().repeticoes;
  }
}
