import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ArquetipoEnum, ClasseEnum, FormacaoBonusEnum, ItemCategoriaEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { FORMACOES } from '@contratados-rpg/shared/regras/identidade';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../ficha.service';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { FichaCriar } from './criar.page';

describe('FichaCriar', () => {
  const CAMPANHA_ID = 57;
  const fichaExistente = {
    id: 1, campanhaId: CAMPANHA_ID, campanhaNome: 'Teste', usuarioId: 1, nome: 'Base',
    imagemUrl: null,
    classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, nivel: 1, prestigio: 0,
    vidaAtual: 1, energiaAtual: 1, morrendo: false, machucado: false, inconsciente: false,
  } satisfies FichaResumoDto;

  function montar(
    fichas: FichaResumoDto[] = [],
    rascunhoExistente: unknown = null,
    campanhaId: number | null = CAMPANHA_ID,
    mediasOverride?: { mediaNivel: number; mediaPrestigio: number; quantidade: number },
  ) {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    ];
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const medias = mediasOverride ?? (fichas.length
      ? {
          mediaNivel: fichas.reduce((s, f) => s + f.nivel, 0) / fichas.length,
          mediaPrestigio: fichas.reduce((s, f) => s + (f.prestigio ?? 0), 0) / fichas.length,
          quantidade: fichas.length,
        }
      : { mediaNivel: 0, mediaPrestigio: 0, quantidade: 0 });
    const fichaService = {
      calcularMediasEsquadrao: vi.fn(() => of(medias)),
      criarFicha: vi.fn(() => of({ id: 99, campanhaId: campanhaId ?? undefined, usuarioId: 1, nome: 'Teste' })),
    };
    const rascunhos = {
      recuperar: vi.fn(() => rascunhoExistente),
      salvar: vi.fn(),
      limpar: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [FichaCriar],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => campanhaId !== null ? String(campanhaId) : null } }, parent: null } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: SessaoService, useValue: { usuario: () => ({ id: 1, login: 'mestre', nome: 'Mestre' }) } },
        { provide: GuiaCriacaoRascunhoService, useValue: rascunhos },
      ],
    });

    const fixture = TestBed.createComponent(FichaCriar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, componente: fixture.componentInstance, rascunhos, fichaService, campanhaService };
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

  it('permite ignorar a rolagem de dinheiro inicial no passo Recursos (m3-74)', () => {
    const { fixture, raiz, componente } = montar();
    componente['atualizar']({ passo: 5 });
    fixture.detectChanges();

    expect(componente['passoValido']()).toBe(false);
    const ignorar = raiz.querySelector('[data-testid="ignorar-recursos"]') as HTMLButtonElement;
    expect(ignorar.textContent).toContain('Não rolar dinheiro inicial');

    ignorar.click();
    fixture.detectChanges();

    expect(componente['estado']().dinheiro).toEqual({ dados: [], inicial: 0, rolado: true });
    expect(componente['passoValido']()).toBe(true);
    expect(componente['totalDinheiro']()).toBe(0);
    expect(raiz.querySelectorAll('.guia__dado')).toHaveLength(0);
    expect(raiz.querySelector('[data-testid="rolar-recursos"]')).toBeNull();
    expect(raiz.querySelector('[data-testid="ignorar-recursos"]')).toBeNull();
    expect(raiz.textContent).toContain('Dinheiro inicial ignorado');

    // Trava de escolha única: ignorar de novo (ou rolar) depois de já resolvido não faz nada.
    const dinheiroIgnorado = componente['estado']().dinheiro;
    componente['ignorarRecursos']();
    expect(componente['estado']().dinheiro).toBe(dinheiroIgnorado);
    componente['iniciarRolagemRecursos']();
    expect(componente['estado']().dinheiro).toBe(dinheiroIgnorado);
  });

  it('ignorar a rolagem também zera o bônus monetário de Prestígio, não só o dinheiro rolado', () => {
    const { fixture, raiz, componente } = montar();
    componente['atualizar']({ sobrescreverProgressao: true, prestigioManual: 30, passo: 5 });
    fixture.detectChanges();

    expect(componente['bonusMonetario']()).toBeGreaterThan(0);

    const ignorar = raiz.querySelector('[data-testid="ignorar-recursos"]') as HTMLButtonElement;
    ignorar.click();
    fixture.detectChanges();

    expect(componente['totalDinheiro']()).toBe(0);
    expect(raiz.textContent).toContain('Dinheiro inicial ignorado');
  });

  describe('confirmação de saída do guia', () => {
    it('não navega ao clicar em Sair sem confirmar, e não usa o confirm() nativo do navegador', () => {
      const { fixture, raiz, componente } = montar();
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (raiz.querySelector('.guia__sair') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(componente['confirmandoSaida']()).toBe(true);
      expect(navegar).not.toHaveBeenCalled();
      const dialogo = raiz.querySelector('.guia__sair-dialog') as HTMLDialogElement;
      expect(dialogo).not.toBeNull();
      expect(dialogo.tagName).toBe('DIALOG');
      expect(dialogo.textContent).toContain('não vai perder nada');
    });

    it('navega para o painel só depois de confirmar, e "Continuar aqui" cancela sem navegar', () => {
      const { fixture, componente } = montar();
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      componente['sair']();
      componente['cancelarSaida']();
      fixture.detectChanges();
      expect(componente['confirmandoSaida']()).toBe(false);
      expect(navegar).not.toHaveBeenCalled();

      componente['sair']();
      componente['confirmarSaida']();
      fixture.detectChanges();
      expect(componente['confirmandoSaida']()).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID]);
    });
  });

  describe('rascunho salvo neste dispositivo', () => {
    it('não sobrescreve o rascunho salvo antes do jogador decidir "Retomar" ou "Começar do zero"', () => {
      const { fixture, componente, rascunhos } = montar([], { nome: 'Agente salvo antes' });

      expect(componente['temRascunho']()).toBe(true);
      expect(rascunhos.salvar).not.toHaveBeenCalled();

      componente['recomecar']();
      fixture.detectChanges();

      expect(componente['temRascunho']()).toBe(false);
      expect(rascunhos.salvar).toHaveBeenCalled();
    });

    it('sem rascunho existente, salva o estado normalmente assim que a página termina de carregar', () => {
      const { rascunhos } = montar();
      expect(rascunhos.salvar).toHaveBeenCalled();
    });
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

  describe('Atributos: teto de 6 pontos e Maestria', () => {
    function irParaAtributos(componente: ReturnType<typeof montar>['componente']): void {
      componente['atualizar']({ passo: 3, classe: ClasseEnum.COMBATENTE });
    }

    it('o botão "+" para de aumentar o atributo assim que ele chega a 6, mesmo com orçamento restante', () => {
      const { fixture, raiz, componente } = montar([fichaExistente]);
      irParaAtributos(componente);
      fixture.detectChanges();

      for (let i = 0; i < 10; i++) componente['passoAtributo']('destreza', 1);
      fixture.detectChanges();

      expect(componente['estado']().atributos.destreza).toBe(6);
      expect((raiz.querySelector('[aria-label="Aumentar Destreza"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('o botão de Maestria só habilita com 6+ pontos no atributo', () => {
      const { fixture, raiz, componente } = montar([fichaExistente]);
      irParaAtributos(componente);
      fixture.detectChanges();

      const botaoMaestria = () => raiz.querySelector('[aria-label="Maestria em Destreza"]') as HTMLButtonElement;
      expect(botaoMaestria().disabled).toBe(true);

      componente['atualizar']({ atributos: { ...componente['estado']().atributos, destreza: 6 } });
      fixture.detectChanges();

      expect(botaoMaestria().disabled).toBe(false);
    });

    it('aplicar Maestria custa 2 pontos de atributo além dos já gastos para chegar a 6, e é alternável/única', () => {
      const { fixture, raiz, componente } = montar([fichaExistente]);
      irParaAtributos(componente);
      componente['atualizar']({ atributos: { ...componente['estado']().atributos, destreza: 6, forca: 6 } });
      fixture.detectChanges();

      const saldoSemMaestria = componente['distribuicao']().saldo;
      (raiz.querySelector('[aria-label="Maestria em Destreza"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(componente['estado']().maestria).toBe('destreza');
      expect(componente['distribuicao']().saldo).toBe(saldoSemMaestria - 2);

      // única na ficha: marcar em outro atributo substitui, não acumula o custo.
      (raiz.querySelector('[aria-label="Maestria em Força"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(componente['estado']().maestria).toBe('forca');
      expect(componente['distribuicao']().saldo).toBe(saldoSemMaestria - 2);

      // clicar de novo no mesmo atributo desmarca a Maestria.
      (raiz.querySelector('[aria-label="Maestria em Força"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(componente['estado']().maestria).toBeNull();
      expect(componente['distribuicao']().saldo).toBe(saldoSemMaestria);
    });

    it('reduzir abaixo de 6 o atributo com Maestria remove a Maestria automaticamente', () => {
      const { fixture, componente } = montar([fichaExistente]);
      irParaAtributos(componente);
      componente['atualizar']({ atributos: { ...componente['estado']().atributos, destreza: 6 }, maestria: 'destreza' });
      fixture.detectChanges();

      componente['passoAtributo']('destreza', -1);
      fixture.detectChanges();

      expect(componente['estado']().atributos.destreza).toBe(5);
      expect(componente['estado']().maestria).toBeNull();
    });

    it('com bônus fixo de arquétipo (Lutador: +1 Luta/Força), o valor final nunca passa de 6', () => {
      const { fixture, raiz, componente } = montar([fichaExistente]);
      componente['atualizar']({ passo: 3, classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      fixture.detectChanges();

      expect(componente['bonusAtributos']().luta).toBe(1);

      for (let i = 0; i < 10; i++) componente['passoAtributo']('luta', 1);
      fixture.detectChanges();

      // investimento bruto para em 5, mas o valor final (com o bônus) para em 6, nunca 7.
      expect(componente['estado']().atributos.luta).toBe(5);
      expect(componente['atributosFinais']().luta).toBe(6);
      expect((raiz.querySelector('[aria-label="Aumentar Luta"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('com bônus fixo de arquétipo, a Maestria já habilita com 5 pontos brutos (6 no valor final)', () => {
      const { fixture, raiz, componente } = montar([fichaExistente]);
      componente['atualizar']({ passo: 3, classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['atualizar']({ atributos: { ...componente['estado']().atributos, luta: 5 } });
      fixture.detectChanges();

      expect(componente['atributosFinais']().luta).toBe(6);
      expect((raiz.querySelector('[aria-label="Maestria em Luta"]') as HTMLButtonElement).disabled).toBe(false);
    });
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

  describe('pacote inicial de habilidades', () => {
    it.each([
      ['QUATRO_GERAIS', [{ tipo: 'geral', alvo: 4 }]],
      ['DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO', [{ tipo: 'geral', alvo: 2 }, { tipo: 'classeOuArquetipo', alvo: 1 }]],
      ['DUAS_CLASSE_OU_ARQUETIPO', [{ tipo: 'classeOuArquetipo', alvo: 2 }]],
    ])('compõe %s no Nível 0', (pacote, alvos) => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['selecionarPacoteHabilidades'](pacote as never);

      expect(componente['comHabilidades']()).toBe(true);
      expect(componente['vagasMelhoria']().map(({ tipo, alvo }) => ({ tipo, alvo }))).toEqual(alvos);
    });

    it('oferece somente o pacote de 3 habilidades civis ao Civil', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.CIVIL });

      expect(componente['pacotesHabilidadesIniciais']().map((pacote) => pacote.id)).toEqual(['TRES_CIVIS']);
      componente['selecionarPacoteHabilidades']('TRES_CIVIS');
      expect(componente['vagasMelhoria']().map(({ tipo, alvo }) => ({ tipo, alvo }))).toEqual([{ tipo: 'civil', alvo: 3 }]);
    });

    it('Experimento compõe o pacote inicial como qualquer outra classe, sem vaga extra', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL });
      componente['selecionarPacoteHabilidades']('DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO');

      expect(componente['vagasMelhoria']().map(({ tipo, alvo }) => ({ tipo, alvo }))).toEqual([
        { tipo: 'geral', alvo: 2 },
        { tipo: 'classeOuArquetipo', alvo: 1 },
      ]);
    });

    it('a vaga "classeOuArquetipo" vira "Classe ou Subclasse" numa classe Experimento, mas continua "Classe ou Arquétipo" numa classe base (P-014)', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      expect(componente['vagasMelhoria']().find((v) => v.tipo === 'classeOuArquetipo')?.rotulo).toBe('Classe ou Arquétipo');

      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      expect(componente['vagasMelhoria']().find((v) => v.tipo === 'classeOuArquetipo')?.rotulo).toBe('Classe ou Subclasse');
    });

    it('bloqueia o passo Habilidades até escolher e preencher o pacote', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, passo: 4 });
      expect(componente['passoValido']()).toBe(false);

      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      preencherVagasDeMelhoria(componente);
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito combinado com o Mestre.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');
      expect(componente['passoValido']()).toBe(true);
    });

    it('não adiciona a mesma habilidade duas vezes por chamadas repetidas do seletor', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      componente['abrirSeletorMelhoria']('geral');
      const habilidade = componente['gruposVagaAberta']()[0].subgrupos[0].habilidades[0];

      componente['adicionarMelhoria'](habilidade);
      componente['adicionarMelhoria'](habilidade);

      expect(componente['estado']().melhorias.filter((melhoria) => melhoria.habilidade.nome === habilidade.nome)).toHaveLength(1);
    });

    it('remove escolhas excedentes ao trocar para um pacote menor', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      preencherVagasDeMelhoria(componente);
      expect(componente['preenchidasNaVaga']('geral')).toBe(4);

      componente['selecionarPacoteHabilidades']('DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO');

      expect(componente['preenchidasNaVaga']('geral')).toBe(2);
    });
  });

  describe('m3-58 — passo // HABILIDADES', () => {
    it('não existe na trilha quando o Nível inicial é 0', () => {
      const { componente } = montar();
      expect(componente['temMelhorias']()).toBe(false);
      expect(componente['passos']()).not.toContain('Habilidades');
      expect(componente['passos']()).toHaveLength(8);
    });

    it('entra na trilha, trava Avançar com vaga sobrando e libera com modo livre', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 6 });
      fixture.detectChanges();
      expect(componente['novoAgente']().nivelInicial).toBe(5);

      const indice = componente['passos']().indexOf('Habilidades');
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

      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      preencherVagasDeMelhoria(componente);
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito combinado com o Mestre.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');
      fixture.detectChanges();
      for (const vaga of componente['vagasMelhoria']()) {
        expect(componente['preenchidasNaVaga'](vaga.tipo)).toBe(vaga.alvo);
      }
      const nomesEscolhidos = componente['estado']().melhorias.map((m) => m.habilidade.nome);
      expect(new Set(nomesEscolhidos).size).toBe(nomesEscolhidos.length);
      expect(componente['estado']().modoLivre).toBe(false);
      expect(componente['melhoriasCompletas']()).toBe(true);
    });

    it('a Base da Habilidade de Personalidade é sempre exigida, mesmo sem Fortificação desbloqueada', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 2, personalidade: 'Atento' });
      fixture.detectChanges();
      expect(componente['alvoFortificacoes']()).toBe(0);

      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      preencherVagasDeMelhoria(componente);
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(false);

      componente['atualizarPersonalidadeBase']('descricao', 'Ganha +1 dado ao agir sob pressão.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '2');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(true);

      const habilidades = componente['habilidadesDoNivel']();
      expect(habilidades.some((h) => h.nome === 'Atento' && h.categoria === 'PERSONALIDADE' && h.custoEnergia === 2)).toBe(true);
    });

    it('exige efeito e custo da 1ª Fortificação a partir do Nível 7 (mesmo com Base e vagas do catálogo preenchidas) — e ela vira o estágio ativo, com nome = personalidade + estágio', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 8, personalidade: 'Atento' });
      fixture.detectChanges();
      expect(componente['novoAgente']().nivelInicial).toBe(7);
      expect(componente['alvoFortificacoes']()).toBe(1);

      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      preencherVagasDeMelhoria(componente);
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito base.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(false);

      componente['atualizarFortificacao']('fortificacao1', 'descricao', 'Mais um dado ao forçar o teste.');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(false);

      componente['atualizarFortificacao']('fortificacao1', 'custoEnergia', '3');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(true);

      const habilidades = componente['habilidadesDoNivel']();
      expect(habilidades.some((h) => h.nome === 'Atento — 1ª Fortificação' && h.categoria === 'PERSONALIDADE' && h.custoEnergia === 3)).toBe(true);
      expect(habilidades.some((h) => h.nome === 'Atento')).toBe(false);
    });

    it('permite preencher a 2ª Fortificação antes do Nível 14 desbloqueá-la, sem exigi-la para avançar', () => {
      const { fixture, componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, mediaNivel: 8, personalidade: 'Atento' });
      fixture.detectChanges();
      expect(componente['alvoFortificacoes']()).toBe(1);

      componente['selecionarPacoteHabilidades']('QUATRO_GERAIS');
      preencherVagasDeMelhoria(componente);
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito base.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');
      componente['atualizarFortificacao']('fortificacao1', 'descricao', 'Mais um dado.');
      componente['atualizarFortificacao']('fortificacao1', 'custoEnergia', '3');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(true);

      componente['atualizarFortificacao']('fortificacao2', 'descricao', 'Efeito maior, ainda em combinação com o Mestre.');
      fixture.detectChanges();
      expect(componente['melhoriasCompletas']()).toBe(true);
      expect(componente['estado']().personalidadeHabilidade.fortificacao2.descricao).toBe('Efeito maior, ainda em combinação com o Mestre.');
    });
  });

  describe('bônus de atributo à escolha (Engenheiro/Assassino/Acadêmico/Híbrido)', () => {
    it('Engenheiro: passoValido(Classe) bloqueia sem escolha e libera com a escolha feita', () => {
      const { componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      expect(componente['slotsEscolhaBonus']()).toEqual([['forca', 'destreza']]);
      expect(componente['passoValido']()).toBe(false);

      componente['escolherBonusAtributo'](0, { target: { value: 'destreza' } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual(['destreza']);
      expect(componente['passoValido']()).toBe(true);
      expect(componente['bonusAtributos']()).toEqual({ intelecto: 1, destreza: 1 });
    });

    it('Assassino: bonusAtributos() combina fixo + escolha em Luta/Pontaria', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO });
      componente['escolherBonusAtributo'](0, { target: { value: 'luta' } } as unknown as Event);
      expect(componente['bonusAtributos']()).toEqual({ destreza: 1, luta: 1 });
    });

    it('Acadêmico: slot livre sem Luta/Pontaria', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ACADEMICO });
      expect(componente['slotsEscolhaBonus']()[0]).not.toContain('luta');
      expect(componente['slotsEscolhaBonus']()[0]).not.toContain('pontaria');

      componente['escolherBonusAtributo'](0, { target: { value: 'vontade' } } as unknown as Event);
      expect(componente['bonusAtributos']()).toEqual({ intelecto: 1, vontade: 1 });
    });

    it('Experimento Híbrido: dois slots independentes, permite repetir o mesmo atributo', () => {
      const { componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.EXPERIMENTO_HIBRIDO });
      expect(componente['slotsEscolhaBonus']()).toHaveLength(2);
      expect(componente['passoValido']()).toBe(false);

      componente['escolherBonusAtributo'](0, { target: { value: 'vigor' } } as unknown as Event);
      expect(componente['passoValido']()).toBe(false); // falta a 2ª escolha

      componente['escolherBonusAtributo'](1, { target: { value: 'vigor' } } as unknown as Event);
      expect(componente['passoValido']()).toBe(true);
      expect(componente['bonusAtributos']()).toEqual({ vigor: 2 });
    });

    it('perfil sem ponto à escolha (Lutador) não exige nada além do arquétipo', () => {
      const { componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      expect(componente['slotsEscolhaBonus']()).toEqual([]);
      expect(componente['passoValido']()).toBe(true);
    });

    it('trocar de arquétipo reseta a escolha anterior', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      componente['escolherBonusAtributo'](0, { target: { value: 'forca' } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual(['forca']);

      componente['mudarPerfil']({ target: { value: ArquetipoEnum.ASSASSINO } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual([]);
      expect(componente['passoValido']()).toBe(false);
    });

    it('trocar de classe-base (primeira etapa) reseta a escolha anterior', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, bonusEscolhido: ['vigor', 'vigor'] });
      componente['mudarClasseBase']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual([]);
    });

    it('ficha final (criar()) persiste o bônus escolhido nos atributos', () => {
      const { fixture, componente } = montar();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      componente['atualizar']({
        nome: 'Agente-9', classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO,
        dinheiro: { dados: [1, 1, 1, 1], inicial: 1000, rolado: true },
        personalidade: 'Firme',
      });
      componente['escolherBonusAtributo'](0, { target: { value: 'forca' } } as unknown as Event);
      fixture.detectChanges();

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      // base 1 + fixo (intelecto 1) / base 1 + fixo (0) + escolha (1) em força
      expect(payload.dados.atributos.intelecto).toBe(2);
      expect(payload.dados.atributos.forca).toBe(2);
    });

    it('m3-75: ficha final (criar()) trima os campos de texto da Identidade, mas a digitação preserva os espaços', () => {
      const { fixture, componente } = montar();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      componente['atualizar']({
        nome: 'Agente-9', classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO,
        dinheiro: { dados: [1, 1, 1, 1], inicial: 1000, rolado: true },
        personalidade: '  Firme  ',
        origem: {
          nome: '  Ex-militar  ',
          descricao: '  Serviu na linha de frente.  ',
          formacao: [
            { bonus: null, parametro: null, texto: '  +1 dado em Vigor  ' },
            { bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO, parametro: '  Furtividade  ', texto: `  ${FORMACOES[FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO].rotulo}  ` },
          ],
          especialidade: { gatilho: '  Sob fogo  ', efeito: '  +1 dado em Reflexos  ' },
          saberDeCampo: '  Balística  ',
        },
        formacoesCustomizadas: [true, false],
      });
      componente['atualizarPersonalidadeBase']('descricao', '  Efeito com espaço  ');
      componente['escolherBonusAtributo'](0, { target: { value: 'forca' } } as unknown as Event);
      fixture.detectChanges();

      // não trima durante a digitação — só na montagem persistida.
      expect(componente['estado']().origem.nome).toBe('  Ex-militar  ');
      expect(componente['estado']().origem.formacao[0].texto).toBe('  +1 dado em Vigor  ');
      expect(componente['estado']().personalidadeHabilidade.base.descricao).toBe('  Efeito com espaço  ');

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      expect(payload.dados.identidade.personalidade).toBe('Firme');
      expect(payload.dados.identidade.habilidade.base.descricao).toBe('Efeito com espaço');
      expect(payload.dados.identidade.origem.nome).toBe('Ex-militar');
      expect(payload.dados.identidade.origem.descricao).toBe('Serviu na linha de frente.');
      expect(payload.dados.identidade.origem.formacao[0].texto).toBe('+1 dado em Vigor');
      expect(payload.dados.identidade.origem.formacao[1].texto).toBe(FORMACOES[FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO].rotulo);
      expect(payload.dados.identidade.origem.formacao[1].parametro).toBe('Furtividade');
      expect(payload.dados.identidade.origem.especialidade.gatilho).toBe('Sob fogo');
      expect(payload.dados.identidade.origem.especialidade.efeito).toBe('+1 dado em Reflexos');
      expect(payload.dados.identidade.origem.saberDeCampo).toBe('Balística');
    });

    it('DOM: Engenheiro mostra um select "Bônus à escolha" com só Força/Destreza', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      fixture.detectChanges();

      const select = raiz.querySelector('[data-testid="bonus-escolha-0"]') as HTMLSelectElement;
      expect(select).not.toBeNull();
      const opcoes = Array.from(select.options).map((o) => o.value).filter(Boolean);
      expect(opcoes.sort()).toEqual(['destreza', 'forca'].sort());

      select.value = 'destreza';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(componente['estado']().bonusEscolhido).toEqual(['destreza']);
    });

    it('DOM: Experimento Híbrido mostra dois selects rotulados "1ª escolha" e "2ª escolha"', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.EXPERIMENTO_HIBRIDO });
      fixture.detectChanges();

      expect(raiz.querySelector('[data-testid="bonus-escolha-0"]')).not.toBeNull();
      expect(raiz.querySelector('[data-testid="bonus-escolha-1"]')).not.toBeNull();
      const rotulos = Array.from(raiz.querySelectorAll('.campo__rotulo')).map((r) => r.textContent?.trim());
      expect(rotulos).toContain('1ª escolha de bônus');
      expect(rotulos).toContain('2ª escolha de bônus');
    });

    it('DOM: perfil sem ponto à escolha (Lutador) não mostra select nenhum de bônus', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ passo: componente['passos']().indexOf('Classe'), classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      fixture.detectChanges();

      expect(raiz.querySelector('[data-testid="bonus-escolha-0"]')).toBeNull();
    });
  });

  describe('seletor de Classe em dois passos (P-019)', () => {
    const irParaClasse = (componente: FichaCriar) => componente['atualizar']({ passo: componente['passos']().indexOf('Classe') });
    const selects = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll('.guia__campos--duas-colunas select')) as HTMLSelectElement[];

    it('DOM: a primeira etapa só lista as três classes-base e Civil — nada de Experimento junto', () => {
      const { fixture, raiz, componente } = montar();
      irParaClasse(componente);
      fixture.detectChanges();

      const [classeSelect] = selects(raiz);
      const opcoes = Array.from(classeSelect.options).map((o) => o.value).filter(Boolean);
      expect(opcoes.sort()).toEqual(
        [ClasseEnum.COMBATENTE, ClasseEnum.ESPECIALISTA, ClasseEnum.SUPORTE, ClasseEnum.CIVIL].sort(),
      );
    });

    it('DOM: escolher Combatente revela a segunda etapa com Arquétipos + Subclasse (Experimento Bestial) lado a lado', () => {
      const { fixture, raiz, componente } = montar();
      irParaClasse(componente);
      fixture.detectChanges();

      const [classeSelect] = selects(raiz);
      classeSelect.value = ClasseEnum.COMBATENTE;
      classeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const [, perfilSelect] = selects(raiz);
      expect(perfilSelect).not.toBeUndefined();
      const grupos = Array.from(perfilSelect.querySelectorAll('optgroup')).map((g) => g.getAttribute('label'));
      expect(grupos).toEqual(['Arquétipos', 'Subclasse']);
      const opcoes = Array.from(perfilSelect.options).map((o) => o.value).filter(Boolean);
      expect(opcoes.sort()).toEqual(
        [ArquetipoEnum.LUTADOR, ArquetipoEnum.MERCENARIO, ArquetipoEnum.VANGUARDA, ClasseEnum.EXPERIMENTO_BESTIAL].sort(),
      );
    });

    it('escolher um arquétipo na segunda etapa define classe = a base e arquetipo = o escolhido', () => {
      const { componente } = montar();
      componente['mudarClasseBase']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      componente['mudarPerfil']({ target: { value: ArquetipoEnum.MERCENARIO } } as unknown as Event);

      expect(componente['estado']().classe).toBe(ClasseEnum.COMBATENTE);
      expect(componente['estado']().arquetipo).toBe(ArquetipoEnum.MERCENARIO);
    });

    it('escolher a Subclasse na segunda etapa define classe = a subclasse de Experimento e arquetipo = null', () => {
      const { componente } = montar();
      componente['mudarClasseBase']({ target: { value: ClasseEnum.ESPECIALISTA } } as unknown as Event);
      componente['mudarPerfil']({ target: { value: ClasseEnum.EXPERIMENTO_ARTIFICIAL } } as unknown as Event);

      expect(componente['estado']().classe).toBe(ClasseEnum.EXPERIMENTO_ARTIFICIAL);
      expect(componente['estado']().arquetipo).toBeNull();
    });

    it('DOM: escolher Civil fecha a classe direto na primeira etapa, sem segunda etapa', () => {
      const { fixture, raiz, componente } = montar();
      irParaClasse(componente);
      fixture.detectChanges();

      const [classeSelect] = selects(raiz);
      classeSelect.value = ClasseEnum.CIVIL;
      classeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(componente['estado']().classe).toBe(ClasseEnum.CIVIL);
      expect(selects(raiz)).toHaveLength(1);
    });

    it('trocar a classe-base na primeira etapa reseta a segunda etapa (classe e arquétipo)', () => {
      const { componente } = montar();
      componente['mudarClasseBase']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      componente['mudarPerfil']({ target: { value: ArquetipoEnum.LUTADOR } } as unknown as Event);
      expect(componente['estado']().classe).toBe(ClasseEnum.COMBATENTE);

      componente['mudarClasseBase']({ target: { value: ClasseEnum.SUPORTE } } as unknown as Event);
      expect(componente['estado']().classe).toBeNull();
      expect(componente['estado']().arquetipo).toBeNull();
      expect(componente['classeBaseAtual']()).toBe(ClasseEnum.SUPORTE);
    });

    it('trocar de arquétipo para a Subclasse na mesma base zera o pacote de Habilidades e as melhorias já escolhidas', () => {
      const { componente } = montar();
      componente['mudarClasseBase']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      componente['mudarPerfil']({ target: { value: ArquetipoEnum.LUTADOR } } as unknown as Event);
      componente['atualizar']({ pacoteHabilidadesId: 'QUATRO_GERAIS' });

      componente['mudarPerfil']({ target: { value: ClasseEnum.EXPERIMENTO_BESTIAL } } as unknown as Event);

      expect(componente['estado']().pacoteHabilidadesId).toBeNull();
    });

    it('trocar entre dois arquétipos da mesma base preserva o pacote de Habilidades já escolhido', () => {
      const { componente } = montar();
      componente['mudarClasseBase']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      componente['mudarPerfil']({ target: { value: ArquetipoEnum.LUTADOR } } as unknown as Event);
      componente['atualizar']({ pacoteHabilidadesId: 'QUATRO_GERAIS' });

      componente['mudarPerfil']({ target: { value: ArquetipoEnum.MERCENARIO } } as unknown as Event);

      expect(componente['estado']().pacoteHabilidadesId).toBe('QUATRO_GERAIS');
    });
  });

  describe('Experimento — Peculiaridade dispensa a Origem (m3-58 + Peculiaridade)', () => {
    it('DOM: os cards de pacote de Habilidades iniciais mostram "Classe/Subclasse" (não "Classe/Arquétipo") pra um Experimento', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });
      fixture.detectChanges();

      const rotulosPacote = Array.from(raiz.querySelectorAll('.guia__pacote strong')).map((n) => n.textContent?.trim());
      expect(rotulosPacote).toEqual(['4 Gerais', '2 Gerais + 1 de Classe/Subclasse', '2 de Classe/Subclasse']);
    });

    it('DOM: os cards de pacote continuam "Classe/Arquétipo" pra uma classe base', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });
      fixture.detectChanges();

      const rotulosPacote = Array.from(raiz.querySelectorAll('.guia__pacote strong')).map((n) => n.textContent?.trim());
      expect(rotulosPacote).toEqual(['4 Gerais', '2 Gerais + 1 de Classe/Arquétipo', '2 de Classe/Arquétipo']);
    });

    it('passo // Habilidades existe no Nível 0 para as três subclasses de Experimento', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });

      expect(componente['comHabilidades']()).toBe(true);
      expect(componente['passos']()).toContain('Habilidades');
      expect(componente['passos']().indexOf('Habilidades')).toBeLessThan(componente['passos']().indexOf('Identidade'));
    });

    it('sem classe Experimento e sem Melhorias, // Habilidades não existe (comportamento de hoje)', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE });

      expect(componente['comHabilidades']()).toBe(true);
      expect(componente['passos']()).toContain('Habilidades');
    });

    it('DOM: a vaga "classeOuArquetipo" mostra a aba "Subclasse" (não "Arquétipo") pra um Experimento — o pick é só da própria subclasse (P-014 follow-up)', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      fixture.detectChanges();

      const rotulosAba = Array.from(raiz.querySelectorAll('.seletor__aba')).map((aba) => aba.textContent?.trim());
      expect(rotulosAba).toContain('Subclasse');
      // Nenhum arquétipo regular da classe-base é "seu" — essa vaga só oferece Classe/Subclasse próprias.
      expect(rotulosAba).not.toContain('Arquétipo');
    });

    it('DOM: a aba do seletor "Do sistema" continua "Arquétipo" para uma classe base (P-014)', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      fixture.detectChanges();

      const rotulosAba = Array.from(raiz.querySelectorAll('.seletor__aba')).map((aba) => aba.textContent?.trim());
      expect(rotulosAba).toContain('Arquétipo');
      expect(rotulosAba).not.toContain('Subclasse');
    });

    it('escolher Peculiaridade num pacote de Classe/Arquétipo conta como melhoria completa', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');

      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']()
        .flatMap((g) => g.subgrupos)
        .flatMap((s) => s.habilidades)
        .find((h) => h.nome === 'Peculiaridade');
      expect(peculiaridade).toBeDefined();

      componente['adicionarMelhoria'](peculiaridade!);
      componente['fecharSeletorMelhoria']();
      preencherVagasDeMelhoria(componente);
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito combinado com o Mestre.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');

      expect(componente['melhoriasCompletas']()).toBe(true);
      expect(componente['habilidadesDoNivel']().some((h) => h.nome === 'Peculiaridade')).toBe(true);
    });

    it('sem escolher o pacote inicial, o Nível 0 de Experimento fica com o passo // Habilidades pendente', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });

      expect(componente['passoValido']()).toBe(false);
    });

    it('escolher Peculiaridade dispensa Origem no passoValido de Identidade', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
      componente['adicionarMelhoria'](peculiaridade);
      componente['fecharSeletorMelhoria']();

      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade'), personalidade: 'Instável' });
      componente['atualizarPersonalidadeBase']('descricao', 'Efeito combinado com o Mestre.');
      componente['atualizarPersonalidadeBase']('custoEnergia', '1');

      expect(componente['temPeculiaridade']()).toBe(true);
      expect(componente['passoValido']()).toBe(true); // sem nenhum campo de Origem preenchido
    });

    it('sem Peculiaridade, o passo Identidade de um Experimento continua exigindo Origem completa', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const outra = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome !== 'Peculiaridade')!;
      componente['adicionarMelhoria'](outra);
      componente['fecharSeletorMelhoria']();

      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade'), personalidade: 'Instável' });

      expect(componente['temPeculiaridade']()).toBe(false);
      expect(componente['passoValido']()).toBe(false); // Origem continua obrigatória
    });

    it('cria a ficha de um Experimento com Peculiaridade sem enviar Origem (origem: null)', () => {
      const { fixture, componente } = montar();
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      componente['atualizar']({ nome: 'Espécime-7', classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, dinheiro: { dados: [1, 1, 1, 1], inicial: 1000, rolado: true } });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
      componente['adicionarMelhoria'](peculiaridade);
      componente['fecharSeletorMelhoria']();
      componente['atualizar']({ personalidade: 'Instável' });
      fixture.detectChanges();

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      expect(payload.dados.identidade.origem).toBeNull();
      expect(payload.dados.identidade.personalidade).toBe('Instável');
      expect(payload.dados.habilidades.some((h: { nome: string }) => h.nome === 'Peculiaridade')).toBe(true);
    });

    it('DOM: com Peculiaridade escolhida, o passo Identidade some com o formulário de Origem e mostra a nota', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
      componente['adicionarMelhoria'](peculiaridade);
      componente['fecharSeletorMelhoria']();
      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade') });
      fixture.detectChanges();

      const blocoOrigem = raiz.querySelector('.guia__identidade-bloco--origem');
      expect(blocoOrigem?.querySelector('input')).toBeNull();
      expect(blocoOrigem?.querySelector('textarea')).toBeNull();
      expect(blocoOrigem?.querySelector('select')).toBeNull();
      expect(blocoOrigem?.textContent).toContain('Substitui a Origem');
      expect(blocoOrigem?.textContent).toContain('A Peculiaridade concede um bônus e uma penalidade desconhecida');
    });

    it('DOM: com outra Habilidade de Subclasse escolhida, o passo Identidade mantém o formulário de Origem', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const outra = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome !== 'Peculiaridade')!;
      componente['adicionarMelhoria'](outra);
      componente['fecharSeletorMelhoria']();
      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade') });
      fixture.detectChanges();

      const blocoOrigem = raiz.querySelector('.guia__identidade-bloco--origem');
      expect(blocoOrigem?.querySelector('input')).not.toBeNull();
      expect(blocoOrigem?.querySelector('[aria-label="Formação 1"]')).not.toBeNull();
      expect(blocoOrigem?.textContent).not.toContain('Substitui a Origem');
    });

    it('DOM: o passo // Habilidades renderiza o título "Habilidades" (não "Melhorias")', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });
      fixture.detectChanges();

      expect(raiz.querySelector('.guia__secao h2')?.textContent?.trim()).toBe('Habilidades');
      expect(raiz.querySelector('.guia__rodape-status')?.textContent).toContain('HABILIDADES');
      expect(raiz.querySelector('.guia__rodape-status')?.textContent).not.toContain('MELHORIAS');
      // conteúdo dentro do próprio @case — só renderiza se o @switch casar com 'Habilidades'
      expect(raiz.querySelector('.guia__introducao-codigo')?.textContent).toBe('PROGRESSÃO // HABILIDADES');
    });

    it('DOM: resumo lateral mostra "Peculiaridade" no lugar da Origem em branco', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ nome: 'Espécime-7', classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['selecionarPacoteHabilidades']('DUAS_CLASSE_OU_ARQUETIPO');
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
      componente['adicionarMelhoria'](peculiaridade);
      componente['fecharSeletorMelhoria']();
      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade') });
      fixture.detectChanges();

      const linhaOrigem = Array.from(raiz.querySelectorAll('.guia__resumo-linha')).find((linha) => linha.querySelector('span')?.textContent === 'Origem');
      expect(linhaOrigem?.querySelector('b')?.textContent).toBe('Peculiaridade');
    });
  });

  describe('m3-59 — passo // EQUIPAMENTO INICIAL', () => {
    const indiceEquipamento = (componente: FichaCriar) => componente['passos']().indexOf('Equipamento inicial');

    it('kit vazio é válido — o passo é pulável', () => {
      const { componente } = montar();
      const indice = indiceEquipamento(componente);
      expect(indice).toBeGreaterThan(-1);
      componente['atualizar']({ passo: indice });
      expect(componente['passoValido']()).toBe(true);
    });

    it('trava Avançar acima de $2500 ou peso 5 e libera com modo livre', () => {
      const { fixture, componente } = montar();
      const indice = indiceEquipamento(componente);
      const kit: CarrinhoItemDto[] = [{ nome: 'Pesada', categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 1500, peso: 5, quantidade: 2, guardada: false, modificacoes: [] }];
      componente['atualizar']({ passo: indice, modoLivre: false, kit });
      fixture.detectChanges();
      expect(componente['kitTotais']().gasto).toBe(3000); // > 2500
      expect(componente['passoValido']()).toBe(false);

      componente['atualizar']({ modoLivre: true });
      fixture.detectChanges();
      expect(componente['passoValido']()).toBe(true);
    });

    it('mudarKit substitui o kit inteiro e recalcula os totais', () => {
      const { fixture, componente } = montar();
      const kit: CarrinhoItemDto[] = [{ nome: 'Molotov', categoria: ItemCategoriaEnum.EXPLOSIVOS, custo: 400, peso: 1, quantidade: 3, guardada: false, modificacoes: [] }];
      componente['mudarKit'](kit);
      fixture.detectChanges();
      expect(componente['kitTotais']()).toEqual(expect.objectContaining({ gasto: 1200, pesoUsado: 3 }));
    });

    it('cria a ficha com o kit em dados.inventario sem tocar no dinheiro rolado', () => {
      const { fixture, componente } = montar();
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const kit: CarrinhoItemDto[] = [{ nome: 'Molotov', categoria: ItemCategoriaEnum.EXPLOSIVOS, custo: 400, peso: 1, quantidade: 1, guardada: false, modificacoes: [] }];
      componente['atualizar']({ nome: 'Agente Kit', classe: ClasseEnum.COMBATENTE, kit, dinheiro: { dados: [1, 2, 3, 4], inicial: 2500, rolado: true } });
      fixture.detectChanges();

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      expect(payload.dados.inventario.itens).toEqual(kit);
      expect(payload.dados.dinheiro).toBe(2500);
    });
  });

  describe('guia sem campanha (/fichas/nova) — ficha avulsa do acervo', () => {
    it('sem campanhaId, pula listarMembros/calcularMediasEsquadrao e segue "primeiro agente"', () => {
      const { componente, campanhaService, fichaService } = montar([], null, null);

      expect(campanhaService.listarMembros).not.toHaveBeenCalled();
      expect(fichaService.calcularMediasEsquadrao).not.toHaveBeenCalled();
      expect(componente['campanhaId']).toBeNull();
      expect(componente['mediasEsquadrao']()).toBeNull();
    });

    it('sem campanhaId, o passo Novo agente mostra "Ficha avulsa" em vez de "Primeiro agente da campanha"', () => {
      const { fixture, raiz, componente } = montar([], null, null);
      componente['atualizar']({ passo: 2 });
      fixture.detectChanges();

      expect(raiz.textContent).toContain('Ficha avulsa, sem campanha');
      expect(raiz.textContent).not.toContain('Primeiro agente da campanha');
    });

    it('usa Nível e Prestígio exatos informados na ficha avulsa', () => {
      const { fixture, componente } = montar([], null, null);
      componente['atualizar']({ nivelManual: 12, prestigioManual: 37 });
      fixture.detectChanges();

      expect(componente['nivelInicial']()).toBe(12);
      expect(componente['prestigioInicial']()).toBe(37);
      expect(componente['progressaoAcumulada']().atributos).toBeGreaterThan(0);
    });

    it('envia Nível e Prestígio exatos no payload da ficha avulsa', () => {
      const { fixture, componente, fichaService } = montar([], null, null);
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      componente['atualizar']({
        nome: 'Agente Veterano',
        classe: ClasseEnum.COMBATENTE,
        nivelManual: 12,
        prestigioManual: 37,
        dinheiro: { dados: [1, 1, 1, 1], inicial: 1250, rolado: true },
      });
      fixture.detectChanges();

      componente['criar']();

      const criarFicha = fichaService.criarFicha as ReturnType<typeof vi.fn>;
      const payload = criarFicha.mock.calls[0][0];
      expect(payload.dados.nivel).toBe(12);
      expect(payload.dados.prestigio).toBe(37);
    });

    it('sem campanhaId, "Sair" confirmado navega para /fichas', () => {
      const { componente } = montar([], null, null);
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      componente['sair']();
      componente['confirmarSaida']();

      expect(navegar).toHaveBeenCalledWith(['/fichas']);
    });

    it('sem campanhaId, criar() envia o DTO sem campanhaId e navega para /fichas/:id', () => {
      const { fixture, componente } = montar([], null, null);
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      componente['atualizar']({ nome: 'Agente Solto', classe: ClasseEnum.COMBATENTE, dinheiro: { dados: [1, 1, 1, 1], inicial: 1250, rolado: true } });
      fixture.detectChanges();

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      expect(payload).not.toHaveProperty('campanhaId');
      expect(navegar).toHaveBeenCalledWith(['/fichas', 99]);
    });
  });

  describe('progressão manual em campanha', () => {
    it('mantém as médias como padrão e usa os valores exatos ao sobrescrever', () => {
      const { componente } = montar([fichaExistente]);
      componente['atualizar']({ mediaNivel: 8, mediaPrestigio: 30 });

      expect(componente['nivelInicial']()).toBe(7);
      expect(componente['prestigioInicial']()).toBe(26);

      componente['atualizar']({ sobrescreverProgressao: true, nivelManual: 15, prestigioManual: 42 });

      expect(componente['nivelInicial']()).toBe(15);
      expect(componente['prestigioInicial']()).toBe(42);
    });
  });

  describe('primeiro agente de um jogador comum numa campanha já com outros agentes', () => {
    it('aplica a média do esquadrão mesmo sem nenhuma ficha alheia visível ao jogador (agregado do backend, não listarFichas)', () => {
      // Cenário do bug reportado: um jogador comum sem `usuario_ficha_acesso` sobre as fichas
      // alheias não as enxergaria numa listagem individual — mas a média é um agregado (§14 não
      // se aplica), então `calcularMediasEsquadrao` devolve a média real do esquadrão mesmo
      // quando este jogador não tem nenhuma ficha própria ainda.
      const { fixture, raiz, componente } = montar([], null, CAMPANHA_ID, {
        mediaNivel: 5,
        mediaPrestigio: 20,
        quantidade: 3,
      });
      componente['atualizar']({ passo: 2 });
      fixture.detectChanges();

      expect(raiz.textContent).not.toContain('Primeiro agente da campanha');
      expect(componente['estado']().mediaNivel).toBe(5);
      expect(componente['estado']().mediaPrestigio).toBe(20);
      expect(componente['novoAgente']().nivelInicial).toBe(4);
    });
  });
});
