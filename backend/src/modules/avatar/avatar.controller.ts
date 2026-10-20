import { Controller, Get, Header, Param, ParseBoolPipe, ParseIntPipe, Query, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiQuery, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ActiveUser, AutenticacaoOpcional } from "../../core/decorators";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { AvatarService } from "./avatar.service";

@ApiTags('Avatares')
@ApiProduces('image/png', 'image/jpeg', 'image/webp')
@Controller('uploads')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get('fichas/:nomeArquivo')
  @ApiBearerAuth('jwt')
  @ApiQuery({ name: 'campanhaId', required: false, type: Number })
  @ApiQuery({ name: 'usuarioAlvoId', required: false, type: Number })
  @ApiQuery({ name: 'espectador', required: false, type: Boolean })
  @ApiUnauthorizedResponse({ description: 'JWT obrigatório.' })
  @ApiForbiddenResponse({ description: 'Avatar fora do recorte atual.' })
  @ApiNotFoundResponse({ description: 'Referência inativa ou imagem ausente.' })
  @ApiOkResponse({ description: 'Bytes após autorização vigente, sem envelope JSON ou cache.', schema: { type: 'string', format: 'binary' } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  @Header('X-Content-Type-Options', 'nosniff')
  recuperarFicha(
    @Param('nomeArquivo') nomeArquivo: string,
    @Query('campanhaId', new ParseIntPipe({ optional: true })) campanhaId: number | undefined,
    @Query('usuarioAlvoId', new ParseIntPipe({ optional: true })) usuarioAlvoId: number | undefined,
    @Query('espectador', new ParseBoolPipe({ optional: true })) espectador: boolean | undefined,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<StreamableFile> {
    return this.avatarService.recuperarAvatar({ caminho: `/uploads/fichas/${nomeArquivo}`, campanhaId, usuarioAlvoId, espectador }, usuarioAtivo);
  }

  @Get('agentes/*caminho')
  @AutenticacaoOpcional()
  @ApiOperation({ security: [{ jwt: [] }, {}] })
  @ApiQuery({ name: 'campanhaId', required: false, type: Number })
  @ApiQuery({ name: 'usuarioAlvoId', required: false, type: Number })
  @ApiQuery({ name: 'espectador', required: false, type: Boolean })
  @ApiUnauthorizedResponse({ description: 'Legado vinculado a ficha exige JWT.' })
  @ApiForbiddenResponse({ description: 'Avatar de ficha fora do recorte atual.' })
  @ApiNotFoundResponse({ description: 'Nenhuma ficha ou avulso ativo referencia a imagem.' })
  @ApiOkResponse({ description: 'Legado: ficha exige leitura autorizada; somente avulso ativo é público.', schema: { type: 'string', format: 'binary' } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  @Header('X-Content-Type-Options', 'nosniff')
  recuperarLegado(
    @Param('caminho') caminho: string[],
    @Query('campanhaId', new ParseIntPipe({ optional: true })) campanhaId: number | undefined,
    @Query('usuarioAlvoId', new ParseIntPipe({ optional: true })) usuarioAlvoId: number | undefined,
    @Query('espectador', new ParseBoolPipe({ optional: true })) espectador: boolean | undefined,
    @ActiveUser() usuarioAtivo?: JwtPayload,
  ): Promise<StreamableFile> {
    return this.avatarService.recuperarAvatar({ caminho: `/uploads/agentes/${caminho.join('/')}`, campanhaId, usuarioAlvoId, espectador }, usuarioAtivo);
  }
}
