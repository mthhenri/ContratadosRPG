import { itemDev } from "./inventario-dev";
import type {
  FichaAtributosDto,
  FichaNpcDadosDto,
} from "@contratados-rpg/shared/dtos/ficha";
import {
  CategoriaNpcEnum,
  ItemCategoriaEnum,
  TipoFichaEnum,
} from "@contratados-rpg/shared/enums";
import {
  calcularBloquear,
  calcularDefesaBase,
  calcularEnergia,
  calcularEsquivar,
  calcularVidaMaxima,
  listarBibliotecaHabilidadesNpc,
  listarPatentesEquivalentes,
} from "@contratados-rpg/shared/regras/npc";
import { validarDadosNpc } from "../../src/modules/ficha/ficha-npc-validacao.util";
import type { ChaveCampanhaDev, ChaveUsuarioDev } from "./cenario-dev";

export interface DefinicaoNpcDev {
  readonly campanha: ChaveCampanhaDev;
  readonly usuario: ChaveUsuarioDev;
  readonly tipo: TipoFichaEnum.NPC;
  readonly nome: string;
  readonly cor: string;
  readonly dados: FichaNpcDadosDto;
}

const PERFIS = [
  {
    categoria: CategoriaNpcEnum.CIVIL,
    nivel: 2,
    cooperacao: 8,
    cor: "#60A5FA",
    funcao: "Responsável pelo plantão médico e contato da equipe no hospital municipal.",
    atributos: {
      destreza: 1,
      forca: 1,
      luta: 0,
      pontaria: 0,
      vigor: 1,
      intelecto: 2,
      medicina: 2,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    competencias: [],
    quantidadeHabilidades: 0,
  },
  {
    categoria: CategoriaNpcEnum.OPERATIVO,
    nivel: 5,
    cooperacao: 7,
    cor: "#34D399",
    funcao:
      "Responsável pela escolta, pelo perímetro e pela extração dos agentes.",
    atributos: {
      destreza: 2,
      forca: 2,
      luta: 2,
      pontaria: 3,
      vigor: 2,
      intelecto: 1,
      medicina: 1,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    competencias: ["pontaria", "sentidos"],
    quantidadeHabilidades: 3,
  },
  {
    categoria: CategoriaNpcEnum.ELITE,
    nivel: 12,
    cooperacao: 5,
    cor: "#F59E0B",
    funcao:
      "Comanda a contenção e decide quais informações serão liberadas à equipe.",
    atributos: {
      destreza: 3,
      forca: 2,
      luta: 3,
      pontaria: 4,
      vigor: 3,
      intelecto: 2,
      medicina: 1,
      sentidos: 3,
      social: 3,
      vontade: 3,
    },
    competencias: ["pontaria", "sentidos", "social", "vontade"],
    quantidadeHabilidades: 5,
  },
] as const;

/** Exemplos do guia: sem energia, reserva fixa e pool com recarga. Sem compartilhamento automático. */
export function montarNpcsDev(): readonly DefinicaoNpcDev[] {
  return (
    [
      {
        campanha: "campanha-matheus",
        usuario: "matheus",
        nomes: [
          "Dra. Helena Duarte",
          "Sargento Raul Nunes",
          "Comandante Vera Brandão",
        ],
      },
      {
        campanha: "campanha-codex",
        usuario: "codex",
        nomes: ["Dr. Caio Mendes", "Cabo Lia Torres", "Diretor Otávio Reis"],
      },
    ] as const
  ).flatMap(({ campanha, usuario, nomes }) =>
    PERFIS.map((perfil, indice) => {
      const { categoria, nivel, cooperacao, atributos } = perfil;
      const vidaMaxima = calcularVidaMaxima({
        categoria,
        nivel,
        vigor: atributos.vigor,
      });
      const defesaBase = calcularDefesaBase({ nivel });
      const energia = calcularEnergia({
        categoria,
        destreza: atributos.destreza,
      });
      const maxima = typeof energia === "number" ? energia : energia.pool;
      const patenteEquivalente = listarPatentesEquivalentes({ categoria })[0];
      const dados: FichaNpcDadosDto = {
        identidadeNarrativa: { nome: nomes[indice], funcao: perfil.funcao },
        categoria,
        nivel,
        cooperacao,
        atributos,
        competencias: [...perfil.competencias] as (keyof FichaAtributosDto)[],
        vidaMaxima,
        vidaAtual: vidaMaxima,
        defesaBase,
        bloquear: calcularBloquear({ defesaBase, vigor: atributos.vigor }),
        esquivar: calcularEsquivar({
          defesaBase,
          destreza: atributos.destreza,
        }),
        energia: {
          maxima,
          atual: maxima,
          recargaPorTurno: typeof energia === "number" ? null : energia.recarga,
        },
        condicoes: { morrendo: false },
        sanidade: { sequelas: [], traumas: [] },
        habilidades: listarBibliotecaHabilidadesNpc({ categoria })
          .slice(0, perfil.quantidadeHabilidades)
          .map(({ habilidade }) => habilidade),
        ...(patenteEquivalente ? { patenteEquivalente } : {}),
        inventario:
          categoria === CategoriaNpcEnum.CIVIL
            ? [itemDev("Bandagem", ItemCategoriaEnum.MEDICINAL, 2)]
            : [
                itemDev("Pistola", ItemCategoriaEnum.ARMAS_DE_FOGO),
                itemDev("9mm", ItemCategoriaEnum.MUNICOES),
                itemDev("Radio Comunicador", ItemCategoriaEnum.OPERACIONAL),
                itemDev("Colete Leve", ItemCategoriaEnum.PROTECOES),
              ],
        condutaCombate: {
          gatilhosFuga:
            categoria === CategoriaNpcEnum.CIVIL
              ? "Busca abrigo ao primeiro sinal de violência."
              : "Recua com menos de um terço da Vida ou ordem de extração.",
          prioridadesAlvo:
            categoria === CategoriaNpcEnum.CIVIL
              ? "Evita confrontos; prioriza socorrer feridos."
              : "Protege aliados feridos e neutraliza quem bloqueia a evacuação.",
          reacaoFerimentoSevero:
            "Procura cobertura, comunica o ferimento e solicita apoio médico.",
        },
        anotacoes:
          categoria === CategoriaNpcEnum.ELITE
            ? "Condicionamento Extremo: resistência a dano Balístico. Mantém os relatórios de contenção sob sigilo."
            : "Conhece a rota de evacuação e o ponto de encontro da operação. Contato disponível ao mestre.",
      };
      validarDadosNpc(dados, true);
      return {
        campanha,
        usuario,
        tipo: TipoFichaEnum.NPC,
        nome: nomes[indice],
        cor: perfil.cor,
        dados,
      };
    }),
  );
}
