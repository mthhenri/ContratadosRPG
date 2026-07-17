import { forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  CampanhaMembroEntradaDto,
  CampanhaRecuperarDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import { CampanhaService } from '../../modules/campanha/campanha.service';
import { FichaService } from '../../modules/ficha/ficha.service';

/** Resposta (ack) de um pedido de entrada em sala — o cliente sabe se a permissão foi concedida. */
interface EntradaSalaResultado {
  readonly sucesso: boolean;
}

/**
 * Gateway de tempo real **broadcast-only** (SYSTEM.SPEC §9, proibição #25): nenhuma escrita entra
 * por aqui — toda mutação passa por REST (guards + validação + motor de regras) e a service emite
 * o evento **após** salvar. O gateway só faz três coisas:
 *
 * 1. **Handshake autenticado** — valida o JWT na conexão com o **mesmo mecanismo do Passport**
 *    (`JwtService` configurado com o `JWT_SECRETO`, o mesmo segredo que a `JwtStrategy` verifica —
 *    nada de segundo validador). Sem token válido, o socket é desconectado.
 * 2. **Entrada em sala com a permissão do REST** — entrar em `ficha:<id>` reusa
 *    `FichaService.recuperarFicha` (permissão de visualização §14) e em `campanha:<id>` reusa
 *    `CampanhaService.recuperarCampanha` (só membros). O gateway **consulta a service dona** — não
 *    duplica a regra de permissão (proibição #28).
 * 3. **Emissão** dos eventos de negócio (`ficha:alterada`, `ficha:criada`, `membro:entrou`),
 *    chamada pelas services após a mutação.
 *
 * A origem do Socket.IO é travada em `APP_FRONTEND_ORIGEM` pelo `WsIoAdapter` (§10.6).
 */
@WebSocketGateway()
export class CampanhaGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly servidor!: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => FichaService))
    private readonly fichaService: FichaService,
    @Inject(forwardRef(() => CampanhaService))
    private readonly campanhaService: CampanhaService,
  ) {}

  /**
   * Handshake autenticado (§9): valida o JWT enviado no `auth.token` (ou no header
   * `Authorization: Bearer`) e guarda o payload em `socket.data`. Token ausente/inválido →
   * o socket é desconectado imediatamente.
   */
  handleConnection(cliente: Socket): void {
    const usuario = this.autenticarHandshake(cliente);
    if (!usuario) {
      cliente.disconnect(true);
      return;
    }
    this.definirUsuario(cliente, usuario);
  }

  /**
   * Entra na sala `ficha:<id>` — exige a **mesma permissão de visualização do REST** (§14),
   * consultando `FichaService.recuperarFicha` (dono, mestre ou concessão em `usuario_ficha_acesso`).
   * Sem permissão (a service lança), a entrada é negada e nenhuma sala é ingressada.
   */
  @SubscribeMessage('ficha:entrar')
  async entrarSalaFicha(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() dto: FichaRecuperarDto,
  ): Promise<EntradaSalaResultado> {
    const usuario = this.obterUsuario(cliente);
    if (!usuario) {
      return { sucesso: false };
    }

    try {
      await this.fichaService.recuperarFicha({ id: dto.id }, usuario);
    } catch {
      return { sucesso: false };
    }

    await cliente.join(this.salaFicha(dto.id));
    return { sucesso: true };
  }

  /**
   * Entra na sala `campanha:<id>` — só **membros** (§14), consultando
   * `CampanhaService.recuperarCampanha` (que valida o vínculo do usuário na campanha). Sem
   * permissão (a service lança), a entrada é negada e nenhuma sala é ingressada.
   */
  @SubscribeMessage('campanha:entrar')
  async entrarSalaCampanha(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() dto: CampanhaRecuperarDto,
  ): Promise<EntradaSalaResultado> {
    const usuario = this.obterUsuario(cliente);
    if (!usuario) {
      return { sucesso: false };
    }

    try {
      await this.campanhaService.recuperarCampanha({ id: dto.id }, usuario);
    } catch {
      return { sucesso: false };
    }

    await cliente.join(this.salaCampanha(dto.id));
    return { sucesso: true };
  }

  /**
   * Emite `ficha:alterada` na sala `ficha:<id>` (§9). Chamado por `FichaService.alterarFicha` após
   * a alteração ser persistida.
   */
  emitirFichaAlterada(ficha: FichaAlteradaDto): void {
    this.servidor.to(this.salaFicha(ficha.id)).emit('ficha:alterada', ficha);
  }

  /**
   * Emite `ficha:criada` na sala `campanha:<id>` (§9). Chamado por `FichaService.criarFicha` após a
   * ficha ser persistida — os membros conectados à campanha veem a nova ficha aparecer.
   *
   * O payload é só o **resumo** (`FichaResumoDto` — o mesmo recorte da listagem, §10.4), **nunca o
   * `dados`**: a sala `campanha:<id>` inclui qualquer membro, mas a visualização do documento da ficha
   * é mais restrita (§14 — dono/mestre/concessão). Emitir o `dados` completo aqui vazaria a ficha a
   * um membro que o REST (`recuperarFicha`) negaria — o conteúdo continua atrás do endpoint gateado
   * pela §14. (o gateway não relaxa a permissão — proibição #28.)
   */
  emitirFichaCriada(ficha: FichaCriadaDto): void {
    const resumo: FichaResumoDto = {
      id: ficha.id,
      usuarioId: ficha.usuarioId,
      nome: ficha.nome,
      classe: ficha.dados.classe,
      nivel: ficha.dados.nivel,
      vidaAtual: ficha.dados.estado.vidaAtual,
      vidaMaxima: ficha.dados.estado.vidaMaxima,
      energiaAtual: ficha.dados.estado.energiaAtual,
      energiaMaxima: ficha.dados.estado.energiaMaxima,
      morrendo: ficha.dados.estado.morrendo ?? false,
      machucado: ficha.dados.estado.machucado ?? false,
      inconsciente: ficha.dados.estado.inconsciente ?? false,
    };
    this.servidor.to(this.salaCampanha(ficha.campanhaId)).emit('ficha:criada', resumo);
  }

  /**
   * Emite `membro:entrou` na sala `campanha:<id>` (§9). Chamado por `CampanhaService.entrarCampanha`
   * após o vínculo ser criado — os membros conectados veem o novo integrante entrar.
   */
  emitirMembroEntrou(evento: CampanhaMembroEntradaDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('membro:entrou', evento);
  }

  /**
   * Valida o JWT do handshake com o mesmo mecanismo do Passport (o `JwtService` usa o `JWT_SECRETO`
   * que a `JwtStrategy` verifica). Devolve o payload quando válido, `null` caso contrário.
   */
  private autenticarHandshake(cliente: Socket): JwtPayload | null {
    const token = this.extrairToken(cliente);
    if (!token) {
      return null;
    }
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  /** Extrai o token do `auth.token` do handshake ou, como alternativa, do header `Authorization`. */
  private extrairToken(cliente: Socket): string | null {
    const autenticacaoHandshake = cliente.handshake.auth as { token?: unknown };
    if (typeof autenticacaoHandshake.token === 'string' && autenticacaoHandshake.token.length > 0) {
      return autenticacaoHandshake.token;
    }

    const cabecalhoAutorizacao = cliente.handshake.headers.authorization;
    if (typeof cabecalhoAutorizacao === 'string' && cabecalhoAutorizacao.startsWith('Bearer ')) {
      return cabecalhoAutorizacao.slice('Bearer '.length);
    }

    return null;
  }

  private obterUsuario(cliente: Socket): JwtPayload | null {
    return (cliente.data as { usuario?: JwtPayload }).usuario ?? null;
  }

  private definirUsuario(cliente: Socket, usuario: JwtPayload): void {
    (cliente.data as { usuario?: JwtPayload }).usuario = usuario;
  }

  private salaFicha(fichaId: number): string {
    return `ficha:${fichaId}`;
  }

  private salaCampanha(campanhaId: number): string {
    return `campanha:${campanhaId}`;
  }
}
