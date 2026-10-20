import type {
  DocumentoOrganizacaoRecuperadaDto,
  DocumentoPastaDto,
  DocumentoPastaVinculoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum, TipoDocumentoOrganizacaoEnum } from '@contratados-rpg/shared/enums';

import {
  alturaSubarvore,
  caminhoDaPasta,
  caminhosDosDocumentos,
  contarItens,
  destinosDeMovimento,
  idsSubarvore,
  linhasVisiveis,
  montarArvore,
  podeCriarSubpasta,
  podeMoverPasta,
  type LinhaArvore,
} from './documento-arvore';

const documento = (id: number, ordem = id): DocumentoResumoDto => ({
  id,
  campanhaId: 5,
  titulo: `Documento ${id}`,
  tipo: TipoDocumentoEnum.TEXTO,
  imagemUrl: null,
  revelado: true,
  ordem,
  updatedDate: '2026-10-16T12:00:00.000000Z',
});

const pasta = (id: number, pastaMaeId: number | null, ordem = id): DocumentoPastaDto => ({
  id,
  nome: `Pasta ${id}`,
  pastaMaeId,
  ordem,
});

const organizacao = (
  pastas: DocumentoPastaDto[],
  vinculos: DocumentoPastaVinculoDto[] = [],
  tipo = TipoDocumentoOrganizacaoEnum.JOGADOR,
): DocumentoOrganizacaoRecuperadaDto => ({
  campanhaId: 5,
  organizacao: tipo,
  editavel: true,
  pastas,
  vinculos,
});

const rotulos = (linhas: LinhaArvore[]): string[] =>
  linhas.map((linha) =>
    linha.tipo === 'pasta' ? `p${linha.no.pasta.id}` : `d${linha.documento.id}`,
  );

