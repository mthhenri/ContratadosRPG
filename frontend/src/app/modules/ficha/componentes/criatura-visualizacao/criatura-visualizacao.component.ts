import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  CadenciaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  ComportamentoCriaturaEnum,
  PorteCriaturaEnum,
  RolagemVisibilidadeEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaDeslocamentoDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaIdentidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaRegeneracaoDto,
  FichaCriaturaResistenciaDto,
  FichaImagemFocoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  calcularAtributoEfetivo,
  calcularLimiteResistencias,
  calcularValorModificador,
  somarResistenciasCriaturaPorTipo,
  validarFichaCriatura,
} from '@contratados-rpg/shared/regras/criatura';

import { TemaService, hexParaHsl } from '../../../../core/services/tema.service';
import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { Icone } from '../../../../shared/icone/icone.component';
import { ReceberDanoDialog } from '../../../../shared/receber-dano/receber-dano-dialog.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { AbaPainel } from '../../../../shared/ui/abas/aba-painel.directive';
import { Aba } from '../../../../shared/ui/abas/aba.component';
import { Abas } from '../../../../shared/ui/abas/abas.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { rolarAtaqueCriatura, rolarTesteAtaqueCriatura, rolarTesteAtributoCriatura } from '../../criatura-rolagem';
import type { AjusteCriaturaVitalidade } from '../../ficha-edicao-criatura.service';
import {
  dimensaoPorte,
  multiplicadorTenacidade,
  nomeCadencia,
  nomePorte,
  nomeTenacidade,
  ritmoCadencia,
  rotuloCadencia,
  rotuloComportamento,
  rotuloModificadorCriatura,
  rotuloNivelAmeaca,
  rotuloOrigemCriatura,
  rotuloPorte,
  rotuloRegeneracaoIntensidade,
  rotuloRegeneracaoModo,
  rotuloTenacidade,
} from '../../rotulos-criatura';
import { CriaturaResistenciaLista } from '../criatura-resistencia-lista/criatura-resistencia-lista.component';
import { CriaturaAtaqueLista } from '../criatura-ataque-lista/criatura-ataque-lista.component';
import { CriaturaHabilidadeLista } from '../criatura-habilidade-lista/criatura-habilidade-lista.component';
import { AjusteEnquadramentoImagem } from '../ajuste-enquadramento-imagem/ajuste-enquadramento-imagem.component';

/** As dez chaves de `FichaAtributosDto`, mesmo apelido do análogo em `FichaVisualizacao`. */
type ChaveAtributo = keyof FichaAtributosDto;

/** Rótulo dos dez atributos (mesma grafia do assistente de criação, `criar-criatura.page.ts`). Os
 * cinco primeiros são os "Atributos Físicos" e os cinco últimos os "Atributos Mentais"
 * (`sistema-v4.1.0.md`) — a ordem já nasce agrupada, então a grade da coluna de Atributos só
 * fatia o array em dois, sem tabela de grupo nova. As abreviações são as mesmas três letras dos
 * boxes de `FichaVisualizacao` (ficha de jogador) — o card do mockup mostra só a sigla, com o nome
 * inteiro na dica. */
const CAMPOS_ATRIBUTO: readonly { readonly chave: ChaveAtributo; readonly abrev: string; readonly nome: string }[] = [
  { chave: 'destreza', abrev: 'DES', nome: 'Destreza' }, { chave: 'forca', abrev: 'FOR', nome: 'Força' },
  { chave: 'luta', abrev: 'LUT', nome: 'Luta' }, { chave: 'pontaria', abrev: 'PON', nome: 'Pontaria' },
  { chave: 'vigor', abrev: 'VIG', nome: 'Vigor' }, { chave: 'intelecto', abrev: 'INT', nome: 'Intelecto' },
  { chave: 'medicina', abrev: 'MED', nome: 'Medicina' }, { chave: 'sentidos', abrev: 'SEN', nome: 'Sentidos' },
  { chave: 'social', abrev: 'SOC', nome: 'Social' }, { chave: 'vontade', abrev: 'VON', nome: 'Vontade' },
];

