import { RegrasTrecho } from "../regras.model";
import { estruturarNotaComMarcadores, lerTextoRegras, separarBonusDeFormacao } from "./regras-texto";

const texto = (valor: string): RegrasTrecho => ({ tipo: "texto", texto: valor });

describe("separarBonusDeFormacao (RV-06)", () => {
    it("separa os dois bônus de cada Formação sem alterar a quantidade nem o efeito", () => {
        const bombeiro = separarBonusDeFormacao([texto("+3 de resistência a dano Químico +1 dado em testes de Vigor")]);
        expect(bombeiro.map(lerTextoRegras)).toEqual(["+3 de resistência a dano Químico", "+1 dado em testes de Vigor"]);
        const alpinista = separarBonusDeFormacao([texto("+1m de Deslocamento +1 dado em ambos os testes de Corrida")]);
        expect(alpinista.map(lerTextoRegras)).toEqual(["+1m de Deslocamento", "+1 dado em ambos os testes de Corrida"]);
    });

    it("não parte uma frase que continua (e/ou, vírgula) nem um bônus único", () => {
        for (const frase of ["+1 em Vigor e +1 em Força", "+1 em Vigor ou +1 em Força", "+1 em Vigor, +1 em Força", "+1 em ESCOLHA ( exceto LUT ou PON )"]) {
            const grupos = separarBonusDeFormacao([texto(frase)]);
            expect(grupos).toHaveLength(1);
            expect(lerTextoRegras(grupos[0])).toBe(frase);
        }
    });

    it("preserva marcações (negrito) dentro do grupo em que estão", () => {
        const grupos = separarBonusDeFormacao([
            { tipo: "negrito", filhos: [texto("+2 Vigor")] }, texto(" +1 dado em testes"),
        ]);
        expect(grupos).toHaveLength(1);
        expect(grupos[0][0]).toMatchObject({ tipo: "negrito" });
    });
});

describe("estruturarNotaComMarcadores (RV-06)", () => {
    const amaldicoado: RegrasTrecho[] = [
        { tipo: "italico", filhos: [texto("⬦ Amaldiçoado pelo Passado Você é a sucessão de uma besta.")] },
        texto(" Você recebe: ▢ +1 dado em todos os testes relacionados a Sequelas. ▢ +2 no limite máximo de Traumas Suportados. ▢ +1 Formação extra em sua Origem (escolhida entre Mestre e Jogador). "),
        { tipo: "italico", filhos: [texto("No caso da seleção da habilidade de experimento Peculiaridade")] },
        texto(", a formação extra ainda se mantém"),
    ];

    it("separa a introdução, os três itens ▢ e a ressalva, sem perder nenhum texto", () => {
        const nota = estruturarNotaComMarcadores(amaldicoado)!;
        expect(lerTextoRegras(nota.introducao)).toBe("⬦ Amaldiçoado pelo Passado Você é a sucessão de uma besta. Você recebe:");
        expect(nota.itens.map(lerTextoRegras)).toEqual([
            "+1 dado em todos os testes relacionados a Sequelas.",
            "+2 no limite máximo de Traumas Suportados.",
            "+1 Formação extra em sua Origem (escolhida entre Mestre e Jogador).",
        ]);
        expect(lerTextoRegras(nota.ressalva)).toBe("No caso da seleção da habilidade de experimento Peculiaridade, a formação extra ainda se mantém");
    });

    it("sem dois marcadores no mesmo trecho de texto, a nota não é estruturada", () => {
        expect(estruturarNotaComMarcadores([texto("Uma nota comum.")])).toBeNull();
        expect(estruturarNotaComMarcadores([texto("▢ um só")])).toBeNull();
    });
});
