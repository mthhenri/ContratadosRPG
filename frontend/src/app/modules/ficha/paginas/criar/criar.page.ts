import { Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArquetipoEnum, ClasseEnum, FormacaoBonusEnum, FormacaoParametroEnum, HabilidadeCategoriaEnum, MotivoEntradaAgenteEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaOrigemDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularDerivados, calcularEnergia, calcularOrcamentoAtributos, calcularProgressaoAcumulada, calcularVida, catalogoHabilidades, habilidadesIniciais, obterBonusAtributos, obterSaudeClasse, validarDistribuicaoAtributos } from '@contratados-rpg/shared/regras/agente';
import type { GrupoHabilidades, HabilidadeCatalogoItemDto } from '@contratados-rpg/shared/regras/agente';
import { calcularDinheiroInicial, calcularNovoAgente } from '@contratados-rpg/shared/regras/novo-agente';
import { rolarDados } from '@contratados-rpg/shared/regras/descanso';
import { FORMACOES } from '@contratados-rpg/shared/regras/identidade';
import type { FormacaoDefinicaoDto } from '@contratados-rpg/shared/regras/identidade';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../ficha.service';
import { ATRIBUTOS_BASE_PADRAO, construirFichaInicial } from '../../ficha-padrao';
import { arquetiposDaClasse, GRUPOS_CLASSE, ehClasseBase } from '../../opcoes-ficha';
import { GRUPOS_FORMACAO, rotuloParametroFormacao } from '../../opcoes-formacao';
import { rotuloArquetipo, rotuloClasse, rotuloClasseCompleto, rotuloMotivoEntrada } from '../../rotulos-ficha';
import { descricaoClasse as textoGuiaClasse, focoArquetipo as textoFocoArquetipo } from '../../guia-briefing';
import { lerParamRota } from '../../ler-param-rota';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { FichaHabilidadeSeletor } from '../../componentes/ficha-habilidade-seletor/ficha-habilidade-seletor.component';

/** Vaga de melhoria de nível (m3-58) — cada uma casa com um campo de `ProgressaoAcumuladaDto`. */
type TipoVagaMelhoria = 'geral' | 'classe' | 'classeOuArquetipo' | 'outraClasse' | 'civil';
interface VagaMelhoria { readonly tipo: TipoVagaMelhoria; readonly rotulo: string; readonly alvo: number; }
interface MelhoriaEscolhida { readonly vaga: TipoVagaMelhoria; readonly habilidade: FichaHabilidadeDto; }
/** Rascunho de uma Fortificação de Personalidade (níveis 7/14) — vira `FichaHabilidadeDto` na criação. */
interface FortificacaoRascunho { readonly nome: string; readonly descricao: string; }

type ChaveAtributo = keyof FichaAtributosDto;
interface DinheiroRolado { readonly dados: readonly number[]; readonly inicial: number; readonly rolado: boolean; }
interface EstadoGuiaCriacao {
  readonly passo: number; readonly nome: string; readonly usuarioId: number | null;
  readonly classe: ClasseEnum | null; readonly arquetipo: ArquetipoEnum | null;
  readonly motivo: MotivoEntradaAgenteEnum; readonly mediaNivel: number; readonly mediaPrestigio: number;
  readonly atributos: FichaAtributosDto; readonly maestria: ChaveAtributo | null; readonly modoLivre: boolean;
  readonly personalidade: string; readonly origem: FichaOrigemDto; readonly formacoesCustomizadas: readonly boolean[];
  readonly dinheiro: DinheiroRolado;
  /** Habilidades de nível escolhidas no passo // MELHORIAS (m3-58) — vazio até o passo existir. */
  readonly melhorias: readonly MelhoriaEscolhida[];
  /** Sempre 2 posições (mesmo padrão de `origem.formacao`); só as `alvoFortificacoes()` primeiras contam. */
  readonly fortificacoes: readonly FortificacaoRascunho[];
}

