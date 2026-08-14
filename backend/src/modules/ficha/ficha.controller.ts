import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  FichaAcessoConcederDto,
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaAlterarDto,
  FichaCampanhaAtribuidaDto,
  FichaCampanhaAtribuirDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaImagemAlteradaDto,
  FichaInventarioItemMandarParaBaseDto,
  FichaInventarioItemPegarDto,
  FichaRecuperadaDto,
  FichaResumoDto,
  FichaVitalidadeAlterarDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { FichaService } from './ficha.service';

/**
 * Endpoints da ficha de jogador (SYSTEM.SPEC §13). Rotas **protegidas** (sem `@Public()`): o
 * `JwtAuthGuard` global exige o JWT e o `@ActiveUser()` injeta o payload. Controller burra: só
 * expõe a rota e repassa à service (proibição #2), montando o DTO com o `id`/`campanhaId` do
 * `@Param`/`@Query` (microinteligência sancionada — §7.1). Permissões e validação vivem na service.
 */
@Controller('ficha')
export class FichaController {
  constructor(private readonly fichaService: FichaService) {}

  @Post()
  criar(
    @Body() dto: FichaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaCriadaDto> {
    return this.fichaService.criarFicha(dto, usuarioAtivo);
  }

  @Get()
  listar(
    @Query('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaResumoDto[]> {
    return this.fichaService.listarFichas({ campanhaId }, usuarioAtivo);
  }

  /** O acervo (m3-28) — todas as fichas do autenticado, com e sem campanha. */
  @Get('minhas')
  minhas(@ActiveUser() usuarioAtivo: JwtPayload): Promise<FichaResumoDto[]> {
    return this.fichaService.listarAcervo({ usuarioId: usuarioAtivo.sub });
  }

  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.recuperarFicha({ id }, usuarioAtivo);
  }

  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAlteradaDto> {
    return this.fichaService.alterarFicha({ ...dto, id }, usuarioAtivo);
  }

  /** Altera exclusivamente Vida/Energia atual; a service autoriza e restringe o recorte. */
  @Patch(':id/vitalidade')
  alterarVitalidade(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaVitalidadeAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAlteradaDto> {
    return this.fichaService.alterarVitalidade({ id, estado: dto }, usuarioAtivo);
  }

  /**
   * Troca o avatar da ficha (m3-62) — multipart, por isso um endpoint dedicado fora do
   * `PUT /ficha/:id` genérico. `arquivo` chega em memória (`FileInterceptor`, sem `dest` —
   * `Express.Multer.File.buffer`); a controller só monta o DTO com o `id`/conteúdo bruto do
   * upload (microinteligência sancionada — §7.1). Validação de MIME/tamanho e permissão vivem
   * na service.
   */
  @Post(':id/imagem')
  @UseInterceptors(FileInterceptor('arquivo'))
  alterarImagem(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() arquivo: Express.Multer.File,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaImagemAlteradaDto> {
    return this.fichaService.alterarImagem(
      {
        id,
        arquivo: { conteudo: arquivo.buffer, mimetype: arquivo.mimetype, tamanho: arquivo.size },
      },
      usuarioAtivo,
    );
  }

  /** Remove o avatar da ficha (m3-62) — exclui o arquivo do armazenamento e limpa `imagemUrl`. */
  @Delete(':id/imagem')
  excluirImagem(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaImagemAlteradaDto> {
    return this.fichaService.excluirImagem({ id }, usuarioAtivo);
  }

  @Delete(':id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.fichaService.excluirFicha({ id }, usuarioAtivo);
  }

  @Post(':id/duplicar')
  duplicar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaCriadaDto> {
    return this.fichaService.duplicarFicha({ id }, usuarioAtivo);
  }

  /** Move a ficha entre o acervo solto e uma campanha (m3-28) — `campanhaId: null` desatribui. */
  @Put(':id/campanha')
  atribuirCampanha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaCampanhaAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaCampanhaAtribuidaDto> {
    return this.fichaService.atribuirCampanha({ ...dto, id }, usuarioAtivo);
  }

  @Post(':id/inventario/item/pegar')
  pegarItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<FichaInventarioItemPegarDto, 'fichaId'>,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.pegarItemInventario({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Post(':id/inventario/item/mandar-para-base')
  mandarItemInventarioParaBase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<FichaInventarioItemMandarParaBaseDto, 'fichaId'>,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.mandarItemInventarioParaBase({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Get(':id/acesso')
  listarAcessos(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoResumoDto[]> {
    return this.fichaService.listarAcessos({ fichaId: id }, usuarioAtivo);
  }

  @Post(':id/acesso')
  concederAcesso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaAcessoConcederDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoConcedidoDto> {
    return this.fichaService.concederAcesso({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Delete(':id/acesso/:usuarioId')
  revogarAcesso(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoRevogadoDto> {
    return this.fichaService.revogarAcesso({ fichaId: id, usuarioId }, usuarioAtivo);
  }
}
