import { ItemCategoriaEnum } from "@contratados-rpg/shared/enums";
import {
  CATALOGO_ITENS,
  type CarrinhoItemDto,
} from "@contratados-rpg/shared/regras/compras";

export function itemDev(
  nome: string,
  categoria: ItemCategoriaEnum,
  quantidade = 1,
): CarrinhoItemDto {
  const item = CATALOGO_ITENS[categoria].find(
    (candidato) => candidato.nome === nome,
  );
  if (!item)
    throw new Error(
      `Item de seed não encontrado no catálogo: ${categoria}/${nome}.`,
    );
  return {
    nome: item.nome,
    categoria,
    custo: item.custo,
    peso: item.peso,
    quantidade,
    guardada: false,
    modificacoes: [],
    ...(categoria === ItemCategoriaEnum.PROTECOES ? { equipado: true } : {}),
    ...(item.duracaoMunicao
      ? {
          contagemMunicao: {
            atual: item.duracaoMunicao.maxima,
            ...item.duracaoMunicao,
          },
        }
      : {}),
  };
}
