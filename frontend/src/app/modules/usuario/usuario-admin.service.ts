import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  UsuarioAdministrativoCriarDto,
  UsuarioCriadoDto,
  UsuarioExcluirDto,
  UsuarioListadosDto,
  UsuarioListarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioPerfilAlterarDto,
  UsuarioReativadoDto,
  UsuarioReativarDto,
  UsuarioSenhaResetadaDto,
  UsuarioSenhaResetarDto,
  UsuarioTipoAlteradoDto,
  UsuarioTipoAlterarDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { environment } from '../../../environments/environment';

/** Cliente HTTP exclusivo das operações administrativas de contas. */
@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly httpClient = inject(HttpClient);
  private readonly base = `${environment.apiBase}/usuario/admin`;

  listarUsuarios(dto: UsuarioListarDto): Observable<UsuarioListadosDto> {
    let params = new HttpParams()
      .set('pagina', dto.pagina)
      .set('itensPorPagina', dto.itensPorPagina)
      .set('ordenarPor', dto.ordenarPor)
      .set('direcao', dto.direcao);
    if (dto.allRows !== undefined) params = params.set('allRows', dto.allRows);
    if (dto.login) params = params.set('login', dto.login);
    if (dto.nome) params = params.set('nome', dto.nome);
    if (dto.busca) params = params.set('busca', dto.busca);
    if (dto.tipo) params = params.set('tipo', dto.tipo);
    if (dto.apenasExcluidos !== undefined) {
      params = params.set('apenasExcluidos', dto.apenasExcluidos);
    }
    if (dto.situacao) params = params.set('situacao', dto.situacao);
    return this.httpClient
      .get<StandardResponse<UsuarioListadosDto>>(this.base, { params })
      .pipe(map((resposta) => resposta.dados as UsuarioListadosDto));
  }

  criarUsuario(dto: UsuarioAdministrativoCriarDto): Observable<UsuarioCriadoDto> {
    return this.httpClient
      .post<StandardResponse<UsuarioCriadoDto>>(this.base, dto)
      .pipe(map((resposta) => resposta.dados as UsuarioCriadoDto));
  }

  alterarUsuario(
    dto: UsuarioPerfilAlterarDto & { readonly id: number },
  ): Observable<UsuarioPerfilAlteradoDto> {
    const { id, login, nome } = dto;
    return this.httpClient
      .patch<StandardResponse<UsuarioPerfilAlteradoDto>>(`${this.base}/${id}`, { login, nome })
      .pipe(map((resposta) => resposta.dados as UsuarioPerfilAlteradoDto));
  }

  resetarSenha(dto: UsuarioSenhaResetarDto): Observable<UsuarioSenhaResetadaDto> {
    return this.httpClient
      .patch<StandardResponse<UsuarioSenhaResetadaDto>>(`${this.base}/${dto.id}/senha`, {
        novaSenha: dto.novaSenha,
      })
      .pipe(map((resposta) => resposta.dados as UsuarioSenhaResetadaDto));
  }

  alterarTipo(dto: UsuarioTipoAlterarDto): Observable<UsuarioTipoAlteradoDto> {
    return this.httpClient
      .patch<StandardResponse<UsuarioTipoAlteradoDto>>(`${this.base}/${dto.id}/tipo`, {
        tipo: dto.tipo,
      })
      .pipe(map((resposta) => resposta.dados as UsuarioTipoAlteradoDto));
  }

  excluirUsuario(dto: UsuarioExcluirDto): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(`${this.base}/${dto.id}`)
      .pipe(map(() => undefined));
  }

  reativarUsuario(dto: UsuarioReativarDto): Observable<UsuarioReativadoDto> {
    return this.httpClient
      .patch<StandardResponse<UsuarioReativadoDto>>(`${this.base}/${dto.id}/reativar`, {})
      .pipe(map((resposta) => resposta.dados as UsuarioReativadoDto));
  }
}
