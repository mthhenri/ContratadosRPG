# Casos especiais e anti-padrões — `dto-conventions`

Complemento ao `SKILL.md` principal. Carregado só quando a operação em questão não se encaixa
na fórmula geral (`Entidade + Complemento? + Verbo + Dto`).

## DTOs Internos (service → repository)

Operações que nunca chegam ao frontend usam `Interno` como complemento — antes do verbo, como
qualquer outra palavra do complemento. Exemplos reais do projeto:

```
shared/src/dtos/ficha/ficha-operacao.dtos.ts     → FichaInternoCriarDto, FichaInternoAlterarDto
shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts → FichaCriaturaInternoAlterarDto
shared/src/dtos/campanha/campanha.dtos.ts        → CampanhaMembroInternoRecuperarDto,
                                                     CampanhaMestreInternoTransferirDto,
                                                     CampanhaInventarioInternoAlterarDto
shared/src/dtos/encontro/encontro-interno.dtos.ts → EncontroInternoCriarDto,
                                                      EncontroInternoAlterarStatusDto
```

Quando `Interno` é o único complemento, a regra é a mesma — continua antes do verbo:

```
CampanhaMembroInternoRecuperarDto  ✅      CampanhaMembroRecuperarInternoDto  ❌
```

## Relatórios / Consultas Computadas

Não representam operação CRUD — descrevem um **recorte calculado**. Fórmula:
`Entidade + Recorte + Dto`, **sem verbo**. Exemplo real
(`shared/src/dtos/ficha/ficha-operacao.dtos.ts:87`):

```typescript
/** Agregado de nível/prestígio médio do esquadrão da campanha — reusa FichaListarDto como entrada. */
export interface FichaMediasEsquadraoDto {
  readonly mediaNivel: number;
  readonly mediaPrestigio: number;
  readonly quantidade: number;
}
```

O DTO de entrada, quando é um recorte específico (não reaproveitado de outra operação, como no
exemplo acima), segue o padrão normal com verbo: `Entidade + Recorte + Consultar/Listar + Dto`.

## Value-Objects / Sub-estruturas

Estruturas reutilizáveis sem ciclo de vida próprio: apenas o **nome do conceito**, sem entidade
nem verbo. Exemplo real (`shared/src/dtos/ficha/ficha-operacao.dtos.ts:325`):

```typescript
/** Conteúdo bruto de um arquivo enviado por upload — value-object sem entidade nem verbo. */
export interface FichaImagemArquivoDto {
  readonly conteudo: Uint8Array;
  readonly mimetype: string;
  readonly tamanho: number;
}
```

## Anti-padrões Frequentes

```
❌ FichaAtualizarDto                    → ✅ FichaAlterarDto
❌ CampanhaListadoDto                   → ✅ CampanhaResumoDto
❌ CampanhaInventarioAjustarItemQuantidadeDto → ✅ CampanhaInventarioItemQuantidadeAjustarDto
❌ CampanhaMembroRecuperarInternoDto    → ✅ CampanhaMembroInternoRecuperarDto
❌ FichaAlteradaDto extends FichaCriadaDto → ✅ campos explícitos em cada DTO de negócio
❌ export class X extends Y {} (vazio entre negócio) → ✅ estender só DTOs core (PaginatedResult)
❌ alterar(id: number, dados)           → ✅ alterar(dto: FichaInternoAlterarDto)
❌ DTO criado em backend/ ou frontend/  → ✅ sempre em shared/src/dtos/<modulo>/
❌ export { FichaCriarDto as FichaDto } → ✅ nenhum alias/re-export de DTO
```
