import { describe, expect, it } from 'vitest';
import { criarUriAbertura, estadoAbertura } from './abertura';
const id = 'e809de1e-005c-4943-9c68-5ce3b445065e';
describe('Abertura contextual', () => {
  it('URI leva somente intenção, nunca JWT, texto ou caminho', () => {
    expect(criarUriAbertura(id)).toBe(`contratados-transcriber://abrir/${id}`);
    expect(() => criarUriAbertura('../arquivo?token=x')).toThrow();
  });
  it('ausência de confirmação não alega detecção de instalação', () => {
    expect(estadoAbertura(false, true)).toBe('Não recebemos confirmação do aplicativo.');
    expect(estadoAbertura(true, true)).toBe('Sessão aberta no aplicativo.');
  });
});
