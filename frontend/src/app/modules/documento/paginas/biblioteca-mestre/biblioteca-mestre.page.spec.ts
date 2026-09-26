import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { DocumentoCriarDialog } from '../../componentes/documento-criar-dialog/documento-criar-dialog.component';
import { DocumentoService } from '../../documento.service';
import { BibliotecaMestre } from './biblioteca-mestre.page';

/**
 * Prova a biblioteca do mestre (m9-04): lista (vazia, esqueleto, ordem e setas), o documento aberto
 * (ler, editar e salvar com `confirmarValor()`, conflito 409, rascunho que pede confirmação),
 * revelar/ocultar, remover, criar `TEXTO`/`IMAGEM`, upload e o tempo real.
 */
describe('BibliotecaMestre', () => {
  const CAMPANHA_ID = 9;
  const V1 = '2026-09-26 10:00:00.000001+00';
  const V2 = '2026-09-26 10:05:00.000002+00';

  const resumo = (
    id: number,
    titulo: string,
    tipo = TipoDocumentoEnum.TEXTO,
    extra: Partial<DocumentoResumoDto> = {},
  ): DocumentoResumoDto => ({
    id,
    campanhaId: CAMPANHA_ID,
    titulo,
    tipo,
    imagemUrl: null,
    revelado: false,
    ordem: id,
    updatedDate: V1,
    ...extra,
  });
  const completo = (item: DocumentoResumoDto, conteudo = '# Texto'): DocumentoRecuperadoDto => ({
    ...item,
    conteudoMarkdown: item.tipo === TipoDocumentoEnum.TEXTO ? conteudo : null,
    createdDate: V1,
  });

  const carta = resumo(1, 'Carta do informante');
  const mapa = resumo(2, 'Mapa do porto', TipoDocumentoEnum.IMAGEM, {
    imagemUrl: '/uploads/documentos/mapa.png',
    revelado: true,
  });
  const relatorio = resumo(3, 'Relatório');

  interface Opcoes {
    readonly documentos?: readonly DocumentoResumoDto[];
    readonly listagemPendente?: boolean;
  }

  function montar(opcoes: Opcoes = {}) {
    const { documentos = [carta, mapa, relatorio], listagemPendente = false } = opcoes;
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const listagem$ = new Subject<DocumentoResumoDto[]>();
    const lista = [...documentos];
    const documentoService = {
      listar: vi.fn(() => (listagemPendente ? listagem$ : of([...lista]))),
      recuperar: vi.fn((id: number) => of(completo(lista.find((item) => item.id === id)!))),
      criar: vi.fn(),
      alterar: vi.fn(),
      remover: vi.fn(() => of(undefined)),
      revelar: vi.fn((id: number) => of({ id, revelado: true, updatedDate: V2 })),
      ocultar: vi.fn((id: number) => of({ id, revelado: false, updatedDate: V2 })),
      reordenar: vi.fn((_campanhaId: number, ordem: readonly number[]) =>
        of(ordem.map((id) => lista.find((item) => item.id === id)!)),
      ),
      enviarImagem: vi.fn(),
    };
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      reconexao: signal(0),
      documentoAlterado$,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DocumentoService, useValue: documentoService },
        {
          provide: CampanhaService,
          useValue: {
            recuperarCampanha: vi.fn(() => of({ id: CAMPANHA_ID, nome: 'Campanha de Teste' })),
          },
        },
        { provide: TempoRealService, useValue: tempoReal },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ campanhaId: String(CAMPANHA_ID) }) },
          },
        },
      ],
    });
    const confirmar = vi
      .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
      .mockResolvedValue(true);
    const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');
    const fixture = TestBed.createComponent(BibliotecaMestre);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      raiz,
      lista,
      documentoService,
      tempoReal,
      documentoAlterado$,
      listagem$,
      confirmar,
      notificar,
    };
  }

  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const titulos = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll('.documento-cartao__nome')).map((nome) => texto(nome));
  const botao = (raiz: Element, rotulo: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => texto(item) === rotulo || item.getAttribute('aria-label') === rotulo,
    );
  const painel = (raiz: HTMLElement) =>
    raiz.querySelector('section[aria-label="Documento aberto"]') as HTMLElement;

  async function estabilizar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function abrir(contexto: ReturnType<typeof montar>, titulo: string): Promise<void> {
    const cartao = Array.from(
      contexto.raiz.querySelectorAll<HTMLButtonElement>('.documento-cartao'),
    ).find((item) => texto(item.querySelector('.documento-cartao__nome')) === titulo)!;
    cartao.click();
    await estabilizar(contexto.fixture);
  }

  function editor(fixture: ReturnType<typeof montar>['fixture']): EditorMarkdown {
    return fixture.debugElement.query(By.directive(EditorMarkdown)).componentInstance;
  }

  function tituloEdicao(raiz: HTMLElement): HTMLInputElement {
    return painel(raiz).querySelector('input.campo__controle') as HTMLInputElement;
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  it('mostra o esqueleto enquanto a lista carrega', () => {
    const { fixture, raiz, listagem$ } = montar({ listagemPendente: true });
    expect(raiz.querySelector('[aria-label="Carregando os documentos"]')).not.toBeNull();

    listagem$.next([carta]);
    listagem$.complete();
    fixture.detectChanges();
    expect(raiz.querySelector('[aria-label="Carregando os documentos"]')).toBeNull();
    expect(titulos(raiz)).toEqual(['Carta do informante']);
  });

  it('mostra o estado vazio sem documentos', () => {
    const { raiz } = montar({ documentos: [] });
    expect(texto(raiz.querySelector('.biblioteca__lista app-estado-vazio'))).toContain(
      'Nenhum documento ainda.',
    );
    // O estado vazio da lista basta: sem documentos, o painel nem aparece.
    expect(painel(raiz)).toBeNull();
  });

  it('lista na ordem com o chip de estado de cada documento', () => {
    const { raiz } = montar();
    expect(titulos(raiz)).toEqual(['Carta do informante', 'Mapa do porto', 'Relatório']);
    const chips = Array.from(raiz.querySelectorAll('.documento-cartao app-chip')).map(texto);
    expect(chips).toEqual(['Oculto', 'Revelado', 'Oculto']);
  });

  it('reordena enviando a lista completa, e a seta no limite fica desabilitada', () => {
    const { fixture, raiz, documentoService } = montar();
    expect(botao(raiz, 'Subir Carta do informante')?.disabled).toBe(true);
    expect(botao(raiz, 'Descer Relatório')?.disabled).toBe(true);

    botao(raiz, 'Descer Carta do informante')!.click();
    fixture.detectChanges();
    expect(documentoService.reordenar).toHaveBeenCalledWith(CAMPANHA_ID, [2, 1, 3]);
    expect(titulos(raiz)).toEqual(['Mapa do porto', 'Carta do informante', 'Relatório']);
  });

  it('refaz a lista a cada evento da campanha, e ignora o de outra campanha', () => {
    const { fixture, raiz, lista, documentoService, documentoAlterado$ } = montar();
    const chamadas = documentoService.listar.mock.calls.length;
    lista.push(resumo(4, 'Diário'));

    documentoAlterado$.next({
      campanhaId: 99,
      documentoId: 4,
      alteracao: DocumentoAlteracaoEnum.CRIADO,
    });
    expect(documentoService.listar).toHaveBeenCalledTimes(chamadas);

    documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 4,
      alteracao: DocumentoAlteracaoEnum.CRIADO,
    });
    fixture.detectChanges();
    expect(titulos(raiz)).toContain('Diário');
  });

  it('refaz a lista na reconexão', () => {
    const { fixture, documentoService, tempoReal } = montar();
    const chamadas = documentoService.listar.mock.calls.length;
    tempoReal.reconexao.set(1);
    fixture.detectChanges();
    expect(documentoService.listar.mock.calls.length).toBe(chamadas + 1);
  });

  // ── Documento aberto ──────────────────────────────────────────────────────

  it('abre o documento no painel pelo leitor, com o cartão marcado como aberto', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');

    expect(contexto.documentoService.recuperar).toHaveBeenCalledWith(1);
    expect(texto(painel(contexto.raiz).querySelector('h2'))).toBe('Carta do informante');
    expect(painel(contexto.raiz).querySelector('app-leitor-documento')).not.toBeNull();
    expect(
      contexto.raiz.querySelector('.documento-cartao--aberto .documento-cartao__nome')?.textContent,
    ).toContain('Carta do informante');
  });

  it('edita e salva lendo o editor com confirmarValor() e a versão de onde partiu', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);

    const confirmarValor = vi
      .spyOn(editor(contexto.fixture), 'confirmarValor')
      .mockReturnValue('# Texto novo, com o fim');
    contexto.documentoService.alterar.mockReturnValue(
      of({ ...completo(carta, '# Texto novo, com o fim'), updatedDate: V2 }),
    );
    botao(painel(contexto.raiz), 'Salvar')!.click();
    await estabilizar(contexto.fixture);

    expect(confirmarValor).toHaveBeenCalled();
    expect(contexto.documentoService.alterar).toHaveBeenCalledWith({
      id: 1,
      titulo: 'Carta do informante',
      conteudoMarkdown: '# Texto novo, com o fim',
      updatedDate: V1,
    });
    expect(painel(contexto.raiz).querySelector('app-editor-markdown.biblioteca__editor')).toBeNull();
    expect(contexto.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'sucesso', resumo: 'Documento salvo' }),
    );
  });

  it('um 409 ao salvar mostra o aviso de conflito sem descartar o rascunho, e Recarregar traz a versão atual', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    vi.spyOn(editor(contexto.fixture), 'confirmarValor').mockReturnValue('meu rascunho');
    contexto.documentoService.alterar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );

    botao(painel(contexto.raiz), 'Salvar')!.click();
    await estabilizar(contexto.fixture);
    expect(painel(contexto.raiz).querySelector('.biblioteca__conflito')).not.toBeNull();
    expect(editor(contexto.fixture)).toBeTruthy();
    expect(botao(painel(contexto.raiz), 'Salvar')?.disabled).toBe(true);

    contexto.lista[0] = { ...carta, updatedDate: V2 };
    botao(painel(contexto.raiz), 'Recarregar')!.click();
    await estabilizar(contexto.fixture);
    expect(painel(contexto.raiz).querySelector('.biblioteca__conflito')).toBeNull();
    expect(botao(painel(contexto.raiz), 'Salvar')?.disabled).toBe(false);
  });

  it('trocar de documento com rascunho pede "Descartar alterações?" e, recusado, mantém a edição', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    const entrada = tituloEdicao(contexto.raiz);
    entrada.value = 'Carta rasurada';
    entrada.dispatchEvent(new Event('input'));
    contexto.confirmar.mockResolvedValue(false);

    await abrir(contexto, 'Relatório');
    expect(contexto.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Descartar alterações?' }),
    );
    expect(texto(painel(contexto.raiz).querySelector('h2'))).toBe('Carta do informante');
    expect(tituloEdicao(contexto.raiz).value).toBe('Carta rasurada');

    contexto.confirmar.mockResolvedValue(true);
    await abrir(contexto, 'Relatório');
    expect(texto(painel(contexto.raiz).querySelector('h2'))).toBe('Relatório');
  });

  it('sem rascunho, cancelar e sair não pedem confirmação', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    vi.spyOn(editor(contexto.fixture), 'confirmarValor').mockReturnValue('# Texto');

    expect(contexto.fixture.componentInstance.podeSair()).toBe(true);
    botao(painel(contexto.raiz), 'Cancelar')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.confirmar).not.toHaveBeenCalled();
    expect(tituloEdicao(contexto.raiz)).toBeNull();
  });

  it('sair da rota com rascunho pede confirmação', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    vi.spyOn(editor(contexto.fixture), 'confirmarValor').mockReturnValue('texto diferente');
    contexto.confirmar.mockResolvedValue(false);

    await expect(contexto.fixture.componentInstance.podeSair()).resolves.toBe(false);
  });

  it('revela e oculta na hora, sem modal, com o toast e o chip trocando', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');

    botao(painel(contexto.raiz), 'Revelar')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.confirmar).not.toHaveBeenCalled();
    expect(contexto.documentoService.revelar).toHaveBeenCalledWith(1);
    expect(texto(painel(contexto.raiz).querySelector('app-chip'))).toBe('Revelado');
    expect(contexto.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ resumo: 'Revelado para a mesa' }),
    );

    botao(painel(contexto.raiz), 'Ocultar')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.documentoService.ocultar).toHaveBeenCalledWith(1);
    expect(texto(painel(contexto.raiz).querySelector('app-chip'))).toBe('Oculto');
    expect(contexto.notificar).toHaveBeenCalledWith(expect.objectContaining({ resumo: 'Oculto' }));
  });

  it('depois de revelar, salvar usa a versão que o revelar devolveu (sem o próprio 409)', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    botao(painel(contexto.raiz), 'Revelar')!.click();
    await estabilizar(contexto.fixture);
    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    vi.spyOn(editor(contexto.fixture), 'confirmarValor').mockReturnValue('novo');
    contexto.documentoService.alterar.mockReturnValue(of(completo(carta, 'novo')));

    botao(painel(contexto.raiz), 'Salvar')!.click();
    expect(contexto.documentoService.alterar).toHaveBeenCalledWith(
      expect.objectContaining({ updatedDate: V2 }),
    );
  });

  it('um IMAGEM sem arquivo não pode ser revelado', async () => {
    const contexto = montar({ documentos: [resumo(5, 'Foto', TipoDocumentoEnum.IMAGEM)] });
    await abrir(contexto, 'Foto');
    expect(botao(painel(contexto.raiz), 'Revelar')?.disabled).toBe(true);
  });

  it('remove só depois da confirmação destrutiva e fecha o painel', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    contexto.confirmar.mockResolvedValue(false);
    botao(painel(contexto.raiz), 'Remover')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.documentoService.remover).not.toHaveBeenCalled();

    contexto.confirmar.mockResolvedValue(true);
    botao(painel(contexto.raiz), 'Remover')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.confirmar).toHaveBeenLastCalledWith(
      expect.objectContaining({ titulo: 'Remover documento', rotuloConfirmar: 'Remover' }),
    );
    expect(contexto.documentoService.remover).toHaveBeenCalledWith(1);
    expect(titulos(contexto.raiz)).not.toContain('Carta do informante');
    expect(painel(contexto.raiz).querySelector('h2')).toBeNull();
  });

  it('o eco REMOVIDO da própria remoção não vira aviso de outra sessão', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    contexto.documentoService.remover.mockImplementation(() => {
      contexto.documentoAlterado$.next({
        campanhaId: CAMPANHA_ID,
        documentoId: 1,
        alteracao: DocumentoAlteracaoEnum.REMOVIDO,
      });
      return of(undefined);
    });
    botao(painel(contexto.raiz), 'Remover')!.click();
    await estabilizar(contexto.fixture);
    expect(contexto.notificar).not.toHaveBeenCalledWith(expect.objectContaining({ severidade: 'aviso' }));
  });

  it('REMOVIDO do documento aberto, vindo de outra sessão, fecha o painel com aviso', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    contexto.lista.splice(0, 1);

    contexto.documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 1,
      alteracao: DocumentoAlteracaoEnum.REMOVIDO,
    });
    contexto.fixture.detectChanges();
    expect(painel(contexto.raiz).querySelector('h2')).toBeNull();
    expect(contexto.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'aviso', resumo: 'Documento removido' }),
    );
  });

  it('ALTERADO do aberto recarrega o conteúdo sem edição, e não mexe na edição em curso', async () => {
    const contexto = montar();
    await abrir(contexto, 'Carta do informante');
    contexto.documentoService.recuperar.mockClear();
    contexto.lista[0] = { ...carta, titulo: 'Carta revista', updatedDate: V2 };

    contexto.documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 1,
      alteracao: DocumentoAlteracaoEnum.ALTERADO,
    });
    await estabilizar(contexto.fixture);
    expect(contexto.documentoService.recuperar).toHaveBeenCalledWith(1);
    expect(texto(painel(contexto.raiz).querySelector('h2'))).toBe('Carta revista');

    botao(painel(contexto.raiz), 'Editar')!.click();
    await estabilizar(contexto.fixture);
    contexto.documentoService.recuperar.mockClear();
    contexto.lista[0] = { ...carta, titulo: 'Terceira versão', updatedDate: '2026-09-26 11:00:00+00' };
    contexto.documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 1,
      alteracao: DocumentoAlteracaoEnum.ALTERADO,
    });
    await estabilizar(contexto.fixture);
    expect(contexto.documentoService.recuperar).not.toHaveBeenCalled();
    expect(tituloEdicao(contexto.raiz).value).toBe('Carta revista');
  });

  // ── Criação e imagem ─────────────────────────────────────────────────────

  it('"Novo documento" abre o dialog; um TEXTO criado entra na lista e abre no editor', async () => {
    const contexto = montar();
    botao(contexto.raiz, 'Novo documento')!.click();
    await estabilizar(contexto.fixture);
    const dialog = contexto.fixture.debugElement.query(By.directive(DocumentoCriarDialog));
    expect(dialog).not.toBeNull();

    const criado = completo(resumo(4, 'Diário'), '');
    contexto.lista.push(resumo(4, 'Diário'));
    (dialog.componentInstance as DocumentoCriarDialog).criado.emit(criado);
    await estabilizar(contexto.fixture);

    expect(contexto.fixture.debugElement.query(By.directive(DocumentoCriarDialog))).toBeNull();
    expect(titulos(contexto.raiz)).toContain('Diário');
    expect(tituloEdicao(contexto.raiz).value).toBe('Diário');
    expect(painel(contexto.raiz).querySelector('app-editor-markdown')).not.toBeNull();
  });

  it('um IMAGEM criado abre pedindo o arquivo', async () => {
    const contexto = montar();
    botao(contexto.raiz, 'Novo documento')!.click();
    await estabilizar(contexto.fixture);
    const dialog = contexto.fixture.debugElement.query(By.directive(DocumentoCriarDialog));
    (dialog.componentInstance as DocumentoCriarDialog).criado.emit(
      completo(resumo(4, 'Planta', TipoDocumentoEnum.IMAGEM)),
    );
    await estabilizar(contexto.fixture);

    expect(botao(painel(contexto.raiz), 'Escolher imagem')).toBeTruthy();
    expect(painel(contexto.raiz).querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/jpeg,image/png,image/webp',
    );
  });

  describe('upload de imagem', () => {
    async function comImagemEmEdicao() {
      const contexto = montar();
      await abrir(contexto, 'Mapa do porto');
      botao(painel(contexto.raiz), 'Editar')!.click();
      await estabilizar(contexto.fixture);
      return contexto;
    }

    function escolher(raiz: HTMLElement, arquivo: File): void {
      const entrada = painel(raiz).querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(entrada, 'files', { value: [arquivo], configurable: true });
      entrada.dispatchEvent(new Event('change'));
    }

    it('recusa tipo inválido e arquivo acima de 10 MB sem enviar', async () => {
      const contexto = await comImagemEmEdicao();
      escolher(contexto.raiz, new File(['x'], 'a.gif', { type: 'image/gif' }));
      contexto.fixture.detectChanges();
      expect(texto(painel(contexto.raiz).querySelector('.biblioteca__erro'))).toBe(
        'Formato inválido: use JPEG, PNG ou WEBP.',
      );

      const grande = new File(['x'], 'a.png', { type: 'image/png' });
      Object.defineProperty(grande, 'size', { value: 10 * 1024 * 1024 + 1 });
      escolher(contexto.raiz, grande);
      contexto.fixture.detectChanges();
      expect(texto(painel(contexto.raiz).querySelector('.biblioteca__erro'))).toBe(
        'Imagem maior que o limite permitido (10 MB).',
      );
      expect(contexto.documentoService.enviarImagem).not.toHaveBeenCalled();
    });

    it('envia a imagem válida e adota a URL e a versão devolvidas', async () => {
      const contexto = await comImagemEmEdicao();
      contexto.documentoService.enviarImagem.mockReturnValue(
        of({ id: 2, imagemUrl: '/uploads/documentos/novo.png', updatedDate: V2 }),
      );
      const arquivo = new File(['x'], 'b.png', { type: 'image/png' });
      escolher(contexto.raiz, arquivo);
      await estabilizar(contexto.fixture);

      expect(contexto.documentoService.enviarImagem).toHaveBeenCalledWith(2, arquivo);
      expect(painel(contexto.raiz).querySelector('img')?.getAttribute('src')).toBe(
        '/uploads/documentos/novo.png',
      );
    });

    it('a recusa do servidor vira mensagem no controle', async () => {
      const contexto = await comImagemEmEdicao();
      contexto.documentoService.enviarImagem.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { sucesso: false, mensagem: 'Arquivo de imagem corrompido' },
            }),
        ),
      );
      escolher(contexto.raiz, new File(['x'], 'c.png', { type: 'image/png' }));
      await estabilizar(contexto.fixture);
      expect(texto(painel(contexto.raiz).querySelector('.biblioteca__erro'))).toBe(
        'Arquivo de imagem corrompido',
      );
    });
  });
});
