import { TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import {
  lerFichaExportada,
  montarCriaturaExportada,
  montarNpcExportado,
  nomeArquivoFichaExportada,
  serializarFichaExportada,
} from './ficha-arquivo-json';
import { criarFichaNpcTeste } from './testing/ficha-npc.fixture';

describe('ficha-arquivo-json', () => {
  const agora = new Date('2026-11-26T12:00:00.000Z');
  const criatura = {
    id: 12,
    campanhaId: 3,
    usuarioId: 4,
    nome: 'Sombra Faminta',
    cor: '#aa3344',
    imagemUrl: 'https://exemplo/avatar.png',
    imagemFoco: { x: 50, y: 50 },
    oculta: true,
    dados: { vd: 30, anotacoes: 'segredo' },
  } as unknown as FichaCriaturaRecuperadaDto;

  it('o envelope de criatura carrega só nome, cor e dados — sem id, dono, campanha, imagem ou oculta', () => {
    const exportada = montarCriaturaExportada(criatura, agora);

    expect(exportada).toEqual({
      formato: 'contratados-rpg.ficha',
      versao: 1,
      tipo: TipoFichaEnum.CRIATURA,
      exportacaoData: '2026-11-26T12:00:00.000Z',
      nome: 'Sombra Faminta',
      cor: '#aa3344',
      dados: criatura.dados,
    });
  });

  it('o envelope de NPC usa o mesmo recorte', () => {
    const npc = criarFichaNpcTeste();
    const exportado = montarNpcExportado(npc, agora);

    expect(exportado.tipo).toBe(TipoFichaEnum.NPC);
    expect(exportado.dados).toBe(npc.dados);
    expect(Object.keys(exportado)).not.toContain('id');
  });

  it('o texto serializado relido devolve o mesmo envelope (ida e volta)', () => {
    const exportada = montarCriaturaExportada(criatura, agora);
    const leitura = lerFichaExportada(serializarFichaExportada(exportada));

    expect(leitura).toEqual({ ok: true, ficha: exportada });
  });

  it('nome do arquivo: tipo + nome sem acento nem símbolo', () => {
    expect(
      nomeArquivoFichaExportada(montarCriaturaExportada({ ...criatura, nome: 'Ávido — Cão #2' })),
    ).toBe('criatura-avido-cao-2.json');
    expect(
      nomeArquivoFichaExportada(montarNpcExportado({ ...criarFichaNpcTeste(), nome: '!!!' })),
    ).toBe('npc-sem-nome.json');
  });

  describe('lerFichaExportada recusa', () => {
    const valida = () =>
      JSON.parse(serializarFichaExportada(montarCriaturaExportada(criatura, agora))) as Record<
        string,
        unknown
      >;
    const casos: [string, string, RegExp][] = [
      ['texto vazio', '   ', /Cole o JSON/],
      ['JSON quebrado', '{ "formato": ', /não é um JSON válido/],
      ['outro formato', JSON.stringify({ ...valida(), formato: 'outro' }), /não é uma ficha exportada/],
      ['array', '[]', /não é uma ficha exportada/],
      ['versão futura', JSON.stringify({ ...valida(), versao: 2 }), /Versão de arquivo não suportada: 2/],
      ['agente', JSON.stringify({ ...valida(), tipo: TipoFichaEnum.JOGADOR }), /Criatura ou de NPC/],
      ['sem nome', JSON.stringify({ ...valida(), nome: '  ' }), /não tem nome/],
      ['cor numérica', JSON.stringify({ ...valida(), cor: 3 }), /cor da ficha é inválida/],
      ['sem dados', JSON.stringify({ ...valida(), dados: null }), /documento de jogo/],
    ];
    it.each(casos)('%s', (_caso, texto, mensagem) => {
      const leitura = lerFichaExportada(texto);
      expect(leitura.ok).toBe(false);
      expect(leitura.ok ? '' : leitura.erro).toMatch(mensagem);
    });
  });

  it('aceita arquivo sem cor (vira null) e apara o nome', () => {
    const bruto = JSON.parse(serializarFichaExportada(montarCriaturaExportada(criatura))) as Record<
      string,
      unknown
    >;
    bruto['nome'] = ' X ';
    delete bruto['cor'];
    const leitura = lerFichaExportada(JSON.stringify(bruto));

    expect(leitura.ok && leitura.ficha.cor).toBeNull();
    expect(leitura.ok && leitura.ficha.nome).toBe('X');
  });
});
