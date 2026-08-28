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
  CampanhaEstadoAlteradaDto,
  CampanhaInventarioAlteradoDto,
  CampanhaMembroEntradaDto,
  CampanhaRecuperarDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
  FichaVisibilidadeAlteradaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type {
  EncontroAlteradoDto,
  EncontroIniciativaPedidoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import type {
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import { CampanhaService } from '../../modules/campanha/campanha.service';
import { EncontroService } from '../../modules/encontro/encontro.service';
import { omitirCamposPrivados } from '../../modules/ficha/ficha-campos-privados.util';
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
    @Inject(forwardRef(() => EncontroService))
    private readonly encontroService: EncontroService,
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
   * a alteração ser persistida. O `emit()` é **único para toda a sala** — não distingue socket por
   * permissão —, e a sala `ficha:<id>` pode incluir um visualizador só-acesso (`entrarSalaFicha`
   * só exige visualização, não edição); por isso o broadcast sempre omite
   * `CAMPOS_PRIVADOS_FICHA` (m3-50 — `historia`), até para dono/mestre, que recuperam o valor
   * atualizado pelo REST (o mesmo tratamento do `dados` reduzido em `emitirFichaCriada` abaixo).
   *
   * Depois do broadcast, pede ao `EncontroService` para resincronizar a Iniciativa (m7-17,
   * correção): quem edita Vida/Energia/Condições pela ficha flutuante do Encontro (ou por qualquer
   * outra tela) grava pela `FichaService`, que só sabe emitir `ficha:alterada` — a sala
   * `ficha:<id>`, não a `campanha:<id>` que o painel de Iniciativa escuta. O gateway não decide se
   * há encontro aberto nem se esta ficha é combatente (proibição #25); só encaminha, e
   * `sincronizarFichaAlterada` é no-op nos demais casos.
   */
  emitirFichaAlterada(ficha: FichaAlteradaDto): void {
    const fichaSemCamposPrivados: FichaAlteradaDto = {
      ...ficha,
      dados: omitirCamposPrivados(ficha.dados),
    };
    this.servidor.to(this.salaFicha(ficha.id)).emit('ficha:alterada', fichaSemCamposPrivados);
    // Best-effort: uma falha aqui (ex.: encontro apagado entre a alteração e este ponto) não pode
    // derrubar o broadcast de `ficha:alterada` que já aconteceu — mesmo espírito do `catch` por
    // socket em `emitirEncontroAlterado` logo abaixo.
    void this.encontroService.sincronizarFichaAlterada(ficha.id, ficha.campanhaId).catch(() => undefined);
  }

  /**
   * Invalida o recorte de fichas de toda a campanha após uma mudança real de visibilidade. O
   * cliente refaz o GET autorizado; o evento não informa se a ficha foi ocultada ou exibida.
   */
  emitirFichaVisibilidadeAlterada(evento: FichaVisibilidadeAlteradaDto): void {
    this.servidor
      .to(this.salaCampanha(evento.campanhaId))
      .emit('ficha:visibilidade-alterada', evento);
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
   *
   * **Ficha solta no acervo (m3-28)**: `campanhaId === null` não tem sala — no-op (nenhum membro de
   * campanha está esperando essa ficha). `campanhaNome` fica sempre `null` aqui — quem recebe o
   * evento já está dentro da própria sala da campanha, não precisa do nome dela.
   */
  emitirFichaCriada(ficha: FichaCriadaDto): void {
    if (ficha.campanhaId === null) {
      return;
    }
    const resumo: FichaResumoDto = {
      id: ficha.id,
      campanhaId: ficha.campanhaId,
      campanhaNome: null,
      usuarioId: ficha.usuarioId,
      nome: ficha.nome,
      cor: ficha.cor,
      imagemUrl: ficha.imagemUrl,
      classe: ficha.dados.classe,
      arquetipo: ficha.dados.arquetipo,
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
   * Emite `campanha:estado-alterado` na sala `campanha:<id>` (§ inventário de esquadrão).
   * Chamado por `CampanhaService.alterarEstado` após a mutação ser persistida — os membros
   * conectados veem o estado Na Base/Em Missão mudar em tempo real.
   */
  emitirEstadoAlterado(evento: CampanhaEstadoAlteradaDto): void {
    this.servidor.to(this.salaCampanha(evento.id)).emit('campanha:estado-alterado', evento);
  }

  /**
   * Emite `campanha:inventario-alterado` na sala `campanha:<id>` — sem payload de dados (o
   * cliente sempre refaz `GET /campanha/:id/inventario`, mesmo padrão dos demais broadcasts).
   * Chamado pelas mutações de `CampanhaService` e pelas rotas de transferência de `FichaService`
   * (Task 3) após persistir.
   */
  emitirInventarioAlterado(evento: CampanhaInventarioAlteradoDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('campanha:inventario-alterado', evento);
  }

  /**
   * Emite `ficha:acesso-revogado` na sala `ficha:<id>` (m3-51, item 27 — "revogar acesso expulsa").
   * Chamado por `FichaService.revogarAcesso` após a revogação ser persistida. Mesmo `emit()` único
   * pra sala inteira dos demais broadcasts (proibição de distinguir por socket) — o cliente é quem
   * decide reagir: `TempoRealService`/`visualizar.page.ts` só redirecionam para fora da tela quando
   * `evento.usuarioId` bate com o usuário autenticado **e** ele não é dono/mestre (que nunca perdem
   * acesso por esta via).
   */
  emitirAcessoRevogado(evento: FichaAcessoRevogadoDto): void {
    this.servidor.to(this.salaFicha(evento.fichaId)).emit('ficha:acesso-revogado', evento);
  }

  /** Propaga a criação já persistida de uma página colaborativa à campanha. */
  emitirPaginaEsquadraoCriada(pagina: PaginaCadernoResumoDto): void {
    this.servidor.to(this.salaCampanha(pagina.campanhaId)).emit('caderno-esquadrao:pagina-criada', pagina);
  }

  /** Propaga uma atualização CRDT já persistida; escrita nunca entra pelo gateway. */
  emitirPaginaEsquadraoAtualizada(evento: PaginaCadernoEsquadraoAlteradaDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('caderno-esquadrao:atualizado', evento);
  }

  /** Invalida a página removida para os membros que mantêm a lista aberta. */
  emitirPaginaEsquadraoExcluida(evento: { readonly campanhaId: number; readonly paginaId: number }): void {
    this.servidor
      .to(this.salaCampanha(evento.campanhaId))
      .emit('caderno-esquadrao:pagina-excluida', evento);
  }

  /**
   * Emite `rolagem:registrada` (m3-27). Chamado por `RolagemService.registrarRolagem` após a
   * rolagem ser persistida. **Só rolagens `PUBLICA` chegam aqui** — o `emit()` é único pra sala
   * inteira, sem emissão direcionada por permissão (§9); broadcastar uma `PRIVADA` vazaria o
   * conteúdo a quem não deveria vê-la. O autor/mestre de uma rolagem privada a recebe via REST no
   * próximo carregamento do feed (decisão de design v1).
   *
   * **Duas salas, mutuamente exclusivas (m3-77)**: com campanha, emite só em `campanha:<id>` (como
   * sempre) — quem tem a ficha aberta por lá entra também nessa sala (`entrarSalaCampanha`,
   * `visualizar.page.ts`/`visualizar-criatura.page.ts`), então emitir de novo em `ficha:<id>`
   * entregaria o mesmo evento duas vezes a quem está nas duas salas ao mesmo tempo (ex.:
   * `campanha/detalhe`, que já assina ambas por ficha visível). **Ficha solta (m3-28)**:
   * `campanhaId === null` não tem sala de campanha — a ficha aberta em `/fichas/:id` só está em
   * `ficha:<id>` (`entrarSalaFicha`, sempre ingressada), então é essa sala que recebe o evento;
   * sem `fichaId` (rolagem de combatente avulso), não há sala nenhuma — no-op.
   */
  emitirRolagemRegistrada(rolagem: RolagemResumoDto): void {
    if (rolagem.campanhaId === null) {
      if (rolagem.fichaId !== null) {
        this.servidor.to(this.salaFicha(rolagem.fichaId)).emit('rolagem:registrada', rolagem);
      }
      return;
    }
    this.servidor.to(this.salaCampanha(rolagem.campanhaId)).emit('rolagem:registrada', rolagem);
  }

  /**
   * Emite `encontro:alterado` na sala `campanha:<id>` (§9), **um payload por usuário** (m7-06).
   *
   * Diferente dos outros eventos, este não pode ser um `emit` único para a sala: o estado do
   * encontro carrega Vida, defesas e log de criaturas que o mestre talvez ainda não tenha revelado,
   * e a sala mistura mestre e jogadores. Então o gateway percorre os sockets, pergunta à
   * `EncontroService` (a dona da regra §14) qual é o recorte daquele usuário e emite socket a
   * socket. O resultado é memorizado por usuário — quem está com duas abas abertas custa uma
   * montagem só.
   *
   * Continua **broadcast-only**: nada entra por aqui, a service chama depois de persistir.
   */
  async emitirEncontroAlterado(
    campanhaId: number,
    montarParaUsuario: (usuario: JwtPayload) => Promise<EncontroAlteradoDto['encontro']>,
  ): Promise<void> {
    const sockets = await this.servidor.in(this.salaCampanha(campanhaId)).fetchSockets();
    const porUsuario = new Map<number, EncontroAlteradoDto['encontro']>();
    for (const socket of sockets) {
      const usuario = (socket.data as { usuario?: JwtPayload }).usuario;
      if (!usuario) {
        continue;
      }
      let encontro = porUsuario.get(usuario.sub);
      if (!encontro) {
        try {
          encontro = await montarParaUsuario(usuario);
        } catch {
          // Socket de quem perdeu o vínculo com a campanha entre o `join` e a emissão: não recebe
          // o evento, e o resto da sala não é penalizado por isso.
          continue;
        }
        porUsuario.set(usuario.sub, encontro);
      }
      socket.emit('encontro:alterado', { encontro } satisfies EncontroAlteradoDto);
    }
  }

  /**
   * Emite `encontro:iniciativa-pedido` na sala `campanha:<id>` (m7-04) — o mestre chamando os
   * jogadores a rolar a própria iniciativa. É só o **chamado**: a rolagem em si entra pelo fluxo
   * REST de rolagem, como qualquer outra (§9, broadcast-only).
   */
  emitirEncontroIniciativaPedido(
    evento: EncontroIniciativaPedidoDto & { campanhaId: number },
  ): void {
    this.servidor
      .to(this.salaCampanha(evento.campanhaId))
      .emit('encontro:iniciativa-pedido', evento);
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
