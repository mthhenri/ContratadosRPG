import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaResistenciaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  calcularAtributoEfetivo,
  calcularBonusIniciativaSugerido,
  calcularCustoResistencia,
  calcularDefesaBase,
  calcularLimiteResistencias,
  calcularValorRegeneracao,
  calcularVidaMaxima,
  obterBaseELimitePorVd,
  obterDanoReferenciaPorVd,
  possuiContraAtaque,
  sugerirDeslocamentoTerrestre,
  validarFichaCriatura,
  validarFraqueza,
  validarRealocacaoAtributos,
} from '@contratados-rpg/shared/regras/criatura';
import { FichaService } from '../../ficha.service';
import { lerParamRota } from '../../ler-param-rota';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { CampoRotulado } from '../../../../shared/ui/campo/campo.component';
import { Stat } from '../../../../shared/ui/stat/stat.component';
import { StepInput } from '../../../../shared/ui/stepper/step-input.component';
import {
  rotuloCadencia,
  rotuloComportamento,
  rotuloCustoAcao,
  rotuloHabilidadeTipoCriatura,
  rotuloModificadorCriatura,
  rotuloNivelAmeaca,
  rotuloOrigemCriatura,
  rotuloPorte,
  rotuloRegeneracaoIntensidade,
  rotuloRegeneracaoModo,
  rotuloTenacidade,
} from '../../rotulos-criatura';

type ChaveAtributo = keyof FichaAtributosDto;

/** Imagem de registro (mesmos limites validados no backend, `FichaService.alterarImagem`). */
const TIPOS_IMAGEM_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_IMAGEM_BYTES = 2 * 1024 * 1024;

/** Rótulo dos dez atributos (mesma grafia do guia de jogador) — reusa `FichaAtributosDto`, sem redefinir (proibição #21). */
const CAMPOS: readonly { readonly chave: ChaveAtributo; readonly nome: string }[] = [
  { chave: 'destreza', nome: 'Destreza' }, { chave: 'forca', nome: 'Força' }, { chave: 'luta', nome: 'Luta' },
  { chave: 'pontaria', nome: 'Pontaria' }, { chave: 'vigor', nome: 'Vigor' }, { chave: 'intelecto', nome: 'Intelecto' },
  { chave: 'medicina', nome: 'Medicina' }, { chave: 'sentidos', nome: 'Sentidos' }, { chave: 'social', nome: 'Social' },
  { chave: 'vontade', nome: 'Vontade' },
];

/** Distribuição fixa de Modificadores (doc — "Modificadores" > "Distribuição"). Replicada aqui só
 * para feedback de progresso do passo; a validação que persiste é sempre `validarFichaCriatura`
 * (`shared/regras/criatura`), chamada pelo backend antes de gravar (`m4-03`). */
const QUANTIDADE_ESPERADA_MODIFICADOR: Readonly<Record<ModificadorCriaturaEnum, number>> = {
  [ModificadorCriaturaEnum.FRAGIL]: 2, [ModificadorCriaturaEnum.FRACO]: 3,
  [ModificadorCriaturaEnum.MEDIO]: 3, [ModificadorCriaturaEnum.FORTE]: 2,
};

/** Faixa de VD típica por NA (doc — "Definindo o Valor de Desafio (VD)") — só texto de referência
 * não-vinculante ("a VD pode cair fora da faixa típica do NA e isso não é atípico"); nunca usada
 * para validar, só para orientar o passo // Ameaça. */
const VD_TIPICO_POR_NA: Readonly<Record<NivelAmeacaEnum, string>> = {
  [NivelAmeacaEnum.NULA]: 'Variável', [NivelAmeacaEnum.BAIXA]: '5–25', [NivelAmeacaEnum.MEDIA]: '25–50',
  [NivelAmeacaEnum.ALTA]: '50–70', [NivelAmeacaEnum.EXTREMA]: '70–90', [NivelAmeacaEnum.CATASTROFICA]: '90–100',
  [NivelAmeacaEnum.APOCALIPTICA]: '100+',
};

const PASSOS = [
  'Identidade', 'Ameaça', 'Atributos', 'Modificadores', 'Saúde', 'Defesa',
  'Resistências', 'Regeneração', 'Porte e Deslocamento', 'Ataques', 'Habilidades', 'Revisão',
] as const;
type NomePasso = (typeof PASSOS)[number];

type ModificadoresRascunho = Record<ChaveAtributo, ModificadorCriaturaEnum | null>;
const modificadoresVazios = (): ModificadoresRascunho => ({
  destreza: null, forca: null, luta: null, pontaria: null, vigor: null,
  intelecto: null, medicina: null, sentidos: null, social: null, vontade: null,
});

