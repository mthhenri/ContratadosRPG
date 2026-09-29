import { VERSAO_SISTEMA } from '@contratados-rpg/shared';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('confirma que o processo responde e informa a versão do sistema', () => {
    expect(new HealthController().verificar()).toEqual({ status: 'ok', versao: VERSAO_SISTEMA });
  });
});