/** Os dez atributos partidos nos dois grupos que a tela desenha (5 + 5) — mesmo formato de
 * `FichaVisualizacao.gruposAtributos`, que o template usa pra emitir um rótulo de grupo e uma grade
 * por vez (blocos `@if` não podem abrir/fechar `<div>` no meio de um `@for`). */
const GRUPOS_ATRIBUTO = [
  { rotulo: 'Físicos', campos: CAMPOS_ATRIBUTO.slice(0, 5) },
  { rotulo: 'Mentais', campos: CAMPOS_ATRIBUTO.slice(5) },
] as const;

/** Aba ativa da coluna de Status. `'informacoes'` virou `'geral'` (Cadência/Bônus de
 * Iniciativa/Deslocamento na mesma linha + Regeneração) + `'descricao'` (Descrição/Gancho/
 * Motivação/Natureza Física/Tema de Horror/Anotações); `'ataques'` (era combinada com
 * Habilidades) virou `'ataques'` + `'habilidades'`, um componente autocontido por aba. */
type AbaCriatura = 'geral' | 'descricao' | 'ataques' | 'habilidades';

const ABAS_CRIATURA: readonly AbaCriatura[] = ['geral', 'descricao', 'ataques', 'habilidades'];

/**
 * Valor exibido no `<input type="color">` do avatar enquanto a ficha não tem `cor` definida —
 * mesmo hex/racional de `FichaVisualizacao`'s `COR_FICHA_PADRAO` (não importado de lá de
 * propósito: os dois componentes ficam desacoplados, mesma convenção já usada por
 * `GRUPOS_ATRIBUTO` acima). Não persiste sozinho — a ficha só ganha cor quando o mestre escolhe.
 */
const COR_FICHA_PADRAO = '#d53030';

/**
 * A **ficha de criatura** numa tela só (m4-04b) — edição no próprio lugar, campo a campo,
 * mirror de `FichaVisualizacao` mas para o documento (bem menor) `FichaCriaturaDadosDto`
 * (`m4-01`). Sem abas: o documento não tem inventário/combos/rolagens-preset/sanidade — todas
 * as seções cabem numa coluna rolável.
 */
@Component({
  selector: 'app-criatura-visualizacao',
  imports: [
    Botao,
    Campo,
    Chip,
    Icone,
    Tooltip,
    AutoFocus,
    ReactiveFormsModule,
    BandejaDados,
    CriaturaResistenciaLista,
    CriaturaAtaqueLista,
    CriaturaHabilidadeLista,
    AjusteEnquadramentoImagem,
    FocoImagem,
    ReceberDanoDialog,
    Abas,
    Aba,
    AbaPainel,
  ],
  templateUrl: './criatura-visualizacao.component.html',
  styleUrl: './criatura-visualizacao.component.scss',
})
export class CriaturaVisualizacao {
  private readonly bandeja = inject(BandejaDadosService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);
  private readonly tema = inject(TemaService);

  readonly fichaId = input.required<number>();
  readonly nome = input.required<string>();
  readonly cor = input<string | null>(null);
  readonly imagemUrl = input<string | null>(null);
  /** Enquadramento do avatar (pan/zoom, ajuste pós-mockup) — ver {@link FichaImagemFocoDto}. */
  readonly foco = input<FichaImagemFocoDto | null>(null);
  readonly oculta = input.required<boolean>();
  readonly dados = input.required<FichaCriaturaDadosDto>();
  /** Dono (mestre) edita; visualizador revelado é só-leitura — mesmo sinal de `FichaVisualizacao.ajustavel`. */
  readonly ajustavel = input.required<boolean>();

