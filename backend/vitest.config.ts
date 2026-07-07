import { defineConfig } from 'vitest/config';

/**
 * Configuração de testes do backend (Vitest, mesmo runner do `shared/`). Os testes de
 * service são unitários: instanciam a service com colaboradores dublados (repositório e
 * `JwtService`), sem subir o container Nest nem tocar o banco.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
