import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", {
    paths: [process.env.CODEX_BROWSER_PACKAGES || process.cwd()]
}));
const pasta = dirname(fileURLToPath(import.meta.url));
const navegador = await chromium.launch({ channel: "msedge", headless: true });
const resultados = [];
const paleta = JSON.parse(readFileSync(join(pasta, "paleta.json"), "utf8"));
for (const [largura, altura] of [[1920,1080],[360,800],[960,1080],[1366,768]]) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
    const erros = [];
    pagina.on("pageerror", erro => erros.push(erro.message));
    await pagina.goto(pathToFileURL(join(pasta,"../m10-04-scp-aprovacao.html")).href);
    await pagina.evaluate(() => document.fonts.ready);
    const medidas = await pagina.evaluate(paleta => ({
        largura: innerWidth,
        larguraDocumento: document.documentElement.scrollWidth,
        imagensCompletas: [...document.images].every(imagem => imagem.complete && imagem.naturalWidth),
        icones: document.querySelectorAll("svg").length,
        niveis: document.querySelectorAll(".prancha__nivel").length,
        fontes: document.fonts.check('16px "IBM Plex Mono"') &&
            document.fonts.check('16px "IBM Plex Sans"'),
        tamanhos: [...document.querySelectorAll(".prancha__tamanhos svg")].map(svg =>
            svg.getBoundingClientRect().width),
        identidadesCorretas: [...document.querySelectorAll(".prancha__base")].every(base => {
            const faixas = base.querySelectorAll(".prancha__tamanhos");
            return [...faixas[0].querySelectorAll("svg")].every(svg =>
                svg.getAttribute("viewBox") === "0 0 24 24") &&
                [...faixas[1].querySelectorAll("svg")].every(svg =>
                    svg.getAttribute("viewBox") === "0 0 1000 1000") &&
                [...base.querySelectorAll(".prancha__nivel svg")].every(svg =>
                    svg.getAttribute("viewBox") === "0 0 1000 1000");
        }),
        coresCorretas: paleta.every(nivel => {
            const rgb = [1,3,5].map(indice => parseInt(nivel.cor.slice(indice, indice + 2),16));
            return [...document.querySelectorAll(`.prancha__nivel--${nivel.chave} svg`)]
                .every(svg => getComputedStyle(svg).color === `rgb(${rgb.join(", ")})`);
        })
    }), paleta);
    const tamanhosEsperados = Array.from({ length: 4 }, () => [16,20,24,32,48,64,96]).flat();
    const tamanhosCorretos = medidas.tamanhos.length === tamanhosEsperados.length &&
        medidas.tamanhos.every((tamanho, indice) =>
            Math.abs(tamanho - tamanhosEsperados[indice]) < 0.1);
    if (medidas.larguraDocumento !== largura || !medidas.imagensCompletas ||
        medidas.icones !== 44 || medidas.niveis !== 16 || !medidas.identidadesCorretas ||
        !medidas.coresCorretas || !tamanhosCorretos || erros.length) {
        throw new Error(JSON.stringify({ medidas, erros }));
    }
    await pagina.screenshot({ path: join(pasta, `prancha-${largura}x${altura}.png`), fullPage: true });
    if (largura === 1920) {
        await pagina.locator(".prancha__tamanhos").first().screenshot({ path: join(pasta,"detalhe-icone.png") });
    }
    resultados.push({ viewport: `${largura}x${altura}`, ...medidas, erros });
    await pagina.close();
}
await navegador.close();
writeFileSync(join(pasta,"verificacao.json"), JSON.stringify(resultados,null,4) + "\n");
console.log(JSON.stringify(resultados.map(({viewport, larguraDocumento, fontes}) =>
    ({viewport,larguraDocumento,fontes}))));