describe('documento-arvore', () => {
  describe('montarArvore', () => {
    it('sem organização, tudo fica na raiz (lista plana)', () => {
      const arvore = montarArvore(null, [documento(2), documento(1)]);

      expect(arvore.pastas).toEqual([]);
      expect(arvore.documentos.map((d) => d.id)).toEqual([1, 2]);
    });

    it('aninha as pastas e ordena irmãs por ordem, com o id desempatando', () => {
      const arvore = montarArvore(
        organizacao([pasta(1, null, 2), pasta(2, null, 1), pasta(3, 1, 1), pasta(4, 1, 1)]),
        [],
      );

      expect(arvore.pastas.map((n) => n.pasta.id)).toEqual([2, 1]);
      expect(arvore.porId.get(1)?.pastas.map((n) => n.pasta.id)).toEqual([3, 4]);
      expect(arvore.porId.get(3)?.nivel).toBe(1);
    });

    it('documento sem vínculo, ou com vínculo para pasta inexistente, fica na raiz', () => {
      const arvore = montarArvore(
        organizacao(
          [pasta(1, null)],
          [
            { documentoId: 10, pastaId: 1, ordem: 1 },
            { documentoId: 11, pastaId: 99, ordem: 1 },
          ],
        ),
        [documento(10), documento(11), documento(12)],
      );

      expect(arvore.porId.get(1)?.documentos.map((d) => d.id)).toEqual([10]);
      expect(arvore.documentos.map((d) => d.id)).toEqual([11, 12]);
    });

    it('dentro da pasta vale a ordem do vínculo', () => {
      const arvore = montarArvore(
        organizacao(
          [pasta(1, null)],
          [
            { documentoId: 10, pastaId: 1, ordem: 2 },
            { documentoId: 11, pastaId: 1, ordem: 1 },
          ],
        ),
        [documento(10), documento(11)],
      );

      expect(arvore.porId.get(1)?.documentos.map((d) => d.id)).toEqual([11, 10]);
    });

    it('na raiz, o mestre vê a ordem manual e a mesa vê a ordem de criação (id)', () => {
      const documentos = [documento(1, 3), documento(2, 1), documento(3, 2)];

      const doMestre = montarArvore(
        organizacao([], [], TipoDocumentoOrganizacaoEnum.MESTRE),
        documentos,
      );
      const daMesa = montarArvore(
        organizacao([], [], TipoDocumentoOrganizacaoEnum.JOGADOR),
        documentos,
      );

      expect(doMestre.documentos.map((d) => d.id)).toEqual([2, 3, 1]);
      expect(daMesa.documentos.map((d) => d.id)).toEqual([1, 2, 3]);
    });

    it('pasta cuja mãe não existe vai para a raiz; um ciclo não trava a montagem', () => {
      const orfa = montarArvore(organizacao([pasta(1, 99)]), []);
      expect(orfa.pastas.map((n) => n.pasta.id)).toEqual([1]);

      const ciclo = montarArvore(organizacao([pasta(1, 2), pasta(2, 1)]), []);
      expect(ciclo.porId.size).toBe(2);
      expect(ciclo.pastas.length).toBeGreaterThan(0);
    });
  });

  describe('linhasVisiveis', () => {
    const arvore = montarArvore(
      organizacao(
        [pasta(1, null), pasta(2, 1), pasta(3, null)],
        [
          { documentoId: 10, pastaId: 1, ordem: 1 },
          { documentoId: 11, pastaId: 2, ordem: 1 },
        ],
      ),
      [documento(10), documento(11), documento(12)],
    );

    it('recolhidas, mostra só as pastas da raiz e os documentos soltos', () => {
      expect(rotulos(linhasVisiveis(arvore, new Set()))).toEqual(['p1', 'p3', 'd12']);
    });

    it('expandidas, desce em profundidade: subpastas e documentos antes do irmão seguinte', () => {
      const linhas = linhasVisiveis(arvore, new Set([1, 2]));

      expect(rotulos(linhas)).toEqual(['p1', 'p2', 'd11', 'd10', 'p3', 'd12']);
      expect(linhas.map((l) => l.nivel)).toEqual([0, 1, 2, 1, 0, 0]);
    });

    it('marca primeiro e último de cada grupo de irmãos', () => {
      const pastas = linhasVisiveis(arvore, new Set()).filter((l) => l.tipo === 'pasta');

      expect(pastas.map((l) => [l.primeiro, l.ultimo])).toEqual([
        [true, false],
        [false, true],
      ]);
    });
  });

  describe('medidas da árvore', () => {
    const arvore = montarArvore(
      organizacao(
        [pasta(1, null), pasta(2, 1), pasta(3, 2), pasta(4, null)],
        [{ documentoId: 10, pastaId: 1, ordem: 1 }],
      ),
      [documento(10)],
    );

    it('conta itens diretos, ids da subárvore e altura', () => {
      const raiz = arvore.porId.get(1)!;

      expect(contarItens(raiz)).toBe(2);
      expect(idsSubarvore(raiz).sort()).toEqual([1, 2, 3]);
      expect(alturaSubarvore(raiz)).toBe(3);
      expect(alturaSubarvore(arvore.porId.get(4)!)).toBe(1);
    });

    it('monta o caminho legível e o caminho de cada documento', () => {
      expect(caminhoDaPasta(arvore, 3)).toBe('Pasta 1 / Pasta 2 / Pasta 3');
      expect(caminhoDaPasta(arvore, null)).toBeNull();
      expect(caminhoDaPasta(arvore, 99)).toBeNull();

      const caminhos = caminhosDosDocumentos(
        organizacao([pasta(1, null), pasta(2, 1)], [{ documentoId: 10, pastaId: 2, ordem: 1 }]),
      );
      expect(caminhos.get(10)).toBe('Pasta 1 / Pasta 2');
      expect(caminhos.get(11)).toBeUndefined();
    });
  });

  describe('destinos e limites', () => {
    // Cadeia 1 > 2 > 3 > 4 > 5 mais a pasta 6 solta: o teto de profundidade é de 5 níveis.
    const cadeia = montarArvore(
      organizacao([
        pasta(1, null),
        pasta(2, 1),
        pasta(3, 2),
        pasta(4, 3),
        pasta(5, 4),
        pasta(6, null),
      ]),
      [],
    );

    it('não cria subpasta abaixo do último nível permitido', () => {
      expect(podeCriarSubpasta(cadeia, null)).toBe(true);
      expect(podeCriarSubpasta(cadeia, 4)).toBe(true);
      expect(podeCriarSubpasta(cadeia, 5)).toBe(false);
    });

    it('mover pasta: nunca para si, para descendente ou além do teto', () => {
      const um = cadeia.porId.get(1)!;
      const seis = cadeia.porId.get(6)!;

      expect(podeMoverPasta(cadeia, um, null)).toBe(true);
      expect(podeMoverPasta(cadeia, um, 1)).toBe(false);
      expect(podeMoverPasta(cadeia, um, 3)).toBe(false);
      // A pasta 6 (altura 1) cabe sob a 4 (ela fica no nível 5), mas não sob a 5.
      expect(podeMoverPasta(cadeia, seis, 4)).toBe(true);
      expect(podeMoverPasta(cadeia, seis, 5)).toBe(false);
      expect(podeMoverPasta(cadeia, cadeia.porId.get(5)!, 6)).toBe(true);
    });

    it('destinos: de um documento, a raiz e todas as pastas; de uma pasta, sem ela e sem o que estoura', () => {
      const paraDocumento = destinosDeMovimento(cadeia, null);
      expect(paraDocumento[0]).toEqual({ id: null, rotulo: 'Raiz da Biblioteca', nivel: 0 });
      expect(paraDocumento.map((d) => d.id)).toEqual([null, 1, 2, 3, 4, 5, 6]);

      // A subárvore da pasta 1 tem altura 5: nem a pasta 6 a comporta, só a raiz.
      const paraPasta = destinosDeMovimento(cadeia, cadeia.porId.get(1)!);
      expect(paraPasta.map((d) => d.id)).toEqual([null]);
    });
  });
});
