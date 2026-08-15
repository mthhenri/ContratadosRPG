import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaAlterarDto,
  FichaCampanhaAtribuidaDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaCriaturaAlteradaDto,
  FichaCriaturaAlterarDto,
  FichaCriaturaCriadaDto,
  FichaCriaturaCriarDto,
  FichaCriaturaRecuperadaDto,
  FichaImagemAlteradaDto,
  FichaRecuperadaDto,
  FichaResumoDto,
  FichaVitalidadeAlterarDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `ficha` (m3-06) — consome os endpoints protegidos do CRUD de ficha
 * (m3-03), com o JWT injetado pelo `auth-token.interceptor`. Só transporte: extrai o `dados` do
 * `StandardResponse`, sem regra de negócio (a autoridade — permissões §14 e validação via
 * `shared/regras` — é do backend). Os DTOs vêm do shared (`./dtos/ficha`) — nunca redefinidos no
 * front. Em dev `apiBase` é vazio e a chamada relativa passa pelo proxy até
 * `http://localhost:3100`; em produção aponta ao Render.
 *
 * Escopo m3-06: criação, recuperação e alteração da própria ficha (a tela de criação/edição).
 * m3-07 acrescenta a listagem de fichas da campanha, a visualização por terceiros e a UI de
 * concessão/revogação de acesso (m3-04) — cada método só transporta; o recorte visível e a
 * permissão continuam sendo arbitrados pelo backend (§14).
 */
