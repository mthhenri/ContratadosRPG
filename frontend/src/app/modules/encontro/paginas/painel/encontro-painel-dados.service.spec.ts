import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import type {
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  EncontroStatusEnum,
  NivelAmeacaEnum,
  RolagemVisibilidadeEnum,
} from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { EncontroPainelDadosService } from './encontro-painel-dados.service';
import type { CombatenteVisualDto } from '../../encontro-leitura.util';
import {
  CAMPANHA_ID,
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
    it('carrega o encontro aberto, as fichas, os membros e o nome da campanha', () => {
      const { dados, encontroService, fichaService, campanhaService } = montar();

      expect(dados.campanhaId).toBe(CAMPANHA_ID);
      expect(encontroService.listarPorCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
      expect(encontroService.recuperarEncontro).toHaveBeenCalledWith(encontroAtivo.id);
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

    it('quem lê um encontro do histórico não é arrastado para o combate corrente', () => {
      const { dados, encontroAlterado$ } = montar();
      const encerrado = { ...encontroAtivo, status: EncontroStatusEnum.ENCERRADO };
      encontroAlterado$.next({ encontro: encerrado });
      expect(dados.vendoHistorico()).toBe(true);

      // Outro encontro (id diferente) da mesma campanha muda: a tela do histórico não o segue.
      encontroAlterado$.next({ encontro: { ...encontroAtivo, id: 99, rodadaAtual: 30 } });

      expect(dados.encontro()?.id).toBe(encontroAtivo.id);
      expect(dados.encontro()?.rodadaAtual).toBe(encontroAtivo.rodadaAtual);
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
});
