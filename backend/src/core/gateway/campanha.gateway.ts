import { forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  CampanhaEstadoAlteradaDto,
  CampanhaAcessoAlteradoDto,
  CampanhaInventarioAlteradoDto,
  CampanhaMembroEntradaDto,
  CampanhaMembroInternoRecuperadoDto,
  CampanhaMembroPapelAlteradoDto,
  CampanhaRecuperarDto,
  CampanhaSalaSairDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { CenaAlteradaDto, CenaDocumentoAlteradoDto } from '@contratados-rpg/shared/dtos/cena';
import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoLeitoresDto,
  DocumentoLeituraInformarDto,
} from '@contratados-rpg/shared/dtos/documento';
import {
  CenaStatusEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaCampanhaRecortesAlteradosDto,
  FichaCriadaDto,
  FichaRecuperarDto,
  FichaSalaSairDto,
  FichaResumoDto,
  FichaCampanhaRemovidaDto,
  FichaVisibilidadeAlteradaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type {
  EncontroAlteradoDto,
  EncontroIniciativaPedidoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemExcluidaDto, RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import type {
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoEsquadraoPresencaDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import { CampanhaService } from '../../modules/campanha/campanha.service';
import { DocumentoLeituraService } from '../../modules/documento/documento-leitura.service';
import { DocumentoService } from '../../modules/documento/documento.service';
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
 * o evento **após** salvar. O gateway só faz quatro coisas:
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
 * 4. **Retransmissão de presença efêmera** do Caderno do Esquadrão
 *    (`caderno-esquadrao:presenca`, P-039) — o único caminho em que o próprio cliente dispara o
 *    encaminhamento em vez de uma service; não é mutação (nada é persistido) e continua exigindo a
 *    mesma permissão de sala do item 2, ver `retransmitirPresencaEsquadrao`.
 * 5. **Presença de leitura da Biblioteca** (`documento:leitura`, m9-09) — também efêmera e sem
 *    persistência, mas **não** retransmitida: o gateway só delega à `DocumentoService` (permissão)
 *    e à `DocumentoLeituraService` (estado em memória e retrato), que devolve o retrato só à sala
 *    do mestre. Ver `informarLeituraDocumento`.
 *
 * A origem do Socket.IO é travada em `APP_FRONTEND_ORIGEM` pelo `WsIoAdapter` (§10.6).
 */
@WebSocketGateway()
export class CampanhaGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
    @Inject(forwardRef(() => DocumentoService))
    private readonly documentoService: DocumentoService,
    @Inject(forwardRef(() => DocumentoLeituraService))
    private readonly documentoLeituraService: DocumentoLeituraService,
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
   * Socket caiu (aba fechada, rede, deploy): a presença de leitura dele sai do retrato sem depender
   * do cliente avisar (m9-09) — senão ficaria "lendo" para sempre.
   */
  handleDisconnect(cliente: Socket): void {
    this.documentoLeituraService.removerLeituraConexao({ conexaoId: cliente.id, campanhaId: null });
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

  /** Abandona a sala de ficha pedida; não é mutação de domínio e não consulta services. */
  @SubscribeMessage('ficha:sair')
  async sairSalaFicha(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() dto: FichaSalaSairDto,
  ): Promise<void> {
    await cliente.leave(this.salaFicha(dto.id));
  }

  /**
   * Entra na sala `campanha:<id>` — só **membros** (§14), consultando
   * `CampanhaService.validarAcessoSalaCampanha` (que valida o vínculo do usuário na campanha,
   * **qualquer papel**). **m8-02**: um `ESPECTADOR` entra numa sala própria
   * (`campanha:<id>:espectador`), não na sala cheia de mestre/jogador — assim ele só recebe os
   * eventos que o gateway explicitamente encaminha às duas salas (`rolagem:registrada` pública),
   * nunca `ficha:criada`, `campanha:inventario-alterado`, `caderno-esquadrao:*` ou qualquer outro
   * broadcast de conteúdo de jogo que a sala cheia recebe. Sem permissão (a service lança), a
   * entrada é negada e nenhuma sala é ingressada.
   *
   * **Rolagem `PRIVADA` (m3-27, correção)**: quem entra como `MESTRE` também ingressa em
   * `campanha:<id>:mestre` — a terceira sala de papel, ao lado da sala cheia e da do espectador.
   * É a única sala que recebe rolagens `PRIVADA` (`emitirRolagemRegistrada`); jogador e espectador
   * nunca a ingressam, então uma rolagem privada de outro jogador nunca chega ao socket dele.
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

    let membroEncontrado: CampanhaMembroInternoRecuperadoDto;
    try {
      membroEncontrado = await this.campanhaService.validarAcessoSalaCampanha({ id: dto.id }, usuario);
    } catch {
      return { sucesso: false };
    }

    const sala =
      membroEncontrado.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR
        ? this.salaCampanhaEspectador(dto.id)
        : this.salaCampanha(dto.id);
    await cliente.join(sala);
    if (membroEncontrado.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      await cliente.join(this.salaCampanhaMestre(dto.id));
    }
    return { sucesso: true };
  }

  /**
   * Abandona todas as variantes de sala que uma campanha pode usar e limpa a presença de leitura
   * deste socket nessa campanha (m9-09); não consulta permissão.
   */
  @SubscribeMessage('campanha:sair')
  async sairSalaCampanha(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() dto: CampanhaSalaSairDto,
  ): Promise<void> {
    await Promise.all([
      cliente.leave(this.salaCampanha(dto.id)),
      cliente.leave(this.salaCampanhaMestre(dto.id)),
      cliente.leave(this.salaCampanhaEspectador(dto.id)),
    ]);
    this.documentoLeituraService.removerLeituraConexao({ conexaoId: cliente.id, campanhaId: dto.id });
  }

  /**
   * Presença de leitura da Biblioteca (m9-09): o cliente informa o documento que está lendo (ou
   * `null`). **Delegação pura** — a `DocumentoService` valida o vínculo com a campanha e se esse
   * usuário pode ler esse documento, e a `DocumentoLeituraService` guarda o estado e emite o retrato
   * (`documento:leitores`) só para `campanha:<id>:mestre`. Recusa (não-membro, payload inválido) é
   * silenciosa, como a da presença do Caderno.
   */
  @SubscribeMessage('documento:leitura')
  async informarLeituraDocumento(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() dto: DocumentoLeituraInformarDto,
  ): Promise<void> {
    const usuario = this.obterUsuario(cliente);
    if (!usuario) {
      return;
    }
    try {
      await this.documentoService.informarLeitura({ ...dto, conexaoId: cliente.id }, usuario);
    } catch {
      return;
    }
  }

  /**
   * Retransmite presença efêmera do Caderno do Esquadrão (P-039) — cursor, seleção e identidade
   * de `y-protocols/awareness`. **Não é a mutação que a proibição #25 veda**: nada é decodificado,
   * persistido ou indexado aqui, o payload só é encaminhado aos demais sockets da sala
   * `campanha:<id>` (broadcast puro, igual a qualquer outro `emitir*` deste gateway — a diferença
   * é só a origem do disparo, um cliente em vez de uma service).
   *
   * O caminho comum já encontra `cliente` na sala (ingressada por `campanha:entrar` ao abrir a
   * página). Mas os dois eventos trafegam no mesmo socket sem coordenação de ordem no cliente
   * (`TempoRealService.entrarSalaCampanha` não aguarda o `join`), então uma presença pode chegar
   * antes do `await cliente.join(...)` acima terminar; nesse caso a checagem de permissão
   * (`CampanhaService.validarAcessoSalaCampanha`, a mesma de `entrarSalaCampanha` — proibição
   * #28, sem duplicar regra) se refaz e o socket ingressa na sala certa (mesmo roteamento por
   * papel — m8-02), sem exigir uma segunda mensagem do cliente.
   */
  @SubscribeMessage('caderno-esquadrao:presenca')
  async retransmitirPresencaEsquadrao(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() evento: PaginaCadernoEsquadraoPresencaDto,
  ): Promise<void> {
    const usuario = this.obterUsuario(cliente);
    if (!usuario) {
      return;
    }
    const salaMembro = this.salaCampanha(evento.campanhaId);
    const salaEspectador = this.salaCampanhaEspectador(evento.campanhaId);
    let sala = cliente.rooms.has(salaMembro)
      ? salaMembro
      : cliente.rooms.has(salaEspectador)
        ? salaEspectador
        : null;
    if (!sala) {
      let membroEncontrado: CampanhaMembroInternoRecuperadoDto;
      try {
        membroEncontrado = await this.campanhaService.validarAcessoSalaCampanha(
          { id: evento.campanhaId },
          usuario,
        );
      } catch {
        return;
      }
      sala =
        membroEncontrado.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR ? salaEspectador : salaMembro;
      await cliente.join(sala);
    }
    cliente.to(sala).emit('caderno-esquadrao:presenca', evento);
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

  /** A service dona decide os recortes; o gateway só transporta o invalidador mínimo. */
  emitirFichaRecortesAlterados(evento: FichaCampanhaRecortesAlteradosDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('ficha:recortes-alterados', evento);
  }

  /**
   * Avisa a campanha que uma ficha saiu dela (`ficha:removida-da-campanha`) — o cliente refaz o GET
   * autorizado e a ficha some do Esquadrão. Payload só com os ids: vale para qualquer tipo de
   * ficha, sem carregar dado da ficha para a sala ampla.
   */
  emitirFichaRemovidaDaCampanha(evento: FichaCampanhaRemovidaDto): void {
    this.servidor
      .to(this.salaCampanha(evento.campanhaId))
      .emit('ficha:removida-da-campanha', evento);
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

  /**
   * Remove das fichas os sockets do usuário cujo acesso acabou de ser revogado pela service.
   * `RemoteSocket.leave` é síncrono (`void`) — só a busca dos sockets é assíncrona (P-077).
   */
  async expulsarUsuarioDaFicha(evento: FichaAcessoRevogadoDto): Promise<void> {
    const sockets = await this.servidor.in(this.salaFicha(evento.fichaId)).fetchSockets();
    for (const socket of sockets) {
      if ((socket.data as { usuario?: JwtPayload }).usuario?.sub !== evento.usuarioId) continue;
      socket.leave(this.salaFicha(evento.fichaId));
    }
  }

  /**
   * Aplica ao socket o papel já persistido pela service, sem reproduzir a autorização de domínio.
   * Sai de todas as salas de papel e entra só nas do papel novo (nenhuma quando `papel` é `null`).
   * A presença de leitura desse usuário na campanha é limpa (m9-09): o recorte do que ele pode ler
   * pode ter mudado, e o cliente volta ao retrato quando informar de novo.
   * Após recalibrar, avisa somente as conexões afetadas com `campanha:acesso-alterado`, inclusive
   * na revogação: sair da sala não invalida sozinho o conteúdo que o cliente já carregou.
   * `RemoteSocket.join`/`leave` são síncronos (`void`) — só `fetchSockets` é assíncrono (P-077).
   */
  async recalibrarSalasCampanhaUsuario(dto: {
    readonly campanhaId: number;
    readonly usuarioId: number;
    readonly papel: TipoCampanhaMembroPapelEnum | null;
  }): Promise<void> {
    const salas = [
      this.salaCampanha(dto.campanhaId),
      this.salaCampanhaMestre(dto.campanhaId),
      this.salaCampanhaEspectador(dto.campanhaId),
    ];
    const sockets = await this.servidor.in(salas).fetchSockets();
    for (const socket of sockets) {
      if ((socket.data as { usuario?: JwtPayload }).usuario?.sub !== dto.usuarioId) continue;
      salas.forEach((sala) => socket.leave(sala));
      if (dto.papel !== null) {
        socket.join(
          dto.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR
            ? this.salaCampanhaEspectador(dto.campanhaId)
            : this.salaCampanha(dto.campanhaId),
        );
        if (dto.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
          socket.join(this.salaCampanhaMestre(dto.campanhaId));
        }
      }
      const evento: CampanhaAcessoAlteradoDto = { campanhaId: dto.campanhaId };
      socket.emit("campanha:acesso-alterado", evento);
    }
    this.documentoLeituraService.removerLeituraUsuario({
      campanhaId: dto.campanhaId,
      usuarioId: dto.usuarioId,
    });
  }

  /** Propaga a criação já persistida de uma página colaborativa à campanha. */
  emitirPaginaEsquadraoCriada(pagina: PaginaCadernoResumoDto): void {
    this.servidor.to(this.salaCampanha(pagina.campanhaId)).emit('caderno-esquadrao:pagina-criada', pagina);
  }

  /** Propaga uma atualização CRDT já persistida; escrita nunca entra pelo gateway. */
  emitirPaginaEsquadraoAlterada(evento: PaginaCadernoEsquadraoAlteradaDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('caderno-esquadrao:alterado', evento);
  }

  /** Invalida a página removida para os membros que mantêm a lista aberta. */
  emitirPaginaEsquadraoExcluida(evento: { readonly campanhaId: number; readonly paginaId: number }): void {
    this.servidor
      .to(this.salaCampanha(evento.campanhaId))
      .emit('caderno-esquadrao:pagina-excluida', evento);
  }

  /**
   * Emite `rolagem:registrada` (m3-27; m3-27 correção). Chamado por `RolagemService.registrarRolagem`
   * e `registrarRolagemAvulso` após a rolagem ser persistida, com **qualquer visibilidade** — quem
   * recebe o evento depende da sala escolhida abaixo, nunca de um filtro dentro do `emit()` (o
   * `emit()` continua único pra sala inteira, sem distinguir socket por permissão).
   *
   * **`PUBLICA`, com campanha (m3-77/m8-02)**: emite em `campanha:<id>` e `campanha:<id>:espectador`
   * — quem tem a ficha aberta por lá já entra também nessa sala (`entrarSalaCampanha`,
   * `visualizar.page.ts`/`visualizar-criatura.page.ts`), então emitir de novo em `ficha:<id>`
   * entregaria o mesmo evento duas vezes a quem está nas duas salas ao mesmo tempo (ex.:
   * `campanha/detalhe`). **`PUBLICA`, ficha solta (m3-28)**: `campanhaId === null` não tem sala de
   * campanha — a ficha aberta em `/fichas/:id` só está em `ficha:<id>` (`entrarSalaFicha`, sempre
   * ingressada), então é essa sala que recebe o evento; sem `fichaId` (rolagem de combatente
   * avulso) não há sala nenhuma — no-op.
   *
   * **`PRIVADA` (correção)**: broadcastar para a sala cheia vazaria o conteúdo a jogadores que não
   * deveriam vê-la (§14 — só autor e mestre enxergam uma `PRIVADA`, `RolagemRepository.
   * listarPorCampanha`). O autor já a recebe pela resposta REST do próprio POST; falta o mestre, que
   * hoje só descobria no próximo refresh do feed. Em vez de filtrar por socket, emite só na sala
   * `campanha:<id>:mestre` (ingressada só por quem entrou como `MESTRE`, ver `entrarSalaCampanha`) —
   * jogador e espectador nunca a recebem. `campanhaId === null` (ficha solta) não tem essa sala:
   * uma `PRIVADA` avulsa não tem mestre de campanha para notificar — no-op, como antes.
   */
  emitirRolagemRegistrada(rolagem: RolagemResumoDto): void {
    if (rolagem.campanhaId === null) {
      if (rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA && rolagem.fichaId !== null) {
        this.servidor.to(this.salaFicha(rolagem.fichaId)).emit('rolagem:registrada', rolagem);
      }
      return;
    }
    if (rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA) {
      this.servidor
        .to([this.salaCampanha(rolagem.campanhaId), this.salaCampanhaEspectador(rolagem.campanhaId)])
        .emit('rolagem:registrada', rolagem);
      return;
    }
    this.servidor.to(this.salaCampanhaMestre(rolagem.campanhaId)).emit('rolagem:registrada', rolagem);
  }

  /**
   * Emite `rolagem:excluida` (soft delete por `ADMIN`) na mesma sala que `emitirRolagemRegistrada`
   * usaria para a rolagem: `PUBLICA` na sala cheia + espectador (ou `ficha:<id>` para ficha solta),
   * `PRIVADA` só na sala do mestre. Payload sem conteúdo (`RolagemExcluidaDto`), então nada privado
   * vaza. Broadcast-only: a service chama depois de persistir.
   */
  emitirRolagemExcluida(rolagem: RolagemExcluidaDto): void {
    if (rolagem.campanhaId === null) {
      if (rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA && rolagem.fichaId !== null) {
        this.servidor.to(this.salaFicha(rolagem.fichaId)).emit('rolagem:excluida', rolagem);
      }
      return;
    }
    if (rolagem.visibilidade === RolagemVisibilidadeEnum.PUBLICA) {
      this.servidor
        .to([this.salaCampanha(rolagem.campanhaId), this.salaCampanhaEspectador(rolagem.campanhaId)])
        .emit('rolagem:excluida', rolagem);
      return;
    }
    this.servidor.to(this.salaCampanhaMestre(rolagem.campanhaId)).emit('rolagem:excluida', rolagem);
  }

  /**
   * Emite `campanha:membro-papel-alterado` na sala `campanha:<id>` (m8-02). Chamado por
   * `CampanhaService.alterarPapelMembro` após a mutação ser persistida — os membros conectados
   * (mestre/jogador) recarregam a lista de membros. Não alcança a sala do espectador: papel de
   * membro é dado de gestão, fora do recorte dele (decisão de produto #4).
   */
  emitirPapelMembroAlterado(evento: CampanhaMembroPapelAlteradoDto): void {
    this.servidor.to(this.salaCampanha(evento.campanhaId)).emit('campanha:membro-papel-alterado', evento);
  }

  /**
   * Emite `encontro:alterado` na sala `campanha:<id>` **e** na sala do espectador (m8-05), **um
   * payload por usuário** (m7-06).
   *
   * Diferente dos outros eventos, este não pode ser um `emit` único para a sala: o estado do
   * encontro carrega Vida, defesas e log de criaturas que o mestre talvez ainda não tenha revelado,
   * e a sala mistura mestre e jogadores. Então o gateway percorre os sockets, pergunta à
   * `EncontroService` (a dona da regra §14) qual é o recorte daquele usuário e emite socket a
   * socket. O resultado é memorizado por usuário — quem está com duas abas abertas custa uma
   * montagem só.
   *
   * `campanha:<id>:espectador` entra na varredura pelo mesmo motivo de `emitirRolagemRegistrada`
   * (m8-02): é a sala de quem entrou com o convite de espectador. O recorte por usuário acima já
   * cobre a segurança — depois do fix de `montarEstadoParaUsuario` para `ESPECTADOR` (m8-05), o
   * socket de um espectador real recebe o mesmo resultado (fichas visíveis vazio) que
   * `EncontroService.recuperarEncontroAtivoParaEspectador` já devolve pelo REST.
   *
   * Continua **broadcast-only**: nada entra por aqui, a service chama depois de persistir.
   */
  async emitirEncontroAlterado(
    campanhaId: number,
    montarParaUsuario: (usuario: JwtPayload) => Promise<EncontroAlteradoDto['encontro']>,
  ): Promise<void> {
    const sockets = await this.servidor
      .in([this.salaCampanha(campanhaId), this.salaCampanhaEspectador(campanhaId)])
      .fetchSockets();
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
          // Recorte recusado — quem perdeu o vínculo com a campanha entre o `join` e a emissão, ou
          // quem não é mestre diante do encontro de uma cena `PLANEJADA` (trava anti-vazamento,
          // m7-22): não recebe o evento, e o resto da sala não é penalizado por isso.
          continue;
        }
        porUsuario.set(usuario.sub, encontro);
      }
      socket.emit('encontro:alterado', { encontro } satisfies EncontroAlteradoDto);
    }
  }

  /**
   * Emite `cena:alterada` (m7-22) depois de uma mutação de cena já persistida. A sala depende do
   * status, pelo mesmo raciocínio de visibilidade de `emitirRolagemRegistrada`: cena `PLANEJADA` é
   * exclusiva do mestre (trava anti-vazamento, decisão #7 do milestone) e vai só para
   * `campanha:<id>:mestre`; `ATIVA`/`ENCERRADA` vão para a sala cheia e a do espectador, que tem a
   * mesma visão read-only do jogador (m8-05). O payload é o resumo — nada do encontro, que segue
   * pelo `encontro:alterado` com o recorte por usuário.
   */
  emitirCenaAlterada(evento: CenaAlteradaDto): void {
    const salas =
      evento.cena.status === CenaStatusEnum.PLANEJADA
        ? [this.salaCampanhaMestre(evento.campanhaId)]
        : [this.salaCampanha(evento.campanhaId), this.salaCampanhaEspectador(evento.campanhaId)];
    this.servidor.to(salas).emit('cena:alterada', evento);
  }

  /**
   * Emite `documento:alterado` (m9-02) depois de uma mutação da biblioteca já persistida. Trava
   * anti-vazamento no molde de `emitirCenaAlterada`: o que nunca foi visível à mesa — criar, alterar
   * ou remover um documento **oculto** — vai só para `campanha:<id>:mestre`; o que a mesa vê ou via
   * (revelar, ocultar, alterar ou remover um revelado, reordenar) vai para a sala cheia e a do
   * espectador, que lê o revelado como o jogador. Quem decide `visivelParaMesa` é a
   * `DocumentoService`; o payload nunca carrega título, conteúdo nem `imagemUrl`.
   */
  emitirDocumentoAlterado(evento: DocumentoBibliotecaAlteradaDto, visivelParaMesa: boolean): void {
    const salas = visivelParaMesa
      ? [this.salaCampanha(evento.campanhaId), this.salaCampanhaEspectador(evento.campanhaId)]
      : [this.salaCampanhaMestre(evento.campanhaId)];
    this.servidor.to(salas).emit('documento:alterado', evento);
  }

  /**
   * Emite `documento:leitores` (m9-09) — o retrato de quem está lendo cada documento — **só** em
   * `campanha:<id>:mestre`. Nunca na sala cheia nem na do espectador: mostraria a leitura de um
   * jogador aos outros. Chamado pela `DocumentoLeituraService` quando o retrato muda.
   */
  emitirDocumentoLeitores(retrato: DocumentoLeitoresDto): void {
    this.servidor.to(this.salaCampanhaMestre(retrato.campanhaId)).emit('documento:leitores', retrato);
  }

  /**
   * Entrega o retrato atual de presença direto a um socket do mestre que acabou de informar leitura
   * (m9-09) — quem abre a Biblioteca depois dos jogadores já vê quem está lendo. Só a
   * `DocumentoLeituraService` chama, e só para uma conexão de papel `MESTRE`.
   */
  emitirDocumentoLeitoresParaConexao(conexaoId: string, retrato: DocumentoLeitoresDto): void {
    this.servidor.to(conexaoId).emit('documento:leitores', retrato);
  }

  /**
   * Emite `cena:documento-alterado` (m7-25) depois de anexar, remover, reordenar ou apresentar um
   * documento da coluna Documentos — dataless como `campanha:inventario-alterado`: só avisa que a
   * lista mudou, sem `alteracao` nem o item. Vai à sala cheia, à do espectador e à do mestre — quem
   * recebe refaz o `GET` já no próprio recorte (o mestre vê tudo; jogador/espectador, só o
   * revelado). "Focar" no palco do mestre não passa por aqui (não emite, ver `CenaDocumentoService`).
   */
  emitirCenaDocumentoAlterado(evento: CenaDocumentoAlteradoDto): void {
    this.servidor
      .to([
        this.salaCampanha(evento.campanhaId),
        this.salaCampanhaEspectador(evento.campanhaId),
        this.salaCampanhaMestre(evento.campanhaId),
      ])
      .emit('cena:documento-alterado', evento);
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

  /**
   * Sala separada do espectador (m8-02) — nunca a mesma de mestre/jogador. Só recebe o que os
   * métodos `emitir*` explicitamente encaminharem às duas salas (hoje, só `rolagem:registrada`
   * pública); qualquer outro broadcast de conteúdo de jogo (`ficha:*`,
   * `campanha:inventario-alterado`, `caderno-esquadrao:*`, `campanha:membro-papel-alterado`) fica
   * de fora por construção — não depende de filtrar por permissão dentro de cada `emit()`.
   */
  private salaCampanhaEspectador(campanhaId: number): string {
    return `campanha:${campanhaId}:espectador`;
  }

  /**
   * Sala própria do mestre (m3-27, correção) — ingressada só por quem entra em `campanha:entrar`
   * com papel `MESTRE`, além da sala cheia. Recebe o que é exclusivo do mestre: `rolagem:registrada`
   * `PRIVADA`, cena `PLANEJADA`, documento oculto e o retrato `documento:leitores` (m9-09).
   */
  private salaCampanhaMestre(campanhaId: number): string {
    return `campanha:${campanhaId}:mestre`;
  }
}
