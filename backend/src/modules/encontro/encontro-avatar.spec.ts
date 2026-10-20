import { describe, expect, it, vi } from "vitest";
import { StreamableFile } from "@nestjs/common";
import knex, { type Knex } from "knex";
import { EncontroRepository } from "./encontro.repository";
import { EncontroService } from "./encontro.service";

describe('avatar de combatente avulso', () => {
  it('query exige referência exata, avulso sem ficha e vínculo ativo', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new EncontroRepository({ raw } as unknown as Knex);
    await repositorio.recuperarImagemAvulso({ caminho: '/uploads/agentes/dev/a.png' });
    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('encontro_combatente.is_deleted = false');
    expect(sql).toContain('encontro_combatente.ficha_id IS NULL');
    expect(sql).toContain('encontro_combatente.imagem_url_avulso = :caminho');
    expect(parametros).toEqual({ caminho: '/uploads/agentes/dev/a.png' });
    const compilador = knex({ client: 'pg' });
    try {
      const compilado = compilador.raw(sql, parametros).toSQL().toNative();
      const indices = [...compilado.sql.matchAll(/\$(\d+)/g)].map(item => Number(item[1]));
      expect(Math.max(...indices)).toBe(compilado.bindings.length);
    } finally {
      await compilador.destroy();
    }
  });

  it('revalida o vínculo depois do storage e recusa avulso removido durante a leitura', async () => {
    const referencia = { caminho: '/uploads/agentes/avulso.png' };
    const recuperar = vi.fn().mockResolvedValueOnce(referencia).mockResolvedValueOnce(null);
    const lerImagem = vi.fn().mockResolvedValue({ conteudo: new Uint8Array([1]), mimetype: 'image/png' });
    const service = new EncontroService({ recuperarImagemAvulso: recuperar } as never,
      {} as never, {} as never, {} as never, { lerImagem } as never);
    await expect(service.recuperarImagemAvulso(referencia)).rejects.toThrow();
    recuperar.mockResolvedValue(referencia);
    expect(await service.recuperarImagemAvulso(referencia)).toBeInstanceOf(StreamableFile);
  });
});
