import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

interface OperacaoContratoGerado {
    readonly controller: string;
    readonly metodo: string;
    readonly caminho: string;
    readonly tag: string;
    readonly publica: boolean;
    readonly requestSchema?: string;
    readonly responseSchema: string;
}

interface ResultadoGeracao {
    readonly schemas: Record<string, unknown>;
    readonly operacoes: Record<string, OperacaoContratoGerado>;
}

const DIRETORIO_RAIZ = resolve(__dirname, "..", "..");
const DIRETORIO_SHARED = join(DIRETORIO_RAIZ, "shared", "src");
const DIRETORIO_DTO = join(DIRETORIO_SHARED, "dtos");
const DIRETORIO_BACKEND = join(DIRETORIO_RAIZ, "backend", "src");
const ARQUIVO_SAIDA = join(
    DIRETORIO_BACKEND,
    "core",
    "openapi",
    "contratos-gerados.ts",
);

const TAGS_POR_CONTROLLER: Readonly<Record<string, string>> = {
    HealthController: "Operação",
    AutenticacaoController: "Autenticação",
    UsuarioController: "Usuários",
    CampanhaController: "Campanhas",
    CampanhaProjecaoController: "Campanhas",
    FichaController: "Fichas",
    RolagemController: "Rolagens",
    PaginaCadernoController: "Caderno",
    EncontroController: "Encontros",
};

function listarArquivosTypescript(diretorio: string): string[] {
    return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(diretorio, entrada.name);
        if (entrada.isDirectory()) {
            return listarArquivosTypescript(caminho);
        }
        return entrada.name.endsWith(".ts") && !entrada.name.endsWith(".spec.ts") ? [caminho] : [];
    });
}

function obterDecorators(no: ts.Node): readonly ts.Decorator[] {
    return ts.canHaveDecorators(no) ? ts.getDecorators(no) ?? [] : [];
}

function nomeDecorator(decorator: ts.Decorator): string | undefined {
    const expressao = decorator.expression;
    if (ts.isCallExpression(expressao)) {
        return ts.isIdentifier(expressao.expression) ? expressao.expression.text : undefined;
    }
    return ts.isIdentifier(expressao) ? expressao.text : undefined;
}

function argumentoTexto(decorator: ts.Decorator): string | undefined {
    const expressao = decorator.expression;
    if (!ts.isCallExpression(expressao) || expressao.arguments.length === 0) {
        return undefined;
    }
    const argumento = expressao.arguments[0];
    return ts.isStringLiteral(argumento) ? argumento.text : undefined;
}

function nomeSchema(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) {
        return "object";
    }
    const texto = typeNode.getText();
    const promise = /^Promise<(.+)>$/.exec(texto);
    return promise?.[1] ?? texto;
}

function schemaParaTipo(
    checker: ts.TypeChecker,
    type: ts.Type,
    schemasPublicos: ReadonlySet<string>,
): Record<string, unknown> {
    if (type.flags & ts.TypeFlags.StringLike) {
        return { type: "string" };
    }
    if (type.flags & ts.TypeFlags.NumberLike) {
        return { type: "number" };
    }
    if (type.flags & ts.TypeFlags.BooleanLike) {
        return { type: "boolean" };
    }
    if (type.flags & ts.TypeFlags.Null) {
        return { type: "null" };
    }
    if (type.isUnion()) {
        const tiposSemIndefinido = type.types.filter((item) => !(item.flags & ts.TypeFlags.Undefined));
        const valores = tiposSemIndefinido.map((item) => {
            if (item.isStringLiteral()) return item.value;
            if (item.isNumberLiteral()) return item.value;
            return undefined;
        });
        if (valores.every((valor) => valor !== undefined)) {
            return { type: typeof valores[0], enum: valores };
        }
        return { oneOf: tiposSemIndefinido.map((item) => schemaParaTipo(checker, item, schemasPublicos)) };
    }
    if (checker.isArrayType(type)) {
        const tipoItem = checker.getTypeArguments(type as ts.TypeReference)[0];
        return { type: "array", items: schemaParaTipo(checker, tipoItem, schemasPublicos) };
    }

    const simbolo = type.getSymbol();
    const nome = simbolo?.getName();
    if (simbolo && (simbolo.flags & ts.SymbolFlags.Enum)) {
        const valores = checker
            .getPropertiesOfType(type)
            .map((propriedade) => {
                const declaracao = propriedade.valueDeclaration ?? propriedade.declarations?.[0];
                return declaracao ? checker.getConstantValue(declaracao as ts.EnumMember) : undefined;
            })
            .filter((valor): valor is string | number => valor !== undefined);
        return { type: "string", enum: valores };
    }
    if (nome && schemasPublicos.has(nome)) {
        return { $ref: `#/components/schemas/${nome}` };
    }
    if (nome === "Date") {
        return { type: "string", format: "date-time" };
    }
    return { type: "object", additionalProperties: true };
}

