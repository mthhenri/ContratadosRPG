import { of, Subject } from 'rxjs';

import { CenaTipoEnum, DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import type { DocumentoRecuperadoDto } from "@contratados-rpg/shared/dtos/documento";

import {
  CAMPANHA_ID,
  CENA_ID,
  USUARIO_JOGADOR,
  itemDaColuna,
  montarPainel,
  texto,
  type OpcoesDoPainel,
} from '../../../encontro/paginas/painel/painel-encontro.testing';
import { PainelCenaSemIniciativaJogador } from './painel-sem-iniciativa-jogador.page';

/** Um usuário que é jogador da campanha mas não tem ficha nela. */
const USUARIO_SEM_FICHA = 8;

/**
 * Prova a visão do jogador da cena sem iniciativa (m7-24): a casca da `ui-39` sem trilha, a
 * própria ficha no palco pelo mesmo `app-ficha-campanha-card` e nenhum controle de cena.
 */
describe('PainelCenaSemIniciativaJogador', () => {
  const montar = (opcoes: OpcoesDoPainel = {}) =>
    montarPainel(PainelCenaSemIniciativaJogador, {
      cenaTipo: CenaTipoEnum.INVESTIGACAO,
      semEncontro: true,
      incluirFichaDoJogador: true,
      usuarioId: USUARIO_JOGADOR,
      ...opcoes,
    });

  it('mostra a própria ficha no palco, com Rolagens e sem trilha', () => {
    const { fixture, fichaService } = montar();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(200);
    expect(elemento.querySelector('.cena-jogador__palco app-ficha-campanha-card')).not.toBeNull();
    expect(elemento.querySelector('app-historico-rolagens-sidebar')).not.toBeNull();
    expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
    expect(texto(elemento.querySelector('.cena-jogador__titulo'))).toBe(
      'Investigação · Contenção no Setor 12',
    );
    expect(texto(elemento.querySelector('.cena-jogador__cabecalho app-chip'))).toBe('Em cena');
  });

  it('não tem controles de cena — só as Ferramentas', () => {
    const elemento = montar().fixture.nativeElement as HTMLElement;

    const categorias = Array.from(elemento.querySelectorAll('.coluna-acoes__categoria')).map(
      (categoria) => texto(categoria),
    );
    expect(categorias).toEqual(['Ferramentas']);
    expect(itemDaColuna(elemento, 'Abrir cena')).toBeUndefined();
    expect(itemDaColuna(elemento, 'Encerrar cena')).toBeUndefined();
    expect(elemento.querySelector('app-espectador-ficha-card')).toBeNull();
  });

  it('sem ficha na campanha, o palco é um estado vazio', () => {
    const { fixture, fichaService } = montar({ usuarioId: USUARIO_SEM_FICHA });
    const elemento = fixture.nativeElement as HTMLElement;

    expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
    expect(elemento.querySelector('app-ficha-campanha-card')).toBeNull();
    expect(texto(elemento.querySelector('.cena-jogador__palco app-estado-vazio'))).toContain(
      'não tem ficha',
    );
  });

  describe('documentos apresentados (m7-25)', () => {
    beforeEach(() => vi.stubGlobal("ResizeObserver", class {
      observe(): void { /* Sem layout real no jsdom. */ }
      unobserve(): void { /* Sem layout real no jsdom. */ }
      disconnect(): void { /* Sem layout real no jsdom. */ }
    }));
    afterEach(() => vi.unstubAllGlobals());
    const documentoImagem = (id: number, titulo = `Imagem ${id}`): DocumentoRecuperadoDto => ({
      id, campanhaId: CAMPANHA_ID, titulo, tipo: TipoDocumentoEnum.IMAGEM,
      conteudoMarkdown: null, imagemUrl: `/imagem-${id}.png`, revelado: true, ordem: id,
      createdDate: "2026-09-29T00:00:00.000Z", updatedDate: "2026-09-29T00:00:00.000Z",
    });

    const montarComDocumentos = () => {
      const montado = montar();
      montado.cenaService.listarDocumentos.mockReturnValue(of([40, 41].map((documentoId, indice) => ({
        documentoId, titulo: `Imagem ${documentoId}`, tipo: TipoDocumentoEnum.IMAGEM,
        revelado: true, ordem: indice + 1, emFoco: false,
      }))));
      montado.cenaDocumentoAlterado$.next({ campanhaId: CAMPANHA_ID, cenaId: CENA_ID });
      montado.fixture.detectChanges();
      const elemento = montado.fixture.nativeElement as HTMLElement;
      const abrir = (indice = 0) => {
        elemento.querySelectorAll<HTMLButtonElement>("[app-documento-cartao]")[indice].click();
        montado.fixture.detectChanges();
      };
      const modal = Array.from(elemento.querySelectorAll<HTMLElement>("app-modal")).at(-1)!;
      const dialogo = () => modal.querySelector<HTMLDialogElement>("dialog")!;
      return { ...montado, elemento: modal, abrir, dialogo };
    };

    it("trocar A→B descarta A atrasado e mantém B no leitor do modal", () => {
      const { fixture, documentoService, elemento, abrir, dialogo } = montarComDocumentos();
      const cargaA = new Subject<DocumentoRecuperadoDto>();
      const cargaB = new Subject<DocumentoRecuperadoDto>();
      documentoService.recuperar.mockReturnValueOnce(cargaA as never)
        .mockReturnValueOnce(cargaB as never);
      abrir();
      abrir(1);
      cargaB.next(documentoImagem(41));
      fixture.detectChanges();
      cargaA.next(documentoImagem(40));
      fixture.detectChanges();
      expect(dialogo().open).toBe(true);
      expect(elemento.querySelector("app-leitor-documento img")?.getAttribute("alt")).toBe("Imagem 41");
      expect(texto(elemento.querySelector(".modal__titulo"))).toBe("Imagem 41");
    });

    it("botão Fechar durante carga cancela o leitor sem reabrir com resposta tardia", () => {
      const { fixture, documentoService, elemento, abrir, dialogo } = montarComDocumentos();
      const carga = new Subject<DocumentoRecuperadoDto>();
      documentoService.recuperar.mockReturnValueOnce(carga as never);
      abrir();
      expect(dialogo().open).toBe(true);
      elemento.querySelector<HTMLButtonElement>("button[aria-label='Fechar']")!.click();
      fixture.detectChanges();
      carga.next(documentoImagem(40));
      fixture.detectChanges();
      expect(dialogo().open).toBe(false);
      expect(elemento.querySelector("app-leitor-documento")).toBeNull();
    });

    it.each([DocumentoAlteracaoEnum.REMOVIDO, DocumentoAlteracaoEnum.OCULTADO])(
      "evento %s fecha modal e impede retorno de conteúdo pendente", (alteracao) => {
        const { fixture, documentoService, documentoAlterado$, elemento, abrir, dialogo } = montarComDocumentos();
        const carga = new Subject<DocumentoRecuperadoDto>();
        documentoService.recuperar.mockReturnValueOnce(carga as never);
        abrir();
        carga.next(documentoImagem(40));
        fixture.detectChanges();
        expect(elemento.querySelector("app-leitor-documento")).not.toBeNull();
        documentoAlterado$.next({ campanhaId: CAMPANHA_ID, documentoId: 40, alteracao });
        fixture.detectChanges();
        carga.next(documentoImagem(40));
        fixture.detectChanges();
        expect(dialogo().open).toBe(false);
        expect(elemento.querySelector("app-leitor-documento")).toBeNull();
      },
    );

    it("evento ALTERADO atualiza título e imagem do leitor aberto", () => {
      const { fixture, documentoService, documentoAlterado$, elemento, abrir, dialogo } = montarComDocumentos();
      documentoService.recuperar.mockReturnValueOnce(of(documentoImagem(40)) as never)
        .mockReturnValueOnce(of({ ...documentoImagem(40, "Imagem corrigida"),
          imagemUrl: "/imagem-corrigida.png" }) as never);
      abrir();
      documentoAlterado$.next({ campanhaId: CAMPANHA_ID, documentoId: 40,
        alteracao: DocumentoAlteracaoEnum.ALTERADO });
      fixture.detectChanges();
      expect(dialogo().open).toBe(true);
      expect(texto(elemento.querySelector(".modal__titulo"))).toBe("Imagem corrigida");
      expect(elemento.querySelector("app-leitor-documento img")?.getAttribute("src"))
        .toContain("imagem-corrigida.png");
    });

    it("erro sai do esqueleto e Tentar novamente recupera o modal", () => {
      const { fixture, documentoService, elemento, abrir, dialogo } = montarComDocumentos();
      const carga = new Subject<DocumentoRecuperadoDto>();
      documentoService.recuperar.mockReturnValueOnce(carga as never)
        .mockReturnValueOnce(of(documentoImagem(40)) as never);
      abrir();
      carga.error({ status: 500 });
      fixture.detectChanges();
      expect(dialogo().open).toBe(true);
      expect(elemento.querySelector("app-esqueleto")).toBeNull();
      const tentar = elemento.querySelector<HTMLButtonElement>(".cena-jogador__tentar-leitura")!;
      expect(texto(tentar)).toBe("Tentar novamente");
      tentar.click();
      fixture.detectChanges();
      expect(documentoService.recuperar).toHaveBeenCalledTimes(2);
      expect(elemento.querySelector("app-leitor-documento img")?.getAttribute("alt")).toBe("Imagem 40");
      expect(elemento.querySelector(".cena-jogador__tentar-leitura")).toBeNull();
    });

    it('sem documentos apresentados, a seção não aparece', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.cena-jogador__documentos')).toBeNull();
    });

    it('lista os documentos já apresentados e abre um deles num modal de leitura', () => {
      const montado = montar();
      const { fixture, cenaService, documentoService, cenaDocumentoAlterado$ } = montado;
      cenaService.listarDocumentos.mockReturnValue(
        of([
          {
            documentoId: 40,
            titulo: 'Relatório do informante',
            tipo: TipoDocumentoEnum.TEXTO,
            revelado: true,
            ordem: 1,
            emFoco: false,
          },
        ]),
      );
      cenaDocumentoAlterado$.next({ campanhaId: CAMPANHA_ID, cenaId: CENA_ID });
      fixture.detectChanges();

      const elemento = fixture.nativeElement as HTMLElement;
      expect(texto(elemento.querySelector('.cena-jogador__documentos'))).toContain(
        'Relatório do informante',
      );

      elemento.querySelector<HTMLButtonElement>('[app-documento-cartao]')!.click();
      fixture.detectChanges();

      expect(documentoService.recuperar).toHaveBeenCalledWith(40);
      expect(elemento.querySelector('app-leitor-documento')).not.toBeNull();
    });
  });
});
