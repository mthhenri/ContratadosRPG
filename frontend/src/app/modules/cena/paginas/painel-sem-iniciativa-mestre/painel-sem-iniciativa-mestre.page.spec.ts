import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import type { FichaAlteradaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { CenaStatusEnum, CenaTipoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EspectadorFichaCard } from '../../../campanha/componentes/espectador-ficha-card/espectador-ficha-card.component';
import {
  CAMPANHA_ID,
  CENA_ID,
  fichaResumoDoJogador,
  fichasDeTeste,
  itemDaColuna,
  montarPainel,
  texto,
  type OpcoesDoPainel,
} from '../../../encontro/paginas/painel/painel-encontro.testing';
import { FichaFlutuante } from '../../../ficha/componentes/ficha-flutuante/ficha-flutuante.component';
import { PainelCenaSemIniciativaMestre } from './painel-sem-iniciativa-mestre.page';

/**
 * Prova a visão do mestre da cena sem iniciativa (m7-24): a casca da `ui-37` sem trilha, a grade de
 * agentes do Esquadrão, abrir/encerrar pela cena com confirmação, o encerrado só de leitura e as
 * fichas ao vivo (salas `ficha:<id>` só do que a grade exibe).
 */
describe('PainelCenaSemIniciativaMestre', () => {
  const montar = (opcoes: OpcoesDoPainel = {}) =>
    montarPainel(PainelCenaSemIniciativaMestre, {
      cenaTipo: CenaTipoEnum.RESISTENCIA,
      semEncontro: true,
      incluirFichaDoJogador: true,
      ...opcoes,
    });

  const clicarEConfirmar = async (
    fixture: ReturnType<typeof montar>['fixture'],
    rotulo: string,
  ) => {
    itemDaColuna(fixture.nativeElement as HTMLElement, rotulo)!.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };

  it('compõe coluna de ações, cabeçalho, Rolagens e palco — sem trilha de turnos', () => {
    const elemento = montar().fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('app-coluna-acoes')).not.toBeNull();
    expect(elemento.querySelector('app-historico-rolagens-sidebar')).not.toBeNull();
    expect(elemento.querySelector('.cena-mestre__palco')).not.toBeNull();
    expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
    expect(elemento.querySelector('app-conducao-turno')).toBeNull();
    expect(texto(elemento.querySelector('.cena-mestre__titulo'))).toBe(
      'Resistência · Contenção no Setor 12',
    );
    expect(texto(elemento.querySelector('.cena-mestre__campanha'))).toBe('Campanha de Teste');
    expect(itemDaColuna(elemento, 'Calculadora')).toBeDefined();
    expect(itemDaColuna(elemento, 'Caderno')).toBeDefined();
  });

  it('a grade mostra só os agentes de membros — sem criaturas — com o nome do dono', () => {
    const elemento = montar().fixture.nativeElement as HTMLElement;

    const cards = Array.from(elemento.querySelectorAll('app-espectador-ficha-card'));
    expect(cards).toHaveLength(1);
    expect(texto(cards[0])).toContain('K. Amaral');
    expect(texto(cards[0])).toContain('Bia');
    expect(texto(elemento.querySelector('.cena-mestre__secao-meta'))).toBe('1 agente');
    // O card só abre a ficha: sem o menu "⋯" do Esquadrão.
    expect(elemento.querySelector('.espectador-ficha__menu-botao')).toBeNull();
  });

  it('clicar no abrir do card abre a ficha flutuante do agente', () => {
    const { fixture } = montar();
    const flutuante = fixture.debugElement.query(By.directive(FichaFlutuante))
      .componentInstance as FichaFlutuante;
    const abrir = vi.spyOn(flutuante, 'abrir').mockImplementation(() => undefined);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.espectador-ficha__abrir-ficha')!
      .click();

    expect(abrir).toHaveBeenCalledWith(
      expect.objectContaining({ fichaId: 200, usuarioIdDono: 7 }),
    );
  });

  it('sem agentes, o palco mostra um estado vazio compacto', () => {
    const elemento = montar({ incluirFichaDoJogador: false }).fixture
      .nativeElement as HTMLElement;

    expect(elemento.querySelector('app-espectador-ficha-card')).toBeNull();
    expect(texto(elemento.querySelector('.cena-mestre__palco app-estado-vazio'))).toContain(
      'Nenhum agente',
    );
  });

  describe('cena planejada', () => {
    const montarPlanejada = () => montar({ cenaStatus: CenaStatusEnum.PLANEJADA });

    it('mostra o selo de planejada e oferece só "Abrir cena"', () => {
      const elemento = montarPlanejada().fixture.nativeElement as HTMLElement;

      const chips = Array.from(
        elemento.querySelectorAll('.cena-mestre__cabecalho app-chip'),
      ).map((chip) => texto(chip));
      expect(chips).toEqual(['Planejada', 'Cena planejada']);
      expect(itemDaColuna(elemento, 'Abrir cena')).toBeDefined();
      expect(itemDaColuna(elemento, 'Encerrar cena')).toBeUndefined();
    });

    it('"Abrir cena" confirma, abre pela cena e troca para "Encerrar cena"', async () => {
      const { fixture, cenaService } = montarPlanejada();
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(true);

      await clicarEConfirmar(fixture, 'Abrir cena');

      const elemento = fixture.nativeElement as HTMLElement;
      expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Abrir cena' }));
      expect(cenaService.abrirCena).toHaveBeenCalledWith(CENA_ID);
      expect(itemDaColuna(elemento, 'Abrir cena')).toBeUndefined();
      expect(itemDaColuna(elemento, 'Encerrar cena')).toBeDefined();
      expect(texto(elemento.querySelector('.cena-mestre__cabecalho'))).not.toContain(
        'Cena planejada',
      );
    });

    it('cancelar a confirmação não abre a cena', async () => {
      const { fixture, cenaService } = montarPlanejada();
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(false);

      await clicarEConfirmar(fixture, 'Abrir cena');

      expect(cenaService.abrirCena).not.toHaveBeenCalled();
    });
  });

  describe('cena ativa', () => {
    it('"Encerrar cena" confirma, encerra pela cena e a tela fica só de leitura', async () => {
      const { fixture, cenaService } = montar();
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(true);

      await clicarEConfirmar(fixture, 'Encerrar cena');

      const elemento = fixture.nativeElement as HTMLElement;
      expect(confirmar).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Encerrar cena' }),
      );
      expect(cenaService.encerrarCena).toHaveBeenCalledWith(CENA_ID);
      expect(itemDaColuna(elemento, 'Encerrar cena')).toBeUndefined();
      expect(texto(elemento.querySelector('.cena-mestre__cabecalho app-chip'))).toBe('Encerrada');
    });

    it('cancelar a confirmação não encerra a cena', async () => {
      const { fixture, cenaService } = montar();
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(false);

      await clicarEConfirmar(fixture, 'Encerrar cena');

      expect(cenaService.encerrarCena).not.toHaveBeenCalled();
    });
  });

  it('cena encerrada é só leitura: some a categoria "Cena", ficam as Ferramentas', () => {
    const elemento = montar({ cenaStatus: CenaStatusEnum.ENCERRADA }).fixture
      .nativeElement as HTMLElement;

    const categorias = Array.from(elemento.querySelectorAll('.coluna-acoes__categoria')).map(
      (categoria) => texto(categoria),
    );
    expect(categorias).toEqual(['Ferramentas']);
    expect(itemDaColuna(elemento, 'Abrir cena')).toBeUndefined();
    expect(itemDaColuna(elemento, 'Encerrar cena')).toBeUndefined();
  });

  describe('fichas ao vivo', () => {
    const alterada = (id: number) => ({ id }) as unknown as FichaAlteradaDto;

    it('entra só na sala das fichas exibidas', () => {
      const { tempoReal } = montar();

      expect(tempoReal.entrarSalaFicha).toHaveBeenCalledTimes(1);
      expect(tempoReal.entrarSalaFicha).toHaveBeenCalledWith(200);
    });

    it('ficha:alterada de uma ficha exibida atualiza o card', () => {
      const { fixture, fichaService, fichaAlterada$ } = montar();
      fichaService.listarFichas.mockReturnValue(
        of([...fichasDeTeste, { ...fichaResumoDoJogador, vidaAtual: 3 } as FichaResumoDto]),
      );

      fichaAlterada$.next(alterada(200));
      fixture.detectChanges();

      const card = fixture.debugElement.query(By.directive(EspectadorFichaCard))
        .componentInstance as EspectadorFichaCard;
      expect(card.ficha().vidaAtual).toBe(3);
    });

    it('ficha:alterada de uma ficha fora da grade é ignorada', () => {
      const { fichaService, fichaAlterada$ } = montar();
      fichaService.listarFichas.mockClear();

      // 999 é de jogador, mas o dono não é membro; 100 é criatura.
      fichaAlterada$.next(alterada(999));
      fichaAlterada$.next(alterada(100));

      expect(fichaService.listarFichas).not.toHaveBeenCalled();
    });
  });

  describe('coluna Documentos — Investigação (m7-25)', () => {
    const montarInvestigacao = (opcoes: OpcoesDoPainel = {}) =>
      montar({ cenaTipo: CenaTipoEnum.INVESTIGACAO, ...opcoes });

    it('mostra "Anexar documento" e a coluna Documentos só para Investigação', () => {
      const elemento = montarInvestigacao().fixture.nativeElement as HTMLElement;
      expect(itemDaColuna(elemento, 'Anexar documento')).toBeDefined();
      expect(elemento.querySelector('.cena-mestre__documentos')).not.toBeNull();
    });

    it('não mostra a coluna Documentos nem "Anexar documento" na Resistência', () => {
      const elemento = montar({ cenaTipo: CenaTipoEnum.RESISTENCIA }).fixture
        .nativeElement as HTMLElement;
      expect(itemDaColuna(elemento, 'Anexar documento')).toBeUndefined();
      expect(elemento.querySelector('.cena-mestre__documentos')).toBeNull();
    });

    /** Reconfigura o retorno de `listarDocumentos` e força um refetch, como o backend faria. */
    const comDocumentos = (
      montado: ReturnType<typeof montarInvestigacao>,
      documentos: readonly {
        documentoId: number;
        titulo: string;
        tipo: typeof TipoDocumentoEnum.TEXTO;
        revelado: boolean;
        ordem: number;
        emFoco: boolean;
      }[],
    ) => {
      montado.cenaService.listarDocumentos.mockReturnValue(of([...documentos]));
      montado.cenaDocumentoAlterado$.next({ campanhaId: CAMPANHA_ID, cenaId: CENA_ID });
      montado.fixture.detectChanges();
    };

    it('lista os documentos da cena e focar um abre o leitor no palco', () => {
      const montado = montarInvestigacao();
      const { fixture, cenaService } = montado;
      comDocumentos(montado, [
        {
          documentoId: 40,
          titulo: 'Relatório do informante',
          tipo: TipoDocumentoEnum.TEXTO,
          revelado: false,
          ordem: 1,
          emFoco: false,
        },
      ]);
      cenaService.focarDocumento.mockReturnValue(
        of([
          {
            documentoId: 40,
            titulo: 'Relatório do informante',
            tipo: TipoDocumentoEnum.TEXTO,
            revelado: false,
            ordem: 1,
            emFoco: true,
          },
        ]),
      );
      const elemento = fixture.nativeElement as HTMLElement;
      expect(texto(elemento.querySelector('.cena-mestre__lista-documentos'))).toContain(
        'Relatório do informante',
      );

      elemento.querySelector<HTMLButtonElement>('[app-documento-cartao]')!.click();
      fixture.detectChanges();

      expect(cenaService.focarDocumento).toHaveBeenCalledWith(CENA_ID, 40);
    });

    it('"Apresentar à mesa" revela o documento em foco', () => {
      const montado = montarInvestigacao();
      const { fixture, cenaService } = montado;
      comDocumentos(montado, [
        {
          documentoId: 40,
          titulo: 'Relatório do informante',
          tipo: TipoDocumentoEnum.TEXTO,
          revelado: false,
          ordem: 1,
          emFoco: false,
        },
      ]);
      const elemento = fixture.nativeElement as HTMLElement;
      // Documento ainda oculto: 4 botões de ação (subir/descer/apresentar/remover) — o terceiro é
      // "Apresentar à mesa".
      const botoesAcao = elemento.querySelectorAll<HTMLButtonElement>(
        '.cena-mestre__item-documento-acoes button',
      );
      expect(botoesAcao.length).toBe(4);
      botoesAcao[2].click();
      fixture.detectChanges();

      expect(cenaService.apresentarDocumento).toHaveBeenCalledWith(CENA_ID, 40);
    });

    it("segundo clique no focado limpa o foco sem remover agentes", () => {
      const montado = montarInvestigacao();
      comDocumentos(montado, [{ documentoId: 40, titulo: "A", tipo: TipoDocumentoEnum.TEXTO,
        revelado: false, ordem: 1, emFoco: true }]);
      const elemento = montado.fixture.nativeElement as HTMLElement;
      elemento.querySelector<HTMLButtonElement>("[app-documento-cartao]")!.click();
      montado.fixture.detectChanges();
      expect(montado.cenaService.limparFocoDocumento).toHaveBeenCalledWith(CENA_ID);
      expect(elemento.querySelector("app-leitor-documento")).toBeNull();
      expect(elemento.querySelector("app-espectador-ficha-card")).not.toBeNull();
    });

    it('remover tira o documento da coluna sem afetar a biblioteca', () => {
      const montado = montarInvestigacao();
      const { fixture, cenaService } = montado;
      comDocumentos(montado, [
        {
          documentoId: 40,
          titulo: 'Relatório do informante',
          tipo: TipoDocumentoEnum.TEXTO,
          revelado: true,
          ordem: 1,
          emFoco: false,
        },
      ]);
      const elemento = fixture.nativeElement as HTMLElement;
      const botoesAcao = elemento.querySelectorAll<HTMLButtonElement>(
        '.cena-mestre__item-documento-acoes button',
      );
      // Revelado: só sobem 3 botões (subir/descer/remover) — o último é "Remover da cena".
      expect(botoesAcao.length).toBe(3);
      botoesAcao[2].click();

      expect(cenaService.removerDocumento).toHaveBeenCalledWith(CENA_ID, 40);
    });
  });
});
