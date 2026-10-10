/** Formato canônico dos livros públicos, produzido no build a partir de docs/core/. */
export interface RegrasDocumento {
    readonly tipo: "documento";
    readonly id: "sistema" | "guia";
    readonly titulo: string;
    readonly versao: string;
    readonly filhos: readonly RegrasConteudo[];
}

export type RegrasConteudo = RegrasSecao | RegrasBloco;

export interface RegrasSecao {
    readonly tipo: "secao";
    readonly nivel: 1 | 2 | 3 | 4;
    readonly glifo: "⬢" | "⬡" | "⬥" | "⬦" | null;
    readonly titulo: string;
    readonly ancora: string;
    /** Título extraído do cabeçalho de uma tabela; a fonte integral permanece no bloco. */
    readonly origemTabela?: boolean;
    readonly filhos: readonly RegrasConteudo[];
}

export type RegrasTrecho =
    | { readonly tipo: "texto"; readonly texto: string }
    | { readonly tipo: "negrito" | "italico"; readonly filhos: readonly RegrasTrecho[] }
    | { readonly tipo: "tarja"; readonly comprimento: number }
    | { readonly tipo: "link-interno"; readonly ancora: string; readonly texto: string }
    | { readonly tipo: "nivel-ameaca"; readonly nivel: number; readonly texto: string;
        /** Menção em prosa ("ameaças Nulas"): só colorida, sem o selo da sigla `NA`. */
        readonly compacto?: boolean }
    | { readonly tipo: "link-externo"; readonly destino: string;
        readonly filhos: readonly RegrasTrecho[] };

export type RegrasBloco =
    | RegrasClasse | RegrasArquetipos | RegrasOrigens | RegrasModulos
    | RegrasEquipamentos | RegrasModificacoes | RegrasAmplificadores | RegrasIdentidade | RegrasAtributos
    | RegrasRoteiro | RegrasFichaCriatura | RegrasHabilidadeCriatura | RegrasNiveisAmeaca
    | RegrasSubclasse | RegrasTermos | RegrasGrade | RegrasAbertura | RegrasCapa
    | { readonly tipo: "paragrafo" | "exemplo"; readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "lista"; readonly ordenada: boolean; readonly inicio: number;
        readonly itens: readonly (readonly RegrasBloco[])[] }
    | { readonly tipo: "nota"; readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "tabela"; readonly cabecalho: readonly (readonly RegrasTrecho[])[];
        readonly linhas: readonly (readonly (readonly RegrasTrecho[])[])[] }
    | { readonly tipo: "habilidade"; readonly nome: string; readonly custo: number | "X";
        readonly reacao: boolean; readonly glifo: "⬦" | "◈" | "◻" | null;
        readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "generico"; readonly motivo: string;
        readonly trechos: readonly RegrasTrecho[]; readonly origemMarkdown: string;
        readonly filhos?: readonly RegrasConteudo[] };

/** Células na ordem da fonte, inclusive vazias, para auditoria sem reconstruir Markdown. */
export interface RegrasFonteTabela {
    readonly cabecalho: readonly (readonly RegrasTrecho[])[];
    readonly linhas: readonly (readonly (readonly RegrasTrecho[])[])[];
}

export interface RegrasClasse extends RegrasFonteTabela {
    readonly tipo: "classe";
    readonly nome: string;
    readonly ancora?: string;
    readonly citacao: readonly RegrasTrecho[];
    readonly saude: { readonly vida: readonly RegrasTrecho[];
        readonly energia: readonly RegrasTrecho[] };
    readonly progressao: { readonly vida: readonly RegrasTrecho[];
        readonly energia: readonly RegrasTrecho[] };
    readonly habilidades: readonly RegrasBloco[];
    readonly arquetipos: readonly { readonly nome: string;
        readonly habilidadeInicial: RegrasBloco }[];
    readonly filhos?: readonly RegrasArquetipos[];
}

/** Subclasse de Experimento: substitui o arquétipo e carrega custos próprios. */
export interface RegrasSubclasse extends RegrasFonteTabela {
    readonly tipo: "subclasse";
    readonly nome: string;
    readonly ancora?: string;
    readonly classe: string;
    readonly citacao: readonly RegrasTrecho[];
    readonly custos: readonly (readonly RegrasTrecho[])[];
    readonly saude: { readonly vida: readonly RegrasTrecho[];
        readonly energia: readonly RegrasTrecho[] };
    readonly progressao: { readonly vida: readonly RegrasTrecho[];
        readonly energia: readonly RegrasTrecho[] };
    readonly atributosBonus: readonly RegrasTrecho[];
    readonly habilidadeInicial: RegrasBloco;
    readonly habilidades: readonly RegrasBloco[];
}

/** Verbete curto de uma lista de termos (atributo, maestria, penalidade, sequela). */
export interface RegrasTermo {
    readonly nome: string;
    readonly numero?: number;
    readonly rotulo?: string;
    readonly descricao: readonly RegrasTrecho[];
}

export interface RegrasTermos extends RegrasFonteTabela {
    readonly tipo: "termos";
    readonly variante: "atributos" | "maestrias" | "penalidades" | "verbetes";
    readonly itens: readonly RegrasTermo[];
}

/** Tabela de layout sem assinatura conhecida: células na ordem da fonte, uma por caixa. */
export interface RegrasGrade extends RegrasFonteTabela {
    readonly tipo: "grade";
    readonly colunas: number;
}

/** Registro oficial em itálico que abre cada livro. */
export interface RegrasAbertura {
    readonly tipo: "abertura";
    readonly titulo: string;
    readonly trechos: readonly RegrasTrecho[];
}

