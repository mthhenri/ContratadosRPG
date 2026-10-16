"""As regras puras do app precisam dar o MESMO resultado que o `shared/` (TypeScript). Os vetores vêm do TypeScript."""
import json
import unittest
from pathlib import Path

from contratados_transcriber import regras_transcricao as r

VETORES = Path(__file__).resolve().parents[3] / "shared" / "src" / "validators" / "transcricao-importacao.vetores.json"


class RegrasCompartilhadasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert VETORES.is_file(), f"vetores compartilhados ausentes: {VETORES}"
        cls.v = json.loads(VETORES.read_text(encoding="utf-8"))

    def test_os_vetores_cobrem_todas_as_funcoes(self):
        self.assertEqual(sorted(self.v), ["chaveParecida", "chaveTermo", "conflitoTermo", "duplicidade", "glossarioEfetivo",
            "normalizarRotulo", "pacote", "participanteParecido", "participantesSemFaixa", "sugestao", "validarParticipante", "validarTermo"])
        self.assertGreater(sum(len(lista) for lista in self.v.values()), 200)

    def test_normalizacao_e_chaves(self):
        for nome, funcao in (("normalizarRotulo", r.normalizar_rotulo), ("chaveTermo", r.chave_termo), ("chaveParecida", r.chave_parecida)):
            for caso in self.v[nome]:
                with self.subTest(funcao=nome, entrada=caso["entrada"]):
                    self.assertEqual(funcao(caso["entrada"]), caso["esperado"])

    def test_validacao_de_termo_e_participante(self):
        for caso in self.v["validarTermo"]:
            with self.subTest(entrada=caso["entrada"]):
                self.assertEqual(r.validar_termo(caso["entrada"]), caso["esperado"])
        for caso in self.v["validarParticipante"]:
            with self.subTest(entrada=caso["entrada"]):
                self.assertEqual(r.validar_participante(caso["entrada"]), caso["esperado"])

    def test_conflito_sugestao_duplicidade_faltantes_e_parecido(self):
        for caso in self.v["conflitoTermo"]:
            with self.subTest(termo=caso["termo"]):
                self.assertEqual(r.localizar_conflito_termo(caso["termo"], caso["existentes"]), caso["esperado"])
        for caso in self.v["sugestao"]:
            with self.subTest(arquivo=caso["arquivo"]):
                self.assertEqual(r.sugerir_identidade(caso["arquivo"], caso["associacoes"]), caso["esperado"])
        for caso in self.v["duplicidade"]:
            self.assertEqual(r.detectar_duplicidade(caso["arquivos"]), caso["esperado"])
        for caso in self.v["participantesSemFaixa"]:
            self.assertEqual(r.participantes_sem_faixa(caso["esperados"], caso["faixas"]), caso["esperado"])
        for caso in self.v["participanteParecido"]:
            with self.subTest(participante=caso["participante"]):
                self.assertEqual(r.localizar_participante_parecido(caso["participante"], caso["conhecidos"]), caso["esperado"])

    def test_glossario_efetivo_e_pacote_do_motor(self):
        for caso in self.v["glossarioEfetivo"]:
            self.assertEqual(r.montar_glossario_efetivo(caso["termos"]), caso["esperado"])
        for caso in self.v["pacote"]:
            with self.subTest(entrada=json.dumps(caso["entrada"])[:80]):
                self.assertEqual(r.montar_pacote_trabalho(caso["entrada"]), caso["esperado"])

    def test_pacote_nao_vaza_termo_de_outra_campanha_na_mensagem(self):
        resultado = r.montar_pacote_trabalho({"campanhaId": 7, "sessaoId": 3, "idioma": "pt", "faixas": [],
            "glossario": [{"campanhaId": 8, "termo": "Segredo do outro"}]})
        self.assertFalse(resultado["ok"])
        self.assertNotIn("Segredo do outro", json.dumps(resultado["erros"], ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
