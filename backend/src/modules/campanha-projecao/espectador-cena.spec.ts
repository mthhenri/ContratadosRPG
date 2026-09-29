import { describe, expect, it, vi } from "vitest";
import {
  CenaStatusEnum,
  CenaTipoEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
} from "@contratados-rpg/shared/enums";
import { CenaService } from "../cena/cena.service";
import { CenaDocumentoService } from "../cena/cena-documento.service";
import { DocumentoService } from "../documento/documento.service";
import { CampanhaProjecaoService } from "./campanha-projecao.service";
import { ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";

/** Dublês de fronteira: exercitam permissão e projeção sem banco nem gateway. */
function criarContexto() {
  const cena = {
    id: 9,
    campanhaId: 3,
    nome: "Investigação",
    tipo: CenaTipoEnum.INVESTIGACAO,
    status: CenaStatusEnum.ATIVA,
    encontroId: null,
  };
  const cenaRepositorio = {
    recuperarAtivaPorCampanha: vi.fn().mockResolvedValue(cena),
    recuperarPorId: vi.fn().mockResolvedValue(cena),
  };
  const encontroService = { recuperarEncontroAtivoParaEspectador: vi.fn().mockResolvedValue(null) };
  const documento = { id: 7, campanhaId: 3, revelado: true, conteudoMarkdown: "Pista" };
  const documentoRepositorio = { recuperarPorId: vi.fn().mockResolvedValue(documento) };
  const campanhaService = {
    validarMembro: vi.fn().mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.ESPECTADOR }),
    ehMestre: vi.fn((papel) => papel === TipoCampanhaMembroPapelEnum.MESTRE),
    ehEspectador: vi.fn((papel) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR),
  };
  const campanhaRepositorio = {
    recuperarPorId: vi.fn().mockResolvedValue({ id: 3 }),
    recuperarMembro: vi.fn().mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE }),
  };
  const documentos = new DocumentoService(
    documentoRepositorio as never,
    campanhaRepositorio as never,
    campanhaService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const vinculo = {
    documentoId: 7,
    titulo: "Pista",
    tipo: TipoDocumentoEnum.TEXTO,
    revelado: true,
    ordem: 1,
    emFoco: true,
  };
  const vinculoRepositorio = {
    listarPorCena: vi.fn().mockResolvedValue([vinculo]),
    recuperarPorCenaEDocumento: vi.fn().mockResolvedValue(vinculo),
  };
  const cenas = new CenaService(
    cenaRepositorio as never,
    {} as never,
    encontroService as never,
    campanhaRepositorio as never,
    {} as never,
    {} as never,
  );
  const cenaDocumentos = new CenaDocumentoService(
    vinculoRepositorio as never,
    cenaRepositorio as never,
    campanhaRepositorio as never,
    documentos,
    {} as never,
    {} as never,
  );
  const projecao = new CampanhaProjecaoService(
    campanhaRepositorio as never,
    campanhaService as never,
    encontroService as never,
    {} as never,
    {} as never,
    cenas,
    cenaDocumentos,
  );
  return {
    cena,
    cenaRepositorio,
    encontroService,
    documentoRepositorio,
    campanhaService,
    campanhaRepositorio,
    vinculoRepositorio,
    cenas,
    cenaDocumentos,
    projecao,
  };
}

const usuario = { sub: 1 } as never;
const consulta = { campanhaId: 3, cenaId: 9 };