  readonly vitalidadeMudou = output<AjusteCriaturaVitalidade>();
  readonly defesaMudou = output<number>();
  readonly identidadeMudou = output<FichaCriaturaIdentidadeDto>();
  readonly naMudou = output<NivelAmeacaEnum>();
  readonly vdMudou = output<number>();
  readonly atributosMudou = output<FichaAtributosDto>();
  readonly modificadoresMudou = output<FichaCriaturaModificadoresDto>();
  readonly tenacidadeMudou = output<TenacidadeEnum>();
  readonly resistenciasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly fraquezasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly regeneracaoMudou = output<FichaCriaturaRegeneracaoDto | undefined>();
  readonly porteMudou = output<PorteCriaturaEnum>();
  readonly deslocamentoMudou = output<FichaCriaturaDeslocamentoDto>();
  readonly cadenciaMudou = output<CadenciaEnum>();
  readonly turnosPorRodadaMudou = output<number>();
  readonly iniciativaBonusMudou = output<number | undefined>();
  readonly ataquesMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  readonly habilidadesMudou = output<readonly FichaCriaturaHabilidadeDto[]>();
  readonly anotacoesMudou = output<string>();
  readonly nomeMudou = output<string>();
  readonly corMudou = output<string | null>();
  readonly ocultaMudou = output<boolean>();
  readonly imagemMudou = output<File>();
  readonly removerImagem = output<void>();
  /** Novo enquadramento do avatar — a página persiste `ficha.imagemFoco`. */
  readonly focoMudou = output<FichaImagemFocoDto | null>();

  /** Cor de identidade visual do avatar — mesmo padrão de `FichaVisualizacao.corFichaForm`. */
  protected readonly corCriaturaForm = new FormControl<string>(COR_FICHA_PADRAO, { nonNullable: true });

  /** Badge do cabeçalho — mesmo formato de `FichaVisualizacao.classificacao` (zero-padded a 4). */
  protected readonly classificacao = computed(() => `FICHA-CRT-${String(this.fichaId()).padStart(4, '0')}`);

  constructor() {
    // Sincroniza o picker com a cor persistida (troca de criatura exibida).
    effect(() => {
      const corAtual = this.cor() ?? COR_FICHA_PADRAO;
      if (this.corCriaturaForm.value !== corAtual) {
        this.corCriaturaForm.setValue(corAtual, { emitEvent: false });
      }
    });
    this.corCriaturaForm.valueChanges.subscribe((cor) => this.confirmarCor(cor));
  }

  protected readonly gruposAtributos = GRUPOS_ATRIBUTO;
  protected readonly origens = Object.values(OrigemCriaturaEnum) as OrigemCriaturaEnum[];
  protected readonly comportamentos = Object.values(ComportamentoCriaturaEnum) as ComportamentoCriaturaEnum[];
  protected readonly niveisAmeaca = Object.values(NivelAmeacaEnum) as NivelAmeacaEnum[];
  /** Mesmos 4 tipos, do menor pro maior bônus — mesma ordem/uso das barrinhas de sinal do
   * assistente de criação (`criar-criatura.page.ts`), pra que o controle cresça da esquerda pra
   * direita e a criatura mantenha os dois lugares onde o Modificador aparece visualmente iguais. */
  protected readonly modificadoresPorNivel = [...(Object.values(ModificadorCriaturaEnum) as ModificadorCriaturaEnum[])].reverse();
  protected readonly tenacidades = Object.values(TenacidadeEnum) as TenacidadeEnum[];
  protected readonly portes = Object.values(PorteCriaturaEnum) as PorteCriaturaEnum[];
  protected readonly cadencias = Object.values(CadenciaEnum) as CadenciaEnum[];
  protected readonly modosRegeneracao = Object.values(RegeneracaoModoEnum) as RegeneracaoModoEnum[];
  protected readonly intensidadesRegeneracao = Object.values(RegeneracaoIntensidadeEnum) as RegeneracaoIntensidadeEnum[];

