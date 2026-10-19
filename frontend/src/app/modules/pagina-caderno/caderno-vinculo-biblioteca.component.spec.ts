import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { BibliotecaLeituraStore } from '../documento/biblioteca-leitura.store';
import { DocumentoService } from '../documento/documento.service';
import { TempoRealService } from '../../core/services/tempo-real.service';
import { CadernoVinculoBiblioteca, lerDocumentoDoVinculo } from './caderno-vinculo-biblioteca.component';

describe('CadernoVinculoBiblioteca', () => {
  it.each(['https://exemplo.org/#biblioteca-documento-7', '#biblioteca-documento-0', '#biblioteca-documento-07', '#biblioteca-documento-7/extra', '#biblioteca-documento-9007199254740992'])('recusa vínculo não canônico: %s', (href) => {
    expect(lerDocumentoDoVinculo(href)).toBeNull();
  });

  it('resolve o ID de um vínculo canônico', () => {
    expect(lerDocumentoDoVinculo('#biblioteca-documento-7')).toBe(7);
  });
  function montar(documentoId: number | null = null) {
    const documento = {
      id: 7, campanhaId: 3, titulo: 'Depoimento', tipo: TipoDocumentoEnum.TEXTO,
      revelado: true, ordem: 0, conteudoMarkdown: 'Conteúdo', imagemUrl: null,
      updatedDate: '2026-10-19',
    };
    const store = {
      documentos: signal([documento]), carregandoLista: signal(false), erroLista: signal(false),
      aberto: signal<unknown>(null), abertoId: signal<number | null>(null),
      iniciar: vi.fn(), tentarNovamente: vi.fn(),
      abrirDocumento: vi.fn((id: number) => store.abertoId.set(id)),
    };
    const api = { recuperar: vi.fn(() => of(documento)), buscar: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CadernoVinculoBiblioteca],
      providers: [
        { provide: DocumentoService, useValue: api },
        { provide: TempoRealService, useValue: { documentoAlterado$: new Subject(), reconexao$: new Subject() } },
      ],
    }).overrideComponent(CadernoVinculoBiblioteca, {
      set: { providers: [{ provide: BibliotecaLeituraStore, useValue: store }] },
    });
    const fixture = TestBed.createComponent(CadernoVinculoBiblioteca);
    const selecao = { texto: 'a mulher de casaco vermelho', aplicarLink: vi.fn(() => true), cancelar: vi.fn() };
    fixture.componentRef.setInput('campanhaId', 3);
    fixture.componentRef.setInput('ehMestre', false);
    fixture.componentRef.setInput('documentoId', documentoId);
    fixture.componentRef.setInput('selecao', documentoId === null ? selecao : null);
    const fechou = vi.fn();
    fixture.componentInstance.fechou.subscribe(fechou);
    fixture.detectChanges();
    const escolher = () => (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[app-documento-cartao]')!.click();
    return { fixture, store, api, documento, selecao, fechou, escolher };
  }

  it('revalida acesso e grava somente ID e texto escolhido, sem copiar título', () => {
    const { api, selecao, fechou, escolher } = montar();
    escolher();
    expect(api.recuperar).toHaveBeenCalledWith(7);
    expect(selecao.aplicarLink).toHaveBeenCalledWith('#biblioteca-documento-7');
    expect(fechou).toHaveBeenCalled();
  });

  it('não cria vínculo quando o documento foi ocultado entre lista e escolha', () => {
    const { fixture, api, selecao, escolher } = montar();
    api.recuperar.mockReturnValue(throwError(() => new Error('404')));
    escolher();
    fixture.detectChanges();
    expect(selecao.aplicarLink).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('não está mais disponível');
  });

  it('recusa documento de outra campanha mesmo que o usuário tenha acesso', () => {
    const { api, documento, selecao, escolher } = montar();
    api.recuperar.mockReturnValue(of({ ...documento, campanhaId: 99 }));
    escolher();
    expect(selecao.aplicarLink).not.toHaveBeenCalled();
  });

  it('seleção removida pela colaboração mantém texto e informa falha', () => {
    const { fixture, selecao, escolher } = montar();
    selecao.aplicarLink.mockReturnValue(false);
    escolher();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Selecione o trecho novamente');
  });

  it('cancelar fecha sem aplicar e libera o handle de seleção', () => {
    const { fixture, selecao, fechou } = montar();
    const cancelar = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((botao) => botao.textContent?.trim() === 'Cancelar')!;
    cancelar.click();
    expect(selecao.aplicarLink).not.toHaveBeenCalled();
    expect(selecao.cancelar).toHaveBeenCalled();
    expect(fechou).toHaveBeenCalled();
  });

  it('ID fora da biblioteca atual não é recuperado nem expõe metadados', () => {
    const { fixture, store } = montar(999);
    expect(store.abrirDocumento).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Documento indisponível');
    expect(fixture.nativeElement.textContent).not.toContain('Depoimento');
  });

  it('ocultar o documento aberto remove título e conteúdo do leitor', () => {
    const { fixture, store, documento } = montar(7);
    store.aberto.set(documento);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Depoimento');
    store.aberto.set(null);
    store.abertoId.set(null);
    store.documentos.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Depoimento');
    expect(fixture.nativeElement.textContent).toContain('Documento indisponível');
  });
});
