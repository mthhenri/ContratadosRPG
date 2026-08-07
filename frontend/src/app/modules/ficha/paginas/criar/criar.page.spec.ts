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
});
