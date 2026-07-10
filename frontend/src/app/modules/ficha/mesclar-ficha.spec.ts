import { describe, expect, it } from 'vitest';
import type { FichaAlteradaDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import { ClasseEnum } from '@contratados-rpg/shared/enums';

import { mesclarFicha } from './mesclar-ficha';

/**
 * Prova o merge de três vias da m3-17: um `ficha:alterada` remoto que chega durante uma edição
 * local pendente não pode nem sobrescrever o que o usuário está editando, nem ser descartado (o
 * descarte fazia o `PUT` de documento inteiro apagar a edição concorrente do outro usuário).
 */
describe('mesclarFicha', () => {
  const dados = (parcial: Partial<FichaJogadorDadosDto> = {}): FichaJogadorDadosDto =>
    ({
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 1,
      prestigio: 0,
      atributos: {
        destreza: 2,
        forca: 1,
        luta: 1,
        pontaria: 1,
        vigor: 2,
        intelecto: 1,
        medicina: 1,
        sentidos: 1,
        social: 1,
        vontade: 1,
      },
      maestria: null,
      estado: {
        vidaAtual: 40,
        vidaMaxima: 49,
        energiaAtual: 10,
        energiaMaxima: 27,
        sequelas: [],
        traumas: [],
        lesoes: [],
      },
      habilidades: [],
      inventario: { itens: [], amplificadores: [] },
      anotacoes: '',
      ...parcial,
    }) as FichaJogadorDadosDto;

  const ficha = (nome: string, parcial: Partial<FichaJogadorDadosDto> = {}): FichaAlteradaDto => ({
    id: 19,
    campanhaId: 14,
    usuarioId: 51,
    nome,
    dados: dados(parcial),
  });

  it('adota o campo remoto quando o local não o editou', () => {
    const base = ficha('Kane');
    const local = ficha('Kane');
    const remoto = ficha('Kane Ferido');

    expect(mesclarFicha(base, local, remoto).nome).toBe('Kane Ferido');
  });

  it('preserva o campo que o local editou, mesmo com o remoto mudando o mesmo campo', () => {
    const base = ficha('Kane');
    const local = ficha('Codinome Local');
    const remoto = ficha('Codinome Remoto');

    expect(mesclarFicha(base, local, remoto).nome).toBe('Codinome Local');
  });

  it('mescla folha a folha: o nome remoto entra e o ajuste local de vida sobrevive', () => {
    const base = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 20 } });
    const local = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 21 } });
    const remoto = ficha('Kane Ferido', { estado: { ...dados().estado, vidaAtual: 20 } });

    const mesclado = mesclarFicha(base, local, remoto);

    expect(mesclado.nome).toBe('Kane Ferido');
    expect(mesclado.dados.estado.vidaAtual).toBe(21);
  });

  it('deixa o remoto alterar vidaMaxima enquanto o local edita vidaAtual (mesmo objeto estado)', () => {
    const base = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 20, vidaMaxima: 49 } });
    const local = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 21, vidaMaxima: 49 } });
    const remoto = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 20, vidaMaxima: 60 } });

    const mesclado = mesclarFicha(base, local, remoto);

    expect(mesclado.dados.estado.vidaAtual).toBe(21);
    expect(mesclado.dados.estado.vidaMaxima).toBe(60);
  });

  it('mescla derivados folha a folha', () => {
    const derivadosBase = {
      defesa: 11,
      esquiva: 13,
      bloqueio: 13,
      percepcao: 10,
      danoFurtivo: '1D6+1',
      deslocamento: 9,
      proficiencia: 1,
      danoCorpoACorpo: '1D3 [Físico]',
      inventarioMaximo: 5,
      habilidadesPorTurno: 4,
    };
    const base = ficha('Kane', { derivados: derivadosBase } as Partial<FichaJogadorDadosDto>);
    const local = ficha('Kane', {
      derivados: { ...derivadosBase, defesa: 15 },
    } as Partial<FichaJogadorDadosDto>);
    const remoto = ficha('Kane', {
      derivados: { ...derivadosBase, percepcao: 12 },
    } as Partial<FichaJogadorDadosDto>);

    const mesclado = mesclarFicha(base, local, remoto);

    expect(mesclado.dados.derivados?.defesa).toBe(15);
    expect(mesclado.dados.derivados?.percepcao).toBe(12);
  });

  it('trata lista como campo atômico: a lista remota entra inteira quando o local não a tocou', () => {
    const traumaRemoto = [{ nome: 'Pânico', tratado: false }];
    const base = ficha('Kane');
    const local = ficha('Kane');
    const remoto = ficha('Kane', {
      estado: { ...dados().estado, traumas: traumaRemoto },
    } as Partial<FichaJogadorDadosDto>);

    expect(mesclarFicha(base, local, remoto).dados.estado.traumas).toEqual(traumaRemoto);
  });

  it('trata lista como campo atômico: a lista local vence inteira, sem misturar itens', () => {
    const base = ficha('Kane');
    const local = ficha('Kane', {
      habilidades: [{ nome: 'Local' }],
    } as unknown as Partial<FichaJogadorDadosDto>);
    const remoto = ficha('Kane', {
      habilidades: [{ nome: 'Remota' }],
    } as unknown as Partial<FichaJogadorDadosDto>);

    const mesclado = mesclarFicha(base, local, remoto);

    expect(mesclado.dados.habilidades).toHaveLength(1);
    expect(mesclado.dados.habilidades[0].nome).toBe('Local');
  });

  it('adota a chave que só o remoto tem (ficha anterior à m3-10 ganhou derivados)', () => {
    const semDerivados = dados();
    delete (semDerivados as { derivados?: unknown }).derivados;

    const base = { ...ficha('Kane'), dados: semDerivados };
    const local = { ...ficha('Kane'), dados: semDerivados };
    const remoto = ficha('Kane', {
      derivados: { defesa: 11 },
    } as unknown as Partial<FichaJogadorDadosDto>);

    expect(mesclarFicha(base, local, remoto).dados.derivados?.defesa).toBe(11);
  });

  it('honra a remoção remota de uma chave que existia na base', () => {
    const comDerivados = ficha('Kane', {
      derivados: { defesa: 11 },
    } as unknown as Partial<FichaJogadorDadosDto>);
    const semDerivados = dados();
    delete (semDerivados as { derivados?: unknown }).derivados;
    const remoto = { ...ficha('Kane'), dados: semDerivados };

    const mesclado = mesclarFicha(comDerivados, comDerivados, remoto);

    expect('derivados' in mesclado.dados).toBe(false);
  });

  it('preserva a chave que só o local tem (edição local que o remoto desconhece)', () => {
    const semDerivados = dados();
    delete (semDerivados as { derivados?: unknown }).derivados;

    const base = { ...ficha('Kane'), dados: semDerivados };
    const remoto = { ...ficha('Kane'), dados: semDerivados };
    const local = ficha('Kane', {
      derivados: { defesa: 15 },
    } as unknown as Partial<FichaJogadorDadosDto>);

    expect(mesclarFicha(base, local, remoto).dados.derivados?.defesa).toBe(15);
  });

  it('não muta os documentos recebidos', () => {
    const base = ficha('Kane');
    const local = ficha('Kane', { estado: { ...dados().estado, vidaAtual: 21 } });
    const remoto = ficha('Kane Ferido');

    mesclarFicha(base, local, remoto);

    expect(base.nome).toBe('Kane');
    expect(local.dados.estado.vidaAtual).toBe(21);
    expect(remoto.nome).toBe('Kane Ferido');
  });
});