  protected readonly rotuloOrigemCriatura = rotuloOrigemCriatura;
  protected readonly rotuloComportamento = rotuloComportamento;
  protected readonly rotuloNivelAmeaca = rotuloNivelAmeaca;
  protected readonly rotuloModificadorCriatura = rotuloModificadorCriatura;
  protected readonly rotuloTenacidade = rotuloTenacidade;
  protected readonly rotuloPorte = rotuloPorte;
  protected readonly rotuloCadencia = rotuloCadencia;
  protected readonly rotuloRegeneracaoModo = rotuloRegeneracaoModo;
  protected readonly rotuloRegeneracaoIntensidade = rotuloRegeneracaoIntensidade;
  protected readonly nomeTenacidade = nomeTenacidade;
  protected readonly multiplicadorTenacidade = multiplicadorTenacidade;
  protected readonly nomePorte = nomePorte;
  protected readonly dimensaoPorte = dimensaoPorte;
  protected readonly nomeCadencia = nomeCadencia;
  protected readonly ritmoCadencia = ritmoCadencia;

  /** Aba ativa da coluna de Status (Geral / Descrição / Ataques / Habilidades) — mesmo padrão de
   * `FichaVisualizacao.abaStatusEfetiva`, sem persistência (a criatura não tem HUD mobile próprio). */
  private readonly abaSelecionada = signal<AbaCriatura>('geral');

  protected abaAtiva(): AbaCriatura {
    return this.abaSelecionada();
  }

  protected selecionarAba(aba: AbaCriatura): void {
    this.abaSelecionada.set(aba);
  }

  /** `(navegou)` do `app-abas`: setas/Home/End já ativam a aba, como o clique. */
  protected aoNavegarAba(valor: string): void {
    const aba = ABAS_CRIATURA.find((candidata) => candidata === valor);
    if (aba) this.selecionarAba(aba);
  }

  /**
   * Rascunho da coluna de Atributos — mesmo gatilho/fluxo do lápis de `FichaVisualizacao` ("Editar
   * atributos" → rascunho → Salvar/Cancelar). Em leitura, o card é a grade compacta do mockup
   * (sigla + valor + efetivo); ligado, vira uma lista vertical com o valor digitável e as
   * barrinhas de Modificador (controles bem mais largos que um card de ~100px — dentro da grade
   * estouravam a coluna).
   *
   * Por que rascunho e não emitir a cada clique: a distribuição de Modificadores é uma **cota
   * fixa** (2 Forte / 3 Médio / 3 Fraco / 2 Frágil, `shared/regras/criatura`), então qualquer
   * troca isolada deixa a ficha inválida e o backend recusa a gravação inteira. Editando um
   * rascunho, o mestre rearranja quantos quiser e só grava quando a distribuição fecha.
   */
  private readonly rascunhoAtributos = signal<FichaAtributosDto | null>(null);
  private readonly rascunhoModificadores = signal<FichaCriaturaModificadoresDto | null>(null);

  protected atributosEmEdicao(): boolean {
    return this.rascunhoAtributos() !== null;
  }

  protected atributoRascunho(chave: ChaveAtributo): number {
    return (this.rascunhoAtributos() ?? this.dados().atributos)[chave];
  }

  protected modificadorRascunho(chave: ChaveAtributo): ModificadorCriaturaEnum {
    return (this.rascunhoModificadores() ?? this.dados().modificadores)[chave];
  }

  protected editarAtributos(): void {
    this.rascunhoAtributos.set({ ...this.dados().atributos });
    this.rascunhoModificadores.set({ ...this.dados().modificadores });
    this.cancelarEdicao();
  }

  protected cancelarAtributos(): void {
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadores.set(null);
  }

  protected definirAtributoRascunho(chave: ChaveAtributo, valor: number): void {
    const atual = this.rascunhoAtributos();
    if (atual && Number.isFinite(valor)) {
      this.rascunhoAtributos.set({ ...atual, [chave]: Math.max(0, valor) });
    }
  }

  protected definirModificadorRascunho(chave: ChaveAtributo, valor: ModificadorCriaturaEnum): void {
    const atual = this.rascunhoModificadores();
    if (atual) {
      this.rascunhoModificadores.set({ ...atual, [chave]: valor });
    }
  }

