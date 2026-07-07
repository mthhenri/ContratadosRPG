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
