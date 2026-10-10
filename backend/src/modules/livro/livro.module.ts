import { Module } from "@nestjs/common";
import { LivroRepository } from "./livro.repository";
import { LivroVersaoRepository } from "./livro-versao.repository";
import { RegraPecaRepository } from "./regra-peca.repository";

/**
 * Módulo `livro` (m11-02) — os livros de regras no banco: cópia de trabalho (`regra_peca`) e
 * fotografias publicadas (`livro_versao`). Por ora só a camada de dados; a service de publicação e a
 * API de leitura chegam na `m11-04`.
 */
@Module({
  providers: [LivroRepository, RegraPecaRepository, LivroVersaoRepository],
  exports: [LivroRepository, RegraPecaRepository, LivroVersaoRepository],
})
export class LivroModule {}
