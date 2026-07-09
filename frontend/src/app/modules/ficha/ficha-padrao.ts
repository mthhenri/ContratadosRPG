import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
} from '@contratados-rpg/shared/regras/agente';

/**
 * Ficha **padrão de fábrica** (m3-10): "Nova ficha" cria esta e abre a tela para edição no próprio
 * lugar — o autor ajusta cada campo com seu lápis, sem formulário separado. Classe base default,
 * atributos base (1 cada), nível 0; Vida/Energia atuais nascem cheias e as **máximas** + o bloco
 * `derivados` já são o **snapshot** de `shared/regras` (o backend também os grava; aqui só antecipa
 * para a tela abrir coerente). Nenhuma regra nova — só orquestra `shared/regras`.
 */
export function construirFichaPadrao(): { readonly nome: string; readonly dados: FichaJogadorDadosDto } {
  const classe = ClasseEnum.COMBATENTE;
  const nivel = 0;
  const atributos: FichaAtributosDto = {
    destreza: 1,
    forca: 1,
    luta: 1,
    pontaria: 1,
    vigor: 1,
    intelecto: 1,
    medicina: 1,
    sentidos: 1,
    social: 1,
    vontade: 1,
  };
  const vidaMaxima = calcularVida({ classe, nivel, vigor: atributos.vigor });
  const energiaMaxima = calcularEnergia({ classe, nivel, destreza: atributos.destreza });

  return {
    nome: 'Novo agente',
    dados: {
      classe,
      arquetipo: null,
      nivel,
      prestigio: 0,
      atributos,
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
      derivados: calcularDerivados(classe, nivel, atributos),
      habilidades: [],
      inventario: { itens: [], amplificadores: [] },
      rolagens: [],
      anotacoes: '',
    },
  };
}
