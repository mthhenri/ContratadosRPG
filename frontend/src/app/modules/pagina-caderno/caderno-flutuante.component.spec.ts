import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import {
  BuscaCampanhaResultadoTipoEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import type { PaginaCadernoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CadernoFlutuante } from './caderno-flutuante.component';
import { EDITOR_MARKDOWN_FACTORY } from './editor-markdown.component';
import { PaginaCadernoService } from './pagina-caderno.service';

const pagina: PaginaCadernoDto = {
  id: 11,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Lia',
  titulo: 'Primeira sessão',
  conteudoMarkdown: '# Pista\n\nTexto **importante**',
  somenteLeitura: false,
  createdDate: '2026-08-10T10:00:00.000Z',
  updatedDate: '2026-08-10T10:00:00.000Z',
};

describe('CadernoFlutuante', () => {
  let fixture: ComponentFixture<CadernoFlutuante>;
  let api: {
    listarPaginas: ReturnType<typeof vi.fn>;
    listarPaginasMembro: ReturnType<typeof vi.fn>;
    recuperarPagina: ReturnType<typeof vi.fn>;
    criarPagina: ReturnType<typeof vi.fn>;
    alterarPagina: ReturnType<typeof vi.fn>;
    excluirPagina: ReturnType<typeof vi.fn>;
    buscarCampanha: ReturnType<typeof vi.fn>;
  };
  let aoAlterarEditor: (markdown: string) => void;

  beforeEach(async () => {
    definirViewport(1920, 1080);
    instalarMatchMedia();
    api = {
      listarPaginas: vi.fn(() => of([{ ...pagina, conteudoMarkdown: undefined }])),
      listarPaginasMembro: vi.fn(() => of([{ ...pagina, conteudoMarkdown: undefined }])),
      recuperarPagina: vi.fn(() => of(pagina)),
      criarPagina: vi.fn(() => of(pagina)),
      alterarPagina: vi.fn(() => of(pagina)),
      excluirPagina: vi.fn(() => of(undefined)),
      buscarCampanha: vi.fn(() =>
        of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [CadernoFlutuante],
      providers: [
        { provide: PaginaCadernoService, useValue: api },
        {
          provide: EDITOR_MARKDOWN_FACTORY,
          useValue: (opcoes: { aoAlterar: (markdown: string) => void }) => {
            aoAlterarEditor = opcoes.aoAlterar;
            let markdown = pagina.conteudoMarkdown;
            return {
              criar: () => Promise.resolve(),
              destruir: vi.fn(),
              obterMarkdown: () => markdown,
              definirMarkdown: (valor: string) => { markdown = valor; },
              definirSomenteLeitura: vi.fn(),
            };
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CadernoFlutuante);
    fixture.componentRef.setInput('campanhaId', 3);
    fixture.componentRef.setInput('campanhaNome', 'Operação Eclipse');
    fixture.componentRef.setInput('usuarioAtivoId', 7);
    fixture.componentRef.setInput('ehMestre', false);
    fixture.componentRef.setInput('membros', []);
    fixture.detectChanges();
  });

  it('nasce fechado e abre uma janela não modal pelo acionador', () => {
    expect(raiz().querySelector('.caderno__janela')).toBeNull();
    clicar('[aria-label="Abrir caderno"]');
    expect(obter('.caderno__janela').getAttribute('aria-modal')).toBe('false');
    expect(raiz().textContent).toContain('Operação Eclipse');
  });

  it('ocupa a vaga do inventário ausente na pilha de utilitários do jogador', () => {
    expect(obter('[aria-label="Abrir caderno"]').classList).toContain(
      'caderno__gatilho--sem-inventario',
    );

    fixture.componentRef.setInput('ehMestre', true);
    fixture.detectChanges();

    expect(obter('[aria-label="Abrir caderno"]').classList).not.toContain(
      'caderno__gatilho--sem-inventario',
    );
  });

  it('ocupa a vaga do inventário mesmo com mestre quando a tela não tem inventário', () => {
    fixture.componentRef.setInput('ehMestre', true);
    fixture.componentRef.setInput('temInventario', false);
    fixture.detectChanges();

    expect(obter('[aria-label="Abrir caderno"]').classList).toContain(
      'caderno__gatilho--sem-inventario',
    );
  });

  it('entra na faixa de ações do cabeçalho no mobile', () => {
    expect(obter('[aria-label="Abrir caderno"]').classList).toContain(
      'utilitario-flutuante--inline-mobile',
    );
  });

  it('recolhe a lista de páginas no desktop e a torna disponível para reabrir', () => {
    clicar('[aria-label="Abrir caderno"]');
    clicar('[aria-label="Recolher páginas"]');

    expect(obter('.caderno__corpo').classList).toContain('caderno__corpo--lista-recolhida');
    expect(raiz().querySelector('[aria-label="Mostrar páginas"]')).not.toBeNull();

    clicar('[aria-label="Mostrar páginas"]');

    expect(obter('.caderno__corpo').classList).not.toContain('caderno__corpo--lista-recolhida');
  });

  it('recolhe a lista aberta ao criar uma página para revelar o editor', () => {
    clicar('[aria-label="Abrir caderno"]');
    clicar('[aria-label="Criar página"]');

    expect(obter('.caderno__corpo').classList).toContain('caderno__corpo--lista-recolhida');
    expect(obter<HTMLInputElement>('[aria-label="Título da página"]').value).toBe('');
  });

  it('minimiza e restaura sem desmontar o rascunho', () => {
    abrirPagina();
    aoAlterarEditor('rascunho preservado');
    fixture.detectChanges();
    clicar('[aria-label="Minimizar caderno"]');
    expect(raiz().querySelector('.caderno__janela')).toBeNull();
    clicar('[aria-label="Reabrir caderno"]');
    expect(obter('app-editor-markdown').getAttribute('aria-label')).toBe('Editor Markdown');
  });

  it('edita o Markdown diretamente no conteúdo formatado sem alternar visualização', () => {
    abrirPagina();
    expect(raiz().querySelector('app-editor-markdown')).not.toBeNull();
    expect(raiz().querySelector('[aria-label="Editar Markdown"]')).toBeNull();
    expect(raiz().querySelector('[aria-label="Visualizar Markdown"]')).toBeNull();
  });

  it('mestre vê página alheia sem controles de escrita', () => {
    fixture.componentRef.setInput('ehMestre', true);
    fixture.componentRef.setInput('membros', [
      {
        usuarioId: 8,
        nome: 'Nina',
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [],
      },
    ]);
    api.recuperarPagina.mockReturnValue(of({ ...pagina, usuarioAutorId: 8, somenteLeitura: true }));
    fixture.detectChanges();
    clicar('[aria-label="Abrir caderno"]');
    clicar('[aria-label="Selecionar cadernos dos jogadores"]');
    const seletor = obter<HTMLSelectElement>('[aria-label="Escolher jogador"]');
    seletor.value = '8';
    seletor.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clicar('[data-pagina-id="11"]');
    expect(raiz().textContent).toContain('Somente leitura');
    expect(raiz().querySelector('[data-acao="excluir"]')).toBeNull();
    expect(obter<HTMLInputElement>('input[formControlName="titulo"]').readOnly).toBe(true);
  });

  it('pede confirmação antes de excluir uma página editável', () => {
    abrirPagina();
    clicar('[data-acao="excluir"]');
    expect(obter('[role="alertdialog"]').textContent).toContain('Excluir “Primeira sessão”?');
    expect(api.excluirPagina).not.toHaveBeenCalled();
    clicar('[data-acao="confirmar-exclusao"]');
    expect(api.excluirPagina).toHaveBeenCalledWith(11);
  });

  it('mostra o estado de salvamento durante uma gravação pendente', () => {
    const resposta = new Subject<PaginaCadernoDto>();
    api.alterarPagina.mockReturnValue(resposta);
    abrirPagina();
    const titulo = obter<HTMLInputElement>('input[formControlName="titulo"]');
    titulo.value = 'Título alterado';
    titulo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    clicar('[data-acao="salvar"]');
    expect(raiz().textContent).toContain('Salvando…');
    resposta.next({ ...pagina, titulo: 'Título alterado' });
    resposta.complete();
  });

  it('oferece recarregar a versão do servidor após conflito', () => {
    vi.useFakeTimers();
    try {
      api.alterarPagina.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409 })),
      );
      abrirPagina();
      const titulo = obter<HTMLInputElement>('input[formControlName="titulo"]');
      titulo.value = 'Versão local';
      titulo.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(800);
      fixture.detectChanges();

      clicar('.caderno__recarregar');

      expect(api.recuperarPagina).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no mobile navega da lista ao conteúdo e não oferece redimensionamento', () => {
    definirViewport(360, 800);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    clicar('[aria-label="Abrir caderno"]');
    expect(obter('.caderno__janela').classList).toContain('caderno__janela--mobile');
    clicar('[data-pagina-id="11"]');
    expect(raiz().querySelector('.caderno__redimensionar')).toBeNull();
    expect(obter('[aria-label="Voltar para páginas"]')).toBeTruthy();
  });

  it('jogador combina busca no próprio caderno e nas próprias fichas', () => {
    vi.useFakeTimers();
    try {
      api.buscarCampanha.mockReturnValue(
        of({
          itens: [
            {
              tipo: BuscaCampanhaResultadoTipoEnum.PAGINA_CADERNO,
              id: 11,
              titulo: 'Primeira sessão',
              trecho: 'A pista estava no cais',
              autorNome: 'Lia',
              updatedDate: pagina.updatedDate,
              relevancia: 0.8,
            },
          ],
          totalItens: 1,
          paginaAtual: 1,
          totalPaginas: 1,
        }),
      );
      clicar('[aria-label="Abrir caderno"]');
      expect(rotulosFontes()).toEqual(['Meu caderno', 'Minhas fichas']);
      const busca = obter<HTMLInputElement>('[aria-label="Buscar na campanha"]');
      busca.value = 'pista';
      busca.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(api.buscarCampanha).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: 3, termo: 'pista', pagina: 1, limite: 20 }),
      );
      expect(obter('[data-resultado-id="11"]').textContent).toContain('A pista estava no cais');
    } finally {
      vi.useRealTimers();
    }
  });

  it('mestre recebe os três filtros autorizados, sem Minhas fichas', () => {
    fixture.componentRef.setInput('ehMestre', true);
    fixture.detectChanges();
    clicar('[aria-label="Abrir caderno"]');
    expect(rotulosFontes()).toEqual([
      'Meu caderno',
      'Cadernos dos jogadores',
      'Fichas da campanha',
    ]);
  });

  it('abre resultado de página no caderno e emite resultado de ficha', () => {
    vi.useFakeTimers();
    try {
      api.buscarCampanha.mockReturnValue(
        of({
          itens: [
            {
              tipo: BuscaCampanhaResultadoTipoEnum.PAGINA_CADERNO,
              id: 31,
              titulo: 'Relatório',
              trecho: 'Página encontrada',
              autorNome: 'Lia',
              updatedDate: pagina.updatedDate,
              relevancia: 1,
            },
            {
              tipo: BuscaCampanhaResultadoTipoEnum.ANOTACAO_FICHA,
              id: 44,
              titulo: 'Agente Kane',
              trecho: 'Ficha encontrada',
              autorNome: 'Lia',
              fichaNome: 'Kane',
              updatedDate: pagina.updatedDate,
              relevancia: 0.9,
            },
          ],
          totalItens: 2,
          paginaAtual: 1,
          totalPaginas: 1,
        }),
      );
      const abrirFicha = vi.fn();
      fixture.componentInstance.abrirFicha.subscribe(abrirFicha);
      clicar('[aria-label="Abrir caderno"]');
      const busca = obter<HTMLInputElement>('[aria-label="Buscar na campanha"]');
      busca.value = 'relatório';
      busca.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      clicar('[data-resultado-id="44"]');
      expect(abrirFicha).toHaveBeenCalledWith(44);
      clicar('[data-resultado-id="31"]');
      expect(api.recuperarPagina).toHaveBeenCalledWith(31);
    } finally {
      vi.useRealTimers();
    }
  });

  function abrirPagina(): void {
    clicar('[aria-label="Abrir caderno"]');
    clicar('[data-pagina-id="11"]');
  }

  function clicar(seletor: string): void {
    obter<HTMLButtonElement>(seletor).click();
    fixture.detectChanges();
  }

  function raiz(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rotulosFontes(): string[] {
    return Array.from(raiz().querySelectorAll('.caderno__fontes span')).map(
      (elemento) => elemento.textContent?.trim() ?? '',
    );
  }

  function obter<T extends HTMLElement = HTMLElement>(seletor: string): T {
    const elemento = raiz().querySelector<T>(seletor);
    expect(elemento, `Elemento ausente: ${seletor}`).not.toBeNull();
    return elemento!;
  }
});

function definirViewport(largura: number, altura: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: altura });
}

function instalarMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((consulta: string) => ({
      matches: consulta.includes('560px') && window.innerWidth <= 560,
      media: consulta,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
