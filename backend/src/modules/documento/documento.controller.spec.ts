import { describe, expect, it, vi } from 'vitest';
import { TipoDocumentoEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { DocumentoController } from './documento.controller';
import type { DocumentoService } from './documento.service';

const usuario: JwtPayload = { sub: 7, login: 'mestre', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

describe('DocumentoController', () => {
  it('mescla a campanha da rota na criação, por cima da do corpo', async () => {
    const criarDocumento = vi.fn().mockResolvedValue({ id: 70 });
    const controller = new DocumentoController({ criarDocumento } as unknown as DocumentoService);

    await controller.criar(5, { campanhaId: 999, titulo: 'Carta', tipo: TipoDocumentoEnum.TEXTO }, usuario);

    expect(criarDocumento).toHaveBeenCalledWith(
      { campanhaId: 5, titulo: 'Carta', tipo: TipoDocumentoEnum.TEXTO },
      usuario,
    );
  });

  it('mescla o id da rota na alteração e a campanha da rota na reordenação', async () => {
    const alterarDocumento = vi.fn().mockResolvedValue({ id: 70 });
    const reordenarDocumentos = vi.fn().mockResolvedValue([]);
    const controller = new DocumentoController({
      alterarDocumento,
      reordenarDocumentos,
    } as unknown as DocumentoService);

    await controller.alterar(
      70,
      { id: 999, titulo: 'Carta', conteudoMarkdown: 'x', updatedDate: '2026-09-26T12:00:00.000000Z' },
      usuario,
    );
    await controller.reordenar(5, { campanhaId: 999, ordem: [2, 1] }, usuario);

    expect(alterarDocumento).toHaveBeenCalledWith(
      { id: 70, titulo: 'Carta', conteudoMarkdown: 'x', updatedDate: '2026-09-26T12:00:00.000000Z' },
      usuario,
    );
    expect(reordenarDocumentos).toHaveBeenCalledWith({ campanhaId: 5, ordem: [2, 1] }, usuario);
  });

  it('monta o arquivo do upload a partir do Multer', async () => {
    const alterarImagemDocumento = vi.fn().mockResolvedValue({ id: 70 });
    const controller = new DocumentoController({ alterarImagemDocumento } as unknown as DocumentoService);
    const buffer = Buffer.from([1, 2, 3]);

    await controller.alterarImagem(
      70,
      { buffer, mimetype: 'image/png', size: 3 } as Express.Multer.File,
      usuario,
    );

    expect(alterarImagemDocumento).toHaveBeenCalledWith(
      { id: 70, arquivo: { conteudo: buffer, mimetype: 'image/png', tamanho: 3 } },
      usuario,
    );
  });

  it('um upload sem arquivo chega à service como arquivo vazio, em vez de quebrar a controller', async () => {
    const alterarImagemDocumento = vi.fn().mockResolvedValue({ id: 70 });
    const controller = new DocumentoController({ alterarImagemDocumento } as unknown as DocumentoService);

    await controller.alterarImagem(70, undefined, usuario);

    expect(alterarImagemDocumento).toHaveBeenCalledWith(
      { id: 70, arquivo: { conteudo: new Uint8Array(), mimetype: '', tamanho: 0 } },
      usuario,
    );
  });
});