interface LinhaResistencia { readonly tipo: TipoDanoEnum; readonly subtipo: string; readonly valor: number; }
const linhaResistenciaVazia = (): LinhaResistencia => ({ tipo: TipoDanoEnum.FISICO, subtipo: '', valor: 0 });

interface LinhaAtaque {
  readonly nome: string; readonly teste: string; readonly custoAcao: CustoAcaoEnum;
  readonly dano: string; readonly danoCritico: string; readonly area: boolean; readonly efeito: string;
}
const linhaAtaqueVazia = (): LinhaAtaque => ({
  nome: '', teste: '', custoAcao: CustoAcaoEnum.PADRAO, dano: '', danoCritico: '',
  area: false, efeito: '',
});

interface LinhaHabilidade {
  readonly nome: string; readonly tipo: HabilidadeTipoCriaturaEnum; readonly descricao: string; readonly restricao: string;
}
const linhaHabilidadeVazia = (): LinhaHabilidade => ({
  nome: '', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: '', restricao: '',
});

interface EstadoRegeneracao {
  readonly ativa: boolean; readonly modo: RegeneracaoModoEnum; readonly intensidade: RegeneracaoIntensidadeEnum;
  readonly condicao: string;
}
const regeneracaoVazia = (): EstadoRegeneracao => ({
  ativa: false, modo: RegeneracaoModoEnum.PASSIVA, intensidade: RegeneracaoIntensidadeEnum.RESIDUAL, condicao: '',
});

interface EstadoDeslocamento {
  readonly terrestre: number | null; readonly voador: number | null;
  readonly aquatico: number | null; readonly sobrenatural: number | null;
}
const deslocamentoVazio = (): EstadoDeslocamento => ({
  terrestre: null, voador: null, aquatico: null, sobrenatural: null,
});

interface EstadoGuiaCriatura {
  readonly passo: number;
  readonly cor: string | null;
  // Identidade
  readonly designacao: string;
  readonly origem: OrigemCriaturaEnum;
  readonly conceito: string;
  readonly naturezaFisica: string;
  readonly comportamento: ComportamentoCriaturaEnum;
  readonly motivacao: string;
  readonly ganchoUnico: string;
  readonly temaHorror: string;
  // Ameaça
  readonly na: NivelAmeacaEnum;
  readonly vd: number;
  // Atributos
  readonly atributos: FichaAtributosDto;
  // Modificadores
  readonly modificadores: ModificadoresRascunho;
  // Saúde
  readonly tenacidade: TenacidadeEnum | null;
  readonly vidaAtual: number | null;
  // Resistências e Fraquezas
  readonly resistencias: readonly LinhaResistencia[];
  readonly fraquezas: readonly LinhaResistencia[];
  // Regeneração
  readonly regeneracao: EstadoRegeneracao;
  // Porte e Deslocamento
  readonly porte: PorteCriaturaEnum | null;
  readonly deslocamento: EstadoDeslocamento;
  // Ataques
  readonly cadencia: CadenciaEnum;
  readonly turnosPorRodada: number;
  readonly iniciativaBonus: number | null;
  readonly ataques: readonly LinhaAtaque[];
  // Habilidades
  readonly habilidades: readonly LinhaHabilidade[];
  // Revisão
  readonly anotacoes: string;
}

const ESTADO_INICIAL: EstadoGuiaCriatura = {
  passo: 0, cor: null,
  designacao: '', origem: OrigemCriaturaEnum.ORIGINAL, conceito: '', naturezaFisica: '',
  comportamento: ComportamentoCriaturaEnum.CACADORA, motivacao: '', ganchoUnico: '', temaHorror: '',
  na: NivelAmeacaEnum.BAIXA, vd: 0,
  atributos: { destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1, intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1 },
  modificadores: modificadoresVazios(),
  tenacidade: null, vidaAtual: null,
  resistencias: [], fraquezas: [],
  regeneracao: regeneracaoVazia(),
  porte: null, deslocamento: deslocamentoVazio(),
  cadencia: CadenciaEnum.SINGULAR, turnosPorRodada: 1, iniciativaBonus: null, ataques: [],
  habilidades: [],
  anotacoes: '',
};

