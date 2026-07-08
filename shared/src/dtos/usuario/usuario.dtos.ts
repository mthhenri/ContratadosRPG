/**
 * DTOs do módulo `usuario` — entrada/saída da API de autenticação (registro e login,
 * m2-02) e os DTOs internos service ↔ repository. Seguem a fórmula
 * `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS / skill `dto-conventions`):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que nunca chega ao
 * frontend (carrega o hash da senha).
 *
 * A `senha` **nunca** volta ao cliente: os DTOs de saída pública (`UsuarioCriadoDto`,
 * `UsuarioAutenticadoDto`) não a expõem; só os `*Interno*` a carregam, como hash bcrypt.
 */

/**
 * Entrada de registro (`AutenticacaoService.registrar`). A `senha` chega em claro e é
 * encriptada (bcrypt) na service antes de persistir.
 */
export interface UsuarioCriarDto {
  readonly login: string;
  readonly senha: string;
  readonly nome: string;
}

/** Saída de registro — o usuário criado, **sem** a senha. */
export interface UsuarioCriadoDto {
  readonly id: number;
  readonly login: string;
  readonly nome: string;
}

/** Entrada de login (`AutenticacaoService.autenticar`) — credenciais. */
export interface UsuarioAutenticarDto {
  readonly login: string;
  readonly senha: string;
}

/** Saída de login — o JWT emitido + os dados básicos do usuário, **sem** a senha. */
export interface UsuarioAutenticadoDto {
  readonly token: string;
  readonly id: number;
  readonly login: string;
  readonly nome: string;
}

/**
 * Entrada interna do `UsuarioRepository.criarUsuario` — a `senha` já é o **hash bcrypt**
 * (a encriptação acontece na service, nunca no repositório).
 */
export interface UsuarioInternoCriarDto {
  readonly login: string;
  readonly senha: string;
  readonly nome: string;
}

/** Entrada interna de busca de usuário pelo `login` (validação de duplicidade e login). */
export interface UsuarioLoginRecuperarDto {
  readonly login: string;
}

/**
 * Saída interna da busca por login — carrega o **hash** da senha para o `bcrypt.compare`
 * da service. `Interno` porque nunca trafega ao frontend.
 */
export interface UsuarioInternoRecuperadoDto {
  readonly id: number;
  readonly login: string;
  readonly senha: string;
  readonly nome: string;
}

/**
 * Entrada de recuperação individual do usuário (m2-03 — perfil self-service). O `id` vem do
 * JWT (`@ActiveUser().sub`), injetado no DTO pela controller — nunca primitivo solto.
 */
export interface UsuarioRecuperarDto {
  readonly id: number;
}

/**
 * Saída do perfil do usuário autenticado (m2-03) — os dados públicos, **sem** a senha.
 */
export interface UsuarioRecuperadoDto {
  readonly id: number;
  readonly login: string;
  readonly nome: string;
}

/**
 * Entrada pública da troca da própria senha (m2-03): a `senhaAtual` (validada por
 * `bcrypt.compare` na service) e a `novaSenha` (encriptada antes de persistir). Complemento
 * `Senha` inteiro antes do verbo (CONVENTIONS / skill `dto-conventions`).
 */
export interface UsuarioSenhaAlterarDto {
  readonly senhaAtual: string;
  readonly novaSenha: string;
}

/** Saída da troca de senha — os dados públicos do usuário, **sem** a senha. */
export interface UsuarioSenhaAlteradaDto {
  readonly id: number;
  readonly login: string;
  readonly nome: string;
}

/**
 * Entrada interna do `UsuarioRepository.alterarSenha` — o `id` do usuário e a `senha` já
 * como **hash bcrypt** (a encriptação acontece na service, nunca no repositório). `Interno`
 * porque carrega o hash e nunca trafega ao frontend.
 */
export interface UsuarioSenhaInternoAlterarDto {
  readonly id: number;
  readonly senha: string;
}

/**
 * Entrada pública da alteração dos dados de perfil do próprio usuário autenticado (m2-11):
 * `nome` e `login`. Complemento `Perfil` inteiro antes do verbo (CONVENTIONS / skill
 * `dto-conventions`). O `id` vem do JWT (`@ActiveUser().sub`), nunca do corpo.
 */
export interface UsuarioPerfilAlterarDto {
  readonly nome: string;
  readonly login: string;
}

/** Saída da alteração de perfil — os dados públicos do usuário, **sem** a senha. */
export interface UsuarioPerfilAlteradoDto {
  readonly id: number;
  readonly login: string;
  readonly nome: string;
}

/**
 * Entrada interna do `UsuarioRepository.alterarPerfil` (m2-11) — o `id` do usuário (do
 * token) e os campos alterados (`nome`, `login`). `Interno` porque o `id` é injetado pela
 * service a partir do JWT, nunca chega no corpo da requisição.
 */
export interface UsuarioPerfilInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  readonly login: string;
}

/**
 * Entrada da exclusão (soft delete) da própria conta (m2-11). O `id` vem do JWT
 * (`@ActiveUser().sub`), injetado no DTO pela controller — nunca primitivo solto.
 */
export interface UsuarioExcluirDto {
  readonly id: number;
}
