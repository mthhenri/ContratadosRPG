import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArquetipoEnum, ClasseEnum, FormacaoBonusEnum, FormacaoParametroEnum, HabilidadeCategoriaEnum, MotivoEntradaAgenteEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaOrigemDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularDerivados, calcularEnergia, calcularOrcamentoAtributos, calcularProgressaoAcumulada, calcularVida, catalogoHabilidades, habilidadesIniciais, listarPacotesHabilidadesIniciais, MAESTRIA_PONTOS_MINIMO, maestriaAtingivel, obterBonusAtributosComEscolha, obterSaudeClasse, obterSlotsEscolhaBonus, validarDistribuicaoAtributos } from '@contratados-rpg/shared/regras/agente';
import type { GrupoHabilidades, HabilidadeCatalogoItemDto, HabilidadesPacoteInicialId, SlotEscolhaAtributo, TipoVagaHabilidade } from '@contratados-rpg/shared/regras/agente';
import { calcularBonusMonetario, calcularDinheiroInicial, calcularNovoAgente } from '@contratados-rpg/shared/regras/novo-agente';
import { rolarDados } from '@contratados-rpg/shared/regras/descanso';
import { FORMACOES, experimentoComPeculiaridade } from '@contratados-rpg/shared/regras/identidade';
import type { FormacaoDefinicaoDto } from '@contratados-rpg/shared/regras/identidade';
import { calcularTotaisCarrinho, KIT_INICIAL_ORCAMENTO_MAXIMO, KIT_INICIAL_PESO_MAXIMO, type CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../ficha.service';
import { ATRIBUTOS_BASE_PADRAO, construirFichaInicial } from '../../ficha-padrao';
import { classeBaseDoSeletor, ehClasseBase, GRUPOS_CLASSE_BASE, gruposPerfilDaClasseBase } from '../../opcoes-ficha';
import { GRUPOS_FORMACAO, rotuloParametroFormacao } from '../../opcoes-formacao';
import { rotuloArquetipo, rotuloClasse, rotuloClasseCompleto, rotuloMotivoEntrada } from '../../rotulos-ficha';
import { descricaoClasse as textoGuiaClasse, focoArquetipo as textoFocoArquetipo } from '../../guia-briefing';
import { lerParamRota } from '../../ler-param-rota';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaHabilidadeSeletor } from '../../componentes/ficha-habilidade-seletor/ficha-habilidade-seletor.component';
import { GuiaEquipamentoLoja } from '../../componentes/guia-equipamento-loja/guia-equipamento-loja.component';

/** Vaga de melhoria de nível (m3-58) — cada uma casa com um campo de `ProgressaoAcumuladaDto`. */
type TipoVagaMelhoria = TipoVagaHabilidade;
interface VagaMelhoria { readonly tipo: TipoVagaMelhoria; readonly rotulo: string; readonly alvo: number; }
interface MelhoriaEscolhida { readonly vaga: TipoVagaMelhoria; readonly habilidade: FichaHabilidadeDto; }
/** Rascunho de uma Fortificação de Personalidade (níveis 7/14) — vira `FichaHabilidadeDto` na criação. */
interface FortificacaoRascunho { readonly nome: string; readonly descricao: string; }

type ChaveAtributo = keyof FichaAtributosDto;
interface DinheiroRolado { readonly dados: readonly number[]; readonly inicial: number; readonly rolado: boolean; }
interface EstadoGuiaCriacao {
  readonly passo: number; readonly nome: string;
  /** Cor de identidade visual (m3-61), escolhida junto do Codinome — `null` sem cor definida. */
  readonly cor: string | null;
  readonly usuarioId: number | null;
  readonly classe: ClasseEnum | null; readonly arquetipo: ArquetipoEnum | null;
  /** Primeira etapa do seletor de Classe em dois passos (P-019) — Combatente/Especialista/Suporte
   * ou Civil. Guarda a escolha mesmo antes da segunda etapa (arquétipo/subclasse) existir, por isso
   * é um campo à parte de `classe` (que só se fecha quando o perfil fica definitivo). */
  readonly classeBase: ClasseEnum | null;
  /** Escolha do jogador para os pontos "à escolha" do bônus de atributo do perfil (Engenheiro/
   * Assassino/Acadêmico: 1 posição; Experimento Híbrido: 2 posições) — mesma ordem de
   * `obterSlotsEscolhaBonus`. `[]` quando o perfil não tem nenhum ponto assim, ou ainda não escolhido. */
  readonly bonusEscolhido: readonly (ChaveAtributo | null)[];
  readonly motivo: MotivoEntradaAgenteEnum; readonly mediaNivel: number; readonly mediaPrestigio: number;
  readonly sobrescreverProgressao: boolean; readonly nivelManual: number; readonly prestigioManual: number;
  readonly pacoteHabilidadesId: HabilidadesPacoteInicialId | null;
  readonly atributos: FichaAtributosDto; readonly maestria: ChaveAtributo | null; readonly modoLivre: boolean;
  readonly personalidade: string; readonly origem: FichaOrigemDto; readonly formacoesCustomizadas: readonly boolean[];
  readonly dinheiro: DinheiroRolado;
  /** Habilidades de nível escolhidas no passo // HABILIDADES (m3-58) — vazio até o passo existir. */
  readonly melhorias: readonly MelhoriaEscolhida[];
  /** Sempre 2 posições (mesmo padrão de `origem.formacao`); só as `alvoFortificacoes()` primeiras contam. */
  readonly fortificacoes: readonly FortificacaoRascunho[];
  /** Itens do passo // EQUIPAMENTO INICIAL (m3-59) — orçamento à parte do dinheiro, nunca descontado dele. */
  readonly kit: readonly CarrinhoItemDto[];
}

