/**
 * Payload do JWT emitido no login e validado pela `JwtStrategy`. É o valor injetado por
 * `@ActiveUser()` no parâmetro do método (SYSTEM.SPEC §12). `sub` é o `id` do usuário
 * (claim padrão "subject" do JWT).
 */
export interface JwtPayload {
  readonly sub: number;
  readonly login: string;
}