function gerarSchemasPublicos(programa: ts.Program): Record<string, unknown> {
    const checker = programa.getTypeChecker();
    const arquivosDto = listarArquivosTypescript(DIRETORIO_DTO);
    const declaracoes = arquivosDto.flatMap((arquivo) => {
        const sourceFile = programa.getSourceFile(arquivo);
        return sourceFile?.statements.filter(
            (declaracao): declaracao is ts.InterfaceDeclaration | ts.ClassDeclaration =>
                (ts.isInterfaceDeclaration(declaracao) || ts.isClassDeclaration(declaracao))
                && !!declaracao.name
                && declaracao.name.text.endsWith("Dto")
                && !declaracao.name.text.includes("Interno"),
        ) ?? [];
    });
    const nomesPublicos = new Set(declaracoes.map((declaracao) => declaracao.name.text));
    const schemas: Record<string, unknown> = {};

    for (const declaracao of declaracoes) {
        const propriedades: Record<string, unknown> = {};
        const obrigatorios: string[] = [];
        const tipo = checker.getTypeAtLocation(declaracao);
        for (const propriedade of checker.getPropertiesOfType(tipo)) {
            const declaracaoPropriedade = propriedade.valueDeclaration ?? propriedade.declarations?.[0];
            if (!declaracaoPropriedade) continue;
            const tipoPropriedade = checker.getTypeOfSymbolAtLocation(propriedade, declaracaoPropriedade);
            const schemaPropriedade = schemaParaTipo(checker, tipoPropriedade, nomesPublicos);
            const descricao = ts.displayPartsToString(propriedade.getDocumentationComment(checker));
            if (descricao) {
                schemaPropriedade.description = descricao;
            }
            propriedades[propriedade.getName()] = schemaPropriedade;
            if (!(propriedade.flags & ts.SymbolFlags.Optional)) {
                obrigatorios.push(propriedade.getName());
            }
        }
        schemas[declaracao.name.text] = {
            type: "object",
            properties: propriedades,
            ...(obrigatorios.length > 0 ? { required: obrigatorios } : {}),
            additionalProperties: false,
            description: ts.displayPartsToString(
                (checker.getSymbolAtLocation(declaracao.name)?.getDocumentationComment(checker)) ?? [],
            ) || undefined,
        };
    }
    return schemas;
}

function normalizarTipoContrato(texto: string): string {
    const tipo = texto.trim();
    if (tipo === "void" || tipo === "undefined") {
        return "null";
    }
    const array = /^(.+)\[\]$/.exec(tipo);
    if (array) {
        return `${normalizarTipoContrato(array[1])}[]`;
    }
    const paginado = /^PaginatedResult<(.+)>$/.exec(tipo);
    if (paginado) {
        return `PaginatedResult<${normalizarTipoContrato(paginado[1])}>`;
    }
    const resultado = /^([A-Za-z][A-Za-z0-9_]*)/.exec(tipo);
    return resultado?.[1] ?? "object";
}

