import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { PaginaCadernoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { TipoPaginaCadernoEnum } from '@contratados-rpg/shared/enums';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CadernoFlutuanteStore } from './caderno-flutuante.store';
import { PaginaCadernoService } from './pagina-caderno.service';

const pagina: PaginaCadernoDto = {
  id: 11,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Lia',
  tipo: TipoPaginaCadernoEnum.PRIVADA,
  titulo: 'Primeira sessão',
  conteudoMarkdown: 'Uma pista',
  somenteLeitura: false,
  createdDate: '2026-08-10T10:00:00.000Z',
  updatedDate: '2026-08-10T10:00:00.000Z',
};

describe('CadernoFlutuanteStore', () => {
  let store: CadernoFlutuanteStore;
  let api: {
    listarPaginas: ReturnType<typeof vi.fn>;
    listarPaginasMembro: ReturnType<typeof vi.fn>;
    recuperarPagina: ReturnType<typeof vi.fn>;
    criarPagina: ReturnType<typeof vi.fn>;
    alterarPagina: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    api = {
      listarPaginas: vi.fn(() => of([])),
      listarPaginasMembro: vi.fn(() => of([])),
      recuperarPagina: vi.fn(() => of(pagina)),
      criarPagina: vi.fn(() => of(pagina)),
      alterarPagina: vi.fn(() => of({ ...pagina, updatedDate: '2026-08-10T10:01:00.000Z' })),
    };
    TestBed.configureTestingModule({
      providers: [CadernoFlutuanteStore, { provide: PaginaCadernoService, useValue: api }],
    });
    store = TestBed.inject(CadernoFlutuanteStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa alterações em um PUT após 800 ms', () => {
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'A', conteudoMarkdown: 'um' });
    vi.advanceTimersByTime(400);
    store.alterarRascunho({ titulo: 'AB', conteudoMarkdown: 'dois' });
    vi.advanceTimersByTime(799);
    expect(api.alterarPagina).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(api.alterarPagina).toHaveBeenCalledWith(11, {
      titulo: 'AB',
      conteudoMarkdown: 'dois',
      updatedDate: pagina.updatedDate,
    });
    expect(store.estadoSalvamento()).toBe('SALVO');
  });

  it('serializa uma mudança feita enquanto o PUT está em andamento', () => {
    const primeiraResposta = new Subject<PaginaCadernoDto>();
    api.alterarPagina
      .mockReturnValueOnce(primeiraResposta)
      .mockReturnValueOnce(of({ ...pagina, titulo: 'Final', updatedDate: 'v3' }));
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Intermediário', conteudoMarkdown: '' });
    vi.advanceTimersByTime(800);
    store.alterarRascunho({ titulo: 'Final', conteudoMarkdown: '' });
    vi.advanceTimersByTime(800);
    expect(api.alterarPagina).toHaveBeenCalledTimes(1);

    primeiraResposta.next({ ...pagina, titulo: 'Intermediário', updatedDate: 'v2' });
    primeiraResposta.complete();
    vi.advanceTimersByTime(0);

    expect(api.alterarPagina).toHaveBeenCalledTimes(2);
    expect(api.alterarPagina).toHaveBeenLastCalledWith(
      11,
      expect.objectContaining({ titulo: 'Final', updatedDate: 'v2' }),
    );
  });

  it('não persiste página nova antes de receber título', () => {
    store.abrir(3);
    store.iniciarNovaPagina();
    store.alterarRascunho({ titulo: '   ', conteudoMarkdown: 'rascunho' });
    vi.advanceTimersByTime(800);
    expect(api.criarPagina).not.toHaveBeenCalled();

    store.alterarRascunho({ titulo: 'Ideias', conteudoMarkdown: 'rascunho' });
    vi.advanceTimersByTime(800);
    expect(api.criarPagina).toHaveBeenCalledWith(3, {
      titulo: 'Ideias',
      conteudoMarkdown: 'rascunho',
    });
  });

  it('importa uma página por POST imediato e a insere no topo', () => {
    const importada = { ...pagina, id: 22, titulo: 'Sessão 04', conteudoMarkdown: '# Pistas\n' };
    api.criarPagina.mockReturnValue(of(importada));
    store.abrir(3);

    store.importarPagina({ titulo: 'Sessão 04', conteudoMarkdown: '# Pistas\n' });

    expect(api.criarPagina).toHaveBeenCalledWith(3, {
      titulo: 'Sessão 04',
      conteudoMarkdown: '# Pistas\n',
    });
    expect(store.paginas()[0]?.id).toBe(22);
    expect(store.estadoSalvamento()).toBe('SALVO');
  });

  it('preserva o rascunho ao minimizar e tenta salvá-lo ao fechar', () => {
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Alterado', conteudoMarkdown: 'local' });
    store.minimizar();
    expect(store.rascunho()).toEqual({ titulo: 'Alterado', conteudoMarkdown: 'local' });
    store.fechar();
    expect(api.alterarPagina).toHaveBeenCalledTimes(1);
    expect(store.estado().aberto).toBe(false);
    expect(store.rascunho().conteudoMarkdown).toBe('local');
  });

  it('tenta salvar e limpa o conteúdo anterior ao trocar de campanha', () => {
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Alterado', conteudoMarkdown: 'segredo' });
    store.abrir(4);
    expect(api.alterarPagina).toHaveBeenCalledTimes(1);
    expect(store.campanhaId()).toBe(4);
    expect(store.paginaAtiva()).toBeNull();
    expect(store.rascunho()).toEqual({ titulo: '', conteudoMarkdown: '' });
  });

  it('não bloqueia o autosave da nova campanha enquanto a anterior termina', () => {
    const respostaAnterior = new Subject<PaginaCadernoDto>();
    api.alterarPagina.mockReturnValueOnce(respostaAnterior);
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Anterior', conteudoMarkdown: 'segredo' });
    vi.advanceTimersByTime(800);

    store.abrir(4);
    store.iniciarNovaPagina();
    store.alterarRascunho({ titulo: 'Nova campanha', conteudoMarkdown: 'isolado' });
    vi.advanceTimersByTime(800);
    expect(api.criarPagina).not.toHaveBeenCalled();

    respostaAnterior.next({ ...pagina, titulo: 'Anterior' });
    respostaAnterior.complete();

    expect(api.criarPagina).toHaveBeenCalledWith(4, {
      titulo: 'Nova campanha',
      conteudoMarkdown: 'isolado',
    });
  });

  it('mantém o rascunho e marca conflito diante de resposta 409', () => {
    api.alterarPagina.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Minha versão', conteudoMarkdown: 'não perder' });
    vi.advanceTimersByTime(800);
    expect(store.estadoSalvamento()).toBe('CONFLITO');
    expect(store.rascunho()).toEqual({
      titulo: 'Minha versão',
      conteudoMarkdown: 'não perder',
    });
  });

  it('marca falha comum sem descartar o rascunho', () => {
    api.alterarPagina.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Ainda aqui', conteudoMarkdown: 'texto local' });
    vi.advanceTimersByTime(800);
    expect(store.estadoSalvamento()).toBe('FALHA');
    expect(store.rascunho().conteudoMarkdown).toBe('texto local');
  });

  it('recarrega a versão persistida somente quando o usuário pede', () => {
    const versaoServidor = { ...pagina, titulo: 'Versão do servidor', updatedDate: 'v2' };
    api.recuperarPagina.mockReturnValue(of(versaoServidor));
    store.abrir(3);
    store.selecionarPagina(pagina);
    store.alterarRascunho({ titulo: 'Meu conflito', conteudoMarkdown: 'local' });

    store.recarregarPaginaAtiva();

    expect(api.recuperarPagina).toHaveBeenCalledWith(11);
    expect(store.rascunho().titulo).toBe('Versão do servidor');
  });

  it('não agenda escrita para página somente leitura', () => {
    store.abrir(3);
    store.selecionarPagina({ ...pagina, somenteLeitura: true });
    store.alterarRascunho({ titulo: 'Tentativa', conteudoMarkdown: 'bloqueado' });
    vi.advanceTimersByTime(1_000);
    expect(api.alterarPagina).not.toHaveBeenCalled();
    expect(store.rascunho().titulo).toBe(pagina.titulo);
  });

  it('limita e persiste somente a geometria no dispositivo', () => {
    store.alterarGeometria(
      { x: 2_000, y: -40, largura: 1_600, altura: 900 },
      { largura: 1_200, altura: 800 },
    );
    expect(store.estado().geometria).toEqual({
      x: 0,
      y: 0,
      largura: 1_200,
      altura: 800,
    });
    const persistido = localStorage.getItem('contratados-rpg:caderno-geometria:v1');
    expect(persistido).toContain('"largura":1200');
    expect(persistido).not.toContain('conteudoMarkdown');
    expect(persistido).not.toContain('segredo');
  });

  it('permite reduzir a janela até pouco além da largura mobile', () => {
    store.alterarGeometria(
      { x: 0, y: 0, largura: 1, altura: 520 },
      { largura: 1_200, altura: 800 },
    );

    expect(store.estado().geometria.largura).toBe(440);
  });
});
