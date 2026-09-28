import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import type {
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  RolagemVisibilidadeEnum,
  TipoDocumentoEnum,
} from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { EncontroPainelDadosService } from './encontro-painel-dados.service';
import type { CombatenteVisualDto } from '../../encontro-leitura.util';
import {
  CAMPANHA_ID,
  CENA_ID,
  USUARIO_JOGADOR,
  USUARIO_MESTRE,
  configurarPainel,
  encontroAtivo,
} from './painel-encontro.testing';

/**
 * Prova o serviço de dados compartilhado entre as páginas do mestre e do jogador (`ui-39`). O foco
 * é o que a **tela** deriva — de quem é a vez, quem já agiu, quantas ações restam — a partir da
 * `ordemRodada` que o backend calculou com `shared/regras/encontro`: nenhuma regra de ordem/Cadência
 * é recalculada aqui, e o teste garante justamente isso — a ordem chega pronta e a tela só a lê.
 */
describe('EncontroPainelDadosService', () => {
  const montar = (opcoes: Parameters<typeof configurarPainel>[0] = {}) => {
    const dublês = configurarPainel(opcoes);
    const dados = TestBed.inject(EncontroPainelDadosService);
    return { dados, ...dublês };
  };

  describe('carga e papel', () => {
    it('carrega a cena da rota com o encontro dela, as fichas, os membros e o nome da campanha', () => {
      const { dados, cenaService, encontroService, fichaService, campanhaService } = montar();

      expect(dados.campanhaId).toBe(CAMPANHA_ID);
      expect(cenaService.recuperarCena).toHaveBeenCalledWith(CENA_ID);
      // A lista de encontros só alimenta o menu de encerrados — não escolhe o encontro da tela.
      expect(encontroService.listarPorCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
      expect(encontroService.recuperarEncontro).not.toHaveBeenCalled();
      expect(dados.cena()).toEqual({
        id: CENA_ID,
        campanhaId: CAMPANHA_ID,
        nome: 'Contenção no Setor 12',
        tipo: CenaTipoEnum.COMBATE,
        status: CenaStatusEnum.ATIVA,
      });
      expect(fichaService.listarFichas).toHaveBeenCalledWith(CAMPANHA_ID);
      expect(campanhaService.listarMembros).toHaveBeenCalledWith(CAMPANHA_ID);
      expect(dados.encontro()?.nome).toBe('Contenção no Setor 12');
      expect(dados.campanhaNome()).toBe('Campanha de Teste');
      expect(dados.carregando()).toBe(false);
    });

    it('define o contexto da topbar com o nome da campanha e o limpa ao sair da tela', () => {
      const dublês = configurarPainel();
      const topbar = TestBed.inject(TopbarContextoService);
      const definir = vi.spyOn(topbar, 'definir');
      const limpar = vi.spyOn(topbar, 'limpar');
      TestBed.inject(EncontroPainelDadosService);

      expect(definir).toHaveBeenCalledWith('Campanha de Teste');
      expect(dublês.campanhaService.recuperarCampanha).toHaveBeenCalledTimes(1);

      TestBed.resetTestingModule();
      expect(limpar).toHaveBeenCalled();
    });

    it('reconhece o mestre e escolhe a visão dele', () => {
      const { dados } = montar({ usuarioId: USUARIO_MESTRE });

      expect(dados.ehMestre()).toBe(true);
      expect(dados.visaoDoMestre()).toBe(true);
    });

    it('reconhece o jogador e não escolhe a visão do mestre', () => {
      const { dados } = montar({ usuarioId: USUARIO_JOGADOR });

      expect(dados.ehMestre()).toBe(false);
      expect(dados.visaoDoMestre()).toBe(false);
    });

    it('enquanto os membros não chegam, a tela carrega e a visão escolhida é a do mestre', () => {
      const { dados } = montar({ usuarioId: USUARIO_JOGADOR, membrosPendentes: true });

      expect(dados.membros()).toBeNull();
      expect(dados.carregando()).toBe(true);
      expect(dados.visaoDoMestre()).toBe(true);
    });

    it('continua carregando enquanto a cena não chega — não cai no estado vazio', () => {
      const { dados, encontroPendente$ } = montar({ encontroPendente: true });

      // Os membros já chegaram; falta a cena (e com ela o encontro).
      expect(dados.membros()).not.toBeNull();
      expect(dados.encontro()).toBeNull();
      expect(dados.carregando()).toBe(true);

      encontroPendente$.next(encontroAtivo);
      encontroPendente$.complete();

      expect(dados.encontro()?.nome).toBe('Contenção no Setor 12');
      expect(dados.carregando()).toBe(false);
    });

    it('cena sem encontro: a carga termina com a cena e sem encontro', () => {
      const { dados } = montar({ semEncontro: true, cenaTipo: CenaTipoEnum.INVESTIGACAO });

      expect(dados.cena()?.tipo).toBe(CenaTipoEnum.INVESTIGACAO);
      expect(dados.encontro()).toBeNull();
      expect(dados.carregando()).toBe(false);
    });

    it('cena recusada pelo backend (planejada para o jogador, 403) devolve ao hub', () => {
      const { cenaService } = configurarPainel({ usuarioId: USUARIO_JOGADOR });
      cenaService.recuperarCena.mockReturnValue(throwError(() => new Error('403')) as never);
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const dados = TestBed.inject(EncontroPainelDadosService);

      expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'cenas']);
      expect(dados.encontro()).toBeNull();
    });

    it('reconhece a cena planejada — só ela bloqueia pedir iniciativa e iniciar', () => {
      expect(montar().dados.cenaPlanejada()).toBe(false);
      TestBed.resetTestingModule();
      expect(montar({ cenaStatus: CenaStatusEnum.PLANEJADA }).dados.cenaPlanejada()).toBe(true);
    });
  });

  describe('leitura da ordem da rodada', () => {
    it('lê de quem é a vez da `ordemRodada`, sem recalcular a ordem', () => {
      const { dados } = montar();

      // turnoIndice 2 → terceiro slot → segunda ocorrência da criatura.
      expect(dados.combatenteDaVez()?.nome).toBe('SCP-1471-A');
      expect(dados.combatenteDaVezId()).toBe(1);
      expect(dados.totalDeTurnos()).toBe(4);
    });

    it('conta as ações restantes do combatente da vez a partir dos slots pendentes', () => {
      const { dados } = montar();

      // A criatura está no seu último slot da rodada: resta 1 (o atual).
      expect(dados.acoesRestantesDaVez()).toBe(1);
    });

    it('marca como "já agiu" só quem não tem mais nenhum slot pendente', () => {
      const { dados } = montar();
      // Por combatente, sem posição na ordem: vale "nenhum slot pendente na rodada".
      const semPosicao = (id: number) => ({ id }) as unknown as CombatenteVisualDto;

      expect(dados.jaAgiu(semPosicao(2))).toBe(true); // K. Amaral agiu no slot 1
      expect(dados.jaAgiu(semPosicao(1))).toBe(false); // criatura está agindo agora
      expect(dados.jaAgiu(semPosicao(3))).toBe(false); // V. Corvalho ainda vai agir

      // Já por ocorrência: o 1º turno da criatura passou; o 2º é o atual.
      const [primeiro, , segundo] = dados.combatentes();
      expect(dados.jaAgiu(primeiro)).toBe(true);
      expect(dados.jaAgiu(segundo)).toBe(false);
    });

    it('repete os cartões na ordem exata dos turnos da rodada', () => {
      const { dados } = montar();
      const itens = dados
        .combatentes()
        .map(({ nome, ocorrencia, totalOcorrencias, indiceOrdem }) => ({
          nome,
          ocorrencia,
          totalOcorrencias,
          indiceOrdem,
        }));

      expect(itens).toEqual([
        { nome: 'SCP-1471-A', ocorrencia: 1, totalOcorrencias: 2, indiceOrdem: 0 },
        { nome: 'K. Amaral', ocorrencia: 1, totalOcorrencias: 1, indiceOrdem: 1 },
        { nome: 'SCP-1471-A', ocorrencia: 2, totalOcorrencias: 2, indiceOrdem: 2 },
        { nome: 'V. Corvalho', ocorrencia: 1, totalOcorrencias: 1, indiceOrdem: 3 },
      ]);
    });

    it('destaca somente o slot atual', () => {
      const { dados } = montar();
      const atuais = dados.combatentes().filter((c) => dados.ehDaVez(c));

      expect(atuais).toHaveLength(1);
      expect(atuais[0]).toMatchObject({ nome: 'SCP-1471-A', ocorrencia: 2 });
    });

    it('resolve o Nível de Ameaça do contexto já carregado, sem consulta extra', () => {
      const { dados, fichaService } = montar();
      const [criatura, agente] = dados.combatentes();

      expect(dados.nivelAmeaca(criatura)).toBe(NivelAmeacaEnum.ALTA);
      expect(dados.nivelAmeaca(agente)).toBeNull();
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
    });

    it('classifica o estado do encontro: mutável, em combate, em montagem, histórico', () => {
      const { dados, encontroAlterado$ } = montar();
      expect(dados.emCombate()).toBe(true);
      expect(dados.emMontagem()).toBe(false);
      expect(dados.mutavel()).toBe(true);
      expect(dados.vendoHistorico()).toBe(false);

      encontroAlterado$.next({
        encontro: { ...encontroAtivo, status: EncontroStatusEnum.ENCERRADO },
      });
      expect(dados.mutavel()).toBe(false);
      expect(dados.vendoHistorico()).toBe(true);
    });

    it('falta iniciativa quando algum combatente ainda não rolou', () => {
      const { dados, encontroAlterado$ } = montar();
      expect(dados.faltamIniciativas()).toBe(false);

      encontroAlterado$.next({
        encontro: {
          ...encontroAtivo,
          combatentes: [{ ...encontroAtivo.combatentes[0], iniciativa: null }],
          ordemRodada: [],
          status: EncontroStatusEnum.MONTAGEM,
        },
      });
      expect(dados.faltamIniciativas()).toBe(true);
    });
  });

  describe('tempo real', () => {
    it('entra na sala da campanha e sai dela ao encerrar a tela', () => {
      montar();
      const tempoReal = TestBed.inject(TempoRealService);

      expect(tempoReal.conectar).toHaveBeenCalled();
      expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);

      TestBed.resetTestingModule();
      expect(tempoReal.sairSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    });

    it('reconexao$ (reconexão real) refaz a carga da cena (P-083)', () => {
      const { cenaService, reconexao$ } = montar();
      cenaService.recuperarCena.mockClear();

      reconexao$.next();

      expect(cenaService.recuperarCena).toHaveBeenCalledWith(CENA_ID);
    });

    it('montar o painel depois de uma reconexão já ocorrida não duplica a carga inicial (P-083)', () => {
      const { cenaService } = montar();

      expect(cenaService.recuperarCena).toHaveBeenCalledTimes(1);
    });

    // === P-084: sem replay de eventos (§9), uma rolagem feita durante a queda só chega por uma
    // releitura explícita do feed ao reconectar — `carregar()` já refazia cena/fichas/membros, mas
    // deixava o histórico de rolagens preso ao último GET antes da queda.

    it('reconexao$ também recarrega o feed de rolagens', () => {
      const { rolagemService, reconexao$ } = montar();
      rolagemService.listarPorCampanha.mockClear();

      reconexao$.next();

      expect(rolagemService.listarPorCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    });

    it('reconexao$ traz uma rolagem feita durante a queda para o feed', () => {
      const rolagemDaQueda: RolagemResumoDto = {
        id: 5,
        fichaId: 200,
        encontroCombatenteId: null,
        campanhaId: CAMPANHA_ID,
        usuarioId: USUARIO_JOGADOR,
        nomeAutor: 'Bia',
        nomeFicha: 'K. Amaral',
        rotulo: 'Dano',
        formula: '2d6',
        visibilidade: RolagemVisibilidadeEnum.PUBLICA,
        resultado: { dados: [], atributos: [], constante: 0, total: 9 },
        createdDate: '2026-08-20T15:05:00.000Z',
        corFicha: null,
      };
      const { dados, rolagemService, reconexao$ } = montar();
      rolagemService.listarPorCampanha.mockReturnValue(of([rolagemDaQueda]));

      reconexao$.next();

      expect(dados.rolagensFeed()).toEqual([rolagemDaQueda]);
    });

    it('não ressuscita uma rolagem que sumiu do servidor sem nenhum evento de socket (queda total) — achado ao vivo', () => {
      const rolagemQueSumiu: RolagemResumoDto = {
        id: 7,
        fichaId: 200,
        encontroCombatenteId: null,
        campanhaId: CAMPANHA_ID,
        usuarioId: USUARIO_JOGADOR,
        nomeAutor: 'Bia',
        nomeFicha: 'K. Amaral',
        rotulo: 'Rolagem antiga',
        formula: '1d20',
        visibilidade: RolagemVisibilidadeEnum.PUBLICA,
        resultado: { dados: [], atributos: [], constante: 0, total: 9 },
        createdDate: '2026-08-20T15:00:00.000Z',
        corFicha: null,
      };
      const { dados, rolagemService, reconexao$ } = montar();
      dados.adicionarRolagemAoFeed(rolagemQueSumiu);
      rolagemService.listarPorCampanha.mockReturnValue(of([]));

      reconexao$.next();

      expect(dados.rolagensFeed()).toEqual([]);
    });

    it('a releitura do feed ao reconectar nunca ressuscita uma rolagem excluída por uma resposta antiga', () => {
      const rolagem: RolagemResumoDto = {
        id: 8,
        fichaId: 200,
        encontroCombatenteId: null,
        campanhaId: CAMPANHA_ID,
        usuarioId: USUARIO_JOGADOR,
        nomeAutor: 'Bia',
        nomeFicha: 'K. Amaral',
        rotulo: 'Dano',
        formula: '2d6',
        visibilidade: RolagemVisibilidadeEnum.PUBLICA,
        resultado: { dados: [], atributos: [], constante: 0, total: 9 },
        createdDate: '2026-08-20T15:05:00.000Z',
        corFicha: null,
      };
      const respostaLenta$ = new Subject<RolagemResumoDto[]>();
      const { dados, rolagemService, rolagemExcluida$, reconexao$ } = montar();
      rolagemService.listarPorCampanha.mockReturnValue(respostaLenta$);

      reconexao$.next();
      rolagemExcluida$.next({
        id: rolagem.id,
        fichaId: rolagem.fichaId,
        campanhaId: rolagem.campanhaId,
        visibilidade: rolagem.visibilidade,
      });
      // Resposta antiga do GET (pedida antes da exclusão) ainda traz a rolagem excluída.
      respostaLenta$.next([rolagem]);

      expect(dados.rolagensFeed()).toEqual([]);
    });

    it('absorve o broadcast `encontro:alterado` da própria campanha', () => {
      const { dados, encontroAlterado$ } = montar();
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, nome: 'Outro nome', rodadaAtual: 7 },
      });

      expect(dados.encontro()?.rodadaAtual).toBe(7);
    });

    it('ignora o broadcast de outra campanha', () => {
      const { dados, encontroAlterado$ } = montar();
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, campanhaId: 999, rodadaAtual: 42 },
      });

      expect(dados.encontro()?.rodadaAtual).toBe(2);
    });

    it('ignora o encontro de outra cena da campanha — a tela é de uma cena só (m7-23)', () => {
      const { dados, encontroAlterado$ } = montar();

      // O mestre abriu outra cena: o combate dela muda, e quem está nesta tela não é arrastado.
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, id: 99, cenaId: 901, rodadaAtual: 30 },
      });

      expect(dados.encontro()?.id).toBe(encontroAtivo.id);
      expect(dados.encontro()?.rodadaAtual).toBe(encontroAtivo.rodadaAtual);
    });

    it('acompanha a `cena:alterada` desta cena e ignora a das outras', () => {
      const { dados, cenaAlterada$ } = montar({ cenaStatus: CenaStatusEnum.PLANEJADA });
      const resumo = {
        id: CENA_ID,
        nome: 'Contenção no Setor 12',
        tipo: CenaTipoEnum.COMBATE,
        status: CenaStatusEnum.ATIVA,
        temEncontro: true,
      };

      cenaAlterada$.next({ campanhaId: CAMPANHA_ID, cena: { ...resumo, id: 901 } });
      expect(dados.cenaPlanejada()).toBe(true);

      cenaAlterada$.next({ campanhaId: CAMPANHA_ID, cena: resumo });
      expect(dados.cena()?.status).toBe(CenaStatusEnum.ATIVA);
      expect(dados.cenaPlanejada()).toBe(false);
    });

    it('acrescenta rolagens públicas recebidas ao vivo, sem duplicar a mesma', () => {
      const { dados, rolagemRegistrada$ } = montar();
      const rolagem: RolagemResumoDto = {
        id: 91,
        fichaId: 200,
        encontroCombatenteId: null,
        campanhaId: CAMPANHA_ID,
        usuarioId: USUARIO_JOGADOR,
        nomeAutor: 'Bia',
        nomeFicha: 'K. Amaral',
        rotulo: 'Iniciativa',
        formula: '1D20',
        visibilidade: RolagemVisibilidadeEnum.PUBLICA,
        resultado: {
          formula: '1D20',
          dados: [],
          total: 17,
        } as unknown as RolagemResumoDto['resultado'],
        createdDate: '2026-08-20T15:00:00.000Z',
        corFicha: null,
      };

      rolagemRegistrada$.next(rolagem);
      dados.adicionarRolagemAoFeed(rolagem);

      expect(dados.rolagensFeed()).toEqual([rolagem]);
    });
  });

  describe('escrita', () => {
    it('avança o turno pelo serviço e troca o estado pelo devolvido', () => {
      const { dados, encontroService } = montar();
      encontroService.avancarTurno.mockReturnValueOnce(of({ ...encontroAtivo, turnoIndice: 3 }));

      dados.avancarTurno();

      expect(encontroService.avancarTurno).toHaveBeenCalledWith(encontroAtivo.id);
      expect(dados.encontro()?.turnoIndice).toBe(3);
      expect(dados.combatenteDaVez()?.nome).toBe('V. Corvalho');
    });

    it('não dispara a chamada de novo enquanto uma escrita está em voo', () => {
      const { dados, encontroService } = montar();
      const emVoo = new Subject<EncontroRecuperadoDto>();
      dados.executar(emVoo, () => undefined);
      expect(dados.emOperacao()).toBe(true);

      dados.avancarTurno();
      expect(encontroService.avancarTurno).not.toHaveBeenCalled();

      emVoo.complete();
      expect(dados.emOperacao()).toBe(false);
    });

    it('lista todos os encontros da campanha, inclusive os encerrados', () => {
      const encerrado: EncontroResumoDto = {
        id: 2,
        campanhaId: CAMPANHA_ID,
        cenaId: 902,
        nome: 'Emboscada no Setor 4',
        status: EncontroStatusEnum.ENCERRADO,
        rodadaAtual: 5,
        quantidadeCombatentes: 3,
        createdDate: '2026-08-10T12:00:00.000Z',
      };
      const { dados } = montar({ historicoExtra: [encerrado] });

      expect(dados.encontrosDaCampanha()).toHaveLength(2);
      expect(dados.encontrosDaCampanha()[1]).toEqual(encerrado);
    });
  });

  describe('coluna Documentos — Investigação (m7-25)', () => {
    it('busca a coluna só para uma cena de Investigação', () => {
      const { dados, cenaService } = montar({ cenaTipo: CenaTipoEnum.INVESTIGACAO });

      expect(dados.ehInvestigacao()).toBe(true);
      expect(cenaService.listarDocumentos).toHaveBeenCalledWith(CENA_ID);
    });

    it('não busca a coluna para as demais cenas', () => {
      const { dados, cenaService } = montar({ cenaTipo: CenaTipoEnum.COMBATE });

      expect(dados.ehInvestigacao()).toBe(false);
      expect(cenaService.listarDocumentos).not.toHaveBeenCalled();
      expect(dados.documentosCena()).toEqual([]);
    });

    it('refaz o GET ao receber `cena:documento-alterado` desta cena', () => {
      const { cenaService, cenaDocumentoAlterado$ } = montar({
        cenaTipo: CenaTipoEnum.INVESTIGACAO,
      });
      cenaService.listarDocumentos.mockClear();

      cenaDocumentoAlterado$.next({ campanhaId: CAMPANHA_ID, cenaId: CENA_ID });
      expect(cenaService.listarDocumentos).toHaveBeenCalledTimes(1);

      cenaDocumentoAlterado$.next({ campanhaId: CAMPANHA_ID, cenaId: 999 });
      expect(cenaService.listarDocumentos).toHaveBeenCalledTimes(1);
    });

    it('anexar/remover/reordenar/focar/apresentar trocam a coluna pela resposta do backend', () => {
      const { dados, cenaService } = montar({ cenaTipo: CenaTipoEnum.INVESTIGACAO });
      const listaNova = [
        { documentoId: 40, titulo: 'Relatório', tipo: TipoDocumentoEnum.TEXTO, revelado: true, ordem: 1, emFoco: true },
      ];
      cenaService.anexarDocumento.mockReturnValueOnce(of(listaNova));

      dados.anexarDocumento(40);
      expect(cenaService.anexarDocumento).toHaveBeenCalledWith(CENA_ID, 40);
      expect(dados.documentosCena()).toEqual(listaNova);
    });
  });
});
