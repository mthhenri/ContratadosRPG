import { describe, expect, it } from 'vitest';
import type {
  ArmazenamentoProvedor,
  ArmazenamentoTextoLer,
  ArmazenamentoTextoSalvar,
} from '../../src/core/armazenamento';
import { publicarPatchnotes } from './publicar';

class ArmazenamentoMemoria implements ArmazenamentoProvedor {
  readonly arquivos = new Map<string, string>();
  readonly gravacoes: string[] = [];
  falharAoGravar: string | null = null;

  salvarImagem(): Promise<{ caminho: string }> {
    throw new Error('não usado');
  }

  excluirImagem(): Promise<void> {
    throw new Error('não usado');
  }

  listarImagens(): Promise<never[]> {
    throw new Error('não usado');
  }

  lerTexto(dto: ArmazenamentoTextoLer): Promise<string | null> {
    return Promise.resolve(this.arquivos.get(dto.nomeArquivo) ?? null);
  }

  salvarTexto(dto: ArmazenamentoTextoSalvar): Promise<void> {
    if (this.falharAoGravar === dto.nomeArquivo) {
      return Promise.reject(new Error(`falha ao gravar ${dto.nomeArquivo}`));
    }
    this.gravacoes.push(dto.nomeArquivo);
    this.arquivos.set(dto.nomeArquivo, dto.conteudo);
    return Promise.resolve();
  }
}

function nota(versao: string, data: string, titulo: string, corpo = '## Novidades\n\n- Algo.'): string {
  return `---\nversao: ${versao}\ndata: ${data}\ntitulo: ${titulo}\n---\n\n${corpo}\n`;
}

describe('publicarPatchnotes (pn-05)', () => {
  it('grava a nota e cria o índice quando ele ainda não existe', async () => {
    const armazenamento = new ArmazenamentoMemoria();

    const resumo = await publicarPatchnotes({
      armazenamento,
      arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') }],
    });

    expect(resumo).toEqual({
      publicadas: ['1.0.0'],
      substituidas: [],
      indice: [{ versao: '1.0.0', data: '2026-09-01', titulo: 'Base' }],
    });
    expect(armazenamento.arquivos.get('1.0.0.md')).toContain('titulo: Base');
    expect(JSON.parse(armazenamento.arquivos.get('indice.json')!)).toEqual(resumo.indice);
  });

  it('preserva versões que já estavam no índice do armazenamento e ordena da mais nova', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    armazenamento.arquivos.set(
      'indice.json',
      JSON.stringify([{ versao: '1.0.0', data: '2026-09-01', titulo: 'Base' }]),
    );

    const resumo = await publicarPatchnotes({
      armazenamento,
      arquivos: [{ nome: 'b.md', texto: nota('1.1.0', '2026-09-29', 'Cenas') }],
    });

    expect(resumo.indice.map((item) => item.versao)).toEqual(['1.1.0', '1.0.0']);
    expect(resumo.substituidas).toEqual([]);
  });

  it('substitui uma versão existente, sem duplicá-la no índice', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    armazenamento.arquivos.set(
      'indice.json',
      JSON.stringify([{ versao: '1.0.0', data: '2026-09-01', titulo: 'Antigo' }]),
    );

    const resumo = await publicarPatchnotes({
      armazenamento,
      arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Corrigido') }],
    });

    expect(resumo.substituidas).toEqual(['1.0.0']);
    expect(resumo.indice).toEqual([{ versao: '1.0.0', data: '2026-09-01', titulo: 'Corrigido' }]);
  });

  it('publica várias de uma vez', async () => {
    const armazenamento = new ArmazenamentoMemoria();

    const resumo = await publicarPatchnotes({
      armazenamento,
      arquivos: [
        { nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') },
        { nome: 'b.md', texto: nota('1.1.0', '2026-09-29', 'Cenas') },
      ],
    });

    expect(resumo.publicadas).toEqual(['1.0.0', '1.1.0']);
    expect(resumo.indice.map((item) => item.versao)).toEqual(['1.1.0', '1.0.0']);
  });

  it('grava as notas antes do índice', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    await publicarPatchnotes({
      armazenamento,
      arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') }],
    });

    expect(armazenamento.gravacoes).toEqual(['1.0.0.md', 'indice.json']);
  });

  it('se a gravação da nota falhar, o índice não é tocado', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    armazenamento.falharAoGravar = '1.0.0.md';

    await expect(
      publicarPatchnotes({
        armazenamento,
        arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') }],
      }),
    ).rejects.toThrow('falha ao gravar');
    expect(armazenamento.arquivos.has('indice.json')).toBe(false);
  });

  it('valida tudo antes de gravar: um arquivo inválido barra os demais', async () => {
    const armazenamento = new ArmazenamentoMemoria();

    await expect(
      publicarPatchnotes({
        armazenamento,
        arquivos: [
          { nome: 'ok.md', texto: nota('1.0.0', '2026-09-01', 'Base') },
          { nome: 'ruim.md', texto: nota('1.x', '2026-02-30', 'Ruim') },
        ],
      }),
    ).rejects.toThrow(/ruim\.md:[\s\S]*"versao"[\s\S]*"data"/);
    expect(armazenamento.gravacoes).toEqual([]);
  });

  it('recusa a mesma versão em dois arquivos e a chamada sem arquivos', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const texto = nota('1.0.0', '2026-09-01', 'Base');

    await expect(
      publicarPatchnotes({
        armazenamento,
        arquivos: [
          { nome: 'a.md', texto },
          { nome: 'b.md', texto },
        ],
      }),
    ).rejects.toThrow('mais de um arquivo');
    await expect(publicarPatchnotes({ armazenamento, arquivos: [] })).rejects.toThrow('Nenhum arquivo');
  });

  it('recusa publicar por cima de um índice corrompido', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    armazenamento.arquivos.set('indice.json', '{quebrado');

    await expect(
      publicarPatchnotes({
        armazenamento,
        arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') }],
      }),
    ).rejects.toThrow();
    expect(armazenamento.gravacoes).toEqual([]);
  });

  it('em simulação valida e calcula o índice sem gravar nada', async () => {
    const armazenamento = new ArmazenamentoMemoria();

    const resumo = await publicarPatchnotes({
      armazenamento,
      arquivos: [{ nome: 'a.md', texto: nota('1.0.0', '2026-09-01', 'Base') }],
      simular: true,
    });

    expect(resumo.publicadas).toEqual(['1.0.0']);
    expect(armazenamento.gravacoes).toEqual([]);
  });

  it('guarda a nota com LF e sem BOM, mesmo vinda do Windows', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const texto = String.fromCharCode(0xfeff) + nota('1.0.0', '2026-09-01', 'Base').replace(/\n/g, '\r\n');

    await publicarPatchnotes({ armazenamento, arquivos: [{ nome: 'a.md', texto }] });

    const gravado = armazenamento.arquivos.get('1.0.0.md')!;
    expect(gravado.startsWith('---\n')).toBe(true);
    expect(gravado).not.toContain('\r');
  });
});
