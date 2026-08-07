import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ArquetipoEnum, ClasseEnum, FormacaoBonusEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { FORMACOES } from '@contratados-rpg/shared/regras/identidade';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../ficha.service';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { FichaCriar } from './criar.page';

describe('FichaCriar', () => {
  const CAMPANHA_ID = 57;
  const fichaExistente = {
    id: 1, campanhaId: CAMPANHA_ID, campanhaNome: 'Teste', usuarioId: 1, nome: 'Base',
    classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, nivel: 1, prestigio: 0,
    vidaAtual: 1, energiaAtual: 1, morrendo: false, machucado: false, inconsciente: false,
  } satisfies FichaResumoDto;

  function montar(fichas: FichaResumoDto[] = []) {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    ];
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const fichaService = {
      listarFichas: vi.fn(() => of(fichas)),
      criarFicha: vi.fn(() => of({ id: 99, campanhaId: CAMPANHA_ID, usuarioId: 1, nome: 'Teste' })),
    };
    const rascunhos = {
      recuperar: vi.fn(() => null),
      salvar: vi.fn(),
      limpar: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [FichaCriar],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } }, parent: null } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: SessaoService, useValue: { usuario: () => ({ id: 1, login: 'mestre', nome: 'Mestre' }) } },
        { provide: GuiaCriacaoRascunhoService, useValue: rascunhos },
      ],
    });

    const fixture = TestBed.createComponent(FichaCriar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, componente: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('começa sem classe, cálculos ou recursos revelados no resumo operacional', () => {
    const { raiz } = montar();
    const resumo = raiz.querySelector('.guia__resumo-corpo');

    expect(resumo?.textContent).toContain('Preencha o codinome para iniciar');
    expect(resumo?.textContent).not.toContain('COMBATENTE');
    expect(resumo?.textContent).not.toContain('R$');
    expect(resumo?.querySelector('.guia__stats')).toBeNull();
  });

  it('permite digitar uma Personalidade e mantém Personalidade separada da Origem', () => {
    const { fixture, raiz, componente } = montar();
    componente['atualizar']({ passo: 4 });
    fixture.detectChanges();

    const personalidade = raiz.querySelector('[data-testid="personalidade"]') as HTMLInputElement;
    personalidade.value = 'Atento';
    personalidade.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(componente['estado']().personalidade).toBe('Atento');
    expect(raiz.querySelector('.guia__identidade-bloco--personalidade')).not.toBeNull();
    expect(raiz.querySelector('.guia__identidade-bloco--origem')).not.toBeNull();
  });

  it('oferece o catálogo mecânico de Formações e a alternativa Outra', () => {
    const { fixture, raiz, componente } = montar();
    componente['atualizar']({ passo: 4 });
    fixture.detectChanges();

    const select = raiz.querySelector('[aria-label="Formação 1"]') as HTMLSelectElement;
    expect(select.options.length).toBe(Object.keys(FORMACOES).length + 2);

    select.value = FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente['estado']().origem.formacao[0]).toEqual({
      bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO,
      parametro: null,
      texto: FORMACOES[FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO].rotulo,
    });

    select.value = '__OUTRA__';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente['estado']().origem.formacao[0].bonus).toBeNull();
    expect(componente['estado']().formacoesCustomizadas[0]).toBe(true);

    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente['estado']().origem.formacao[0].bonus).toBeNull();
    expect(componente['estado']().formacoesCustomizadas[0]).toBe(false);
  });

  it('entra em Recursos sem dados e exige uma única rolagem antes de avançar', () => {
    vi.useFakeTimers();
    try {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ passo: 5 });
      fixture.detectChanges();

      expect(raiz.querySelectorAll('.guia__dado')).toHaveLength(0);
      expect(componente['passoValido']()).toBe(false);
      const rolar = raiz.querySelector('[data-testid="rolar-recursos"]') as HTMLButtonElement;
      expect(rolar.textContent).toContain('Rolar dados');

      rolar.click();
      fixture.detectChanges();
      expect(raiz.querySelector('.guia__recursos--rolando')).not.toBeNull();
      expect(componente['passoValido']()).toBe(false);

      vi.advanceTimersByTime(700);
      fixture.detectChanges();
      expect(raiz.querySelectorAll('.guia__dado')).toHaveLength(4);
      expect(raiz.querySelector('[data-testid="rolar-recursos"]')).toBeNull();
      expect(componente['passoValido']()).toBe(true);

      const primeiraRolagem = componente['estado']().dinheiro;
      componente['iniciarRolagemRecursos']();
      vi.advanceTimersByTime(700);
      expect(componente['estado']().dinheiro).toBe(primeiraRolagem);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [1, { destreza: 3, forca: 3, luta: 2 }],
    [5, { destreza: 7, forca: 3, luta: 2, pontaria: 2, vigor: 2 }],
    [10, { destreza: 7, forca: 7, luta: 3, pontaria: 2, vigor: 2, intelecto: 2, medicina: 2, sentidos: 2 }],
    [15, { destreza: 7, forca: 7, luta: 7, pontaria: 7, vigor: 3 }],
    [20, { destreza: 7, forca: 7, luta: 7, pontaria: 7, vigor: 7, intelecto: 3, medicina: 2, sentidos: 2 }],
  ])('habilita Avançar no modo convencional para um agente de nível %i', (nivel, atributos) => {
    const { fixture, raiz, componente } = montar([fichaExistente]);
    const atributosBase = { destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1, intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1 };
    componente['atualizar']({
      passo: 3,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
      mediaNivel: nivel + 1,
      modoLivre: false,
      atributos: { ...atributosBase, ...atributos },
    });
    fixture.detectChanges();

    expect(componente['novoAgente']().nivelInicial).toBe(nivel);
    expect(componente['distribuicao']()).toEqual(expect.objectContaining({ saldo: 0, violacoes: [] }));
    expect(componente['passoValido']()).toBe(true);
    expect((raiz.querySelector('.guia__rodape .botao--primario') as HTMLButtonElement).disabled).toBe(false);
  });

  /** Preenche todas as vagas de catálogo do passo Melhorias com habilidades distintas (m3-58). */
  function preencherVagasDeMelhoria(componente: FichaCriar): void {
    for (const vaga of componente['vagasMelhoria']()) {
      while (componente['preenchidasNaVaga'](vaga.tipo) < vaga.alvo) {
        componente['abrirSeletorMelhoria'](vaga.tipo);
        const nomesEscolhidos = componente['nomesEscolhidosMelhoria']() as Set<string>;
        const habilidades = componente['gruposVagaAberta']().flatMap((grupo) => grupo.subgrupos).flatMap((subgrupo) => subgrupo.habilidades);
        const escolhido = habilidades.find((habilidade) => !nomesEscolhidos.has(habilidade.nome));
        if (!escolhido) throw new Error(`Sem habilidade livre para a vaga ${vaga.tipo}`);
        componente['adicionarMelhoria'](escolhido);
      }
    }
    componente['fecharSeletorMelhoria']();
  }

  describe('m3-58 — passo // MELHORIAS', () => {
    it('não existe na trilha quando o Nível inicial é 0', () => {
      const { componente } = montar();
      expect(componente['temMelhorias']()).toBe(false);
      expect(componente['passos']()).not.toContain('Melhorias');
      expect(componente['passos']()).toHaveLength(7);
    });

    it('entra na trilha, trava Avançar com vaga sobrando e libera com modo livre', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 6 });
      fixture.detectChanges();
      expect(componente['novoAgente']().nivelInicial).toBe(5);

      const indice = componente['passos']().indexOf('Melhorias');
      expect(indice).toBeGreaterThan(-1);
      componente['atualizar']({ passo: indice, modoLivre: false });
      fixture.detectChanges();
      expect(componente['passoValido']()).toBe(false);

      componente['atualizar']({ modoLivre: true });
      fixture.detectChanges();
      expect(componente['passoValido']()).toBe(true);
    });

    it('preenche as vagas pelo catálogo do sistema e não deixa repetir a Habilidade Inicial nem uma já escolhida', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 2 });
      fixture.detectChanges();
      expect(componente['novoAgente']().nivelInicial).toBe(1);

      const habilidadeInicial = componente['habilidadeInicial']();
      expect(componente['nomesEscolhidosMelhoria']().has(habilidadeInicial!.nome)).toBe(true);

      preencherVagasDeMelhoria(componente);
      fixture.detectChanges();
      for (const vaga of componente['vagasMelhoria']()) {
        expect(componente['preenchidasNaVaga'](vaga.tipo)).toBe(vaga.alvo);
      }
      const nomesEscolhidos = componente['estado']().melhorias.map((m) => m.habilidade.nome);
      expect(new Set(nomesEscolhidos).size).toBe(nomesEscolhidos.length);
      expect(componente['estado']().modoLivre).toBe(false);
      expect(componente['melhoriasCompletas']()).toBe(true);
    });

    it('exige nome e efeito da Fortificação de Personalidade a partir do Nível 7 (mesmo com as vagas do catálogo preenchidas)', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 8 });
      fixture.detectChanges();
      expect(componente['novoAgente']().nivelInicial).toBe(7);
      expect(componente['alvoFortificacoes']()).toBe(1);

      preencherVagasDeMelhoria(componente);
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(false);

      componente['atualizarFortificacao'](0, 'nome', 'Determinado+');
      componente['atualizarFortificacao'](0, 'descricao', 'Mais um dado ao forçar o teste.');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(true);

      const habilidades = componente['habilidadesDoNivel']();
      expect(habilidades.some((h) => h.nome === 'Determinado+' && h.categoria === 'PERSONALIDADE')).toBe(true);
    });
  });
});
