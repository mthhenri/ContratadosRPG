import { describe, expect, it, vi } from 'vitest';
import { ArmazenamentoPastaEnum, type ArmazenamentoProvedor } from '../../src/core/armazenamento';
import { decidirFaxina, faxinarImagens, interpretarCarenciaDias } from './faxinar-imagens';

const agora = new Date('2026-09-30T12:00:00Z');
const diasAtras = (dias: number): Date => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

describe('decidirFaxina (I-038)', () => {
  const imagens = [
    { caminho: '/uploads/agentes/viva.png', modificadoEm: diasAtras(90) },
    { caminho: '/uploads/agentes/orfa-antiga.png', modificadoEm: diasAtras(40) },
    { caminho: '/uploads/documentos/orfa-recente.png', modificadoEm: diasAtras(2) },
  ];

  it('mantém a referenciada, poupa a órfã em carência e marca só a órfã antiga', () => {
    const decisao = decidirFaxina({
      imagens,
      referenciados: new Set(['/uploads/agentes/viva.png']),
      carenciaDias: 30,
      agora,
    });

    expect(decisao).toEqual({
      orfas: ['/uploads/agentes/orfa-antiga.png'],
      emCarencia: ['/uploads/documentos/orfa-recente.png'],
      referenciadas: 1,
    });
  });

  it('aborta quando o banco não referencia nada mas há arquivos', () => {
    expect(() =>
      decidirFaxina({ imagens, referenciados: new Set(), carenciaDias: 30, agora }),
    ).toThrow('Nenhuma imagem referenciada');
  });

  it('não aborta com armazenamento vazio', () => {
    expect(
      decidirFaxina({ imagens: [], referenciados: new Set(), carenciaDias: 30, agora }),
    ).toEqual({ orfas: [], emCarencia: [], referenciadas: 0 });
  });
});

describe('faxinarImagens (I-038)', () => {
  function montar(): ArmazenamentoProvedor {
    return {
      listarImagens: vi.fn(({ pasta }: { pasta: ArmazenamentoPastaEnum }) =>
        Promise.resolve(
          pasta === ArmazenamentoPastaEnum.AGENTES
            ? [
                { caminho: '/uploads/agentes/viva.png', modificadoEm: diasAtras(90) },
                { caminho: '/uploads/agentes/orfa.png', modificadoEm: diasAtras(90) },
              ]
            : [],
        ),
      ),
      excluirImagem: vi.fn(() => Promise.resolve()),
    } as unknown as ArmazenamentoProvedor;
  }
  const base = { referenciados: new Set(['/uploads/agentes/viva.png']), carenciaDias: 30, agora };

  it('só varre AGENTES e DOCUMENTOS — nunca PATCHNOTES', async () => {
    const armazenamento = montar();
    await faxinarImagens({ ...base, armazenamento, apagar: false });

    expect(armazenamento.listarImagens).toHaveBeenCalledTimes(2);
    expect(armazenamento.listarImagens).not.toHaveBeenCalledWith({
      pasta: ArmazenamentoPastaEnum.PATCHNOTES,
    });
  });

  it('simula por padrão: lista a órfã e não apaga nada', async () => {
    const armazenamento = montar();
    const decisao = await faxinarImagens({ ...base, armazenamento, apagar: false });

    expect(decisao.orfas).toEqual(['/uploads/agentes/orfa.png']);
    expect(armazenamento.excluirImagem).not.toHaveBeenCalled();
  });

  it('com apagar, exclui exatamente as órfãs fora da carência', async () => {
    const armazenamento = montar();
    await faxinarImagens({ ...base, armazenamento, apagar: true });

    expect(armazenamento.excluirImagem).toHaveBeenCalledTimes(1);
    expect(armazenamento.excluirImagem).toHaveBeenCalledWith({ caminho: '/uploads/agentes/orfa.png' });
  });
});

describe('interpretarCarenciaDias', () => {
  it('usa 30 dias sem argumento e aceita o valor informado', () => {
    expect(interpretarCarenciaDias([])).toBe(30);
    expect(interpretarCarenciaDias(['--apagar', '--carencia-dias=7'])).toBe(7);
  });

  it('recusa valor inválido', () => {
    expect(() => interpretarCarenciaDias(['--carencia-dias=-1'])).toThrow('inteiro');
    expect(() => interpretarCarenciaDias(['--carencia-dias=abc'])).toThrow('inteiro');
  });
});
