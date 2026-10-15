import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { DispositivoService } from "./dispositivo.service";
import type { DispositivoAutenticado } from "./dispositivo.repository";
/** Obrigatório nas rotas do app; @Public só contorna os guards JWT globais. */
@Injectable()
export class DispositivoGuard implements CanActivate {
    constructor(private readonly service: DispositivoService) {}
    async canActivate(contexto: ExecutionContext): Promise<boolean> {
        const req = contexto.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: DispositivoAutenticado }>();
        const header = req.headers.authorization;
        if (!header || !/^Bearer [a-zA-Z0-9_-]{43}$/.test(header)) throw new UnauthorizedException();
        req.user = await this.service.autenticar(header.slice(7));
        return true;
    }
}