/** Selo de versão, título e subtítulo logo após a abertura de cada livro. */
export interface RegrasCapa {
    readonly tipo: "capa";
    readonly versao?: string;
    readonly titulo: string;
    readonly subtitulo: string;
}

export interface RegrasArquetipos extends RegrasFonteTabela {
    readonly tipo: "arquetipos";
    readonly classe: string;
    readonly arquetipos: readonly { readonly nome: string;
        readonly citacao: readonly RegrasTrecho[];
        readonly atributosBonus: readonly RegrasTrecho[];
        readonly habilidades: readonly RegrasBloco[];
        readonly habilidadesGeraisMelhoradas: readonly RegrasBloco[] }[];
}

export interface RegrasOrigens extends RegrasFonteTabela {
    readonly tipo: "origens";
    readonly origens: readonly { readonly nome: string;
        readonly citacao: readonly RegrasTrecho[];
        readonly formacao: readonly RegrasTrecho[];
        readonly especialidade: readonly RegrasTrecho[];
        readonly saberCampo: readonly RegrasTrecho[] }[];
}

export interface RegrasModulos extends RegrasFonteTabela {
    readonly tipo: "modulos";
    readonly modulos: readonly { readonly nivel: string;
        readonly energiaMaxima: number }[];
}

export interface RegrasEquipamento {
    readonly nome: string;
    readonly custo: readonly RegrasTrecho[];
    readonly descricao: readonly RegrasTrecho[];
    readonly peso: readonly RegrasTrecho[];
    readonly porte?: readonly RegrasTrecho[];
    readonly danos: readonly { readonly rotulo: "DANO" | "UMA MÃO" | "DUAS MÃOS";
        readonly trechos: readonly RegrasTrecho[] }[];
    readonly especificacoes?: readonly RegrasTrecho[];
    readonly duracao?: readonly RegrasTrecho[];
}

export interface RegrasEquipamentos extends RegrasFonteTabela {
    readonly tipo: "equipamentos";
    readonly categoria: string;
    readonly itens: readonly RegrasEquipamento[];
}

export interface RegrasModificacao {
    readonly nome: string;
    readonly empilhamento: string;
    readonly efeito: readonly RegrasTrecho[];
    readonly bloqueia: readonly RegrasTrecho[];
}

export interface RegrasModificacoes extends RegrasFonteTabela {
    readonly tipo: "modificacoes";
    /** Título da categoria de Equipamentos a que a tabela pertence (ex.: "Corpo a Corpo"). */
    readonly categoria: string;
    readonly nota?: readonly RegrasTrecho[];
    readonly itens: readonly RegrasModificacao[];
}

export interface RegrasAmplificador {
    readonly nome: string;
    readonly empilhamento: string;
    readonly efeito: readonly RegrasTrecho[];
}

export interface RegrasAmplificadores extends RegrasFonteTabela {
    readonly tipo: "amplificadores";
    readonly itens: readonly RegrasAmplificador[];
}

export interface RegrasIdentidade extends RegrasFonteTabela {
    readonly tipo: "identidade";
    readonly campos: readonly { readonly rotulo: string;
        readonly valor: readonly RegrasTrecho[]; readonly nivel?: number }[];
}

export interface RegrasNiveisAmeaca extends RegrasFonteTabela {
    readonly tipo: "niveis-ameaca";
    readonly niveis: readonly { readonly nivel: number;
        readonly referenciaImagem: string; readonly descricao: readonly RegrasTrecho[] }[];
}

export interface RegrasAtributos extends RegrasFonteTabela {
    readonly tipo: "atributos";
    readonly atributos: readonly { readonly nome: string; readonly valor: number;
        readonly modificador: string; readonly bonus: string }[];
}

export interface RegrasRoteiro {
    readonly tipo: "roteiro";
    readonly etapas: readonly { readonly ordem: number;
        readonly titulo: readonly RegrasTrecho[];
        readonly descricao: readonly RegrasTrecho[] }[];
    readonly filhos: readonly RegrasConteudo[];
    /** Conteúdo suplementar, sem repetir as etapas já apresentadas na lista numerada. */
    readonly introducao?: readonly RegrasConteudo[];
    readonly conclusao?: readonly RegrasConteudo[];
}

export interface RegrasHabilidadeCriatura {
    readonly tipo: "habilidade-criatura";
    readonly nome: string;
    readonly categoria: "PASSIVA" | "ATIVA" | "DE GATILHO";
    readonly trechos: readonly RegrasTrecho[];
    /** Cabeçalho original para manter a escrita e a pontuação do livro. */
    readonly rotulo: string;
}

/** Só emitida quando identidade, dez atributos, saúde e ataques estão completos. */
export interface RegrasFichaCriatura {
    readonly tipo: "ficha-criatura";
    readonly nome: string;
    readonly identidade: RegrasIdentidade;
    readonly atributos: RegrasAtributos;
    readonly vidaMaxima: string;
    readonly defesaBase: string;
    readonly resistencias: readonly RegrasTrecho[];
    readonly fraquezas: readonly RegrasTrecho[];
    readonly regeneracao: readonly RegrasTrecho[];
    readonly porte: readonly RegrasTrecho[];
    readonly deslocamento: readonly RegrasTrecho[];
    readonly cadencia: string;
    readonly ataques: readonly { readonly nome: string; readonly acao: string;
        readonly teste: string; readonly dano: string;
        readonly efeito: readonly RegrasTrecho[] }[];
    readonly habilidades: readonly RegrasHabilidadeCriatura[];
    readonly filhos: readonly RegrasConteudo[];
}

/** Diagnóstico não fatal; linha é contada a partir de 1 no arquivo de origem. */
export interface RegrasAviso {
    readonly documento: RegrasDocumento["id"];
    readonly linha: number;
    readonly motivo: string;
}