const paraResistenciaDto = (linha: LinhaResistencia): FichaCriaturaResistenciaDto => ({
  tipo: linha.tipo, subtipo: linha.subtipo.trim() || null, valor: linha.valor,
});
const paraAtaqueDto = (linha: LinhaAtaque): FichaCriaturaAtaqueDto => ({
  nome: linha.nome.trim(), teste: linha.teste.trim(), custoAcao: linha.custoAcao, dano: linha.dano.trim(),
  danoCritico: linha.danoCritico.trim(), area: linha.area,
  ...(linha.efeito.trim() ? { efeito: linha.efeito.trim() } : {}),
});
const paraHabilidadeDto = (linha: LinhaHabilidade): FichaCriaturaHabilidadeDto => ({
  nome: linha.nome.trim(), tipo: linha.tipo, descricao: linha.descricao.trim(),
  ...(linha.restricao.trim() ? { restricao: linha.restricao.trim() } : {}),
});

/**
 * Assistente de criação de criatura (Ameaça) para o mestre (`m4-04`) — trilha vertical +
 * resumo operacional progressivo, mesma filosofia do guia de jogador (`FichaCriar`,
 * `m3-57`/`m3-58`/`m3-59`), mas com o roteiro do "Guia de Criação de Ameaças" em vez do de
 * agente: passos e travas diferentes, nenhum código compartilhado entre os dois guias (a
 * mecânica diverge o bastante para não valer a pena uma abstração comum — mesma lógica de "dois
 * contratos, não um" da m4-01).
 *
 * ── Decisões de abertura desta task ─────────────────────────────────────────────
 * - **Rascunho persistido** (mesmo `GuiaCriacaoRascunhoService` do guia de jogador, ajuste
 *   pós-mockup): a chave leva um `tipo` (`'agente' | 'criatura'`) desde essa mudança — os dois
 *   guias podem ter rascunho pendente na mesma campanha, no mesmo navegador, sem se sobrescrever.
 * - **`nome` da ficha = `designacao`**: o DTO de nível de ficha (`FichaCriaturaCriarDto.nome`)
 *   não tem campo próprio no roteiro do guia — a Designação da Ficha de Identidade já cumpre
 *   esse papel, sem precisar de um segundo campo quase idêntico.
 * - **Sem seleção de "operador responsável"**: dono de criatura é sempre o mestre autenticado
 *   (`FichaCriaturaCriarDto` não tem `usuarioId` — o backend já fixa isso em `m4-03`), então o
 *   guia não precisa (nem pode) escolher em nome de quem a ficha nasce.
 * - **Validação final via `validarFichaCriatura`**: em vez de reimplementar cada regra de
 *   coerência (limite de resistências, mínimo de fraqueza, distribuição de modificadores,
 *   deslocamento) como uma trava de passo separada, o passo // Revisão chama a mesma função de
 *   `shared/regras/criatura` que o backend chama antes de persistir (`m4-03`) — fonte única de
 *   verdade, sem duplicar fórmula (entregável 3 da task).
 */