  /**
   * Violações da distribuição de Modificadores no rascunho — reusa `validarFichaCriatura` (a mesma
   * regra que o backend roda antes de gravar) em vez de copiar a tabela de quantidades pra cá, e
   * filtra só as linhas de modificador pra não travar o salvamento por alguma incoerência
   * pré-existente de outra seção da ficha.
   */
  protected readonly violacoesModificadores = computed<readonly string[]>(() => {
    const modificadores = this.rascunhoModificadores();
    if (!modificadores) {
      return [];
    }
    return validarFichaCriatura({ ...this.dados(), modificadores }).violacoes.filter(
      (violacao: string) => violacao.startsWith('modificadores:'),
    );
  });

  protected salvarAtributos(): void {
    const atributos = this.rascunhoAtributos();
    const modificadores = this.rascunhoModificadores();
    if (!atributos || !modificadores || this.violacoesModificadores().length) {
      return;
    }
    this.confirmarAtributos(atributos);
    this.confirmarModificadores(modificadores);
    this.cancelarAtributos();
  }

  /**
   * Modo de edição dos chips de classificação (Origem/Porte/Comportamento/NA) — mesmo racional:
   * trocar um chip por um `<select>` de largura diferente fazia a linha inteira saltar. Ligado, os
   * quatro viram selects de uma vez numa grade estável; desligado, voltam a ser chips de leitura.
   */
  private readonly editandoClassificacao = signal(false);

  protected classificacaoEmEdicao(): boolean {
    return this.editandoClassificacao();
  }

  protected alternarEdicaoClassificacao(): void {
    this.editandoClassificacao.update((valor) => !valor);
  }

  /** Chave (única, tipo `secao.campo`) do campo em edição no-próprio-lugar — `null` = nenhum. */
  private readonly campoEmEdicao = signal<string | null>(null);

  /** Estado do dialog "Receber dano" (m7-17). */
  protected readonly receberDanoAberto = signal(false);

  /**
   * `dados().resistencias` remapeada para o `resistenciasFicha` do dialog "Receber dano" — a lista
   * da criatura carrega `subtipo` (não usado aqui) e pode ter mais de uma linha por tipo; soma as
   * repetidas via `somarResistenciasCriaturaPorTipo` (mesma função que o mapper do encontro usa
   * pro cartão da Iniciativa, m7-17).
   */
  protected readonly resistenciasParaReceberDano = computed<Partial<Record<TipoDanoEnum, number>>>(
    () => somarResistenciasCriaturaPorTipo(this.dados().resistencias),
  );

  /** Abate o total já efetivo do dialog "Receber dano" (m7-17) — mesmo canal de `ajustarVida`. */
  protected receberDano(total: number): void {
    this.ajustarVida(-total);
  }

  protected editando(chave: string): boolean {
    return this.campoEmEdicao() === chave;
  }

  protected editar(chave: string): void {
    this.campoEmEdicao.set(chave);
  }

  protected cancelarEdicao(): void {
    this.campoEmEdicao.set(null);
  }

  /**
   * Limite de pontos de Resistência disponível para `resistencias` (`2×VD`, +25% por Fraqueza
   * extra além da 1ª — `shared/regras/criatura`). `quantidadeFraquezasExtras` conta só a partir
   * da 2ª fraqueza (a 1ª é obrigatória e não soma bônus).
   */
  protected readonly limiteResistencias = computed(() =>
    calcularLimiteResistencias({
      vd: this.dados().vd,
      quantidadeFraquezasExtras: Math.max(0, this.dados().fraquezas.length - 1),
    }),
  );

  /** Atributo Efetivo = valor final + modificador (usado em testes/ataques) — nunca reimplementado aqui. */
  protected atributoEfetivo(chave: ChaveAtributo): number {
    const dados = this.dados();
    return calcularAtributoEfetivo({
      atributoFinal: dados.atributos[chave],
      modificador: dados.modificadores[chave],
      vd: dados.vd,
    });
  }

