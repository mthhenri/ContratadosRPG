import type { CampanhaMembroInternoRecuperarDto } from "@contratados-rpg/shared/dtos/campanha";
import { ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { CampanhaService } from "../campanha/campanha.service";

/**
 * Exige o Mestre ATUAL de uma campanha ativa. Qualquer recusa (não-membro, ex-Mestre, outro papel,
 * campanha excluída) vira o mesmo "não encontrado", sem revelar se o recurso existe.
 */
export async function exigirMestreAtual(
    campanhaService: CampanhaService,
    campanhaRepositorio: CampanhaRepository,
    dto: CampanhaMembroInternoRecuperarDto,
): Promise<void> {
    try {
        const membro = await campanhaService.validarMembro(dto);
        if (!campanhaService.ehMestre(membro.papel)) throw new ResourceNotFoundException("Transcrição");
    } catch (erro) {
        if (erro instanceof UnauthorizedAccessException) throw new ResourceNotFoundException("Transcrição");
        throw erro;
    }
    if (!await campanhaRepositorio.recuperarPorId({ id: dto.campanhaId })) {
        throw new ResourceNotFoundException("Transcrição");
    }
}