@Component({
  selector: 'app-criatura-criar',
  imports: [Botao, CampoRotulado, Stat, StepInput, CommonModule, Icone, Tooltip],
  templateUrl: './criar-criatura.page.html',
  styleUrl: './criar-criatura.page.scss',
})
export class CriaturaCriar {
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fichaService = inject(FichaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rascunhos = inject(GuiaCriacaoRascunhoService);

  private readonly campanhaIdRota = lerParamRota(this.rota, 'campanhaId');
  /**
   * `null` sob `/fichas/criatura/nova` (m4-11, criatura avulsa) — sob
   * `/campanhas/:campanhaId/criatura/nova` vem do parâmetro de rota, como sempre. O backend decide
   * quem pode criar sem campanha (mestre de alguma — `FichaService.criarFichaCriatura`); aqui só
   * muda o destino de saída/pós-criação (mesmo padrão de `FichaCriar.campanhaId`, `criar.page.ts`).
   */
  protected readonly campanhaId: number | null =
    this.campanhaIdRota !== null ? Number(this.campanhaIdRota) : null;
  protected readonly passos = PASSOS;
  protected readonly campos = CAMPOS;
  protected readonly tiposDano = Object.values(TipoDanoEnum);
  protected readonly origens = Object.values(OrigemCriaturaEnum);
  protected readonly comportamentos = Object.values(ComportamentoCriaturaEnum);
  protected readonly niveisAmeaca = Object.values(NivelAmeacaEnum);
  protected readonly tenacidades = Object.values(TenacidadeEnum);
  protected readonly portes = Object.values(PorteCriaturaEnum);
  protected readonly cadencias = Object.values(CadenciaEnum);
  protected readonly modificadoresDisponiveis = Object.values(ModificadorCriaturaEnum);
  /** Mesmos 4 tipos, do menor pro maior bônus (ordem inversa de `modificadoresDisponiveis`) —
   * só para os chips de "Atributo Efetivo", que devem crescer da esquerda pra direita. */
  protected readonly modificadoresPorNivel = [...this.modificadoresDisponiveis].reverse();
  protected readonly custosAcao = Object.values(CustoAcaoEnum);
  protected readonly habilidadeTipos = Object.values(HabilidadeTipoCriaturaEnum);
  protected readonly regeneracaoIntensidades = Object.values(RegeneracaoIntensidadeEnum);
  protected readonly regeneracaoModos = Object.values(RegeneracaoModoEnum);

  protected readonly rotuloOrigemCriatura = rotuloOrigemCriatura;
  protected readonly rotuloComportamento = rotuloComportamento;
  protected readonly rotuloNivelAmeaca = rotuloNivelAmeaca;
  protected readonly rotuloTenacidade = rotuloTenacidade;
  protected readonly rotuloPorte = rotuloPorte;
  protected readonly rotuloCadencia = rotuloCadencia;
  protected readonly rotuloModificadorCriatura = rotuloModificadorCriatura;
  protected readonly rotuloCustoAcao = rotuloCustoAcao;
  protected readonly rotuloHabilidadeTipoCriatura = rotuloHabilidadeTipoCriatura;
  protected readonly rotuloRegeneracaoIntensidade = rotuloRegeneracaoIntensidade;
  protected readonly rotuloRegeneracaoModo = rotuloRegeneracaoModo;

  protected readonly resumoAberto = signal(false);
  protected readonly visitado = signal(0);
  protected readonly criando = signal(false);
  protected readonly erro = signal('');
  /** Rascunho salvo neste dispositivo (mesmo padrão do guia de agente, `criar.page.ts`). */
  protected readonly temRascunho = signal(false);
  /** Confirmação de saída do guia — substitui o `confirm()` nativo por um `<dialog>`. */
  protected readonly confirmandoSaida = signal(false);
  private readonly sairDialog = viewChild<ElementRef<HTMLDialogElement>>('sairDialog');

  protected readonly estado = signal<EstadoGuiaCriatura>(ESTADO_INICIAL);

  /**
   * Imagem de registro da criatura — mesmo padrão do guia de jogador (m3-62): fica só em memória
   * até a ficha existir (`POST /ficha/criatura` não aceita arquivo), então o upload real é um
   * segundo request, disparado por `criar()` em sequência, depois que o `id` existir.
   */
  protected readonly imagemArquivo = signal<File | null>(null);
  protected readonly imagemPreviewUrl = signal<string | null>(null);
  protected readonly erroImagemGuia = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.revogarPreviewImagem());
    const existente = this.rascunhos.recuperar<EstadoGuiaCriatura>(this.campanhaId, 'criatura');
    this.temRascunho.set(existente !== null);
    // `!this.temRascunho()` evita sobrescrever o rascunho salvo antes do mestre decidir "Retomar"
    // ou "Começar do zero" — mesma trava do guia de agente (`criar.page.ts`).
    effect(() => { if (!this.temRascunho()) this.rascunhos.salvar(this.campanhaId, 'criatura', this.estado()); });
    // Sincroniza o `<dialog>` nativo de saída com `confirmandoSaida()` — mesmo padrão do guia de
    // agente; `typeof` guarda o ambiente de teste (jsdom não implementa `HTMLDialogElement`).
    effect(() => {
      const dialog = this.sairDialog()?.nativeElement;
      if (!dialog || typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') return;
      if (this.confirmandoSaida()) { if (!dialog.open) dialog.showModal(); } else { dialog.close(); }
    });
  }

  protected retomar(): void {
    const salvo = this.rascunhos.recuperar<EstadoGuiaCriatura>(this.campanhaId, 'criatura');
    if (salvo) {
      this.estado.set(salvo);
      this.visitado.set(salvo.passo);
    }
    this.temRascunho.set(false);
  }
  protected recomecar(): void {
    this.rascunhos.limpar(this.campanhaId, 'criatura');
    this.temRascunho.set(false);
  }