const origemVazia = (): FichaOrigemDto => ({ nome: '', descricao: '', formacao: [{ bonus: null, parametro: null, texto: '' }, { bonus: null, parametro: null, texto: '' }], especialidade: { gatilho: '', efeito: '' }, saberDeCampo: '' });
const dinheiroVazio = (): DinheiroRolado => ({ dados: [], inicial: 0, rolado: false });
const fortificacoesVazias = (): FortificacaoRascunho[] => [{ nome: '', descricao: '' }, { nome: '', descricao: '' }];
const rolarDinheiro = (): DinheiroRolado => { const dados = rolarDados({ quantidade: 4, faces: 4 }); const rolagem = calcularDinheiroInicial({ somaDados: dados.reduce((soma, dado) => soma + dado, 0) }); return { dados, inicial: rolagem.dinheiro, rolado: true }; };
/** Teto de atributo no guia (doc — "⬡ Atributos": 6 pontos fora da criação; acima disso só via Fragmento de Módulo I, fora do escopo deste guia). */
const ATRIBUTO_MAXIMO_GUIA = 6;
/** Custo em pontos de atributo da Maestria (doc — "⬥ Maestrias"), além do ponto que já leva o atributo a 6. */
const MAESTRIA_PONTOS_CUSTO = 2;
/** Avatar do guia (m3-62) — mesmos limites validados no backend (`FichaService.alterarImagem`). */
const TIPOS_IMAGEM_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_IMAGEM_BYTES = 2 * 1024 * 1024;

function normalizarEstado(estado: EstadoGuiaCriacao): EstadoGuiaCriacao {
  return {
    ...estado,
    cor: estado.cor ?? null,
    // Rascunhos salvos antes do seletor de Classe virar dois passos (P-019) não têm `classeBase` —
    // reconstrói a partir da `classe` já escolhida (`classeBaseAtual()` já faz o mesmo em runtime,
    // isto só mantém o estado persistido coerente daqui pra frente).
    classeBase: estado.classeBase ?? (estado.classe ? classeBaseDoSeletor(estado.classe) : null),
    formacoesCustomizadas: estado.formacoesCustomizadas ?? estado.origem.formacao.map((item) => item.bonus === null && item.texto.trim().length > 0),
    bonusEscolhido: estado.bonusEscolhido ?? [],
    dinheiro: { ...estado.dinheiro, rolado: estado.dinheiro.rolado ?? estado.dinheiro.dados.length === 4 },
    melhorias: estado.melhorias ?? [],
    sobrescreverProgressao: estado.sobrescreverProgressao ?? false,
    nivelManual: estado.nivelManual ?? 0,
    prestigioManual: estado.prestigioManual ?? 0,
    pacoteHabilidadesId: estado.pacoteHabilidadesId ?? null,
    fortificacoes: estado.fortificacoes ?? fortificacoesVazias(),
    kit: estado.kit ?? [],
  };
}