const origemVazia = (): FichaOrigemDto => ({ nome: '', descricao: '', formacao: [{ bonus: null, parametro: null, texto: '' }, { bonus: null, parametro: null, texto: '' }], especialidade: { gatilho: '', efeito: '' }, saberDeCampo: '' });
const dinheiroVazio = (): DinheiroRolado => ({ dados: [], inicial: 0, rolado: false });
const fortificacoesVazias = (): FortificacaoRascunho[] => [{ nome: '', descricao: '' }, { nome: '', descricao: '' }];
const rolarDinheiro = (): DinheiroRolado => { const dados = rolarDados({ quantidade: 4, faces: 4 }); const rolagem = calcularDinheiroInicial({ somaDados: dados.reduce((soma, dado) => soma + dado, 0) }); return { dados, inicial: rolagem.dinheiro, rolado: true }; };

function normalizarEstado(estado: EstadoGuiaCriacao): EstadoGuiaCriacao {
  return {
    ...estado,
    formacoesCustomizadas: estado.formacoesCustomizadas ?? estado.origem.formacao.map((item) => item.bonus === null && item.texto.trim().length > 0),
    dinheiro: { ...estado.dinheiro, rolado: estado.dinheiro.rolado ?? estado.dinheiro.dados.length === 4 },
    melhorias: estado.melhorias ?? [],
    fortificacoes: estado.fortificacoes ?? fortificacoesVazias(),
  };
}

