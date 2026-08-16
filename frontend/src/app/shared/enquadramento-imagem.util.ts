import type { FichaImagemFocoDto } from '@contratados-rpg/shared/dtos/ficha';

export interface Proporcao {
  readonly largura: number;
  readonly altura: number;
}

const CAIXA_QUADRADA: Proporcao = { largura: 1, altura: 1 };

/**
 * Quanto o `object-fit: cover` (nativo, sem JS) já deixa a imagem "sobrando" além da caixa em
 * cada eixo, antes de qualquer zoom manual — só quando a proporção real da imagem
 * (`naturalWidth`/`naturalHeight`, ver `FocoImagem`) não bate com a da caixa. Nunca os dois eixos
 * ao mesmo tempo: é assim que `cover` funciona — um eixo encaixa exato (sem sobra), o outro sobra
 * na proporção do descompasso. `null`/proporção inválida (imagem ainda não carregou) devolve
 * `{ x: 1, y: 1 }` — sem sobra, mesmo comportamento de uma foto já quadrada.
 */
export function escalaMinimaPorEixo(imagem: Proporcao | null, caixa: Proporcao): { x: number; y: number } {
  if (!imagem || imagem.largura <= 0 || imagem.altura <= 0 || caixa.largura <= 0 || caixa.altura <= 0) {
    return { x: 1, y: 1 };
  }
  const relativa = (imagem.largura / imagem.altura) / (caixa.largura / caixa.altura);
  return { x: Math.max(1, relativa), y: Math.max(1, 1 / relativa) };
}

/**
 * Matemática do crop-pan do avatar (jogador e criatura) — usada tanto pelo editor
 * (`AjusteEnquadramentoImagem`, via a diretiva `FocoImagem`) quanto pelos dois lugares que
 * renderizam o avatar final (`FichaVisualizacao`/`CriaturaVisualizacao`), pra não duplicar a
 * fórmula em três arquivos.
 *
 * Substitui a combinação antiga `object-position` + `transform: scale()` (dois mecanismos CSS
 * independentes, com referenciais diferentes) por uma única transformação: `translate(tx%, ty%)
 * scale(escalaTotal)`, com `object-fit: contain` + `object-position: 0% 0%` fixos no elemento
 * (aplicados pela diretiva `FocoImagem` só quando há `foco` — ver lá) e `transform-origin: 0 0`
 * fixo via SCSS, onde
 *
 *   escalaX = escala * escalaMinimaPorEixo(...).x
 *   escalaY = escala * escalaMinimaPorEixo(...).y
 *   escalaTotal = escala * max(escalaMinimaPorEixo(...).x, escalaMinimaPorEixo(...).y)
 *   tx = -(escalaX - 1) * x
 *   ty = -(escalaY - 1) * y
 *
 * **Por que `contain`, não `cover`:** `object-fit: cover` já pré-corta a imagem — descarta
 * pra sempre, no próprio *paint*, tudo o que sobra além da caixa — antes de qualquer `transform`
 * rodar em cima. Um `translate()` depois disso só desliza os pixels que sobreviveram ao corte;
 * nunca devolve o que já foi descartado (essa foi a causa raiz do zoom "quebrado" original —
 * ver histórico deste arquivo). `contain` nunca corta nada (só letterbox), então o `translate()`/
 * `scale()` calculados aqui têm o material inteiro da imagem disponível pra revelar.
 *
 * Com `x`/`y` em 0–100 e `escala` (zoom manual do slider) em [1, 3]. `escalaMinimaPorEixo` entra
 * pra não jogar fora a folga que uma foto não-quadrada já tem de graça: numa foto retangular, o
 * eixo que sobra começa com `escalaX`/`escalaY` > 1 mesmo com `escala = 1` (zoom manual no
 * mínimo) — dá pra arrastar até alcançar qualquer parte da imagem sem precisar zoom nenhum. Numa
 * foto já quadrada (proporção igual à da caixa), a mínima é sempre 1 nos dois eixos e a fórmula
 * volta a exigir zoom manual antes de qualquer arrasto (mesmo comportamento de sempre — e, nesse
 * caso, `escalaTotal` reduz exatamente a `escala`, idêntico ao `cover` de sempre). O `scale()` do
 * CSS é sempre `escalaTotal` — um único número, nunca `escalaX`/`escalaY` diretamente — então a
 * imagem nunca distorce; só o *translate* varia por eixo (`tx`/`ty` continuam usando `escalaX`/
 * `escalaY` cada um, não `escalaTotal`).
 *
 * Em qualquer combinação, `x`/`y` ficam sempre dentro de 0–100 e o `tx`/`ty` resultante nunca
 * desloca o conteúdo além do que `escalaX`/`escalaY` cresceram — nunca revela vazio além da borda
 * da imagem.
 */
export function estiloTransformEnquadramento(
  foco: FichaImagemFocoDto | null,
  proporcaoImagem: Proporcao | null = null,
  proporcaoCaixa: Proporcao = CAIXA_QUADRADA,
): string | null {
  if (!foco) {
    return null;
  }
  const minima = escalaMinimaPorEixo(proporcaoImagem, proporcaoCaixa);
  const escalaTotal = foco.escala * Math.max(minima.x, minima.y);
  const tx = -(foco.escala * minima.x - 1) * foco.x;
  const ty = -(foco.escala * minima.y - 1) * foco.y;
  return `translate(${tx}%, ${ty}%) scale(${escalaTotal})`;
}

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Converte um arrasto (delta em % da caixa de pré-visualização) no novo valor de `x`/`y`, na
 * mesma direção de sempre (arrastar pra direita revela mais do lado esquerdo → `x` diminui).
 *
 * `escalaEixo` é a escala **total** daquele eixo (`escala * escalaMinimaPorEixo(...).x` ou `.y`,
 * ver {@link estiloTransformEnquadramento}) — não a escala bruta do slider. Deriva direto de
 * `tx = -(escalaEixo-1)*x`, que é exatamente o deslocamento em tela (em % da caixa): mover o
 * ponteiro por `deltaPercentualCaixa` desloca `tx` pelo mesmo tanto, e invertendo a fórmula:
 * `novoX = x - deltaPercentualCaixa / (escalaEixo - 1)`.
 *
 * Sem margem naquele eixo (`escalaEixo <= 1`) não há pra onde arrastar — `valorAtual` volta
 * inalterado.
 */
export function deslocarPan(valorAtual: number, deltaPercentualCaixa: number, escalaEixo: number): number {
  if (escalaEixo <= 1) {
    return valorAtual;
  }
  return limitar(valorAtual - deltaPercentualCaixa / (escalaEixo - 1), 0, 100);
}