  /** Valida a imagem escolhida no client (tipo/tamanho) — mesmos limites de `FichaService` (backend). */
  protected aoSelecionarImagemGuia(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    (evento.target as HTMLInputElement).value = '';
    if (!arquivo) {
      return;
    }
    if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
      this.erroImagemGuia.set('Formato inválido: use JPEG, PNG ou WEBP');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
      this.erroImagemGuia.set('Imagem maior que o limite permitido (2MB)');
      return;
    }
    this.erroImagemGuia.set(null);
    this.revogarPreviewImagem();
    this.imagemArquivo.set(arquivo);
    this.imagemPreviewUrl.set(URL.createObjectURL(arquivo));
  }

  private revogarPreviewImagem(): void {
    const anterior = this.imagemPreviewUrl();
    if (anterior) {
      URL.revokeObjectURL(anterior);
    }
  }

  protected readonly baseLimite = computed(() => obterBaseELimitePorVd({ vd: this.estado().vd }));
  /** Contador "gasto/total" dos Pontos de Ajuste (mesmo padrão do "Saldo de distribuição" do
   * guia de agente, `criar.page.ts`) — gasto é a soma de cada atributo acima da Base; um
   * atributo realocado abaixo da Base libera pontos extras para os demais. */
  protected readonly pontosAjuste = computed(() => {
    const base = this.baseLimite().base;
    const total = this.baseLimite().pontosAjuste;
    const atributos = this.estado().atributos;
    const gastos = this.campos.reduce((soma, campo) => soma + (atributos[campo.chave] - base), 0);
    return { gastos, total, saldo: total - gastos };
  });
  protected readonly vidaMaxima = computed(() => {
    const tenacidade = this.estado().tenacidade;
    return tenacidade ? calcularVidaMaxima({ vd: this.estado().vd, tenacidade }) : 0;
  });
  protected readonly defesaBase = computed(() => calcularDefesaBase({ vd: this.estado().vd }));
  protected readonly contraAtaque = computed(() =>
    possuiContraAtaque(this.estado().modificadores.luta ?? ModificadorCriaturaEnum.MEDIO));

  protected readonly somaResistencias = computed(() =>
    this.estado().resistencias.reduce((soma, r) => soma + r.valor, 0));
  protected readonly custoResistencias = computed(() =>
    this.estado().resistencias.reduce(
      (soma, r) => soma + calcularCustoResistencia({ valor: r.valor, tipo: r.tipo, ehSubtipo: r.subtipo.trim().length > 0 }),
      0,
    ));
  protected readonly limiteResistencias = computed(() =>
    calcularLimiteResistencias({ vd: this.estado().vd, quantidadeFraquezasExtras: Math.max(0, this.estado().fraquezas.length - 1) }));
  protected readonly fraquezaMinima = computed(() => Math.max(5, this.somaResistencias() / 2));

  protected readonly valorRegeneracao = computed(() => calcularValorRegeneracao({
    vidaMaxima: this.vidaMaxima(), intensidade: this.estado().regeneracao.intensidade, modo: this.estado().regeneracao.modo,
  }));

  protected readonly deslocamentoSugerido = computed(() => sugerirDeslocamentoTerrestre({ destreza: this.estado().atributos.destreza }));
  protected readonly iniciativaSugerida = computed(() => calcularBonusIniciativaSugerido({ vd: this.estado().vd }));

  /** Dados completos, com valores-padrão nos campos ainda não preenchidos (só para preview e para a
   * validação final de coerência — `construirDados` nunca é enviado ao backend fora do passo //
   * Revisão, que já exige tudo preenchido via `passoValido`). */
  protected readonly violacoesFinais = computed(() => validarFichaCriatura(this.construirDados()).violacoes);

  protected alterar(parcial: Partial<EstadoGuiaCriatura>): void {
    this.estado.update((atual) => ({ ...atual, ...parcial }));
  }
  protected valor(evento: Event): string { return (evento.target as HTMLInputElement).value; }
  protected numero(evento: Event): number { return Number(this.valor(evento)); }

  // Setters tipados dos `<select>` de enum — `valor()` devolve `string` bruto do DOM; o cast fica
  // centralizado aqui (em vez de inline no template) para não perder o tipo de `EstadoGuiaCriatura`.
  protected mudarOrigem(evento: Event): void { this.alterar({ origem: this.valor(evento) as OrigemCriaturaEnum }); }
  protected mudarComportamento(evento: Event): void { this.alterar({ comportamento: this.valor(evento) as ComportamentoCriaturaEnum }); }
  protected mudarNa(evento: Event): void { this.alterar({ na: this.valor(evento) as NivelAmeacaEnum }); }
  /** Atributos começam na Base (doc: "Todo atributo começa no valor Base") — só reinicializa
   * enquanto o passo // Atributos ainda não foi visitado, para nunca apagar uma distribuição já
   * feita pelo mestre ao voltar e ajustar o VD. */
  protected mudarVd(evento: Event): void {
    const vd = this.numero(evento);
    if (this.visitado() >= this.passos.indexOf('Atributos')) { this.alterar({ vd }); return; }
    const base = obterBaseELimitePorVd({ vd }).base;
    const atributos = this.campos.reduce((acc, campo) => ({ ...acc, [campo.chave]: base }), {} as FichaAtributosDto);
    this.alterar({ vd, atributos });
  }
  protected mudarTenacidade(evento: Event): void {
    const bruto = this.valor(evento);
    this.alterar({ tenacidade: bruto ? (bruto as TenacidadeEnum) : null });
  }
  protected mudarPorte(evento: Event): void {
    const bruto = this.valor(evento);
    this.alterar({ porte: bruto ? (bruto as PorteCriaturaEnum) : null });
  }
  protected mudarCadencia(evento: Event): void {
    const cadencia = this.valor(evento) as CadenciaEnum;
    const turnosFixos: Partial<Record<CadenciaEnum, number>> = {
      [CadenciaEnum.SINGULAR]: 1,
      [CadenciaEnum.DUPLA]: 2,
      [CadenciaEnum.TRIPLICE]: 3,
    };
    this.alterar({ cadencia, turnosPorRodada: turnosFixos[cadencia] ?? 4 });
  }
  protected mudarRegeneracaoModo(evento: Event): void {
    this.alterarRegeneracao({ modo: this.valor(evento) as RegeneracaoModoEnum });
  }
  protected mudarRegeneracaoIntensidade(evento: Event): void {
    this.alterarRegeneracao({ intensidade: this.valor(evento) as RegeneracaoIntensidadeEnum });
  }

  protected atributoEfetivo(chave: ChaveAtributo): number | null {
    const modificador = this.estado().modificadores[chave];
    return modificador
      ? calcularAtributoEfetivo({ atributoFinal: this.estado().atributos[chave], modificador, vd: this.estado().vd })
      : null;
  }

  /**
   * Fórmula real do teste de atributo (`<valor>d20kh1±<modificador>`, mesma notação de
   * `rolarTesteAtributoCriatura`) — "Atributo Efetivo" não é um número que a criatura carrega em
   * lugar nenhum da ficha, é só um passo intermediário do cálculo; o guia mostra a fórmula que
   * será de fato rolada, não esse intermediário.
   */
  protected testeAtributoFormula(chave: ChaveAtributo): string | null {
    const efetivo = this.atributoEfetivo(chave);
    if (efetivo === null) {
      return null;
    }
    const atributoFinal = this.estado().atributos[chave];
    const modificador = efetivo - atributoFinal;
    const sinal = modificador < 0 ? '-' : '+';
    return `${atributoFinal}d20kh1${sinal}${Math.abs(modificador)}`;
  }

  protected passoAtributo(chave: ChaveAtributo, delta: number): void {
    const atual = this.estado();
    // Realocação retira no máximo 3 pontos da Base (doc: "⬥ Realocação de Pontos"), sem nunca negativar.
    const piso = Math.max(0, this.baseLimite().base - 3);
    const valor = Math.max(piso, Math.min(this.baseLimite().limite, atual.atributos[chave] + delta));
    this.alterar({ atributos: { ...atual.atributos, [chave]: valor } });
  }
  protected definirModificador(chave: ChaveAtributo, tipo: ModificadorCriaturaEnum): void {
    const atual = this.estado().modificadores[chave];
    this.alterar({ modificadores: { ...this.estado().modificadores, [chave]: atual === tipo ? null : tipo } });
  }
  protected contagemModificador(tipo: ModificadorCriaturaEnum): number {
    return CAMPOS.filter((campo) => this.estado().modificadores[campo.chave] === tipo).length;
  }
  /** Trava o botão de um `tipo` já com a quota cheia (doc — "Distribuição": 2 Forte / 3 Médio / 3
   * Fraco / 2 Frágil) para todo atributo que ainda não é desse tipo — quem já está marcado
   * continua clicável, pra permitir desmarcar ou trocar de tipo sem precisar liberar vaga antes. */
  protected modificadorDesabilitado(chave: ChaveAtributo, tipo: ModificadorCriaturaEnum): boolean {
    if (this.estado().modificadores[chave] === tipo) return false;
    return this.contagemModificador(tipo) >= QUANTIDADE_ESPERADA_MODIFICADOR[tipo];
  }
  protected distribuicaoModificadoresCompleta(): boolean {
    const modificadores = this.estado().modificadores;
    if (CAMPOS.some((campo) => modificadores[campo.chave] === null)) return false;
    return this.modificadoresDisponiveis.every(
      (tipo) => this.contagemModificador(tipo) === QUANTIDADE_ESPERADA_MODIFICADOR[tipo],
    );
  }

  protected adicionarResistencia(): void { this.alterar({ resistencias: [...this.estado().resistencias, linhaResistenciaVazia()] }); }
  protected removerResistencia(indice: number): void {
    this.alterar({ resistencias: this.estado().resistencias.filter((_, i) => i !== indice) });
  }
  protected alterarResistencia(indice: number, campo: keyof LinhaResistencia, valor: string | number): void {
    this.alterar({ resistencias: this.estado().resistencias.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r)) });
  }
  protected adicionarFraqueza(): void { this.alterar({ fraquezas: [...this.estado().fraquezas, linhaResistenciaVazia()] }); }
  protected removerFraqueza(indice: number): void {
    this.alterar({ fraquezas: this.estado().fraquezas.filter((_, i) => i !== indice) });
  }
  protected alterarFraqueza(indice: number, campo: keyof LinhaResistencia, valor: string | number): void {
    this.alterar({ fraquezas: this.estado().fraquezas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)) });
  }
  protected fraquezaValida(linha: LinhaResistencia): boolean {
    return validarFraqueza({ valor: linha.valor, somaResistencias: this.somaResistencias() });
  }
  protected conflitoResistenciaFraqueza(): boolean {
    return this.estado().resistencias.some((r) =>
      this.estado().fraquezas.some((f) => f.tipo === r.tipo && f.subtipo.trim() === r.subtipo.trim()));
  }

  protected alterarRegeneracao(parcial: Partial<EstadoRegeneracao>): void {
    this.alterar({ regeneracao: { ...this.estado().regeneracao, ...parcial } });
  }
  protected alterarDeslocamento(campo: keyof EstadoDeslocamento, valor: number | null): void {
    this.alterar({ deslocamento: { ...this.estado().deslocamento, [campo]: valor } });
  }

  protected vdTipico(na: NivelAmeacaEnum): string { return VD_TIPICO_POR_NA[na]; }

  protected danoReferencia(custoAcao: CustoAcaoEnum): string {
    return this.estado().vd > 0 ? obterDanoReferenciaPorVd({ vd: this.estado().vd, custoAcao }) : '—';
  }
  protected adicionarAtaque(): void { this.alterar({ ataques: [...this.estado().ataques, linhaAtaqueVazia()] }); }
  protected removerAtaque(indice: number): void {
    this.alterar({ ataques: this.estado().ataques.filter((_, i) => i !== indice) });
  }
  protected alterarAtaque(indice: number, campo: keyof LinhaAtaque, valor: string | boolean): void {
    this.alterar({ ataques: this.estado().ataques.map((a, i) => (i === indice ? { ...a, [campo]: valor } : a)) });
  }

  protected adicionarHabilidade(): void { this.alterar({ habilidades: [...this.estado().habilidades, linhaHabilidadeVazia()] }); }
  protected removerHabilidade(indice: number): void {
    this.alterar({ habilidades: this.estado().habilidades.filter((_, i) => i !== indice) });
  }
  protected alterarHabilidade(indice: number, campo: keyof LinhaHabilidade, valor: string): void {
    this.alterar({ habilidades: this.estado().habilidades.map((h, i) => (i === indice ? { ...h, [campo]: valor } : h)) });
  }

  private construirDados(): FichaCriaturaDadosDto {
    const e = this.estado();
    const modificadores = CAMPOS.reduce((acc, campo) => {
      acc[campo.chave] = e.modificadores[campo.chave] ?? ModificadorCriaturaEnum.FRACO;
      return acc;
    }, {} as FichaCriaturaModificadoresDto);
    const tenacidade = e.tenacidade ?? TenacidadeEnum.PADRAO;
    const vidaMaxima = calcularVidaMaxima({ vd: e.vd, tenacidade });
    return {
      identidade: {
        designacao: e.designacao.trim(), origem: e.origem, conceito: e.conceito.trim(),
        naturezaFisica: e.naturezaFisica.trim(), comportamento: e.comportamento, motivacao: e.motivacao.trim(),
        ganchoUnico: e.ganchoUnico.trim(), ...(e.temaHorror.trim() ? { temaHorror: e.temaHorror.trim() } : {}),
      },
      na: e.na, vd: e.vd, atributos: e.atributos, modificadores, tenacidade,
      vidaMaxima, vidaAtual: e.vidaAtual ?? vidaMaxima,
      defesa: calcularDefesaBase({ vd: e.vd }),
      resistencias: e.resistencias.map(paraResistenciaDto),
      fraquezas: e.fraquezas.map(paraResistenciaDto),
      ...(e.regeneracao.ativa
        ? {
            regeneracao: {
              modo: e.regeneracao.modo, intensidade: e.regeneracao.intensidade,
              valor: calcularValorRegeneracao({ vidaMaxima, intensidade: e.regeneracao.intensidade, modo: e.regeneracao.modo }),
              condicao: e.regeneracao.modo === RegeneracaoModoEnum.CONDICIONAL ? e.regeneracao.condicao.trim() : null,
            },
          }
        : {}),
      porte: e.porte ?? PorteCriaturaEnum.MEDIO,
      deslocamento: e.deslocamento,
      cadencia: e.cadencia,
      turnosPorRodada:
        e.cadencia === CadenciaEnum.FRENETICA
          ? Math.max(4, Math.trunc(e.turnosPorRodada))
          : e.turnosPorRodada,
      ...(e.iniciativaBonus ? { iniciativaBonus: e.iniciativaBonus } : {}),
      ataques: e.ataques.map(paraAtaqueDto),
      habilidades: e.habilidades.map(paraHabilidadeDto),
      ...(e.anotacoes.trim() ? { anotacoes: e.anotacoes.trim() } : {}),
    };
  }

  protected passoValido(): boolean {
    const e = this.estado();
    switch (this.passos[e.passo] as NomePasso) {
      case 'Identidade':
        return e.designacao.trim().length > 0 && e.conceito.trim().length > 0
          && e.naturezaFisica.trim().length > 0 && e.motivacao.trim().length > 0 && e.ganchoUnico.trim().length > 0;
      case 'Ameaça':
        return e.vd > 0;
      case 'Atributos':
        return validarRealocacaoAtributos({ atributosFinal: e.atributos, limite: this.baseLimite().limite }).length === 0
          && this.pontosAjuste().saldo === 0;
      case 'Modificadores':
        return this.distribuicaoModificadoresCompleta();
      case 'Saúde':
        return e.tenacidade !== null;
      case 'Defesa':
        return true;
      case 'Resistências':
        return e.fraquezas.length > 0
          && this.custoResistencias() <= this.limiteResistencias()
          && e.fraquezas.every((f) => this.fraquezaValida(f))
          && !this.conflitoResistenciaFraqueza();
      case 'Regeneração':
        return !e.regeneracao.ativa || e.regeneracao.modo !== RegeneracaoModoEnum.CONDICIONAL || e.regeneracao.condicao.trim().length > 0;
      case 'Porte e Deslocamento':
        return e.porte !== null
          && (e.deslocamento.terrestre != null || e.deslocamento.voador != null
            || e.deslocamento.aquatico != null || e.deslocamento.sobrenatural != null);
      case 'Ataques':
      case 'Habilidades':
        return true;
      default:
        return true;
    }
  }

  protected ir(passo: number): void { if (passo <= this.visitado()) this.alterar({ passo }); }
  protected avancar(): void {
    if (!this.passoValido()) return;
    const proximo = Math.min(this.passos.length - 1, this.estado().passo + 1);
    this.visitado.update((v) => Math.max(v, proximo));
    this.alterar({ passo: proximo });
  }
  protected voltar(): void { this.alterar({ passo: Math.max(0, this.estado().passo - 1) }); }
  protected sair(): void { this.confirmandoSaida.set(true); }
  protected confirmarSaida(): void {
    this.confirmandoSaida.set(false);
    void this.router.navigate(this.campanhaId !== null ? ['/campanhas', this.campanhaId] : ['/fichas']);
  }

  protected definirAtributo(chave: ChaveAtributo, valor: number): void {
    this.passoAtributo(chave, valor - this.estado().atributos[chave]);
  }
  protected cancelarSaida(): void { this.confirmandoSaida.set(false); }
  /** Clique no `::backdrop` do `<dialog>` cai no próprio elemento (não num filho) — fecha como "Continuar aqui". */
  protected fecharAoClicarFora(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.cancelarSaida(); }

  protected criar(): void {
    if (this.criando() || this.violacoesFinais().length > 0) return;
    this.criando.set(true);
    this.erro.set('');
    const e = this.estado();
    this.fichaService
      .criarFichaCriatura({ campanhaId: this.campanhaId, nome: e.designacao.trim(), cor: e.cor, dados: this.construirDados() })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: (ficha) => {
          this.rascunhos.limpar(this.campanhaId, 'criatura');
          const destino =
            this.campanhaId !== null
              ? ['/campanhas', this.campanhaId, 'criatura', ficha.id]
              : ['/fichas', 'criatura', ficha.id];
          const arquivo = this.imagemArquivo();
          // Imagem (mesmo padrão do guia de jogador, m3-62): a ficha já existe — segundo request,
          // em sequência. Falha no upload não desfaz a criatura criada nem trava a navegação; só
          // fica sem imagem, subível depois pelo cabeçalho da ficha.
          if (!arquivo) {
            void this.router.navigate(destino);
            return;
          }
          this.fichaService
            .alterarImagem(ficha.id, arquivo)
            .pipe(catchError(() => of(null)))
            .subscribe(() => void this.router.navigate(destino));
        },
        error: (erro) => this.erro.set(erro?.error?.mensagem ?? 'Não foi possível criar a criatura.'),
      });
  }
}
