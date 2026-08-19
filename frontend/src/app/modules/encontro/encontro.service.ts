import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  EncontroCombatenteAdicionarDto,
  EncontroCombatenteCondicaoAtribuirDto,
  EncontroCombatenteCondicaoRemoverDto,
  EncontroCombatenteEnergiaAjustarDto,
  EncontroCombatenteIniciativaAtribuirDto,
  EncontroCombatenteVidaAjustarDto,
  EncontroCriadoDto,
  EncontroCriarDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `encontro` (m7-05) — consome os endpoints da m7-03/m7-04. Só transporte:
 * extrai o `dados` do `StandardResponse` e nada mais (a autoridade é o backend, §14). Quase toda
 * mutação devolve o **estado completo** (`EncontroRecuperadoDto`), então a tela troca o estado
 * inteiro em vez de aplicar delta — o mesmo payload que chega pelo broadcast `encontro:alterado`.
 *
 * As rotas não têm prefixo comum: criar/listar vivem sob `campanha/:id/encontro`, o resto sob
 * `encontro/...` (espelha `EncontroController`).
 */
@Injectable({ providedIn: 'root' })
export class EncontroService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/encontro`;

  private baseCampanha(campanhaId: number): string {
    return `${environment.apiBase}/campanha/${campanhaId}/encontro`;
  }

  /** Cria um encontro em `MONTAGEM` na campanha (só mestre — o backend barra o jogador com 403). */
  criarEncontro(campanhaId: number, dto: EncontroCriarDto): Observable<EncontroCriadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroCriadoDto>>(this.baseCampanha(campanhaId), dto)
      .pipe(map((resposta) => resposta.dados as EncontroCriadoDto));
  }

  /** Lista os encontros da campanha (o corrente + o histórico encerrado). */
  listarPorCampanha(campanhaId: number): Observable<EncontroResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<EncontroResumoDto[]>>(this.baseCampanha(campanhaId))
      .pipe(map((resposta) => resposta.dados as EncontroResumoDto[]));
  }

  /** Recupera o estado completo de um encontro — o que a tela "Iniciativa" desenha. */
  recuperarEncontro(id: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .get<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Adiciona um combatente (ficha da campanha ou avulso digitado) ao encontro em montagem. */
  adicionarCombatente(
    encontroId: number,
    dto: EncontroCombatenteAdicionarDto,
  ): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/combatente`, dto)
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Remove um combatente do encontro (soft delete no backend). */
  removerCombatente(combatenteId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .delete<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/combatente/${combatenteId}`)
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Atribui/corrige a iniciativa de um combatente (rolagem do jogador ou override do mestre). */
  atribuirIniciativa(
    dto: EncontroCombatenteIniciativaAtribuirDto,
  ): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .put<StandardResponse<EncontroRecuperadoDto>>(
        `${this.base}/combatente/${dto.id}/iniciativa`,
        { iniciativa: dto.iniciativa },
      )
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /**
   * `Rolar tudo` — preenche de uma vez a iniciativa de quem ainda não tem. O backend **ignora**
   * quem já tem valor, então uma iniciativa rolada pelo jogador nunca é sobrescrita.
   */
  rolarIniciativasFaltantes(
    encontroId: number,
    iniciativaPorCombatente: Readonly<Record<number, number>>,
  ): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .put<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/iniciativa`, {
        iniciativaPorCombatente,
      })
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Pede aos jogadores que rolem a própria iniciativa — só dispara o broadcast, não muda estado. */
  pedirIniciativa(encontroId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(
        `${this.base}/${encontroId}/iniciativa/pedido`,
        {},
      )
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Inicia o combate (`MONTAGEM` → `ATIVO`) — exige todo mundo com iniciativa definida. */
  iniciarEncontro(encontroId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/iniciar`, {})
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Encerra o combate (`ATIVO` → `ENCERRADO`) — depois disso o encontro é imutável. */
  encerrarEncontro(encontroId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/encerrar`, {})
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Avança para o próximo turno — vira a rodada sozinho ao passar do último slot. */
  avancarTurno(encontroId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/turno/avancar`, {})
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Volta ao turno anterior — nunca antes do 1º turno da rodada 1. */
  voltarTurno(encontroId: number): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/${encontroId}/turno/voltar`, {})
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Ajusta a Vida de um combatente por `delta` (negativo = dano, positivo = cura). */
  ajustarVida(dto: EncontroCombatenteVidaAjustarDto): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .put<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/combatente/${dto.id}/vida`, {
        delta: dto.delta,
        origemTexto: dto.origemTexto,
      })
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Ajusta a Energia de um combatente — recusado pelo backend para criatura e avulso. */
  ajustarEnergia(dto: EncontroCombatenteEnergiaAjustarDto): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .put<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/combatente/${dto.id}/energia`, {
        delta: dto.delta,
        origemTexto: dto.origemTexto,
      })
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Aplica uma condição a um combatente (`rodadasRestantes: null` = permanente). */
  aplicarCondicao(
    dto: EncontroCombatenteCondicaoAtribuirDto,
  ): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .post<StandardResponse<EncontroRecuperadoDto>>(`${this.base}/combatente/${dto.id}/condicao`, {
        nome: dto.nome,
        rodadasRestantes: dto.rodadasRestantes,
        perdeTurno: dto.perdeTurno,
      })
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }

  /** Remove manualmente uma condição, antes de ela expirar sozinha. */
  removerCondicao(dto: EncontroCombatenteCondicaoRemoverDto): Observable<EncontroRecuperadoDto> {
    return this.httpClient
      .delete<StandardResponse<EncontroRecuperadoDto>>(
        `${this.base}/combatente/${dto.id}/condicao`,
        { body: { nome: dto.nome } },
      )
      .pipe(map((resposta) => resposta.dados as EncontroRecuperadoDto));
  }
}