@Component({ selector: 'app-ficha-criar', imports: [CommonModule, Icone, FichaHabilidadeSeletor, GuiaEquipamentoLoja, Tooltip], templateUrl: './criar.page.html', styleUrl: './criar.page.scss' })
export class FichaCriar {
  private readonly destroyRef = inject(DestroyRef);
  private readonly rota = inject(ActivatedRoute); private readonly router = inject(Router);
  private readonly campanhaService = inject(CampanhaService); private readonly fichaService = inject(FichaService);
  private readonly sessaoService = inject(SessaoService); private readonly rascunhos = inject(GuiaCriacaoRascunhoService);
  private readonly campanhaIdRota = lerParamRota(this.rota, 'campanhaId');
  /**
   * `null` sob `/fichas/nova` (m3-28, ficha avulsa) — sob `/painel/:campanhaId/ficha/nova` vem do
   * parâmetro de rota, como sempre. Sem campanha não há esquadrão: o construtor pula
   * `listarMembros`/`listarFichas` e o guia sempre segue o caminho "primeiro agente" (Nível 0,
   * Prestígio 0, sem bônus monetário) — não existe média para calcular sem fichas de campanha.
   */
  protected readonly campanhaId: number | null = this.campanhaIdRota !== null ? Number(this.campanhaIdRota) : null;
  protected readonly gruposClasseBase = GRUPOS_CLASSE_BASE;
  protected readonly gruposFormacao = GRUPOS_FORMACAO;
  protected readonly parametroEsquivaOuBloqueio = FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO;
  /** Teto de atributo e limiar/custo de Maestria expostos ao template (doc — "⬥ Maestrias"). */
  protected readonly atributoMaximoGuia = ATRIBUTO_MAXIMO_GUIA;
  protected readonly limiteMaestria = MAESTRIA_PONTOS_MINIMO;
  protected readonly custoMaestriaPontos = MAESTRIA_PONTOS_CUSTO;
  protected readonly campos: readonly { chave: ChaveAtributo; nome: string }[] = [
    { chave: 'destreza', nome: 'Destreza' }, { chave: 'forca', nome: 'Força' }, { chave: 'luta', nome: 'Luta' },
    { chave: 'pontaria', nome: 'Pontaria' }, { chave: 'vigor', nome: 'Vigor' }, { chave: 'intelecto', nome: 'Intelecto' },
    { chave: 'medicina', nome: 'Medicina' }, { chave: 'sentidos', nome: 'Sentidos' }, { chave: 'social', nome: 'Social' },
    { chave: 'vontade', nome: 'Vontade' },
  ];
  /** Rótulo de cada vaga de melhoria (m3-58), na ordem de exibição do passo. `classeOuArquetipo` vira
   * "Classe ou Subclasse" para as subclasses de Experimento (P-014) — resolvido em `rotuloVaga`. */
  private static readonly ROTULOS_VAGA: Readonly<Record<TipoVagaMelhoria, string>> = {
    geral: 'Habilidade Geral', classe: 'Habilidade de Classe', classeOuArquetipo: 'Classe ou Arquétipo',
    outraClasse: 'Outra classe / outro arquétipo', civil: 'Habilidade Civil',
  };
  /** Rótulo da vaga, com `classeOuArquetipo` trocado para "Classe ou Subclasse" numa ficha Experimento
   * (P-014) — mesmo critério de `!ehClasseBase` usado pelo resto do guia para distinguir subclasse. */
  private rotuloVaga(tipo: TipoVagaMelhoria): string {
    if (tipo === 'classeOuArquetipo' && !ehClasseBase(this.classeCalculada())) {
      return 'Classe ou Subclasse';
    }
    return FichaCriar.ROTULOS_VAGA[tipo];
  }
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]); protected readonly fichas = signal<FichaResumoDto[]>([]);
  protected readonly carregando = signal(true); protected readonly criando = signal(false); protected readonly rolandoRecursos = signal(false); protected readonly erro = signal('');

  /**
   * Avatar do guia (m3-62) — nunca entra em `EstadoGuiaCriacao`/no rascunho persistido (`File` não
   * é serializável em JSON); fica só em memória até o passo Revisão. `POST /ficha` cria a ficha
   * antes de existir um `id` para `POST /ficha/:id/imagem`, então o upload real é um segundo
   * request, em sequência, disparado por `criar()` depois que a ficha existir.
   */
  protected readonly imagemArquivo = signal<File | null>(null);
  protected readonly imagemPreviewUrl = signal<string | null>(null);
  protected readonly erroImagemGuia = signal<string | null>(null);

  /** Valida o avatar escolhido no client (tipo/tamanho) — mesmos limites de `FichaService` (backend). */
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
  protected readonly resumoAberto = signal(false); protected readonly visitado = signal(0); protected readonly temRascunho = signal(false);
  /** Confirmação de saída do guia — substitui o `confirm()` nativo do navegador por um `<dialog>`. */
  protected readonly confirmandoSaida = signal(false);
  private readonly sairDialog = viewChild<ElementRef<HTMLDialogElement>>('sairDialog');
  /** Vaga com o seletor do sistema aberto (`null` = fechado) — m3-58. */
  protected readonly vagaAberta = signal<TipoVagaMelhoria | null>(null);
  protected readonly estado = signal<EstadoGuiaCriacao>({ passo: 0, nome: '', cor: null, usuarioId: null, classe: null,
    classeBase: null,
    arquetipo: null, bonusEscolhido: [], motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO, mediaNivel: 0, mediaPrestigio: 0,
    sobrescreverProgressao: this.campanhaId === null, nivelManual: 0, prestigioManual: 0,
    pacoteHabilidadesId: null,
    atributos: { ...ATRIBUTOS_BASE_PADRAO }, maestria: null, modoLivre: false, personalidade: '', origem: origemVazia(),
    formacoesCustomizadas: [false, false], dinheiro: dinheiroVazio(), melhorias: [], fortificacoes: fortificacoesVazias(), kit: [] });
  protected readonly ehMestre = computed(() => this.membros().find((m) => m.usuarioId === this.sessaoService.usuario()?.id)?.papel === TipoCampanhaMembroPapelEnum.MESTRE);
  /** Classe-base "efetiva" do seletor de dois passos (P-019): a `classeBase` já escolhida na
   * primeira etapa, ou — enquanto ela ainda não existir (rascunho antigo, ou estado montado direto
   * via `atualizar({ classe, arquetipo })`, como em vários testes) — derivada da `classe` já
   * definitiva. Mantém as duas etapas coerentes mesmo quando só a segunda foi preenchida. */
  protected readonly classeBaseAtual = computed(() => {
    const e = this.estado();
    return e.classeBase ?? (e.classe ? classeBaseDoSeletor(e.classe) : null);
  });
  /** Opções da segunda etapa (arquétipos + subclasse de Experimento) para a classe-base atual. */
  protected readonly gruposPerfil = computed(() => {
    const base = this.classeBaseAtual();
    return base ? gruposPerfilDaClasseBase(base) : [];
  });
  /** Valor selecionado na segunda etapa — o arquétipo, ou a própria `classe` quando ela é a
   * subclasse de Experimento da base atual. `''` sem nada escolhido ainda. */
  protected readonly perfilSelecionado = computed(() => {
    const e = this.estado();
    if (e.arquetipo) return e.arquetipo as string;
    const base = this.classeBaseAtual();
    return e.classe && base && e.classe !== base ? (e.classe as string) : '';
  });
  /** Slots de bônus "à escolha" do perfil atual (`shared/regras`) — `[]` sem nenhum ponto assim. */
  protected readonly slotsEscolhaBonus = computed<readonly SlotEscolhaAtributo[]>(() =>
    obterSlotsEscolhaBonus({ classe: this.classeCalculada(), arquetipo: this.estado().arquetipo }));
  protected readonly novoAgente = computed(() => calcularNovoAgente({ motivo: this.estado().motivo, mediaNivel: this.estado().mediaNivel, mediaPrestigio: this.estado().mediaPrestigio }));
  protected readonly nivelInicial = computed(() => this.estado().sobrescreverProgressao
    ? Math.max(0, Math.min(20, Math.trunc(this.estado().nivelManual)))
    : this.novoAgente().nivelInicial);
  protected readonly prestigioInicial = computed(() => this.estado().sobrescreverProgressao
    ? Math.max(0, Math.trunc(this.estado().prestigioManual))
    : this.novoAgente().prestigio.prestigioInicial);
  protected readonly classeCalculada = computed(() => this.estado().classe ?? ClasseEnum.COMBATENTE);
  /** Custo extra da Maestria (doc — "⬥ Maestrias"): 2 pontos de atributo além dos 5 já gastos para chegar a 6. */
  protected readonly custoMaestria = computed(() => this.estado().maestria !== null ? MAESTRIA_PONTOS_CUSTO : 0);
  protected readonly distribuicao = computed(() => {
    const base = validarDistribuicaoAtributos({ classe: this.classeCalculada(), nivel: this.nivelInicial(), atributos: this.estado().atributos });
    const maestria = this.estado().maestria;
    // A Maestria vale sobre o atributo **final** (base + bônus fixo de arquétipo/subclasse) — mesmo
    // valor que `construirFichaInicial` persiste e valida, não o investimento bruto do jogador.
    const violacoes = maestria !== null && !maestriaAtingivel(this.atributosFinais()[maestria])
      ? [...base.violacoes, `${maestria}: maestria requer ${MAESTRIA_PONTOS_MINIMO}+ pontos`]
      : base.violacoes;
    return { gastos: base.gastos + this.custoMaestria(), saldo: base.saldo - this.custoMaestria(), violacoes };
  });
  protected readonly orcamento = computed(() => calcularOrcamentoAtributos({ classe: this.classeCalculada(), nivel: this.nivelInicial() }));
  protected readonly bonusMonetario = computed(() => calcularBonusMonetario({ prestigioInicial: this.prestigioInicial() }).bonus);
  protected readonly totalDinheiro = computed(() => this.estado().dinheiro.rolado ? this.estado().dinheiro.inicial + this.bonusMonetario() : 0);
  /** Bônus fixo de atributos do perfil (arquétipo/subclasse) atual — `{}` sem perfil definitivo. */
  protected readonly bonusAtributos = computed(() => obterBonusAtributosComEscolha({ classe: this.classeCalculada(), arquetipo: this.estado().arquetipo }, this.estado().bonusEscolhido));
  protected readonly bonusAtributosLista = computed(() => this.campos
    .map((campo) => ({ nome: campo.nome, valor: this.bonusAtributos()[campo.chave] ?? 0 }))
    .filter(({ valor }) => valor !== 0));
  protected readonly atributosFinais = computed(() => { const bonus = this.bonusAtributos(); const atributos = { ...this.estado().atributos }; this.campos.forEach(({ chave }) => atributos[chave] += bonus[chave] ?? 0); return atributos; });
  /** Teto de investimento **bruto** por atributo — garante que o valor final (com o bônus fixo de arquétipo/subclasse já somado) nunca passe de 6. */
  protected limiteAtributo(chave: ChaveAtributo): number {
    return Math.max(0, Math.min(ATRIBUTO_MAXIMO_GUIA, this.orcamento().maximoFinal) - (this.bonusAtributos()[chave] ?? 0));
  }
  protected readonly vida = computed(() => calcularVida({ classe: this.classeCalculada(), nivel: this.nivelInicial(), vigor: this.atributosFinais().vigor }));
  protected readonly energia = computed(() => calcularEnergia({ classe: this.classeCalculada(), nivel: this.nivelInicial(), destreza: this.atributosFinais().destreza }));
  /** Base de Vida/Energia da classe (sem Nível/atributos) — passo // CLASSE, antes de `vida()`/`energia()`
   * fazerem sentido: ali o jogador ainda não escolheu atributos, só tem o valor de fábrica (1 em cada). */
  protected readonly saudeClasse = computed(() => obterSaudeClasse({ classe: this.classeCalculada() }));
  protected readonly atributosDestaque = computed(() => this.campos
    .map((campo) => ({ nome: campo.nome, valor: this.atributosFinais()[campo.chave] }))
    .filter(({ valor }) => valor > 1)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3));
  /** `true` quando a classe já tem um perfil definitivo (arquétipo escolhido, ou classe sem arquétipo). */
  protected readonly perfilDefinido = computed(() => { const classe = this.estado().classe; return classe !== null && (!ehClasseBase(classe) || this.estado().arquetipo !== null); });
  /** Rótulo "Classe - Arquétipo/Subclasse" do perfil em construção — vazio sem classe escolhida. */
  protected readonly perfilRotulo = computed(() => { const classe = this.estado().classe; return classe ? rotuloClasseCompleto(classe, this.estado().arquetipo) : ''; });
  /** Rótulo curto da fonte do bônus fixo (só o arquétipo/subclasse, sem a classe) — rótulo do marcador "+N Nome". */
  protected readonly rotuloOrigemBonus = computed(() => {
    const classe = this.estado().classe;
    if (!classe) return '';
    if (!ehClasseBase(classe)) return rotuloClasse(classe);
    const arquetipo = this.estado().arquetipo;
    return arquetipo ? rotuloArquetipo(arquetipo) : '';
  });
  protected readonly descricaoClasse = computed(() => { const classe = this.estado().classe; return classe ? textoGuiaClasse(classe) : ''; });
  protected readonly focoArquetipo = computed(() => { const arquetipo = this.estado().arquetipo; return arquetipo ? textoFocoArquetipo(arquetipo) : ''; });
  /** Habilidade Inicial do arquétipo/subclasse — vem de graça, só existe com o perfil definitivo. */
  protected readonly habilidadeInicial = computed<HabilidadeCatalogoItemDto | null>(() => {
    const classe = this.estado().classe;
    if (!classe || !this.perfilDefinido()) return null;
    const arquetipo = ehClasseBase(classe) ? this.estado().arquetipo : null;
    return habilidadesIniciais(classe, arquetipo)[0] ?? null;
  });
  /** Rótulo legível do motivo de entrada escolhido no passo 03, usado no Resumo Operacional. */
  protected readonly motivoRotulo = computed(() => rotuloMotivoEntrada(this.estado().motivo));
  /** Formações com texto já registrado — usadas no Resumo Operacional (m3-57). */
  protected readonly formacoesPreenchidas = computed(() => this.estado().origem.formacao.filter((item) => item.texto.trim().length > 0));

  /** `true` quando o Nível/Treinamento inicial (passo 03) é maior que 0 — só então o passo // HABILIDADES existe (m3-58). */
  protected readonly temMelhorias = computed(() => this.nivelInicial() > 0);
  /** `true` quando o passo // HABILIDADES existe na trilha: sempre que há classe escolhida, já que agora ele também cobre o pacote de Habilidades iniciais. */
  protected readonly comHabilidades = computed(() => this.estado().classe !== null);
  /** Trilha de passos — // Habilidades (quando existe) vem antes de // Identidade: só depois de escolher habilidades o guia sabe se um Experimento vai ter Peculiaridade (e portanto não vai ter Origem). */
  protected readonly passos = computed<readonly string[]>(() => {
    const base = ['Base', 'Classe', 'Novo agente', 'Atributos'];
    return this.comHabilidades()
      ? [...base, 'Habilidades', 'Identidade', 'Recursos', 'Equipamento inicial', 'Revisão']
      : [...base, 'Identidade', 'Recursos', 'Equipamento inicial', 'Revisão'];
  });
  /** Contagem acumulada de vagas do Nível 1 até o Nível inicial (`shared/regras`) — fonte única, proibição #26. */
  protected readonly progressaoAcumulada = computed(() => calcularProgressaoAcumulada({ classe: this.classeCalculada(), nivel: this.nivelInicial() }));
  protected readonly pacotesHabilidadesIniciais = computed(() => listarPacotesHabilidadesIniciais(this.classeCalculada()));
  protected readonly pacoteHabilidadesSelecionado = computed(() => this.pacotesHabilidadesIniciais().find((pacote) => pacote.id === this.estado().pacoteHabilidadesId) ?? null);
  /** Vagas de habilidade do passo // HABILIDADES, só as com alvo > 0 — Civil nunca vê Geral/Classe própria/Arquétipo/Outra classe.
   * A vaga 'classeOuArquetipo' já dá acesso à lista de Habilidades de Subclasse (Peculiaridade incluída,
   * `habilidades-catalogo.ts` grupo 'subclasse') — inclusive para Experimento, via o pacote de Habilidades iniciais. */
  protected readonly vagasMelhoria = computed<readonly VagaMelhoria[]>(() => {
    const p = this.progressaoAcumulada();
    const civil = this.classeCalculada() === ClasseEnum.CIVIL;
    const pacote = this.pacoteHabilidadesSelecionado();
    const quantidadeInicial = (tipo: TipoVagaMelhoria): number => pacote?.vagas.find((vagaInicial) => vagaInicial.tipo === tipo)?.quantidade ?? 0;
    const vaga = (tipo: TipoVagaMelhoria, alvo: number): VagaMelhoria | null => alvo > 0 ? { tipo, rotulo: this.rotuloVaga(tipo), alvo } : null;
    const vagas = civil
      ? [vaga('classe', p.habilidadesClasse), vaga('civil', p.habilidadesCivis + quantidadeInicial('civil'))]
      : [vaga('geral', p.habilidadesGerais + quantidadeInicial('geral')), vaga('classe', p.habilidadesClasse + quantidadeInicial('classe')), vaga('classeOuArquetipo', p.habilidadesClasseOuArquetipo + quantidadeInicial('classeOuArquetipo')), vaga('outraClasse', p.habilidadesOutraClasse + quantidadeInicial('outraClasse'))];
    return vagas.filter((v): v is VagaMelhoria => v !== null);
  });
  /** Vagas de Fortificação de Personalidade (níveis 7/14) — 0, 1 ou 2. */
  protected readonly alvoFortificacoes = computed(() => this.progressaoAcumulada().fortificacoes);
  /** Ganhos automáticos do nível (sem escolha) — reusa `calcularDerivados`, nenhuma fórmula nova aqui. */
  protected readonly derivadosNivel = computed(() => calcularDerivados(this.classeCalculada(), this.nivelInicial(), this.atributosFinais(), this.habilidadesDoNivel()));
  /** Nomes já indisponíveis para escolha: a Habilidade Inicial (não consome vaga) + o que já foi escolhido no passo. */
  protected readonly nomesEscolhidosMelhoria = computed(() => {
    const nomes = this.estado().melhorias.map((m) => m.habilidade.nome);
    const inicial = this.habilidadeInicial();
    return new Set(inicial ? [...nomes, inicial.nome] : nomes);
  });
  /** Grupos do catálogo já filtrados para a vaga aberta no seletor — `[]` com o seletor fechado. */
  protected readonly gruposVagaAberta = computed<readonly GrupoHabilidades[]>(() => {
    const vaga = this.vagaAberta();
    return vaga ? this.gruposParaVaga(vaga) : [];
  });
  /** Habilidades do catálogo + Fortificações preenchidas — o que vai para `dados.habilidades` além da Inicial. */
  protected readonly habilidadesDoNivel = computed<readonly FichaHabilidadeDto[]>(() => {
    if (!this.comHabilidades()) return [];
    const daCatalogo = this.estado().melhorias.map((m) => m.habilidade);
    const fortificacoes: FichaHabilidadeDto[] = this.estado().fortificacoes
      .slice(0, this.alvoFortificacoes())
      .filter((f) => f.nome.trim().length > 0)
      .map((f) => ({ nome: f.nome.trim(), categoria: HabilidadeCategoriaEnum.PERSONALIDADE, custoEnergia: 0, descricao: f.descricao.trim() }));
    return [...daCatalogo, ...fortificacoes];
  });
  /** `true` quando a Peculiaridade já foi escolhida no passo // Habilidades — Experimento com ela não tem Origem (m3-41). */
  protected readonly temPeculiaridade = computed(() => {
    const classe = this.estado().classe;
    return classe !== null && experimentoComPeculiaridade(classe, this.habilidadesDoNivel());
  });
  /** `true` quando todas as vagas (catálogo + Fortificações) do passo estão preenchidas — trava dura da m3-58. */
  protected readonly melhoriasCompletas = computed(() => {
    const vagasOk = this.vagasMelhoria().every((v) => this.preenchidasNaVaga(v.tipo) >= v.alvo);
    const fortOk = this.estado().fortificacoes.slice(0, this.alvoFortificacoes()).every((f) => f.nome.trim().length > 0 && f.descricao.trim().length > 0);
    return this.pacoteHabilidadesSelecionado() !== null && vagasOk && fortOk;
  });
  /** Total de vagas (catálogo + Fortificações) e quantas já foram preenchidas — só para o resumo lateral. */
  protected readonly melhoriasAlvoTotal = computed(() => this.vagasMelhoria().reduce((soma, v) => soma + v.alvo, 0) + this.alvoFortificacoes());
  protected readonly melhoriasPreenchidasTotal = computed(() => this.estado().melhorias.length + this.estado().fortificacoes.slice(0, this.alvoFortificacoes()).filter((f) => f.nome.trim() && f.descricao.trim()).length);

  /** Tetos do Equipamento Inicial (m3-59) — `shared/regras`, doc: soma ≤ $2500 e peso ≤ 5. */
  protected readonly kitOrcamentoMaximo = KIT_INICIAL_ORCAMENTO_MAXIMO;
  protected readonly kitPesoMaximo = KIT_INICIAL_PESO_MAXIMO;
  /** Gasto/peso do kit — mesma função do motor de compras que soma o carrinho da Loja (m1-10) e do Inventário (m3-14). */
  protected readonly kitTotais = computed(() => calcularTotaisCarrinho({ itens: this.estado().kit, amplificadores: [] }));
  /** Trava dura do passo // EQUIPAMENTO INICIAL — kit vazio (0/0) sempre válido, então o passo é pulável. */
  protected readonly kitValido = computed(() => this.kitTotais().gasto <= KIT_INICIAL_ORCAMENTO_MAXIMO && this.kitTotais().pesoUsado <= KIT_INICIAL_PESO_MAXIMO);
  /** Preenchimento dos medidores (0–100%) — trilho nunca estoura a barra mesmo estourado o teto. */
  protected readonly kitGastoPercentual = computed(() => Math.min(100, (this.kitTotais().gasto / KIT_INICIAL_ORCAMENTO_MAXIMO) * 100));
  protected readonly kitPesoPercentual = computed(() => Math.min(100, (this.kitTotais().pesoUsado / KIT_INICIAL_PESO_MAXIMO) * 100));

  constructor() {
    this.destroyRef.onDestroy(() => this.revogarPreviewImagem());
    const existente = this.rascunhos.recuperar<EstadoGuiaCriacao>(this.campanhaId); this.temRascunho.set(existente !== null);
    const campanhaId = this.campanhaId;
    forkJoin({
      membros: campanhaId !== null ? this.campanhaService.listarMembros(campanhaId) : of([]),
      fichas: campanhaId !== null ? this.fichaService.listarFichas(campanhaId) : of([]),
    })
      .pipe(finalize(() => this.carregando.set(false))).subscribe(({ membros, fichas }) => { this.membros.set(membros); this.fichas.set(fichas); if (!fichas.length) return; this.atualizar({ mediaNivel: fichas.reduce((s, f) => s + f.nivel, 0) / fichas.length, mediaPrestigio: fichas.reduce((s, f) => s + (f.prestigio ?? 0), 0) / fichas.length }); });
    // `!this.temRascunho()` evita sobrescrever o rascunho salvo antes do jogador decidir "Retomar"
    // ou "Começar do zero": sem essa trava, este efeito salvava o estado inicial (vazio) assim que
    // `carregando()` virava `false` — antes de qualquer clique — apagando o rascunho que o banner
    // "Rascunho encontrado" ainda estava oferecendo para retomar.
    effect(() => { if (!this.carregando() && !this.temRascunho()) this.rascunhos.salvar(this.campanhaId, this.estado()); });
    // A trilha ganha/perde o passo Melhorias conforme o Nível inicial muda (voltar ao passo 03 e
    // editar as médias) — mantém `passo`/`visitado` dentro dos limites da trilha atual.
    effect(() => { const max = this.passos().length - 1; if (this.estado().passo > max) this.atualizar({ passo: max }); if (this.visitado() > max) this.visitado.set(max); });
    // Sincroniza o `<dialog>` nativo de saída com `confirmandoSaida()` — `showModal()`/`close()` são
    // imperativos, não têm equivalente declarativo em template. `close()` num dialog já fechado (ex.:
    // Esc, que o navegador fecha sozinho antes deste efeito rodar) é um no-op — seguro de chamar
    // sempre. O `typeof` guarda o ambiente de teste (jsdom não implementa `HTMLDialogElement`).
    effect(() => {
      const dialog = this.sairDialog()?.nativeElement;
      if (!dialog || typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') return;
      if (this.confirmandoSaida()) { if (!dialog.open) dialog.showModal(); } else { dialog.close(); }
    });
  }
  protected retomar(): void { const salvo = this.rascunhos.recuperar<EstadoGuiaCriacao>(this.campanhaId); if (salvo) { const normalizado = normalizarEstado(salvo); this.estado.set(normalizado); this.visitado.set(normalizado.passo); } this.temRascunho.set(false); }
  protected recomecar(): void { this.rascunhos.limpar(this.campanhaId); this.temRascunho.set(false); }
  protected atualizar(parcial: Partial<EstadoGuiaCriacao>): void { this.estado.update((atual) => ({ ...atual, ...parcial })); }
  protected valor(evento: Event): string { return (evento.target as HTMLInputElement).value; }
  protected numero(evento: Event): number { return Number(this.valor(evento)); }
  /** Primeira etapa do seletor de Classe (P-019): trocar a classe-base sempre reseta a segunda
   * etapa e tudo que dependia dela — mesmo reset completo que a troca de classe fazia no select
   * único. Civil não tem segunda etapa, então já fecha `classe` aqui mesmo. */
  protected mudarClasseBase(evento: Event): void {
    const valor = this.valor(evento);
    const classeBase = valor ? valor as ClasseEnum : null;
    const classe = classeBase === ClasseEnum.CIVIL ? classeBase : null;
    this.atualizar({ classeBase, classe, arquetipo: null, bonusEscolhido: [], pacoteHabilidadesId: null, melhorias: [] });
  }
  protected mudarMotivo(evento: Event): void { this.atualizar({ motivo: this.valor(evento) as MotivoEntradaAgenteEnum }); }
  /** Segunda etapa do seletor de Classe (P-019): escolhe um arquétipo regular ou a subclasse de
   * Experimento da classe-base atual — `gruposPerfil()` já resolve qual é qual. Só reseta o pacote
   * de Habilidades iniciais e as melhorias já escolhidas quando a `classe` final muda de fato (pick
   * de subclasse ↔ arquétipo); trocar entre dois arquétipos da mesma base preserva ambos, como o
   * antigo `mudarArquetipo` já fazia. */
  protected mudarPerfil(evento: Event): void {
    const valor = this.valor(evento);
    const classeBase = this.classeBaseAtual();
    if (!valor || !classeBase) {
      this.atualizar({ classe: classeBase, arquetipo: null, bonusEscolhido: [] });
      return;
    }
    const opcao = this.gruposPerfil().flatMap((grupo) => grupo.opcoes).find((o) => o.valor === valor);
    if (!opcao) return;
    const classeAnterior = this.estado().classe;
    const classe = opcao.tipo === 'subclasse' ? opcao.valor as ClasseEnum : classeBase;
    const arquetipo = opcao.tipo === 'arquetipo' ? opcao.valor as ArquetipoEnum : null;
    this.atualizar({
      classe, arquetipo, bonusEscolhido: [],
      ...(classe !== classeAnterior ? { pacoteHabilidadesId: null, melhorias: [] } : {}),
    });
  }
  /** Grava a escolha do jogador na posição `indice` de `bonusEscolhido` (substitui, não acumula).
   * Recebe o `Event` bruto do `<select>` e faz o cast — mesmo padrão de `mudarArquetipo`. */
  protected escolherBonusAtributo(indice: number, evento: Event): void {
    const valor = this.valor(evento);
    const chave = valor ? valor as ChaveAtributo : null;
    const bonusEscolhido = this.slotsEscolhaBonus().map((_, i) => (i === indice ? chave : this.estado().bonusEscolhido[i] ?? null));
    this.atualizar({ bonusEscolhido });
  }
  protected atualizarOrigem(campo: 'nome' | 'descricao' | 'saberDeCampo', valor: string): void { this.atualizar({ origem: { ...this.estado().origem, [campo]: valor } }); }
  protected atualizarEspecialidade(campo: 'gatilho' | 'efeito', valor: string): void { const origem = this.estado().origem; this.atualizar({ origem: { ...origem, especialidade: { ...origem.especialidade, [campo]: valor } } }); }
  protected mudarBonusFormacao(indice: number, evento: Event): void {
    const valor = this.valor(evento);
    const customizada = valor === '__OUTRA__';
    const bonus = valor && !customizada ? valor as FormacaoBonusEnum : null;
    const origem = this.estado().origem;
    const formacao = origem.formacao.map((item, atual) => atual === indice
      ? { bonus, parametro: null, texto: bonus ? FORMACOES[bonus].rotulo : '' }
      : item);
    const formacoesCustomizadas = this.estado().formacoesCustomizadas.map((atualCustomizada, atual) => atual === indice ? customizada : atualCustomizada);
    this.atualizar({ origem: { ...origem, formacao }, formacoesCustomizadas });
  }
  protected atualizarParametroFormacao(indice: number, valor: string): void {
    const origem = this.estado().origem;
    const formacao = origem.formacao.map((item, atual) => atual === indice ? { ...item, parametro: valor || null } : item);
    this.atualizar({ origem: { ...origem, formacao } });
  }
  protected atualizarTextoFormacao(indice: number, texto: string): void {
    const origem = this.estado().origem;
    const formacao = origem.formacao.map((item, atual) => atual === indice ? { ...item, texto } : item);
    this.atualizar({ origem: { ...origem, formacao } });
  }
  protected definicaoFormacao(indice: number): FormacaoDefinicaoDto | null {
    const bonus = this.estado().origem.formacao[indice]?.bonus;
    return bonus ? FORMACOES[bonus] : null;
  }
  protected rotuloParametroFormacao(parametro: FormacaoParametroEnum): string { return rotuloParametroFormacao(parametro); }
  protected passoAtributo(chave: ChaveAtributo, delta: number): void {
    const atual = this.estado();
    const valor = Math.max(0, Math.min(this.limiteAtributo(chave), atual.atributos[chave] + delta));
    const valorFinal = valor + (this.bonusAtributos()[chave] ?? 0);
    const maestria = atual.maestria === chave && !maestriaAtingivel(valorFinal) ? null : atual.maestria;
    this.atualizar({ atributos: { ...atual.atributos, [chave]: valor }, maestria });
  }
  /** `true` se o atributo já tem os 6 pontos exigidos para receber a Maestria (doc — "⬥ Maestrias") no valor **final** (com o bônus fixo já somado — mesmo valor que `construirFichaInicial` valida). */
  protected maestriaHabilitada(chave: ChaveAtributo): boolean { return maestriaAtingivel(this.atributosFinais()[chave]); }
  /** Marca/desmarca a Maestria num atributo — única na ficha, só disponível com 6+ pontos e custa 2 pontos extras do orçamento. */
  protected alternarMaestria(chave: ChaveAtributo): void {
    if (!this.maestriaHabilitada(chave)) return;
    this.atualizar({ maestria: this.estado().maestria === chave ? null : chave });
  }
  protected selecionarPacoteHabilidades(id: HabilidadesPacoteInicialId): void {
    if (!this.pacotesHabilidadesIniciais().some((pacote) => pacote.id === id)) return;
    this.atualizar({ pacoteHabilidadesId: id });
    const limites = new Map(this.vagasMelhoria().map((vaga) => [vaga.tipo, vaga.alvo]));
    const contagem = new Map<TipoVagaMelhoria, number>();
    const melhorias = this.estado().melhorias.filter((melhoria) => {
      const atual = contagem.get(melhoria.vaga) ?? 0;
      if (atual >= (limites.get(melhoria.vaga) ?? 0)) return false;
      contagem.set(melhoria.vaga, atual + 1);
      return true;
    });
    this.atualizar({ melhorias });
  }

  /**
   * Grupos do catálogo de habilidades (`shared/regras`) filtrados para uma vaga do passo //
   * HABILIDADES: 'geral' é sempre a Aba Gerais inteira; 'classe'/'classeOuArquetipo' mostram só o(s)
   * subgrupo(s) **da própria ficha**; 'outraClasse' mostra os demais (as duas outras classes-base +
   * os outros arquétipos da mesma classe — exatamente o pick de "outra classe/outro arquétipo da
   * sua classe" do documento); 'civil' é a lista fechada de Habilidades Civis. O caso especial é o
   * Civil no Treinamento Elite ("1 Habilidade de Classe", sem marcar nenhuma como "sua", já que
   * Civil não tem classe) — usa uma classe-base qualquer só para obter a lista das 3.
   */
  private gruposParaVaga(vaga: TipoVagaMelhoria): readonly GrupoHabilidades[] {
    const classe = this.classeCalculada();
    if (vaga === 'civil') return catalogoHabilidades(ClasseEnum.CIVIL, null);
    if (classe === ClasseEnum.CIVIL) {
      const grupo = catalogoHabilidades(ClasseEnum.COMBATENTE, null).find((g) => g.id === 'classe');
      return grupo ? [{ ...grupo, subgrupos: grupo.subgrupos.map((s) => ({ ...s, ehDaFicha: false })) }] : [];
    }
    if (vaga === 'geral') return catalogoHabilidades(classe, this.estado().arquetipo).filter((g) => g.id === 'gerais');
    const arquetipo = ehClasseBase(classe) ? this.estado().arquetipo : null;
    // 'subclasse' entra junto de 'arquetipo' (P-014 follow-up: viraram abas separadas no catálogo,
    // mas continuam sendo o mesmo pick de "Classe ou Arquétipo/Subclasse" pra quem tem subclasse).
    const idsRelevantes: readonly GrupoHabilidades['id'][] =
      vaga === 'classe' ? ['classe'] : ['classe', 'subclasse', 'arquetipo'];
    const propriaOrigem = vaga === 'classe' || vaga === 'classeOuArquetipo';
    return catalogoHabilidades(classe, arquetipo)
      .filter((g) => idsRelevantes.includes(g.id))
      .map((g) => ({ ...g, subgrupos: g.subgrupos.filter((s) => s.ehDaFicha === propriaOrigem) }))
      .filter((g) => g.subgrupos.length > 0);
  }
  protected preenchidasNaVaga(vaga: TipoVagaMelhoria): number { return this.estado().melhorias.filter((m) => m.vaga === vaga).length; }
  protected melhoriasDaVaga(vaga: TipoVagaMelhoria): readonly FichaHabilidadeDto[] { return this.estado().melhorias.filter((m) => m.vaga === vaga).map((m) => m.habilidade); }
  protected abrirSeletorMelhoria(vaga: TipoVagaMelhoria): void { this.vagaAberta.set(vaga); }
  protected fecharSeletorMelhoria(): void { this.vagaAberta.set(null); }
  protected adicionarMelhoria(item: HabilidadeCatalogoItemDto): void {
    const vaga = this.vagaAberta();
    if (!vaga) return;
    if (this.nomesEscolhidosMelhoria().has(item.nome)) return;
    const alvo = this.vagasMelhoria().find((vagaDisponivel) => vagaDisponivel.tipo === vaga)?.alvo ?? 0;
    if (this.preenchidasNaVaga(vaga) >= alvo) return;
    const habilidade: FichaHabilidadeDto = { nome: item.nome, categoria: item.categoria, custoEnergia: item.custoEnergia, descricao: item.descricao, ...(item.origem === undefined ? {} : { origem: item.origem }) };
    this.atualizar({ melhorias: [...this.estado().melhorias, { vaga, habilidade }] });
  }
  protected removerMelhoria(nome: string): void { this.atualizar({ melhorias: this.estado().melhorias.filter((m) => m.habilidade.nome !== nome) }); }
  protected atualizarFortificacao(indice: number, campo: 'nome' | 'descricao', valor: string): void {
    const fortificacoes = this.estado().fortificacoes.map((f, i) => i === indice ? { ...f, [campo]: valor } : f);
    this.atualizar({ fortificacoes });
  }
  protected mudarKit(itens: readonly CarrinhoItemDto[]): void { this.atualizar({ kit: itens }); }
  protected passoValido(): boolean {
    const e = this.estado();
    switch (this.passos()[e.passo]) {
      case 'Base': return e.nome.trim().length > 0;
      case 'Classe': return e.classe !== null && (!ehClasseBase(e.classe) || e.arquetipo !== null)
        && this.slotsEscolhaBonus().every((_, indice) => e.bonusEscolhido[indice] != null);
      case 'Atributos': return e.modoLivre || (this.distribuicao().saldo === 0 && this.distribuicao().violacoes.length === 0);
      case 'Identidade': return e.personalidade.trim().length > 0
        && !/\s/.test(e.personalidade.trim())
        && (this.temPeculiaridade() || (
          e.origem.nome.trim().length > 0
          && e.origem.descricao.trim().length > 0
          && e.origem.formacao.every((item, indice) => (item.bonus !== null || e.formacoesCustomizadas[indice])
            && item.texto.trim().length > 0
            && (!this.definicaoFormacao(indice)?.parametro || Boolean(item.parametro?.trim())))
          && e.origem.especialidade.gatilho.trim().length > 0
          && e.origem.especialidade.efeito.trim().length > 0
          && e.origem.saberDeCampo.trim().length > 0
        ));
      case 'Habilidades': return e.modoLivre || this.melhoriasCompletas();
      case 'Recursos': return e.dinheiro.rolado && !this.rolandoRecursos();
      case 'Equipamento inicial': return e.modoLivre || this.kitValido();
      default: return true;
    }
  }
  protected ir(passo: number): void { if (passo <= this.visitado()) this.atualizar({ passo }); }
  protected avancar(): void { if (!this.passoValido()) return; const proximo = Math.min(this.passos().length - 1, this.estado().passo + 1); this.visitado.update((v) => Math.max(v, proximo)); this.atualizar({ passo: proximo }); }
  protected voltar(): void { this.atualizar({ passo: Math.max(0, this.estado().passo - 1) }); }
  protected iniciarRolagemRecursos(): void {
    if (this.estado().dinheiro.rolado || this.rolandoRecursos()) return;
    this.rolandoRecursos.set(true);
    timer(650).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.atualizar({ dinheiro: rolarDinheiro() });
      this.rolandoRecursos.set(false);
    });
  }
  protected sair(): void { this.confirmandoSaida.set(true); }
  protected confirmarSaida(): void { this.confirmandoSaida.set(false); void this.router.navigate(this.campanhaId !== null ? ['/painel', this.campanhaId] : ['/fichas']); }
  protected cancelarSaida(): void { this.confirmandoSaida.set(false); }
  /** Clique no `::backdrop` do `<dialog>` cai no próprio elemento (não num filho) — fecha como "Continuar aqui". */
  protected fecharAoClicarFora(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.cancelarSaida(); }
  protected criar(): void {
    const e = this.estado();
    if (this.criando() || !e.classe || !e.dinheiro.rolado) return;
    this.criando.set(true);
    this.erro.set('');
    const resultado = construirFichaInicial({ nome: e.nome, cor: e.cor, classe: e.classe, arquetipo: e.arquetipo, bonusEscolhido: e.bonusEscolhido, nivel: this.nivelInicial(), prestigio: this.prestigioInicial(), atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: this.temPeculiaridade() ? null : e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '', habilidadesExtras: this.habilidadesDoNivel(), equipamentoInicial: e.kit });
    const campanhaId = this.campanhaId;
    this.fichaService.criarFicha({ ...(campanhaId !== null ? { campanhaId } : {}), usuarioId: this.ehMestre() ? (e.usuarioId ?? undefined) : undefined, ...resultado })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: (ficha) => {
          this.rascunhos.limpar(campanhaId);
          const destino = campanhaId !== null ? ['/painel', campanhaId, 'ficha', ficha.id] : ['/fichas', ficha.id];
          const arquivo = this.imagemArquivo();
          // Avatar (m3-62): a ficha já existe — segundo request, em sequência. Falha no upload não
          // desfaz a ficha criada nem trava a navegação; só fica sem avatar, subível depois pelo cabeçalho.
          if (!arquivo) {
            void this.router.navigate(destino);
            return;
          }
          this.fichaService
            .alterarImagem(ficha.id, arquivo)
            .pipe(catchError(() => of(null)))
            .subscribe(() => void this.router.navigate(destino));
        },
        error: (erro) => this.erro.set(erro?.error?.mensagem ?? 'Não foi possível criar a ficha.'),
      });
  }
}
