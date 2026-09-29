/**
 * Contrato de armazenamento de blob (m3-62) — `salvarImagem`/`excluirImagem`, comum às duas
 * implementações (`ArmazenamentoLocalProvedor`/`ArmazenamentoR2Provedor`), escolhidas por
 * `ARMAZENAMENTO_PROVEDOR` (`ArmazenamentoModule`). Local técnico, não um DTO de negócio
 * (nunca trafega até o frontend) — por isso vive em `core/`, não em `shared/`.
 */
export interface ArmazenamentoProvedor {
  salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva>;
  excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void>;
  /** Lê um arquivo de texto da pasta; `null` quando ele não existe (pn-02). */
  lerTexto(dto: ArmazenamentoTextoLer): Promise<string | null>;
  /** Grava (ou substitui) um arquivo de texto na pasta (pn-02). */
  salvarTexto(dto: ArmazenamentoTextoSalvar): Promise<void>;
}

/**
 * Pasta de destino — cada módulo dono grava na sua (`AGENTES` para os avatares de ficha e de avulso
 * do encontro, `DOCUMENTOS` para os documentos de campanha, `PATCHNOTES` para as notas de versão e o
 * índice delas). Técnico, nunca sai do backend; o nome real da pasta está em
 * `armazenamento-chave.util.ts`.
 */
export enum ArmazenamentoPastaEnum {
  AGENTES = 'AGENTES',
  DOCUMENTOS = 'DOCUMENTOS',
  PATCHNOTES = 'PATCHNOTES',
}

/**
 * Entrada de `salvarImagem` — a pasta de destino, o conteúdo bruto e a extensão já resolvida do
 * MIME validado na service.
 */
export interface ArmazenamentoImagemSalvar {
  readonly pasta: ArmazenamentoPastaEnum;
  readonly conteudo: Uint8Array;
  readonly mimetype: string;
  readonly extensao: string;
}

/** Saída de `salvarImagem` — o caminho/URL a persistir (`ficha.imagem_url`, `documento.imagem_url`...). */
export interface ArmazenamentoImagemSalva {
  readonly caminho: string;
}

/** Entrada de `excluirImagem` — o `caminho` que `salvarImagem` devolveu. */
export interface ArmazenamentoImagemExcluir {
  readonly caminho: string;
}

/**
 * Entrada de `lerTexto` — a pasta e o nome do arquivo dentro dela. O nome nunca é um caminho
 * (`construirChaveTexto` recusa separadores e `..`).
 */
export interface ArmazenamentoTextoLer {
  readonly pasta: ArmazenamentoPastaEnum;
  readonly nomeArquivo: string;
}

/** Entrada de `salvarTexto` — o arquivo, o conteúdo (UTF-8) e o tipo de mídia a registrar. */
export interface ArmazenamentoTextoSalvar {
  readonly pasta: ArmazenamentoPastaEnum;
  readonly nomeArquivo: string;
  readonly conteudo: string;
  readonly mimetype: string;
}
