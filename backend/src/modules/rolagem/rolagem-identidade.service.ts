import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  RolagemExcluidaDto,
  RolagemExclusaoIdentidadeRecortarDto,
  RolagemIdentidadeRecortarDto,
  RolagemResumoDto,
} from '@contratados-rpg/shared/dtos/rolagem';
import { FichaService } from '../ficha/ficha.service';

/** Aplica o árbitro de ficha sem alterar o histórico persistido nem textos autorais. */
@Injectable()
export class RolagemIdentidadeService {
  constructor(
    @Inject(forwardRef(() => FichaService))
    private readonly fichaService: FichaService,
  ) {}

  async recortarRolagens(dto: RolagemIdentidadeRecortarDto): Promise<RolagemResumoDto[]> {
    const porFicha = new Map<number, Promise<boolean>>();
    return Promise.all(dto.rolagens.map(async rolagem => {
      if (rolagem.fichaId === null) return rolagem;
      let reservada = porFicha.get(rolagem.fichaId);
      if (!reservada) {
        reservada = this.fichaService.avaliarIdentidadeRolagem({ fichaId: rolagem.fichaId, usuarioId: dto.usuarioId });
        porFicha.set(rolagem.fichaId, reservada);
      }
      if (!await reservada) return rolagem;
      return { ...rolagem, fichaId: null, encontroCombatenteId: null,
        nomeFicha: null, corFicha: null, identidadeReservada: true };
    }));
  }

  async recortarExclusao(dto: RolagemExclusaoIdentidadeRecortarDto): Promise<RolagemExcluidaDto> {
    const { rolagem, usuarioId } = dto;
    if (rolagem.fichaId === null) return rolagem;
    const reservada = await this.fichaService.avaliarIdentidadeRolagem({ fichaId: rolagem.fichaId, usuarioId });
    return reservada ? { ...rolagem, fichaId: null } : rolagem;
  }
}
