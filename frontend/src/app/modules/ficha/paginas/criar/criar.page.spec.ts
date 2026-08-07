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
    classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR, nivel: 1, prestigio: 0,
    vidaAtual: 1, energiaAtual: 1, morrendo: false, machucado: false, inconsciente: false,
  } satisfies FichaResumoDto;

  function montar(fichas: FichaResumoDto[] = [], rascunhoExistente: unknown = null, campanhaId: number | null = CAMPANHA_ID) {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    ];
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const fichaService = {
      listarFichas: vi.fn(() => of(fichas)),
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
      expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID]);
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

  describe('Experimento — vaga garantida de Habilidade de Subclasse (m3-58 + Peculiaridade)', () => {
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

      expect(componente['comHabilidades']()).toBe(false);
      expect(componente['passos']()).not.toContain('Habilidades');
    });

    it('vaga classeOuArquetipo ganha +1 fixo no Nível 0 para Experimento — nenhuma outra vaga aparece', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL });

      const vagas = componente['vagasMelhoria']();
      expect(vagas).toEqual([{ tipo: 'classeOuArquetipo', rotulo: 'Classe ou Arquétipo', alvo: 1 }]);
    });

    it('vaga classeOuArquetipo soma o +1 fixo às vagas normais do Nível (Experimento nível > 0)', () => {
      const { componente } = montar([fichaExistente]);
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, mediaNivel: 6 }); // nivelInicial 5
      const semExperimento = componente['progressaoAcumulada']().habilidadesClasseOuArquetipo;

      const vaga = componente['vagasMelhoria']().find((v) => v.tipo === 'classeOuArquetipo');
      expect(vaga?.alvo).toBe(semExperimento + 1);
    });

    it('escolher Peculiaridade na vaga garantida do Nível 0 conta como melhoria completa', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });

      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']()
        .flatMap((g) => g.subgrupos)
        .flatMap((s) => s.habilidades)
        .find((h) => h.nome === 'Peculiaridade');
      expect(peculiaridade).toBeDefined();

      componente['adicionarMelhoria'](peculiaridade!);
      componente['fecharSeletorMelhoria']();

      expect(componente['melhoriasCompletas']()).toBe(true);
      expect(componente['habilidadesDoNivel']().some((h) => h.nome === 'Peculiaridade')).toBe(true);
    });

    it('sem escolher nenhuma habilidade, o Nível 0 de Experimento fica com a vaga garantida pendente', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['atualizar']({ passo: componente['passos']().indexOf('Habilidades') });

      expect(componente['passoValido']()).toBe(false);
    });

    it('escolher Peculiaridade dispensa Origem no passoValido de Identidade', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
      componente['abrirSeletorMelhoria']('classeOuArquetipo');
      const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
      componente['adicionarMelhoria'](peculiaridade);
      componente['fecharSeletorMelhoria']();

      componente['atualizar']({ passo: componente['passos']().indexOf('Identidade'), personalidade: 'Instável' });

      expect(componente['temPeculiaridade']()).toBe(true);
      expect(componente['passoValido']()).toBe(true); // sem nenhum campo de Origem preenchido
    });

    it('sem Peculiaridade, o passo Identidade de um Experimento continua exigindo Origem completa', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, passo: 0 });
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
    it('sem campanhaId, pula listarMembros/listarFichas e segue "primeiro agente"', () => {
      const { componente, campanhaService, fichaService } = montar([], null, null);

      expect(campanhaService.listarMembros).not.toHaveBeenCalled();
      expect(fichaService.listarFichas).not.toHaveBeenCalled();
      expect(componente['campanhaId']).toBeNull();
      expect(componente['fichas']()).toEqual([]);
    });

    it('sem campanhaId, o passo Novo agente mostra "Ficha avulsa" em vez de "Primeiro agente da campanha"', () => {
      const { fixture, raiz, componente } = montar([], null, null);
      componente['atualizar']({ passo: 2 });
      fixture.detectChanges();

      expect(raiz.textContent).toContain('Ficha avulsa, sem campanha');
      expect(raiz.textContent).not.toContain('Primeiro agente da campanha');
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
});
