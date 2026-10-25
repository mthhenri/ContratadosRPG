import { Module } from "@nestjs/common";
import { LivroController } from "./livro.controller";
import { RegraPecaController } from "./regra-peca.controller";
import { RegraPecaService } from "./regra-peca.service";
import { LivroRepository } from "./livro.repository";
import { LivroService } from "./livro.service";
import { LivroVersaoRepository } from "./livro-versao.repository";
import { RegraPecaRepository } from "./regra-peca.repository";
import { LivroPacoteController } from "./livro-pacote.controller";
import { LivroPacoteRepository } from "./livro-pacote.repository";
import { LivroPacoteService } from "./livro-pacote.service";

/**
 * Módulo `livro` (m11-02, m11-04) — os livros de regras no banco: cópia de trabalho (`regra_peca`),
 * fotografias (`livro_versao`), publicação e leitura por papel.
 */
@Module({
  controllers: [LivroPacoteController, LivroController, RegraPecaController],
  providers: [LivroPacoteRepository, LivroPacoteService, LivroRepository, RegraPecaRepository, LivroVersaoRepository, LivroService, RegraPecaService],
  exports: [LivroRepository, RegraPecaRepository, LivroVersaoRepository, LivroService, RegraPecaService],
})
export class LivroModule {}