  /** Valor puro do Modificador (sem somar o Atributo Final) — é este número, não o Atributo
   * Efetivo, que o card de leitura exibe: somar o atributo ali duplicava a mesma informação já
   * mostrada no valor grande e nunca corresponde ao bônus de fato aplicado num teste
   * (`rolarTesteAtributoCriatura` soma só isto ao resultado, nunca o Atributo Efetivo). */
  protected modificadorValor(chave: ChaveAtributo): number {
    const dados = this.dados();
    return calcularValorModificador({ tipo: dados.modificadores[chave], vd: dados.vd });
  }

  /** Nível 1 (Frágil) a 4 (Forte) do Modificador — mesma ordem/uso de `modificadoresPorNivel`,
   * dirige a progressão de cor do card de leitura (`data-nivel` no template). */
  protected nivelModificador(chave: ChaveAtributo): number {
    return this.modificadoresPorNivel.indexOf(this.dados().modificadores[chave]) + 1;
  }

  /**
   * Ponta "fraca" da progressão de cor do Modificador (Forte = `--accent` do tema do site cheio →
   * Frágil = este valor). Normalmente `null` — o CSS já mistura `--accent` até `--text-mute` (o
   * cinza do tema). Só quando o `--accent` selecionado nas configurações é ele mesmo acromático
   * (preset "Cinza" de `TemaService`) esta função devolve preto/branco puro: misturar cinza-com-
   * cinza não produz gradiente visível, então a ponta se afasta para o extremo que mais contrasta
   * com a cor de origem (a mais clara vai a preto, a mais escura vai a branco).
   */
  protected readonly modificadorCorFraca = computed<string | null>(() => {
    const [, saturacao, luminosidade] = hexParaHsl(this.tema.accentAplicado());
    if (saturacao >= 0.12) {
      return null;
    }
    return luminosidade < 0.5 ? '#ffffff' : '#000000';
  });

  protected ajustarVida(delta: number): void {
    const valor = Math.max(0, this.dados().vidaAtual + delta);
    this.vitalidadeMudou.emit({ campo: 'vidaAtual', valor });
  }

  protected ajustarVidaMaxima(valor: number): void {
    this.vitalidadeMudou.emit({ campo: 'vidaMaxima', valor });
  }

  /** Entrada direta (não-delta) de Vida atual — clique-para-editar, ao lado do stepper +/−. */
  protected confirmarVidaAtual(valor: number): void {
    this.vitalidadeMudou.emit({ campo: 'vidaAtual', valor: Math.max(0, valor) });
  }

  protected confirmarDefesa(valor: number): void {
    this.defesaMudou.emit(valor);
  }

  protected confirmarIdentidade(identidade: FichaCriaturaIdentidadeDto): void {
    this.identidadeMudou.emit(identidade);
  }

  /** Confirma um único campo de Identidade — monta o objeto inteiro (`identidadeMudou` é atômico). */
  protected confirmarCampoIdentidade<K extends keyof FichaCriaturaIdentidadeDto>(
    campo: K,
    valor: FichaCriaturaIdentidadeDto[K],
  ): void {
    this.confirmarIdentidade({ ...this.dados().identidade, [campo]: valor });
  }

  protected confirmarNa(na: NivelAmeacaEnum): void {
    this.naMudou.emit(na);
  }

  protected confirmarVd(vd: number): void {
    this.vdMudou.emit(vd);
  }

  protected confirmarAtributos(atributos: FichaAtributosDto): void {
    this.atributosMudou.emit(atributos);
  }

  protected confirmarModificadores(modificadores: FichaCriaturaModificadoresDto): void {
    this.modificadoresMudou.emit(modificadores);
  }

  protected confirmarTenacidade(tenacidade: TenacidadeEnum): void {
    this.tenacidadeMudou.emit(tenacidade);
  }

  protected aoResistenciasMudar(resistencias: readonly FichaCriaturaResistenciaDto[]): void {
    this.resistenciasMudou.emit(resistencias);
  }