@Component({ selector: 'app-ficha-criar', imports: [CommonModule, Icone, FichaHabilidadeSeletor], templateUrl: './criar.page.html', styleUrl: './criar.page.scss' })
export class FichaCriar {
  private readonly destroyRef = inject(DestroyRef);
  private readonly rota = inject(ActivatedRoute); private readonly router = inject(Router);
  private readonly campanhaService = inject(CampanhaService); private readonly fichaService = inject(FichaService);
  private readonly sessaoService = inject(SessaoService); private readonly rascunhos = inject(GuiaCriacaoRascunhoService);
  protected readonly campanhaId = Number(lerParamRota(this.rota, 'campanhaId'));
  protected readonly gruposClasse = GRUPOS_CLASSE;
  protected readonly gruposFormacao = GRUPOS_FORMACAO;
  protected readonly parametroEsquivaOuBloqueio = FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO;
  protected readonly campos: readonly { chave: ChaveAtributo; nome: string }[] = [
    { chave: 'destreza', nome: 'Destreza' }, { chave: 'forca', nome: 'Força' }, { chave: 'luta', nome: 'Luta' },
    { chave: 'pontaria', nome: 'Pontaria' }, { chave: 'vigor', nome: 'Vigor' }, { chave: 'intelecto', nome: 'Intelecto' },
    { chave: 'medicina', nome: 'Medicina' }, { chave: 'sentidos', nome: 'Sentidos' }, { chave: 'social', nome: 'Social' },
    { chave: 'vontade', nome: 'Vontade' },
  ];
  /** Rótulo de cada vaga de melhoria (m3-58), na ordem de exibição do passo. */
  private static readonly ROTULOS_VAGA: Readonly<Record<TipoVagaMelhoria, string>> = {
    geral: 'Habilidade Geral', classe: 'Habilidade de Classe', classeOuArquetipo: 'Classe ou Arquétipo',
    outraClasse: 'Outra classe / outro arquétipo', civil: 'Habilidade Civil',
  };
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]); protected readonly fichas = signal<FichaResumoDto[]>([]);
  protected readonly carregando = signal(true); protected readonly criando = signal(false); protected readonly rolandoRecursos = signal(false); protected readonly erro = signal('');
  protected readonly resumoAberto = signal(false); protected readonly visitado = signal(0); protected readonly temRascunho = signal(false);
  /** Confirmação de saída do guia — substitui o `confirm()` nativo do navegador por um `<dialog>`. */
  protected readonly confirmandoSaida = signal(false);
  private readonly sairDialog = viewChild<ElementRef<HTMLDialogElement>>('sairDialog');
  /** Vaga com o seletor do sistema aberto (`null` = fechado) — m3-58. */
  protected readonly vagaAberta = signal<TipoVagaMelhoria | null>(null);
  protected readonly estado = signal<EstadoGuiaCriacao>({ passo: 0, nome: '', usuarioId: null, classe: null,
    arquetipo: null, motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO, mediaNivel: 0, mediaPrestigio: 0,
    atributos: { ...ATRIBUTOS_BASE_PADRAO }, maestria: null, modoLivre: false, personalidade: '', origem: origemVazia(),
    formacoesCustomizadas: [false, false], dinheiro: dinheiroVazio(), melhorias: [], fortificacoes: fortificacoesVazias() });
  protected readonly ehMestre = computed(() => this.membros().find((m) => m.usuarioId === this.sessaoService.usuario()?.id)?.papel === TipoCampanhaMembroPapelEnum.MESTRE);
  protected readonly arquetipos = computed(() => {
    const classe = this.estado().classe;
    return classe ? arquetiposDaClasse(classe) : [];
  });
  protected readonly novoAgente = computed(() => calcularNovoAgente({ motivo: this.estado().motivo, mediaNivel: this.estado().mediaNivel, mediaPrestigio: this.estado().mediaPrestigio }));
  protected readonly classeCalculada = computed(() => this.estado().classe ?? ClasseEnum.COMBATENTE);
  protected readonly distribuicao = computed(() => validarDistribuicaoAtributos({ classe: this.classeCalculada(), nivel: this.novoAgente().nivelInicial, atributos: this.estado().atributos }));
  protected readonly orcamento = computed(() => calcularOrcamentoAtributos({ classe: this.classeCalculada(), nivel: this.novoAgente().nivelInicial }));
  protected readonly bonusMonetario = computed(() => this.fichas().length ? this.novoAgente().bonus.bonus : 0);
  protected readonly totalDinheiro = computed(() => this.estado().dinheiro.rolado ? this.estado().dinheiro.inicial + this.bonusMonetario() : 0);
  /** Bônus fixo de atributos do perfil (arquétipo/subclasse) atual — `{}` sem perfil definitivo. */
  protected readonly bonusAtributos = computed(() => obterBonusAtributos({ classe: this.classeCalculada(), arquetipo: this.estado().arquetipo }));
  protected readonly bonusAtributosLista = computed(() => this.campos
    .map((campo) => ({ nome: campo.nome, valor: this.bonusAtributos()[campo.chave] ?? 0 }))
    .filter(({ valor }) => valor !== 0));
  protected readonly atributosFinais = computed(() => { const bonus = this.bonusAtributos(); const atributos = { ...this.estado().atributos }; this.campos.forEach(({ chave }) => atributos[chave] += bonus[chave] ?? 0); return atributos; });
  protected readonly vida = computed(() => calcularVida({ classe: this.classeCalculada(), nivel: this.novoAgente().nivelInicial, vigor: this.atributosFinais().vigor }));
  protected readonly energia = computed(() => calcularEnergia({ classe: this.classeCalculada(), nivel: this.novoAgente().nivelInicial, destreza: this.atributosFinais().destreza }));
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

  /** `true` quando o Nível/Treinamento inicial (passo 03) é maior que 0 — só então o passo // MELHORIAS existe (m3-58). */
  protected readonly temMelhorias = computed(() => this.fichas().length > 0 && this.novoAgente().nivelInicial > 0);
  /** Trilha de passos — 7 posições sem Melhorias, 8 com ela (entre Identidade e Recursos). */
  protected readonly passos = computed<readonly string[]>(() => {
    const base = ['Base', 'Classe', 'Novo agente', 'Atributos', 'Identidade'];
    return this.temMelhorias() ? [...base, 'Melhorias', 'Recursos', 'Revisão'] : [...base, 'Recursos', 'Revisão'];
  });
  /** Contagem acumulada de vagas do Nível 1 até o Nível inicial (`shared/regras`) — fonte única, proibição #26. */
  protected readonly progressaoAcumulada = computed(() => calcularProgressaoAcumulada({ classe: this.classeCalculada(), nivel: this.novoAgente().nivelInicial }));
  /** Vagas de habilidade do passo // MELHORIAS, só as com alvo > 0 — Civil nunca vê Geral/Classe própria/Arquétipo/Outra classe. */
  protected readonly vagasMelhoria = computed<readonly VagaMelhoria[]>(() => {
    const p = this.progressaoAcumulada();
    const civil = this.classeCalculada() === ClasseEnum.CIVIL;
    const vaga = (tipo: TipoVagaMelhoria, alvo: number): VagaMelhoria | null => alvo > 0 ? { tipo, rotulo: FichaCriar.ROTULOS_VAGA[tipo], alvo } : null;
    const vagas = civil
      ? [vaga('classe', p.habilidadesClasse), vaga('civil', p.habilidadesCivis)]
      : [vaga('geral', p.habilidadesGerais), vaga('classe', p.habilidadesClasse), vaga('classeOuArquetipo', p.habilidadesClasseOuArquetipo), vaga('outraClasse', p.habilidadesOutraClasse)];
    return vagas.filter((v): v is VagaMelhoria => v !== null);
  });
  /** Vagas de Fortificação de Personalidade (níveis 7/14) — 0, 1 ou 2. */
  protected readonly alvoFortificacoes = computed(() => this.progressaoAcumulada().fortificacoes);
  /** Ganhos automáticos do nível (sem escolha) — reusa `calcularDerivados`, nenhuma fórmula nova aqui. */
  protected readonly derivadosNivel = computed(() => calcularDerivados(this.classeCalculada(), this.novoAgente().nivelInicial, this.atributosFinais(), this.habilidadesDoNivel()));
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
    if (!this.temMelhorias()) return [];
    const daCatalogo = this.estado().melhorias.map((m) => m.habilidade);
    const fortificacoes: FichaHabilidadeDto[] = this.estado().fortificacoes
      .slice(0, this.alvoFortificacoes())
      .filter((f) => f.nome.trim().length > 0)
      .map((f) => ({ nome: f.nome.trim(), categoria: HabilidadeCategoriaEnum.PERSONALIDADE, custoEnergia: 0, descricao: f.descricao.trim() }));
    return [...daCatalogo, ...fortificacoes];
  });
  /** `true` quando todas as vagas (catálogo + Fortificações) do passo estão preenchidas — trava dura da m3-58. */
  protected readonly melhoriasCompletas = computed(() => {
    const vagasOk = this.vagasMelhoria().every((v) => this.preenchidasNaVaga(v.tipo) >= v.alvo);
    const fortOk = this.estado().fortificacoes.slice(0, this.alvoFortificacoes()).every((f) => f.nome.trim().length > 0 && f.descricao.trim().length > 0);
    return vagasOk && fortOk;
  });
  /** Total de vagas (catálogo + Fortificações) e quantas já foram preenchidas — só para o resumo lateral. */
  protected readonly melhoriasAlvoTotal = computed(() => this.vagasMelhoria().reduce((soma, v) => soma + v.alvo, 0) + this.alvoFortificacoes());
  protected readonly melhoriasPreenchidasTotal = computed(() => this.estado().melhorias.length + this.estado().fortificacoes.slice(0, this.alvoFortificacoes()).filter((f) => f.nome.trim() && f.descricao.trim()).length);

  constructor() {
    const existente = this.rascunhos.recuperar<EstadoGuiaCriacao>(this.campanhaId); this.temRascunho.set(existente !== null);
    forkJoin({ membros: this.campanhaService.listarMembros(this.campanhaId), fichas: this.fichaService.listarFichas(this.campanhaId) })
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
  protected mudarClasse(evento: Event): void { const valor = this.valor(evento); this.atualizar({ classe: valor ? valor as ClasseEnum : null, arquetipo: null }); }
  protected mudarMotivo(evento: Event): void { this.atualizar({ motivo: this.valor(evento) as MotivoEntradaAgenteEnum }); }
  protected mudarArquetipo(evento: Event): void { const valor = this.valor(evento); this.atualizar({ arquetipo: valor ? valor as ArquetipoEnum : null }); }
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
  protected passoAtributo(chave: ChaveAtributo, delta: number): void { const atual = this.estado(); const limite = this.orcamento().maximoFinal; this.atualizar({ atributos: { ...atual.atributos, [chave]: Math.max(0, Math.min(limite, atual.atributos[chave] + delta)) } }); }

  /**
   * Grupos do catálogo de habilidades (`shared/regras`) filtrados para uma vaga do passo //
   * MELHORIAS: 'geral' é sempre a Aba Gerais inteira; 'classe'/'classeOuArquetipo' mostram só o(s)
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
    const idsRelevantes: readonly GrupoHabilidades['id'][] = vaga === 'classe' ? ['classe'] : ['classe', 'arquetipo'];
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
    const habilidade: FichaHabilidadeDto = { nome: item.nome, categoria: item.categoria, custoEnergia: item.custoEnergia, descricao: item.descricao, ...(item.origem === undefined ? {} : { origem: item.origem }) };
    this.atualizar({ melhorias: [...this.estado().melhorias, { vaga, habilidade }] });
  }
  protected removerMelhoria(nome: string): void { this.atualizar({ melhorias: this.estado().melhorias.filter((m) => m.habilidade.nome !== nome) }); }
  protected atualizarFortificacao(indice: number, campo: 'nome' | 'descricao', valor: string): void {
    const fortificacoes = this.estado().fortificacoes.map((f, i) => i === indice ? { ...f, [campo]: valor } : f);
    this.atualizar({ fortificacoes });
  }
  protected passoValido(): boolean {
    const e = this.estado();
    switch (this.passos()[e.passo]) {
      case 'Base': return e.nome.trim().length > 0;
      case 'Classe': return e.classe !== null && (!ehClasseBase(e.classe) || e.arquetipo !== null);
      case 'Atributos': return e.modoLivre || (this.distribuicao().saldo === 0 && this.distribuicao().violacoes.length === 0);
      case 'Identidade': return e.personalidade.trim().length > 0
        && !/\s/.test(e.personalidade.trim())
        && e.origem.nome.trim().length > 0
        && e.origem.descricao.trim().length > 0
        && e.origem.formacao.every((item, indice) => (item.bonus !== null || e.formacoesCustomizadas[indice])
          && item.texto.trim().length > 0
          && (!this.definicaoFormacao(indice)?.parametro || Boolean(item.parametro?.trim())))
        && e.origem.especialidade.gatilho.trim().length > 0
        && e.origem.especialidade.efeito.trim().length > 0
        && e.origem.saberDeCampo.trim().length > 0;
      case 'Melhorias': return e.modoLivre || this.melhoriasCompletas();
      case 'Recursos': return e.dinheiro.rolado && !this.rolandoRecursos();
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
  protected confirmarSaida(): void { this.confirmandoSaida.set(false); void this.router.navigate(['/painel', this.campanhaId]); }
  protected cancelarSaida(): void { this.confirmandoSaida.set(false); }
  /** Clique no `::backdrop` do `<dialog>` cai no próprio elemento (não num filho) — fecha como "Continuar aqui". */
  protected fecharAoClicarFora(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.cancelarSaida(); }
  protected criar(): void {
    const e = this.estado();
    if (this.criando() || !e.classe || !e.dinheiro.rolado) return;
    this.criando.set(true);
    this.erro.set('');
    const resultado = construirFichaInicial({ nome: e.nome, classe: e.classe, arquetipo: e.arquetipo, nivel: this.fichas().length ? this.novoAgente().nivelInicial : 0, prestigio: this.fichas().length ? this.novoAgente().prestigio.prestigioInicial : 0, atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '', habilidadesExtras: this.habilidadesDoNivel() });
    this.fichaService.criarFicha({ campanhaId: this.campanhaId, usuarioId: this.ehMestre() ? (e.usuarioId ?? undefined) : undefined, ...resultado })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({ next: (ficha) => { this.rascunhos.limpar(this.campanhaId); void this.router.navigate(['/painel', this.campanhaId, 'ficha', ficha.id]); }, error: (erro) => this.erro.set(erro?.error?.mensagem ?? 'Não foi possível criar a ficha.') });
  }
  @HostListener('window:beforeunload', ['$event']) protected antesDeSair(evento: BeforeUnloadEvent): void { if (!this.criando()) evento.preventDefault(); }
}
