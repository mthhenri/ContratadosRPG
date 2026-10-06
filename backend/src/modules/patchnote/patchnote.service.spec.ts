import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArmazenamentoProvedor } from '../../core/armazenamento';
import { ResourceNotFoundException } from '../../core/exceptions';
import { PATCHNOTE_CACHE_TTL_MS, PatchnoteService } from './patchnote.service';

const INDICE = JSON.stringify([
  { versao: '1.0.0', data: '2026-09-01', titulo: 'Base' },
  { versao: '1.1.0', data: '2026-09-29', titulo: 'Cenas' },
]);

function nota(versao: string, titulo: string): string {
  return `---\nversao: ${versao}\ndata: 2026-09-29\ntitulo: ${titulo}\n---\n\n## Novidades\n\n- Algo.\n`;
}

describe('PatchnoteService (pn-03)', () => {
  let arquivos: Record<string, string | undefined>;
  let lerTexto: ReturnType<typeof vi.fn<(alvo: { nomeArquivo: string }) => Promise<string | null>>>;
  let servico: PatchnoteService;

  beforeEach(() => {
    vi.useFakeTimers();
    arquivos = {
      'indice.json': INDICE,
      '1.0.0.md': nota('1.0.0', 'Base'),
      '1.1.0.md': nota('1.1.0', 'Cenas'),
    };
    lerTexto = vi.fn(({ nomeArquivo }) => Promise.resolve(arquivos[nomeArquivo] ?? null));
    servico = new PatchnoteService({ lerTexto } as unknown as ArmazenamentoProvedor);
  });

  afterEach(() => vi.useRealTimers());

  describe('listarPatchnotes', () => {
    it('devolve o índice da versão mais nova para a mais antiga', async () => {
      const itens = await servico.listarPatchnotes();

      expect(itens.map((item) => item.versao)).toEqual(['1.1.0', '1.0.0']);
      expect(lerTexto).toHaveBeenCalledWith({ pasta: 'PATCHNOTES', nomeArquivo: 'indice.json' });
    });

    it('devolve lista vazia quando o índice ainda não existe', async () => {
      arquivos['indice.json'] = undefined;
      expect(await servico.listarPatchnotes()).toEqual([]);
    });

    it('propaga o erro de um índice corrompido em vez de fingir lista vazia', async () => {
      arquivos['indice.json'] = '{quebrado';
      await expect(servico.listarPatchnotes()).rejects.toThrow();
    });

    it('lê o R2 uma vez só dentro das 24 h', async () => {
      await servico.listarPatchnotes();
      vi.advanceTimersByTime(PATCHNOTE_CACHE_TTL_MS - 1);
      await servico.listarPatchnotes();

      expect(lerTexto).toHaveBeenCalledTimes(1);
    });

    it('lê de novo depois de 24 h e enxerga a versão nova', async () => {
      await servico.listarPatchnotes();
      arquivos['indice.json'] = JSON.stringify([
        { versao: '1.2.0', data: '2026-10-05', titulo: 'Nova' },
      ]);
      vi.advanceTimersByTime(PATCHNOTE_CACHE_TTL_MS + 1);

      expect((await servico.listarPatchnotes()).map((item) => item.versao)).toEqual(['1.2.0']);
      expect(lerTexto).toHaveBeenCalledTimes(2);
    });

    it('junta requisições simultâneas em uma única leitura', async () => {
      await Promise.all([servico.listarPatchnotes(), servico.listarPatchnotes(), servico.listarPatchnotes()]);
      expect(lerTexto).toHaveBeenCalledTimes(1);
    });

    it('não cacheia falha: a leitura seguinte tenta de novo', async () => {
      lerTexto.mockRejectedValueOnce(new Error('R2 fora do ar'));
      await expect(servico.listarPatchnotes()).rejects.toThrow('R2 fora do ar');

      expect(await servico.listarPatchnotes()).toHaveLength(2);
      expect(lerTexto).toHaveBeenCalledTimes(2);
    });
  });

  describe('recuperarPatchnote', () => {
    it('devolve a nota com metadados e Markdown', async () => {
      expect(await servico.recuperarPatchnote({ versao: '1.1.0' })).toEqual({
        versao: '1.1.0',
        data: '2026-09-29',
        titulo: 'Cenas',
        conteudoMarkdown: '## Novidades\n\n- Algo.',
      });
      expect(lerTexto).toHaveBeenCalledWith({ pasta: 'PATCHNOTES', nomeArquivo: '1.1.0.md' });
    });

    it('lê cada nota do R2 uma vez só dentro das 24 h e de novo depois', async () => {
      await servico.recuperarPatchnote({ versao: '1.1.0' });
      await servico.recuperarPatchnote({ versao: '1.1.0' });
      expect(lerTexto.mock.calls.filter(([alvo]) => alvo.nomeArquivo === '1.1.0.md')).toHaveLength(1);

      vi.advanceTimersByTime(PATCHNOTE_CACHE_TTL_MS + 1);
      await servico.recuperarPatchnote({ versao: '1.1.0' });
      expect(lerTexto.mock.calls.filter(([alvo]) => alvo.nomeArquivo === '1.1.0.md')).toHaveLength(2);
    });

    it.each(['../indice', '1.1', 'v1.1.0', '1.1.0/../..', '', '1.1.0.md'])(
      'recusa a versão %j sem tocar o armazenamento',
      async (versao) => {
        await expect(servico.recuperarPatchnote({ versao })).rejects.toBeInstanceOf(
          ResourceNotFoundException,
        );
        expect(lerTexto).not.toHaveBeenCalled();
      },
    );

    it('recusa versão válida que não está no índice, sem ler o arquivo dela', async () => {
      arquivos['9.9.9.md'] = nota('9.9.9', 'Vazada');

      await expect(servico.recuperarPatchnote({ versao: '9.9.9' })).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      expect(lerTexto).toHaveBeenCalledTimes(1);
    });

    it('falta de arquivo de versão indexada é 404 e não fica em cache', async () => {
      arquivos['1.0.0.md'] = undefined;
      await expect(servico.recuperarPatchnote({ versao: '1.0.0' })).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );

      arquivos['1.0.0.md'] = nota('1.0.0', 'Base');
      expect((await servico.recuperarPatchnote({ versao: '1.0.0' })).titulo).toBe('Base');
    });

    it('nota malformada ou de outra versão é erro interno, não conteúdo', async () => {
      arquivos['1.0.0.md'] = 'sem front matter';
      await expect(servico.recuperarPatchnote({ versao: '1.0.0' })).rejects.toThrow('malformado');

      arquivos['1.1.0.md'] = nota('1.0.0', 'Trocada');
      await expect(servico.recuperarPatchnote({ versao: '1.1.0' })).rejects.toThrow('malformado');
    });
  });

  describe('reiniciarCache (pn-06)', () => {
    it('esvazia índice e notas e a próxima leitura volta ao armazenamento', async () => {
      await servico.recuperarPatchnote({ versao: '1.1.0' });
      expect(lerTexto).toHaveBeenCalledTimes(2);

      expect(servico.reiniciarCache()).toEqual({ entradasRemovidas: 2 });

      arquivos['1.1.0.md'] = nota('1.1.0', 'Corrigida');
      const recarregada = await servico.recuperarPatchnote({ versao: '1.1.0' });
      expect(recarregada.titulo).toBe('Corrigida');
      expect(lerTexto).toHaveBeenCalledTimes(4);
    });

    it('com o cache vazio não remove nada', () => {
      expect(servico.reiniciarCache()).toEqual({ entradasRemovidas: 0 });
    });

    it('uma leitura em voo durante o reinício não volta ao cache', async () => {
      const emVoo = servico.listarPatchnotes();
      servico.reiniciarCache();
      await emVoo;

      await servico.listarPatchnotes();
      expect(lerTexto).toHaveBeenCalledTimes(2);
    });
  });
});
