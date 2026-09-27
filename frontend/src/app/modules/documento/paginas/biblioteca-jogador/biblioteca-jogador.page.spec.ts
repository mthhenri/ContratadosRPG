import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { DocumentoService } from '../../documento.service';
import { BibliotecaJogador } from './biblioteca-jogador.page';

/**
 * Prova a biblioteca do jogador (m9-05): só o que o backend listou (o revelado), sem nenhum
 * controle do mestre, estado vazio e esqueleto — e o tempo real do `BibliotecaLeituraStore`:
 * `REVELADO` acrescenta sem abrir, `OCULTADO`/`REMOVIDO` do aberto fecham com aviso, uma versão
 * nova recarrega em silêncio e a reconexão refaz a lista.
 */
describe('BibliotecaJogador', () => {
  const CAMPANHA_ID = 9;
  const V1 = '2026-09-26 10:00:00.000001+00';
  const V2 = '2026-09-26 10:05:00.000002+00';

  const resumo = (
    id: number,
    titulo: string,
    extra: Partial<DocumentoResumoDto> = {},
  ): DocumentoResumoDto => ({
    id,
    campanhaId: CAMPANHA_ID,
    titulo,
    tipo: TipoDocumentoEnum.TEXTO,
    imagemUrl: null,
    revelado: true,
    ordem: id,
    updatedDate: V1,
    ...extra,
  });
  const completo = (item: DocumentoResumoDto, conteudo = '# Texto'): DocumentoRecuperadoDto => ({
    ...item,
    conteudoMarkdown: conteudo,
    createdDate: V1,
  });

  const carta = resumo(1, 'Carta do informante');
  const mapa = resumo(2, 'Mapa do porto');

  function montar(opcoes: { documentos?: DocumentoResumoDto[]; pendente?: boolean } = {}) {
    let lista = [...(opcoes.documentos ?? [carta, mapa])];
    const listagem$ = new Subject<DocumentoResumoDto[]>();
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const documentoService = {
      listar: vi.fn(() => (opcoes.pendente ? listagem$ : of([...lista]))),
      recuperar: vi.fn((id: number) => of(completo(lista.find((item) => item.id === id)!))),
      buscar: vi.fn(),
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
        { provide: TempoRealService, useValue: tempoReal },
        {
          provide: CampanhaService,
          useValue: { recuperarCampanha: vi.fn(() => of({ id: CAMPANHA_ID, nome: 'Operação Maré' })) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ campanhaId: String(CAMPANHA_ID) }) },
          },
        },
      ],
    });
    const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');
    const fixture = TestBed.createComponent(BibliotecaJogador);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const alterarLista = (nova: DocumentoResumoDto[]) => (lista = nova);
    const evento = (alteracao: DocumentoAlteracaoEnum, documentoId: number | null) => {
      documentoAlterado$.next({ campanhaId: CAMPANHA_ID, documentoId, alteracao });
      fixture.detectChanges();
    };
    return {
      fixture,
      raiz,
      documentoService,
      tempoReal,
      notificar,
      listagem$,
      alterarLista,
      evento,
    };
  }

  const texto = (elemento: Element | null | undefined) =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const titulos = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll('.lista-documentos__itens .documento-cartao__nome')).map(texto);
  const abrir = (fixture: ReturnType<typeof montar>['fixture'], titulo: string) => {
    const raiz = fixture.nativeElement as HTMLElement;
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('.documento-cartao'))
      .find((cartao) => texto(cartao.querySelector('.documento-cartao__nome')) === titulo)!
      .click();
    fixture.detectChanges();
  };
  const tituloAberto = (raiz: HTMLElement) => texto(raiz.querySelector('.biblioteca__documento-titulo'));

  it('mostra o esqueleto enquanto a lista carrega', () => {
    const { raiz } = montar({ pendente: true });
    expect(raiz.querySelector('[aria-label="Carregando os documentos"]')).not.toBeNull();
  });

  it('sem nada revelado, o estado vazio da mesa e nenhum painel', () => {
    const { raiz } = montar({ documentos: [] });
    const vazio = texto(raiz.querySelector('.biblioteca__lista app-estado-vazio'));
    expect(vazio).toContain('Nenhum documento revelado ainda.');
    expect(vazio).toContain('O que o mestre revelar aparece aqui ao vivo.');
    expect(raiz.querySelector('section[aria-label="Documento aberto"]')).toBeNull();
  });

  it('lista o que o backend entregou, sem chip de estado, setas nem "Novo documento"', () => {
    const { raiz, tempoReal } = montar();

    expect(titulos(raiz)).toEqual(['Carta do informante', 'Mapa do porto']);
    expect(raiz.querySelector('.documento-cartao app-chip')).toBeNull();
    expect(raiz.querySelector('[aria-label^="Subir"], [aria-label^="Descer"]')).toBeNull();
    expect(texto(raiz)).not.toContain('Novo documento');
    expect(texto(raiz.querySelector('.biblioteca__campanha'))).toBe('Operação Maré');
    expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  it('abre o documento só no leitor — sem Editar, Revelar, Ocultar nem Remover', () => {
    const { fixture, raiz } = montar();

    abrir(fixture, 'Carta do informante');

    expect(tituloAberto(raiz)).toBe('Carta do informante');
    expect(raiz.querySelector('app-leitor-documento')).not.toBeNull();
    const botoes = Array.from(raiz.querySelectorAll('button')).map(texto);
    for (const rotulo of ['Editar', 'Revelar', 'Ocultar', 'Remover']) {
      expect(botoes).not.toContain(rotulo);
    }
    expect(raiz.querySelector('section[aria-label="Documento aberto"] app-chip')).toBeNull();
  });

  it('REVELADO acrescenta o documento à lista sem abrir nada', () => {
    const { fixture, raiz, alterarLista, evento } = montar();
    abrir(fixture, 'Carta do informante');

    alterarLista([carta, mapa, resumo(3, 'Relatório')]);
    evento(DocumentoAlteracaoEnum.REVELADO, 3);

    expect(titulos(raiz)).toEqual(['Carta do informante', 'Mapa do porto', 'Relatório']);
    expect(tituloAberto(raiz)).toBe('Carta do informante');
  });

  it('OCULTADO do documento aberto fecha o painel com o aviso e o tira da lista', () => {
    const { fixture, raiz, notificar, alterarLista, evento } = montar();
    abrir(fixture, 'Carta do informante');

    alterarLista([mapa]);
    evento(DocumentoAlteracaoEnum.OCULTADO, carta.id);

    expect(raiz.querySelector('.biblioteca__documento-titulo')).toBeNull();
    expect(titulos(raiz)).toEqual(['Mapa do porto']);
    expect(notificar).toHaveBeenCalledTimes(1);
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        severidade: 'aviso',
        detalhe: 'Este documento não está mais disponível.',
      }),
    );
  });

  it('REMOVIDO do documento aberto fecha do mesmo jeito; de outro documento, não', () => {
    const { fixture, raiz, notificar, alterarLista, evento } = montar();
    abrir(fixture, 'Carta do informante');

    alterarLista([carta]);
    evento(DocumentoAlteracaoEnum.REMOVIDO, mapa.id);
    expect(tituloAberto(raiz)).toBe('Carta do informante');
    expect(notificar).not.toHaveBeenCalled();

    alterarLista([]);
    evento(DocumentoAlteracaoEnum.REMOVIDO, carta.id);
    expect(raiz.querySelector('.biblioteca__documento-titulo')).toBeNull();
    expect(notificar).toHaveBeenCalledTimes(1);
  });

  it('ALTERADO do aberto recarrega o conteúdo em silêncio, sem esqueleto', () => {
    const { fixture, raiz, documentoService, alterarLista, evento } = montar();
    abrir(fixture, 'Carta do informante');
    documentoService.recuperar.mockClear();

    const novaCarta = resumo(1, 'Carta do informante (rasgada)', { updatedDate: V2 });
    alterarLista([novaCarta, mapa]);
    evento(DocumentoAlteracaoEnum.ALTERADO, carta.id);

    expect(documentoService.recuperar).toHaveBeenCalledWith(carta.id);
    expect(raiz.querySelector('[aria-label="Carregando o documento"]')).toBeNull();
    expect(tituloAberto(raiz)).toBe('Carta do informante (rasgada)');
  });

  it('a reconexão refaz a lista; o aberto que sumiu sem evento fecha com o aviso', () => {
    const { fixture, raiz, documentoService, tempoReal, notificar, alterarLista } = montar();
    abrir(fixture, 'Carta do informante');
    documentoService.listar.mockClear();

    alterarLista([mapa]);
    tempoReal.reconexao.set(1);
    fixture.detectChanges();

    expect(documentoService.listar).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(titulos(raiz)).toEqual(['Mapa do porto']);
    expect(raiz.querySelector('.biblioteca__documento-titulo')).toBeNull();
    expect(notificar).toHaveBeenCalledTimes(1);
  });

  it('sai da sala da campanha ao ser destruída', () => {
    const { fixture, tempoReal } = montar();
    fixture.destroy();
    expect(tempoReal.sairSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
  });
});
