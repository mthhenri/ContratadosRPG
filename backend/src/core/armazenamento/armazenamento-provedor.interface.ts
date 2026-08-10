/**
 * Contrato de armazenamento de blob (m3-62) — `salvarImagem`/`excluirImagem`, comum às duas
 * implementações (`ArmazenamentoLocalProvedor`/`ArmazenamentoR2Provedor`), escolhidas por
 * `ARMAZENAMENTO_PROVEDOR` (`ArmazenamentoModule`). Local técnico, não um DTO de negócio
 * (nunca trafega até o frontend) — por isso vive em `core/`, não em `shared/`.
 */
export interface ArmazenamentoProvedor {
  salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva>;
  excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void>;
}

/** Entrada de `salvarImagem` — o conteúdo bruto e a extensão já resolvida do MIME validado na service. */
export interface ArmazenamentoImagemSalvar {
  readonly conteudo: Uint8Array;
  readonly mimetype: string;
  readonly extensao: string;
}

/** Saída de `salvarImagem` — o caminho/URL a persistir em `ficha.imagem_url`. */
export interface ArmazenamentoImagemSalva {
  readonly caminho: string;
}

/** Entrada de `excluirImagem` — o `caminho` gravado em `ficha.imagem_url`. */
export interface ArmazenamentoImagemExcluir {
  readonly caminho: string;
}
