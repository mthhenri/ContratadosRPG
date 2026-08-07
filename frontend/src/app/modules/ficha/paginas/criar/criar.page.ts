import { Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArquetipoEnum, ClasseEnum, FormacaoBonusEnum, FormacaoParametroEnum, MotivoEntradaAgenteEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAtributosDto, FichaOrigemDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularEnergia, calcularOrcamentoAtributos, calcularVida, habilidadesIniciais, obterBonusAtributos, validarDistribuicaoAtributos } from '@contratados-rpg/shared/regras/agente';
import type { HabilidadeCatalogoItemDto } from '@contratados-rpg/shared/regras/agente';
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
import { rotuloArquetipo, rotuloClasse, rotuloClasseCompleto } from '../../rotulos-ficha';
import { descricaoClasse as textoGuiaClasse, focoArquetipo as textoFocoArquetipo } from '../../guia-briefing';
import { lerParamRota } from '../../ler-param-rota';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { Icone } from '../../../../shared/icone/icone.component';

type ChaveAtributo = keyof FichaAtributosDto;
interface DinheiroRolado { readonly dados: readonly number[]; readonly inicial: number; readonly rolado: boolean; }
interface EstadoGuiaCriacao {
  readonly passo: number; readonly nome: string; readonly usuarioId: number | null;
  readonly classe: ClasseEnum | null; readonly arquetipo: ArquetipoEnum | null;
  readonly motivo: MotivoEntradaAgenteEnum; readonly mediaNivel: number; readonly mediaPrestigio: number;
  readonly atributos: FichaAtributosDto; readonly maestria: ChaveAtributo | null; readonly modoLivre: boolean;
  readonly personalidade: string; readonly origem: FichaOrigemDto; readonly formacoesCustomizadas: readonly boolean[];
  readonly dinheiro: DinheiroRolado;
}

const origemVazia = (): FichaOrigemDto => ({ nome: '', descricao: '', formacao: [{ bonus: null, parametro: null, texto: '' }, { bonus: null, parametro: null, texto: '' }], especialidade: { gatilho: '', efeito: '' }, saberDeCampo: '' });
const dinheiroVazio = (): DinheiroRolado => ({ dados: [], inicial: 0, rolado: false });
const rolarDinheiro = (): DinheiroRolado => { const dados = rolarDados({ quantidade: 4, faces: 4 }); const rolagem = calcularDinheiroInicial({ somaDados: dados.reduce((soma, dado) => soma + dado, 0) }); return { dados, inicial: rolagem.dinheiro, rolado: true }; };

function normalizarEstado(estado: EstadoGuiaCriacao): EstadoGuiaCriacao {
  return {
    ...estado,
    formacoesCustomizadas: estado.formacoesCustomizadas ?? estado.origem.formacao.map((item) => item.bonus === null && item.texto.trim().length > 0),
    dinheiro: { ...estado.dinheiro, rolado: estado.dinheiro.rolado ?? estado.dinheiro.dados.length === 4 },
  };
}