  protected aoFraquezasMudar(fraquezas: readonly FichaCriaturaResistenciaDto[]): void {
    this.fraquezasMudou.emit(fraquezas);
  }

  protected confirmarRegeneracao(regeneracao: FichaCriaturaRegeneracaoDto | undefined): void {
    this.regeneracaoMudou.emit(regeneracao);
  }

  /** Ativa a Regeneração (opcional) com valores default — o mestre ajusta cada campo em seguida. */
  protected ativarRegeneracao(): void {
    this.confirmarRegeneracao({
      modo: RegeneracaoModoEnum.PASSIVA,
      intensidade: RegeneracaoIntensidadeEnum.RESIDUAL,
      valor: 0,
      condicao: null,
    });
  }

  protected removerRegeneracao(): void {
    this.confirmarRegeneracao(undefined);
  }

  /** Confirma um único campo de Regeneração — monta o objeto inteiro (`regeneracaoMudou` é atômico). */
  protected confirmarCampoRegeneracao<K extends keyof FichaCriaturaRegeneracaoDto>(
    campo: K,
    valor: FichaCriaturaRegeneracaoDto[K],
  ): void {
    const atual = this.dados().regeneracao;
    if (!atual) {
      return;
    }
    this.confirmarRegeneracao({ ...atual, [campo]: valor });
  }

  protected confirmarPorte(porte: PorteCriaturaEnum): void {
    this.porteMudou.emit(porte);
  }

  protected confirmarDeslocamento(deslocamento: FichaCriaturaDeslocamentoDto): void {
    this.deslocamentoMudou.emit(deslocamento);
  }

  /** Confirma um único modo de Deslocamento — monta o objeto inteiro (`deslocamentoMudou` é atômico). */
  protected confirmarCampoDeslocamento<K extends keyof FichaCriaturaDeslocamentoDto>(
    campo: K,
    valor: FichaCriaturaDeslocamentoDto[K],
  ): void {
    this.confirmarDeslocamento({ ...this.dados().deslocamento, [campo]: valor });
  }

  protected confirmarCadencia(cadencia: CadenciaEnum): void {
    this.cadenciaMudou.emit(cadencia);
  }

  protected confirmarTurnosPorRodada(turnosPorRodada: number): void {
    this.turnosPorRodadaMudou.emit(Math.max(4, Math.trunc(turnosPorRodada)));
  }

  protected confirmarIniciativaBonus(valor: number | undefined): void {
    this.iniciativaBonusMudou.emit(valor);
  }

  protected aoAtaquesMudar(ataques: readonly FichaCriaturaAtaqueDto[]): void {
    this.ataquesMudou.emit(ataques);
  }

  protected aoHabilidadesMudar(habilidades: readonly FichaCriaturaHabilidadeDto[]): void {
    this.habilidadesMudou.emit(habilidades);
  }

  protected confirmarAnotacoes(anotacoes: string): void {
    this.anotacoesMudou.emit(anotacoes);
  }

  protected confirmarNome(nome: string): void {
    this.nomeMudou.emit(nome);
  }

  protected confirmarCor(cor: string | null): void {
    this.corMudou.emit(cor);
  }

  protected alternarOculta(): void {
    this.ocultaMudou.emit(!this.oculta());
  }

  /**
   * Visibilidade das próximas rolagens desta criatura (`FichaRolagemRegistroService`, distinto do
   * `oculta`/`alternarOculta` acima, que é a visibilidade da **ficha inteira**). Nasce `true`
   * (`visualizar-criatura.page.ts` chama `inicializar(..., true)`) — os jogadores não podem ver os
   * testes/danos da Ameaça por padrão.
   */
  protected rolagemOculta(): boolean {
    return this.rolagemRegistro.oculta();
  }

  /** Confirmação pendente pra tornar as rolagens públicas — só ocultar → revelar pede confirmação
   * (revelar de propósito, ex.: "susto" de rolar publicamente pros jogadores verem, é uma decisão
   * deliberada; voltar a ocultar não precisa de trava). */
  protected readonly confirmandoRevelarRolagem = signal(false);