describe("Projeção de cena do espectador", () => {
  it("recupera Investigação ativa sem encontro e não consulta iniciativa", async () => {
    const contexto = criarContexto();
    const resultado = await contexto.projecao.recuperarCenaAtivaPainelEspectador(
      { campanhaId: 3 },
      usuario,
    );
    expect(resultado).toMatchObject({ id: 9, tipo: CenaTipoEnum.INVESTIGACAO, encontro: null });
    expect(contexto.encontroService.recuperarEncontroAtivoParaEspectador).not.toHaveBeenCalled();
  });

  it.each([CenaStatusEnum.PLANEJADA, CenaStatusEnum.ENCERRADA])(
    "não projeta %s",
    async (status) => {
      const contexto = criarContexto();
      contexto.cena.status = status;
      expect(await contexto.cenas.recuperarCenaAtivaParaEspectador({ campanhaId: 3 })).toBeNull();
    },
  );

  it("sem cena ativa devolve null", async () => {
    const contexto = criarContexto();
    contexto.cenaRepositorio.recuperarAtivaPorCampanha.mockResolvedValue(null);
    expect(await contexto.cenas.recuperarCenaAtivaParaEspectador({ campanhaId: 3 })).toBeNull();
  });

  it("encontro antigo não substitui o encontro da cena ativa", async () => {
    const contexto = criarContexto();
    contexto.cena.tipo = CenaTipoEnum.COMBATE;
    Object.assign(contexto.cena, { encontroId: 50 });
    contexto.encontroService.recuperarEncontroAtivoParaEspectador.mockResolvedValue({
      id: 51,
      cenaId: 8,
    });
    expect(
      (await contexto.cenas.recuperarCenaAtivaParaEspectador({ campanhaId: 3 }))?.encontro,
    ).toBeNull();
  });

  it("iniciativa da cena ativa usa projeção idêntica para mestre e espectador", async () => {
    const contexto = criarContexto();
    contexto.cena.tipo = CenaTipoEnum.COMBATE;
    Object.assign(contexto.cena, { encontroId: 50 });
    const encontro = { id: 50, cenaId: 9, combatentes: [] };
    contexto.encontroService.recuperarEncontroAtivoParaEspectador.mockResolvedValue(encontro);
    const espectador = await contexto.projecao.recuperarCenaAtivaPainelEspectador(
      { campanhaId: 3 },
      usuario,
    );
    contexto.campanhaService.validarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });
    expect(
      await contexto.projecao.recuperarCenaAtivaPainelEspectador({ campanhaId: 3 }, usuario),
    ).toEqual(espectador);
    expect(espectador?.encontro).toBe(encontro);
  });

  it("lista não inclui documento oculto mesmo com sessão mestre", async () => {
    const contexto = criarContexto();
    contexto.vinculoRepositorio.listarPorCena.mockResolvedValue([
      { documentoId: 8, revelado: false },
    ]);
    contexto.campanhaService.validarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });
    expect(await contexto.projecao.listarDocumentosCenaPainelEspectador(consulta, usuario)).toEqual(
      [],
    );
  });

  it("cena de campanha diferente não fornece vínculos", async () => {
    const contexto = criarContexto();
    contexto.cena.campanhaId = 4;
    await expect(
      contexto.projecao.listarDocumentosCenaPainelEspectador(consulta, usuario),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(contexto.vinculoRepositorio.listarPorCena).not.toHaveBeenCalled();
  });

  it.each(["anexar", "remover", "focar", "apresentar", "reordenar"] as const)(
    "espectador continua sem poder %s documento",
    async (metodo) => {
      const contexto = criarContexto();
      contexto.campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });
      const chamada =
        metodo === "reordenar"
          ? contexto.cenaDocumentos.reordenar({ cenaId: 9, ordem: [7] }, usuario)
          : contexto.cenaDocumentos[metodo]({ cenaId: 9, documentoId: 7 }, usuario);
      await expect(chamada).rejects.toBeInstanceOf(UnauthorizedAccessException);
    },
  );

  it("mestre em prévia recebe o mesmo recorte de documentos e foco false", async () => {
    const contexto = criarContexto();
    const espectador = await contexto.projecao.listarDocumentosCenaPainelEspectador(
      consulta,
      usuario,
    );
    contexto.campanhaService.validarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });
    const previa = await contexto.projecao.listarDocumentosCenaPainelEspectador(consulta, usuario);
    expect(previa).toEqual(espectador);
    expect(previa[0].emFoco).toBe(false);
    expect(contexto.vinculoRepositorio.listarPorCena).toHaveBeenCalledWith({
      cenaId: 9,
      apenasRevelados: true,
    });
  });

  it.each(["cena", "lista", "documento"])("nega jogador em %s", async (operacao) => {
    const contexto = criarContexto();
    contexto.campanhaService.validarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });
    const chamada =
      operacao === "cena"
        ? contexto.projecao.recuperarCenaAtivaPainelEspectador({ campanhaId: 3 }, usuario)
        : operacao === "lista"
          ? contexto.projecao.listarDocumentosCenaPainelEspectador(consulta, usuario)
          : contexto.projecao.recuperarDocumentoCenaPainelEspectador(
              { ...consulta, documentoId: 7 },
              usuario,
            );
    await expect(chamada).rejects.toBeInstanceOf(UnauthorizedAccessException);
  });

  it("nega não membro antes de ler documentos", async () => {
    const contexto = criarContexto();
    contexto.campanhaService.validarMembro.mockRejectedValue(new UnauthorizedAccessException());
    await expect(
      contexto.projecao.listarDocumentosCenaPainelEspectador(consulta, usuario),
    ).rejects.toBeInstanceOf(UnauthorizedAccessException);
    expect(contexto.vinculoRepositorio.listarPorCena).not.toHaveBeenCalled();
  });

  it.each(["oculto", "não anexado", "campanha alheia", "cena encerrada", "Resistência"])(
    "recusa leitura direta de %s inclusive na prévia",
    async (caso) => {
      const contexto = criarContexto();
      contexto.campanhaService.validarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      if (caso === "oculto")
        contexto.documentoRepositorio.recuperarPorId.mockResolvedValue({
          id: 7,
          campanhaId: 3,
          revelado: false,
        });
      if (caso === "não anexado")
        contexto.vinculoRepositorio.recuperarPorCenaEDocumento.mockResolvedValue(null);
      if (caso === "campanha alheia")
        contexto.documentoRepositorio.recuperarPorId.mockResolvedValue({
          id: 7,
          campanhaId: 4,
          revelado: true,
        });
      if (caso === "cena encerrada") contexto.cena.status = CenaStatusEnum.ENCERRADA;
      if (caso === "Resistência") contexto.cena.tipo = CenaTipoEnum.RESISTENCIA;
      await expect(
        contexto.projecao.recuperarDocumentoCenaPainelEspectador(
          { ...consulta, documentoId: 7 },
          usuario,
        ),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    },
  );

  it("lê conteúdo revelado vinculado", async () => {
    const contexto = criarContexto();
    expect(
      await contexto.projecao.recuperarDocumentoCenaPainelEspectador(
        { ...consulta, documentoId: 7 },
        usuario,
      ),
    ).toMatchObject({ conteudoMarkdown: "Pista" });
  });
});
