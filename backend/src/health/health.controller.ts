import { Controller, Get } from '@nestjs/common';
import { Public } from '../core/decorators';

/**
 * Endpoint operacional de disponibilidade da API. Não possui service nem repository: não
 * há regra de negócio nem persistência — apenas confirma que o processo Nest está
 * respondendo. Público (dispensa autenticação; o guard global que interpreta `@Public()`
 * nasce no M2). A resposta é embrulhada em `StandardResponse<T>` pelo
 * `response-format.interceptor`. Ver m0-04-healthcheck-endpoint.spec.md.
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  verificar(): { status: string } {
    return { status: 'ok' };
  }
}