  protected alternarRolagemOculta(): void {
    if (this.rolagemRegistro.oculta()) {
      this.confirmandoRevelarRolagem.set(true);
      return;
    }
    this.rolagemRegistro.alternarOculta();
  }

  protected confirmarRevelarRolagem(): void {
    this.rolagemRegistro.alternarOculta();
    this.confirmandoRevelarRolagem.set(false);
  }

  protected cancelarRevelarRolagem(): void {
    this.confirmandoRevelarRolagem.set(false);
  }

  /**
   * Handler de `(change)` do `<input type="file">` do avatar — sem validação de tamanho/tipo aqui
   * (o `accept` do input já filtra a escolha e `FichaService.alterarImagem` valida no envio). Não
   * emite ainda: abre o seletor de enquadramento (`arquivoPendente`) — mesmo fluxo de
   * `FichaVisualizacao.aoSelecionarImagem`, o upload só acontece ao confirmar o enquadramento.
   */
  protected aoSelecionarImagem(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    (evento.target as HTMLInputElement).value = '';
    if (arquivo) {
      this.arquivoPendente.set(arquivo);
      this.enquadramentoOrigem.set(arquivo);
    }
  }

  /** Enquadramento do avatar (pan/zoom) — mesmo padrão de `FichaVisualizacao`. */
  protected readonly arquivoPendente = signal<File | null>(null);
  protected readonly enquadramentoOrigem = signal<File | string | null>(null);

  protected abrirEnquadramentoExistente(): void {
    const urlAtual = this.imagemUrl();
    if (urlAtual) {
      this.enquadramentoOrigem.set(urlAtual);
    }
  }

  protected confirmarEnquadramento(foco: FichaImagemFocoDto): void {
    const arquivo = this.arquivoPendente();
    if (arquivo) {
      this.imagemMudou.emit(arquivo);
    }
    this.focoMudou.emit(foco);
    this.fecharEnquadramento();
  }

  protected fecharEnquadramento(): void {
    this.enquadramentoOrigem.set(null);
    this.arquivoPendente.set(null);
  }

  /** Rola o dano de um Ataque (`criatura-rolagem.ts`, motor puro) e mostra/registra o resultado.
   * `critico` (ajuste pós-mockup) troca pra `ataque.danoCritico` — fórmula independente escrita
   * pelo Mestre, não o dobro automático de `dano` (todo ataque ganha o botão "Crítico"). */
  protected rolarAtaque(ataque: FichaCriaturaAtaqueDto, critico = false): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarAtaqueCriatura({ atributos: this.dados().atributos }, ataque, critico);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor(), visibilidade: this.rolagemOculta() ? RolagemVisibilidadeEnum.PRIVADA : RolagemVisibilidadeEnum.PUBLICA });
    this.rolagemRegistro.registrar(executada);
  }

  /** Rola um teste do Atributo Efetivo dessa chave e mostra/registra o resultado. */
  protected rolarTesteAtributo(chave: ChaveAtributo): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarTesteAtributoCriatura(this.dados(), chave, `Teste de ${chave}`);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor(), visibilidade: this.rolagemOculta() ? RolagemVisibilidadeEnum.PRIVADA : RolagemVisibilidadeEnum.PUBLICA });
    this.rolagemRegistro.registrar(executada);
  }

  /** Botão "Teste" do card de Ataque — fórmula própria do ataque (`ataque.teste`, ajuste
   * pós-mockup), não mais atrelada a um único atributo da coluna de Atributos: um ataque pode
   * exigir mais dados/testes do que o convencional. */
  protected rolarTesteAtaque(ataque: FichaCriaturaAtaqueDto): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarTesteAtaqueCriatura({ atributos: this.dados().atributos }, ataque);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor(), visibilidade: this.rolagemOculta() ? RolagemVisibilidadeEnum.PRIVADA : RolagemVisibilidadeEnum.PUBLICA });
    this.rolagemRegistro.registrar(executada);
  }
}
