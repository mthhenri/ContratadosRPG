import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamableFile, UnauthorizedException } from "@nestjs/common";
import type { FichaImagemContextoDto, FichaImagemContextoRecuperarDto, FichaRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import type { ArmazenamentoProvedor } from "../../core/armazenamento";
import { ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { FichaService } from "./ficha.service";
import type { FichaRepository } from "./ficha.repository";

describe("FichaService — leitura atual de avatar", () => {
  let atual: FichaRecuperadaDto | null;
  let concessao: boolean;
  const papeis = new Map<number, TipoCampanhaMembroPapelEnum>();
  const repositorio = { recuperarContextoImagem: vi.fn<FichaRepository['recuperarContextoImagem']>(), recuperarAcesso: vi.fn() };
  const armazenamento = { lerImagem: vi.fn<ArmazenamentoProvedor['lerImagem']>() };
  const campanha = { recuperarMembro: vi.fn() };
  const caminho = '/uploads/fichas/avatar.png';
  const imagem = { conteudo: new Uint8Array([1, 2, 3]), mimetype: 'image/png' };
  let service: FichaService;
  const usuario = (sub: number): JwtPayload => ({ sub, tipo: TipoUsuarioEnum.NORMAL, login: `u${sub}`, tokenVersao: 1 });
  function montarContexto(dto: FichaImagemContextoRecuperarDto): FichaImagemContextoDto | null {
    return atual ? { ficha: atual, papelUsuario: papeis.get(dto.usuarioId!) ?? null,
      papelAlvo: papeis.get(dto.usuarioAlvoId!) ?? null, acessoUsuario: concessao, acessoAlvo: concessao } : null;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    atual = { id: 1, usuarioId: 10, campanhaId: 3, nome: 'A', oculta: false,
      tipo: TipoFichaEnum.JOGADOR, imagemUrl: caminho } as FichaRecuperadaDto;
    concessao = false;
    papeis.clear();
    papeis.set(7, TipoCampanhaMembroPapelEnum.MESTRE);
    papeis.set(10, TipoCampanhaMembroPapelEnum.JOGADOR);
    papeis.set(42, TipoCampanhaMembroPapelEnum.JOGADOR);
    papeis.set(55, TipoCampanhaMembroPapelEnum.ESPECTADOR);
    repositorio.recuperarContextoImagem.mockImplementation(dto => Promise.resolve(montarContexto(dto)));
    repositorio.recuperarAcesso.mockImplementation(() => concessao ? { id: 1 } : null);
    campanha.recuperarMembro.mockImplementation(({ usuarioId }: { usuarioId: number }) => {
      const papel = papeis.get(usuarioId);
      return papel ? { papel } : null;
    });
    armazenamento.lerImagem.mockResolvedValue(imagem);
    service = new FichaService(repositorio as never, campanha as never, {
      ehEspectador: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR,
      ehJogador: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.JOGADOR,
      ehMestre: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.MESTRE,
    } as never, {} as never, armazenamento as never);
  });

  it.each([7, 10, 42, 55])('jogador visível tem carteirinha pública para membro %s sem concessão', async observador => {
    expect(await service.recuperarImagem({ caminho }, usuario(observador))).toBeInstanceOf(StreamableFile);
    expect(repositorio.recuperarContextoImagem).toHaveBeenCalledTimes(2);
  });

  it.each([7, 10])('jogador oculto continua legível a dono/mestre %s', async observador => {
    atual = { ...atual!, oculta: true };
    expect(await service.recuperarImagem({ caminho }, usuario(observador))).toBeInstanceOf(StreamableFile);
  });

  it.each([42, 55, 99])('ocultação suspende acesso de %s mesmo com concessão', async observador => {
    atual = { ...atual!, oculta: true };
    concessao = true;
    await expect(service.recuperarImagem({ caminho }, usuario(observador))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    expect(armazenamento.lerImagem).not.toHaveBeenCalled();
  });

  it.each([TipoFichaEnum.CRIATURA, TipoFichaEnum.NPC])('%s exige concessão de B e nunca amplia S', async tipo => {
    atual = { ...atual!, tipo, oculta: true };
    await expect(service.recuperarImagem({ caminho }, usuario(42))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    concessao = true;
    expect(await service.recuperarImagem({ caminho }, usuario(42))).toBeInstanceOf(StreamableFile);
    await expect(service.recuperarImagem({ caminho }, usuario(55))).rejects.toBeInstanceOf(UnauthorizedAccessException);
  });

  it('mestre em prévia avalia A, B e espectador sem herdar o privilégio do requisitante', async () => {
    atual = { ...atual!, oculta: true };
    concessao = true;
    expect(await service.recuperarImagem({ caminho, campanhaId: 3, usuarioAlvoId: 10 }, usuario(7))).toBeInstanceOf(StreamableFile);
    await expect(service.recuperarImagem({ caminho, usuarioAlvoId: 42 }, usuario(7))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    await expect(service.recuperarImagem({ caminho, espectador: true }, usuario(7))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    atual = { ...atual, oculta: false };
    expect(await service.recuperarImagem({ caminho, espectador: true }, usuario(7))).toBeInstanceOf(StreamableFile);
  });

  it('recusa contexto forjado, alvo espectador, campanha divergente e antigo dono rebaixado a S', async () => {
    await expect(service.recuperarImagem({ caminho, usuarioAlvoId: 10 }, usuario(42))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    await expect(service.recuperarImagem({ caminho, usuarioAlvoId: 55 }, usuario(7))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    await expect(service.recuperarImagem({ caminho, espectador: true }, usuario(42))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    await expect(service.recuperarImagem({ caminho, campanhaId: 999 }, usuario(7))).rejects.toBeInstanceOf(ResourceNotFoundException);
    papeis.set(10, TipoCampanhaMembroPapelEnum.ESPECTADOR);
    atual = { ...atual!, oculta: true };
    await expect(service.recuperarImagem({ caminho }, usuario(10))).rejects.toBeInstanceOf(UnauthorizedAccessException);
  });

  it('ficha solta usa dono/concessão e recusa modos de campanha', async () => {
    atual = { ...atual!, campanhaId: null, oculta: true };
    expect(await service.recuperarImagem({ caminho }, usuario(10))).toBeInstanceOf(StreamableFile);
    await expect(service.recuperarImagem({ caminho }, usuario(42))).rejects.toBeInstanceOf(UnauthorizedAccessException);
    concessao = true;
    expect(await service.recuperarImagem({ caminho }, usuario(42))).toBeInstanceOf(StreamableFile);
    await expect(service.recuperarImagem({ caminho, espectador: true }, usuario(10))).rejects.toBeInstanceOf(UnauthorizedAccessException);
  });

  it('legado conhecido exige JWT; imagem inexistente não consulta o storage', async () => {
    await expect(service.recuperarImagem({ caminho })).rejects.toBeInstanceOf(UnauthorizedException);
    atual = null;
    expect(await service.recuperarImagem({ caminho })).toBeNull();
    expect(armazenamento.lerImagem).not.toHaveBeenCalled();
  });

  it.each(['ocultacao', 'revogacao', 'exclusao', 'substituicao', 'saida', 'papel', 'posse', 'campanha', 'tipo'] as const)(
    'último snapshot reavalia %s; nenhuma autorização assíncrona posterior usa ficha antiga', async mudanca => {
      if (mudanca === 'revogacao') atual = { ...atual!, tipo: TipoFichaEnum.CRIATURA };
      if (mudanca === 'papel') atual = { ...atual!, oculta: true };
      if (mudanca === 'posse') atual = { ...atual!, oculta: true };
      concessao = true;
      const observador = mudanca === 'papel' ? 7 : mudanca === 'posse' ? 10 : 42;
      let liberar!: () => void;
      let iniciou!: () => void;
      const pendente = new Promise<void>(resolve => { liberar = resolve; });
      const iniciada = new Promise<void>(resolve => { iniciou = resolve; });
      repositorio.recuperarContextoImagem.mockImplementationOnce(dto => Promise.resolve(montarContexto(dto)))
        .mockImplementationOnce(async dto => { iniciou(); await pendente; return montarContexto(dto); });
      const leitura = service.recuperarImagem({ caminho, campanhaId: 3 }, usuario(observador));
      await iniciada;
      if (mudanca === 'ocultacao') atual = { ...atual!, oculta: true };
      if (mudanca === 'revogacao') concessao = false;
      if (mudanca === 'exclusao') atual = null;
      if (mudanca === 'substituicao') atual = { ...atual!, imagemUrl: '/uploads/fichas/outro.png' };
      if (mudanca === 'saida') papeis.delete(42);
      if (mudanca === 'papel') papeis.set(7, TipoCampanhaMembroPapelEnum.JOGADOR);
      if (mudanca === 'posse') atual = { ...atual!, usuarioId: 99 };
      if (mudanca === 'campanha') atual = { ...atual!, campanhaId: 9 };
      if (mudanca === 'tipo') { atual = { ...atual!, tipo: TipoFichaEnum.NPC }; concessao = false; }
      liberar();
      await expect(leitura).rejects.toThrow();
      expect(campanha.recuperarMembro).not.toHaveBeenCalled();
      expect(repositorio.recuperarAcesso).not.toHaveBeenCalled();
    },
  );

  it.each(['ocultacao', 'revogacao', 'exclusao', 'substituicao', 'saida'] as const)(
    'revalida %s ocorrida durante leitura dos bytes', async mudanca => {
      if (mudanca === 'revogacao') atual = { ...atual!, tipo: TipoFichaEnum.CRIATURA };
      concessao = true;
      let liberar!: (valor: typeof imagem) => void;
      let iniciou!: () => void;
      const iniciada = new Promise<void>(resolve => { iniciou = resolve; });
      const pendente = new Promise<typeof imagem>(resolve => { liberar = resolve; });
      armazenamento.lerImagem.mockImplementationOnce(() => { iniciou(); return pendente; });
      const leitura = service.recuperarImagem({ caminho }, usuario(42));
      await iniciada;
      if (mudanca === 'ocultacao') atual = { ...atual!, oculta: true };
      if (mudanca === 'revogacao') concessao = false;
      if (mudanca === 'exclusao') atual = null;
      if (mudanca === 'substituicao') atual = { ...atual!, imagemUrl: '/uploads/fichas/outro.png' };
      if (mudanca === 'saida') papeis.delete(42);
      liberar(imagem);
      await expect(leitura).rejects.toThrow();
    },
  );
});
