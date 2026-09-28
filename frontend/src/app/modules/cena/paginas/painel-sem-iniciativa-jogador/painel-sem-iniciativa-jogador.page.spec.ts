import { of } from 'rxjs';

import { CenaTipoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

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
