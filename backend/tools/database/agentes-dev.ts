import type {
  FichaAtributosDto,
  FichaJogadorDadosDto,
} from "@contratados-rpg/shared/dtos/ficha";
import type { ArquetipoEnum, ClasseEnum } from "@contratados-rpg/shared/enums";
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  habilidadesIniciais,
  catalogoHabilidades,
  calcularProgressaoAcumulada,
  listarPacotesHabilidadesIniciais,
  obterBonusAtributosComEscolha,
  obterSlotsEscolhaBonus,
  validarDistribuicaoAtributos,
} from "@contratados-rpg/shared/regras/agente";
import {
  aplicarFormacaoAosDerivados,
  materializarHabilidadePersonalidade,
} from "@contratados-rpg/shared/regras/identidade";
import { PRESET_INICIATIVA_PADRAO } from "../../src/modules/ficha/ficha-presets-padrao";
import type { DefinicaoFichaDev } from "./cenario-dev";

/** Os perfis contêm apenas os pontos de criação. Ganhos de Nível e especialização usam o motor. */
export function montarAtributosAgenteDev(
  base: FichaAtributosDto,
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
  nivel: number,
): FichaAtributosDto {
  const atributos = { ...base };
  const chaves = Object.keys(base) as (keyof FichaAtributosDto)[];
  const prioridades = [...chaves].sort(
    (primeira, segunda) => base[segunda] - base[primeira],
  );
  const progressao = calcularProgressaoAcumulada({ classe, nivel });
  for (let indice = 0; indice < progressao.atributos; indice++) {
    atributos[prioridades[indice % prioridades.length]]++;
  }
  const validacao = validarDistribuicaoAtributos({ classe, nivel, atributos });
  if (validacao.violacoes.length)
    throw new Error(
      `Atributos de seed inválidos: ${validacao.violacoes.join("; ")}`,
    );
  const escolhas = obterSlotsEscolhaBonus({ classe, arquetipo }).map((slot) =>
    prioridades.find((chave) => slot.includes(chave))!,
  );
  const bonus = obterBonusAtributosComEscolha({ classe, arquetipo }, escolhas);
  for (const chave of chaves) atributos[chave] += bonus[chave] ?? 0;
  return atributos;
}

export function montarDadosFichaDev(
  ficha: DefinicaoFichaDev,
): FichaJogadorDadosDto {
  const energiaMaxima = calcularEnergia({
    classe: ficha.classe,
    nivel: ficha.nivel,
    destreza: ficha.atributos.destreza,
  });
  const habilidades = habilidadesIniciais(ficha.classe, ficha.arquetipo).map(
    ({ nome, categoria, custoEnergia, descricao, origem }) => ({
      nome,
      categoria,
      custoEnergia,
      descricao,
      ...(origem === undefined ? {} : { origem }),
    }),
  );
  // Pacote de quatro Gerais e ganhos de Nível: escolhas determinísticas do catálogo,
  // sem duplicar a Inicial e sem reaplicar bônus nos atributos finais do cenário.
  const catalogo = catalogoHabilidades(ficha.classe, ficha.arquetipo);
  const progressao = calcularProgressaoAcumulada(ficha);
  const pacote = listarPacotesHabilidadesIniciais(ficha.classe)[0];
  const escolher = (
    grupos: readonly string[],
    quantidade: number,
    propriaClasse = false,
  ): void => {
    const opcoes = catalogo
      .filter((grupo) => grupos.includes(grupo.id))
      .flatMap((grupo) =>
        grupo.subgrupos
          .filter((subgrupo) => !propriaClasse || subgrupo.ehDaFicha)
          .flatMap((subgrupo) => subgrupo.habilidades),
      );
    for (let indice = 0; indice < quantidade; indice++) {
      const habilidade = opcoes.find(
        (candidata) => !habilidades.some(({ nome }) => nome === candidata.nome),
      );
      if (!habilidade)
        throw new Error(
          `Seed: faltam habilidades elegíveis para ${ficha.nome}.`,
        );
      habilidades.push({ ...habilidade });
    }
  };
  for (const vaga of pacote.vagas)
    escolher([vaga.tipo === "civil" ? "civil" : "gerais"], vaga.quantidade);
  escolher(["gerais"], progressao.habilidadesGerais);
  escolher(["classe"], progressao.habilidadesClasse, true);
  escolher(
    ["classe", "arquetipo", "subclasse"],
    progressao.habilidadesClasseOuArquetipo,
    true,
  );
  escolher(["civil"], progressao.habilidadesCivis);
  if (progressao.habilidadesOutraClasse > 0)
    throw new Error(
      "Seed: definir escolhas de outra classe antes de ampliar o Nível.",
    );
  const habilidadePersonalidade = materializarHabilidadePersonalidade(
    ficha.identidade,
  );
  if (habilidadePersonalidade) {
    habilidades.push(habilidadePersonalidade);
  }
  const vidaMaxima = calcularVida({
    classe: ficha.classe,
    nivel: ficha.nivel,
    vigor: ficha.atributos.vigor,
    habilidades,
  });
  const derivadosBase = calcularDerivados(
    ficha.classe,
    ficha.nivel,
    ficha.atributos,
    habilidades,
  );
  const derivados = aplicarFormacaoAosDerivados(
    derivadosBase,
    ficha.identidade.origem?.formacao ?? [],
  );

  return {
    classe: ficha.classe,
    arquetipo: ficha.arquetipo,
    nivel: ficha.nivel,
    prestigio: ficha.prestigio,
    atributos: ficha.atributos,
    maestria: null,
    estado: {
      vidaAtual: vidaMaxima,
      energiaAtual: energiaMaxima,
      vidaMaxima,
      energiaMaxima,
      sequelas: [],
      traumas: [],
      lesoes: [],
    },
    derivados,
    habilidades,
    identidade: ficha.identidade,
    inventario: { itens: ficha.itens, amplificadores: [] },
    rolagens: [{ ...PRESET_INICIATIVA_PADRAO }],
    combos: [],
    anotacoes:
      "Ponto de encontro: acesso de serviço. Confirmar a rota de extração antes de entrar em campo.",
    historia: `${ficha.nome} integra a equipe desta operação. ${ficha.identidade.origem?.descricao ?? ""}`,
    dinheiro: ficha.dinheiro,
  } satisfies FichaJogadorDadosDto;
}