function gerarOperacoes(programa: ts.Program): Record<string, OperacaoContratoGerado> {
    const operacoes: Record<string, OperacaoContratoGerado> = {};
    const arquivosController = listarArquivosTypescript(DIRETORIO_BACKEND)
        .filter((arquivo) => arquivo.endsWith(".controller.ts"));
    const verbos = new Set(["Get", "Post", "Put", "Patch", "Delete"]);

    for (const arquivo of arquivosController) {
        const sourceFile = programa.getSourceFile(arquivo);
        if (!sourceFile) continue;
        for (const declaracao of sourceFile.statements) {
            if (!ts.isClassDeclaration(declaracao) || !declaracao.name) continue;
            const decoratorController = obterDecorators(declaracao)
                .find((decorator) => nomeDecorator(decorator) === "Controller");
            if (!decoratorController) continue;
            const controller = declaracao.name.text;
            const prefixo = argumentoTexto(decoratorController) ?? "";
            const tag = TAGS_POR_CONTROLLER[controller];
            if (!tag) continue;

            for (const membro of declaracao.members) {
                if (!ts.isMethodDeclaration(membro) || !membro.name) continue;
                const decoratorRota = obterDecorators(membro)
                    .find((decorator) => {
                        const nome = nomeDecorator(decorator);
                        return nome ? verbos.has(nome) : false;
                    });
                if (!decoratorRota) continue;
                const verboDecorator = nomeDecorator(decoratorRota) as string;
                const caminhoRota = argumentoTexto(decoratorRota) ?? "";
                const metodo = verboDecorator.toLowerCase();
                const caminho = `/${[prefixo, caminhoRota].filter(Boolean).join("/")}`.replace(/\/+/g, "/");
                const chaveMetodo = membro.name.getText();
                const parametroBody = membro.parameters.find((parametro) =>
                    obterDecorators(parametro).some((decorator) => nomeDecorator(decorator) === "Body"),
                );
                const retorno = membro.type ? nomeSchema(membro.type) : "object";
                const chave = `${controller}_${chaveMetodo}`;
                operacoes[chave] = {
                    controller,
                    metodo,
                    caminho,
                    tag,
                    publica: obterDecorators(membro).some((decorator) => nomeDecorator(decorator) === "Public"),
                    ...(parametroBody ? { requestSchema: normalizarTipoContrato(nomeSchema(parametroBody.type)) } : {}),
                    responseSchema: normalizarTipoContrato(retorno),
                };
            }
        }
    }
    return operacoes;
}

export function gerarContratosOpenApi(): ResultadoGeracao {
    const arquivos = [...listarArquivosTypescript(DIRETORIO_SHARED), ...listarArquivosTypescript(DIRETORIO_BACKEND)];
    const programa = ts.createProgram(arquivos, {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        skipLibCheck: true,
    });
    return {
        schemas: gerarSchemasPublicos(programa),
        operacoes: gerarOperacoes(programa),
    };
}

export function escreverContratosOpenApi(): void {
    const contratos = gerarContratosOpenApi();
    mkdirSync(dirname(ARQUIVO_SAIDA), { recursive: true });
    const conteudo = [
        "/* Este arquivo é gerado por backend/tools/gerar-openapi-contratos.ts. */",
        "/* Não edite manualmente: os DTOs públicos em shared/src/dtos são a fonte de verdade. */",
        "",
        `export const schemasContratosPublicos = ${JSON.stringify(contratos.schemas, null, 4)} as const;`,
        "",
        `export const operacoesContratosPublicos = ${JSON.stringify(contratos.operacoes, null, 4)} as const;`,
        "",
    ].join("\n");
    writeFileSync(ARQUIVO_SAIDA, conteudo);
    console.log(`Contratos OpenAPI gerados em ${relative(DIRETORIO_RAIZ, ARQUIVO_SAIDA)}.`);
}

if (process.argv[1]?.includes("gerar-openapi-contratos")) {
    escreverContratosOpenApi();
}