@Component({ selector: 'app-ficha-criar', imports: [CommonModule, Icone], templateUrl: './criar.page.html', styleUrl: './criar.page.scss' })
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
  protected readonly passos = ['Base', 'Classe', 'Novo agente', 'Atributos', 'Identidade', 'Recursos', 'Revisão'];
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]); protected readonly fichas = signal<FichaResumoDto[]>([]);
  protected readonly carregando = signal(true); protected readonly criando = signal(false); protected readonly rolandoRecursos = signal(false); protected readonly erro = signal('');
  protected readonly resumoAberto = signal(false); protected readonly visitado = signal(0); protected readonly temRascunho = signal(false);
  protected readonly estado = signal<EstadoGuiaCriacao>({ passo: 0, nome: '', usuarioId: null, classe: null,
    arquetipo: null, motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO, mediaNivel: 0, mediaPrestigio: 0,
    atributos: { ...ATRIBUTOS_BASE_PADRAO }, maestria: null, modoLivre: false, personalidade: '', origem: origemVazia(),
    formacoesCustomizadas: [false, false], dinheiro: dinheiroVazio() });
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

  constructor() {
    const existente = this.rascunhos.recuperar<EstadoGuiaCriacao>(this.campanhaId); this.temRascunho.set(existente !== null);
    forkJoin({ membros: this.campanhaService.listarMembros(this.campanhaId), fichas: this.fichaService.listarFichas(this.campanhaId) })
      .pipe(finalize(() => this.carregando.set(false))).subscribe(({ membros, fichas }) => { this.membros.set(membros); this.fichas.set(fichas); if (!fichas.length) return; this.atualizar({ mediaNivel: fichas.reduce((s, f) => s + f.nivel, 0) / fichas.length, mediaPrestigio: fichas.reduce((s, f) => s + (f.prestigio ?? 0), 0) / fichas.length }); });
    effect(() => { if (!this.carregando()) this.rascunhos.salvar(this.campanhaId, this.estado()); });
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
  protected passoValido(): boolean {
    const e = this.estado();
    switch (e.passo) {
      case 0: return e.nome.trim().length > 0;
      case 1: return e.classe !== null && (!ehClasseBase(e.classe) || e.arquetipo !== null);
      case 3: return e.modoLivre || (this.distribuicao().saldo === 0 && this.distribuicao().violacoes.length === 0);
      case 4: return e.personalidade.trim().length > 0
        && !/\s/.test(e.personalidade.trim())
        && e.origem.nome.trim().length > 0
        && e.origem.descricao.trim().length > 0
        && e.origem.formacao.every((item, indice) => (item.bonus !== null || e.formacoesCustomizadas[indice])
          && item.texto.trim().length > 0
          && (!this.definicaoFormacao(indice)?.parametro || Boolean(item.parametro?.trim())))
        && e.origem.especialidade.gatilho.trim().length > 0
        && e.origem.especialidade.efeito.trim().length > 0
        && e.origem.saberDeCampo.trim().length > 0;
      case 5: return e.dinheiro.rolado && !this.rolandoRecursos();
      default: return true;
    }
  }
  protected ir(passo: number): void { if (passo <= this.visitado()) this.atualizar({ passo }); }
  protected avancar(): void { if (!this.passoValido()) return; const proximo = Math.min(6, this.estado().passo + 1); this.visitado.update((v) => Math.max(v, proximo)); this.atualizar({ passo: proximo }); }
  protected voltar(): void { this.atualizar({ passo: Math.max(0, this.estado().passo - 1) }); }
  protected iniciarRolagemRecursos(): void {
    if (this.estado().dinheiro.rolado || this.rolandoRecursos()) return;
    this.rolandoRecursos.set(true);
    timer(650).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.atualizar({ dinheiro: rolarDinheiro() });
      this.rolandoRecursos.set(false);
    });
  }
  protected sair(): void { if (confirm('Seu progresso foi salvo. Deseja sair do guia?')) void this.router.navigate(['/painel', this.campanhaId]); }
  protected criar(): void {
    const e = this.estado();
    if (this.criando() || !e.classe || !e.dinheiro.rolado) return;
    this.criando.set(true);
    this.erro.set('');
    const resultado = construirFichaInicial({ nome: e.nome, classe: e.classe, arquetipo: e.arquetipo, nivel: this.fichas().length ? this.novoAgente().nivelInicial : 0, prestigio: this.fichas().length ? this.novoAgente().prestigio.prestigioInicial : 0, atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '' });
    this.fichaService.criarFicha({ campanhaId: this.campanhaId, usuarioId: this.ehMestre() ? (e.usuarioId ?? undefined) : undefined, ...resultado })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({ next: (ficha) => { this.rascunhos.limpar(this.campanhaId); void this.router.navigate(['/painel', this.campanhaId, 'ficha', ficha.id]); }, error: (erro) => this.erro.set(erro?.error?.mensagem ?? 'Não foi possível criar a ficha.') });
  }
  @HostListener('window:beforeunload', ['$event']) protected antesDeSair(evento: BeforeUnloadEvent): void { if (!this.criando()) evento.preventDefault(); }
}