@Injectable({ providedIn: 'root' })
export class FichaService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/ficha`;

  /**
   * Cria a ficha de jogador do usuário autenticado na campanha informada. O documento de jogo
   * (`dados`) é validado contra `shared/regras` no backend antes de persistir (§11 camada 2).
   */
  criarFicha(dto: FichaCriarDto): Observable<FichaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaCriadaDto>>(this.base, dto)
      .pipe(map((resposta) => resposta.dados as FichaCriadaDto));
  }

  /**
   * Cria a ficha de criatura (Ameaça) — só o mestre da campanha (§14; barrado com 403 no
   * backend, `m4-03`). Sempre dentro de campanha, sem "avulsa" — `campanhaId` é obrigatório no
   * DTO. Contrato de operação próprio (`FichaCriaturaCriarDto`/`*CriadaDto`), não união com o
   * de jogador (`m4-01`/`m4-03`: "dois contratos, não um").
   */
  criarFichaCriatura(dto: FichaCriaturaCriarDto): Observable<FichaCriaturaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaCriaturaCriadaDto>>(`${this.base}/criatura`, dto)
      .pipe(map((resposta) => resposta.dados as FichaCriaturaCriadaDto));
  }

  /** Recupera uma ficha de criatura pelo `id` (mesma permissão de visualização — §14, m4-03). */
  recuperarFichaCriatura(id: number): Observable<FichaCriaturaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<FichaCriaturaRecuperadaDto>>(`${this.base}/criatura/${id}`)
      .pipe(map((resposta) => resposta.dados as FichaCriaturaRecuperadaDto));
  }

  /** Altera `nome` e o documento de jogo de uma ficha de criatura (só dono/mestre — §14, m4-03). */
  alterarFichaCriatura(id: number, dto: FichaCriaturaAlterarDto): Observable<FichaCriaturaAlteradaDto> {
    return this.httpClient
      .put<StandardResponse<FichaCriaturaAlteradaDto>>(`${this.base}/criatura/${id}`, dto)
      .pipe(map((resposta) => resposta.dados as FichaCriaturaAlteradaDto));
  }

  /**
   * Lista as fichas de uma campanha visíveis ao usuário autenticado. O recorte (dono vê a própria,
   * mestre vê todas, outro membro só as concedidas) é filtrado pelo backend (§14) — o front só
   * apresenta, sem duplicar regra.
   */
  listarFichas(campanhaId: number): Observable<FichaResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<FichaResumoDto[]>>(this.base, { params: { campanhaId } })
      .pipe(map((resposta) => resposta.dados as FichaResumoDto[]));
  }

  /**
   * Lista **todas** as fichas ativas do usuário autenticado — com e sem campanha (m3-28, o
   * acervo `/fichas`). Cada item traz `campanhaId`/`campanhaNome` para o chip da campanha (ou
   * "Sem campanha" quando `null`).
   */
  listarMinhasFichas(): Observable<FichaResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<FichaResumoDto[]>>(`${this.base}/minhas`)
      .pipe(map((resposta) => resposta.dados as FichaResumoDto[]));
  }

  /** Recupera uma ficha pelo `id` (exige permissão de visualização — §14; barrado com 403 no back). */
  recuperarFicha(id: number): Observable<FichaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<FichaRecuperadaDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as FichaRecuperadaDto));
  }

  /**
   * Altera `nome` e o documento de jogo de uma ficha (só o dono ou o mestre — o backend barra os
   * demais com 403). O `dados` é revalidado contra `shared/regras` no backend antes de persistir.
   */
  alterarFicha(id: number, dto: FichaAlterarDto): Observable<FichaAlteradaDto> {
    return this.httpClient
      .put<StandardResponse<FichaAlteradaDto>>(`${this.base}/${id}`, dto)
      .pipe(map((resposta) => resposta.dados as FichaAlteradaDto));
  }

  /** Altera somente Vida/Energia atual; usada pelos controles rapidos dos cards da campanha. */
  alterarVitalidade(id: number, dto: FichaVitalidadeAlterarDto): Observable<FichaAlteradaDto> {
    return this.httpClient
      .patch<StandardResponse<FichaAlteradaDto>>(`${this.base}/${id}/vitalidade`, dto)
      .pipe(map((resposta) => resposta.dados as FichaAlteradaDto));
  }

  /** Troca o avatar da ficha sem passar pela alteracao completa. */
  alterarImagem(id: number, arquivo: File): Observable<FichaImagemAlteradaDto> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return this.httpClient
      .post<StandardResponse<FichaImagemAlteradaDto>>(`${this.base}/${id}/imagem`, formData)
      .pipe(map((resposta) => resposta.dados as FichaImagemAlteradaDto));
  }

  /** Remove o avatar da ficha (m3-62) — exclui o arquivo do armazenamento e limpa `imagemUrl`. */
  excluirImagem(id: number): Observable<FichaImagemAlteradaDto> {
    return this.httpClient
      .delete<StandardResponse<FichaImagemAlteradaDto>>(`${this.base}/${id}/imagem`)
      .pipe(map((resposta) => resposta.dados as FichaImagemAlteradaDto));
  }

  /**
   * Lista as concessões de visualização ativas de uma ficha (membro + `nome`). Só o dono ou o
   * mestre listam (§14) — o backend barra os demais com 403. Base da UI de gestão de acesso (m3-04).
   */
  listarAcessos(fichaId: number): Observable<FichaAcessoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<FichaAcessoResumoDto[]>>(`${this.base}/${fichaId}/acesso`)
      .pipe(map((resposta) => resposta.dados as FichaAcessoResumoDto[]));
  }

  /**
   * Concede a visualização de uma ficha a outro membro da campanha (só o dono ou o mestre — §14).
   * Idempotente no backend (uma concessão ativa por par ficha/usuário). O `fichaId` vai na rota; o
   * `usuarioId` (membro alvo) no corpo.
   */
  concederAcesso(fichaId: number, usuarioId: number): Observable<FichaAcessoConcedidoDto> {
    return this.httpClient
      .post<StandardResponse<FichaAcessoConcedidoDto>>(`${this.base}/${fichaId}/acesso`, { usuarioId })
      .pipe(map((resposta) => resposta.dados as FichaAcessoConcedidoDto));
  }

  /**
   * Revoga a visualização de uma ficha de um membro — soft delete no backend (só o dono ou o
   * mestre — §14). Após revogar, o membro deixa de ver a ficha (some da listagem/recuperação dele).
   */
  revogarAcesso(fichaId: number, usuarioId: number): Observable<FichaAcessoRevogadoDto> {
    return this.httpClient
      .delete<StandardResponse<FichaAcessoRevogadoDto>>(`${this.base}/${fichaId}/acesso/${usuarioId}`)
      .pipe(map((resposta) => resposta.dados as FichaAcessoRevogadoDto));
  }

  /** Exclui (soft delete) a ficha — só o dono ou o mestre (§14; barrado com 403 no backend, m3-52). */
  excluirFicha(id: number): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  /**
   * Duplica a ficha (m3-52): cria um clone com nome "(cópia)", dono = quem duplicou, sem herdar
   * acessos de visualização. Só o dono ou o mestre da ficha original podem duplicar (§14).
   */
  duplicarFicha(id: number): Observable<FichaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaCriadaDto>>(`${this.base}/${id}/duplicar`, {})
      .pipe(map((resposta) => resposta.dados as FichaCriadaDto));
  }

  /**
   * Move a ficha entre o acervo solto e uma campanha (m3-28) — `campanhaId: null` desatribui
   * (volta ao acervo). Só o dono ou o mestre atual da ficha (§14; barrado com 403 no backend).
   */
  atribuirCampanha(id: number, campanhaId: number | null): Observable<FichaCampanhaAtribuidaDto> {
    return this.httpClient
      .put<StandardResponse<FichaCampanhaAtribuidaDto>>(`${this.base}/${id}/campanha`, { campanhaId })
      .pipe(map((resposta) => resposta.dados as FichaCampanhaAtribuidaDto));
  }

  pegarItemInventario(
    fichaId: number,
    campanhaItemId: string,
    quantidade?: number,
  ): Observable<FichaRecuperadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaRecuperadaDto>>(`${this.base}/${fichaId}/inventario/item/pegar`, {
        campanhaItemId,
        ...(quantidade === undefined ? {} : { quantidade }),
      })
      .pipe(map((resposta) => resposta.dados as FichaRecuperadaDto));
  }

  mandarItemInventarioParaBase(
    fichaId: number,
    indice: number,
    quantidade?: number,
  ): Observable<FichaRecuperadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaRecuperadaDto>>(
        `${this.base}/${fichaId}/inventario/item/mandar-para-base`,
        { indice, ...(quantidade === undefined ? {} : { quantidade }) },
      )
      .pipe(map((resposta) => resposta.dados as FichaRecuperadaDto));
  }
}
