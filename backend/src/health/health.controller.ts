import { Controller, Get } from '@nestjs/common';
import { VERSAO_SISTEMA } from '@contratados-rpg/shared';
import { Public } from '../core/decorators';
import { DocumentarController } from '../core/openapi';

/**
 * Endpoint operacional de disponibilidade da API. Não possui service nem repository: não
 * há regra de negócio nem persistência — apenas confirma que o processo Nest está
 * respondendo. Público (dispensa autenticação; o guard global que interpreta `@Public()`
 * nasce no M2). A resposta é embrulhada em `StandardResponse<T>` pelo
 * `response-format.interceptor`. Ver m0-04-healthcheck-endpoint.spec.md. Devolve também a `versao`
 * do sistema (`VERSAO_SISTEMA`, fonte única em `shared/` — pn-01), para conferir o que está no ar.
 */
@Controller('health')
@DocumentarController('Operação')
export class HealthController {
  @Public()
  @Get()
  verificar(): { status: string; versao: string } {
    return { status: 'ok', versao: VERSAO_SISTEMA };
  }
}
