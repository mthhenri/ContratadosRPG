import { ClasseEnum } from '../../enums';

export type TipoVagaHabilidade = 'geral' | 'classe' | 'classeOuArquetipo' | 'outraClasse' | 'civil';

export type HabilidadesPacoteInicialId =
  | 'QUATRO_GERAIS'
  | 'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO'
  | 'DUAS_CLASSE_OU_ARQUETIPO'
  | 'TRES_CIVIS';

export interface HabilidadesPacoteInicialDto {
  readonly id: HabilidadesPacoteInicialId;
  readonly rotulo: string;
  readonly vagas: readonly {
    readonly tipo: TipoVagaHabilidade;
    readonly quantidade: number;
  }[];
}

const PACOTES_AGENTE: readonly HabilidadesPacoteInicialDto[] = [
  { id: 'QUATRO_GERAIS', rotulo: '4 Gerais', vagas: [{ tipo: 'geral', quantidade: 4 }] },
  {
    id: 'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO',
    rotulo: '2 Gerais + 1 de Classe/Arquétipo',
    vagas: [
      { tipo: 'geral', quantidade: 2 },
      { tipo: 'classeOuArquetipo', quantidade: 1 },
    ],
  },
  {
    id: 'DUAS_CLASSE_OU_ARQUETIPO',
    rotulo: '2 de Classe/Arquétipo',
    vagas: [{ tipo: 'classeOuArquetipo', quantidade: 2 }],
  },
];

const PACOTE_CIVIL: readonly HabilidadesPacoteInicialDto[] = [
  { id: 'TRES_CIVIS', rotulo: '3 Civis', vagas: [{ tipo: 'civil', quantidade: 3 }] },
];

/** Pacotes obrigatórios escolhidos uma vez na criação, separados dos ganhos por progressão. */
export function listarPacotesHabilidadesIniciais(classe: ClasseEnum): readonly HabilidadesPacoteInicialDto[] {
  return classe === ClasseEnum.CIVIL ? PACOTE_CIVIL : PACOTES_AGENTE;
}
