import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from contratados_transcriber.api import Api, ConflitoError
from contratados_transcriber.core import CredentialError, OfflineError, SecureStore, Session, account_namespace
from contratados_transcriber.importacao import Importacao, ParecidoError, obter_glossario, preparar_importacao
from contratados_transcriber.wav import calcular_hash
from wav_fixtures import silencio, tom, wav

CONTEXTO = {"sessaoId": 11, "campanhaId": 9, "titulo": "Sessão"}
ASSOCIACOES = [{"nomeOrigem": "joao", "participante": "João"}, {"nomeOrigem": "maria", "participante": "Maria"}]
MARCADOR = b"MARCADOR-DE-AUDIO-NAO-PODE-VAZAR"


class Resposta:
    def __init__(self, dados): self.dados = dados
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, quantidade): return json.dumps({"sucesso": True, "dados": self.dados}).encode()


class Servidor:
    """Substitui o `opener` do Api: registra TUDO o que o app envia e responde como o backend."""
    def __init__(self):
        self.pedidos = []; self.proximo_id = 100; self.falhar_em = None; self.conflito_em = None
    def open(self, req, timeout=None):
        corpo = json.loads(req.data) if req.data else None
        self.pedidos.append({"url": req.full_url, "metodo": req.get_method(), "corpo": corpo, "cabecalhos": dict(req.header_items()), "bruto": req.data or b""})
        chave = (req.get_method(), req.full_url.split("/transcricao/aplicativo/")[1].split("?")[0].rstrip("0123456789/"))
        if self.falhar_em == chave: raise URLError("sem rede")
        if self.conflito_em == chave: raise HTTPError(req.full_url, 409, "x", {}, None)
        if req.get_method() == "POST" and "faixa" in req.full_url:
            self.proximo_id += 1
            return Resposta({"id": self.proximo_id, "identificador": f"00000000-0000-4000-8000-{self.proximo_id:012d}"})
        return Resposta({"ok": True})


class ImportacaoTests(unittest.TestCase):
    def setUp(self):
        self.pasta = TemporaryDirectory(); self.addCleanup(self.pasta.cleanup)
        self.raiz = Path(self.pasta.name)

    def wav(self, nome, dados=None, **opcoes):
        caminho = self.raiz / nome
        caminho.write_bytes(wav(dados if dados is not None else tom(4800), **opcoes))
        return caminho

    def importacao(self, **extra):
        return Importacao(CONTEXTO, ASSOCIACOES, **extra)

    # --- lote, erro isolado, sugestão -----------------------------------
    def test_lote_com_nomes_conhecidos_e_desconhecidos_sugere_sem_confirmar(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("2-maria.wav"), self.wav("3-carlos.wav")])
        sugestoes = [f.sugestao["origem"] for f in imp.faixas]
        self.assertEqual(sugestoes, ["ASSOCIACAO", "ASSOCIACAO", "DESCONHECIDA"])
        self.assertEqual([f.participante for f in imp.faixas], ["João", "Maria", None])
        self.assertFalse(any(f.confirmada for f in imp.faixas))
        self.assertFalse(imp.pode_transcrever())

    def test_erro_de_uma_faixa_e_isolado_e_informa_o_arquivo(self):
        self.wav("1-joao.wav")
        (self.raiz / "falso.wav").write_bytes(b"texto")
        imp = self.importacao()
        imp.adicionar([self.raiz / "1-joao.wav", self.raiz / "falso.wav"])
        ruim = imp.faixas[1]
        self.assertIsNone(ruim.info)
        self.assertIn("falso.wav", ruim.erro)
        self.assertEqual(ruim.codigo_erro, "NAO_RIFF")
        self.assertNotIn(self.pasta.name, ruim.erro)
        self.assertIsNotNone(imp.faixas[0].info)

    def test_faixa_com_erro_nao_pode_ser_confirmada_nem_entra_no_pacote(self):
        (self.raiz / "falso.wav").write_bytes(b"texto")
        imp = self.importacao()
        imp.adicionar([self.raiz / "falso.wav"])
        with self.assertRaises(ValueError): imp.confirmar(0, "Alguém")

    def test_alertas_de_duplicidade_e_de_faixa_faltante(self):
        imp = self.importacao(participantes_esperados=["João", "Maria", "Pedro"])
        imp.adicionar([self.wav("1-joao.wav"), self.wav("copia.wav")])  # mesmo conteúdo, nomes diferentes
        self.assertEqual([a["tipo"] for a in imp.alertas_duplicidade()], ["POSSIVEL_COPIA_RENOMEADA"])
        imp.confirmar(0, "João")
        self.assertEqual(imp.participantes_faltantes(), ["Maria", "Pedro"])

    def test_mesmo_caminho_escolhido_duas_vezes_vira_duplicado(self):
        imp = self.importacao()
        caminho = self.wav("1-joao.wav")
        imp.adicionar([caminho]); imp.adicionar([caminho])
        self.assertEqual([a["tipo"] for a in imp.alertas_duplicidade()], ["DUPLICADO"])

    # --- confirmação ------------------------------------------------------
    def test_confirmar_aceita_corrigir_a_sugestao_e_nunca_altera_o_arquivo(self):
        caminho = self.wav("1-joao.wav")
        antes = calcular_hash(caminho)
        imp = self.importacao()
        imp.adicionar([caminho])
        imp.confirmar(0, "  João   Pedro ")
        self.assertEqual((imp.faixas[0].participante, imp.faixas[0].confirmada), ("João Pedro", True))
        self.assertEqual(calcular_hash(caminho), antes)

    def test_participante_parecido_exige_confirmacao_explicita(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("9-x.wav", tom(2400))])
        imp.confirmar(0, "João")
        with self.assertRaises(ParecidoError) as caught: imp.confirmar(1, "Joao")
        self.assertEqual(caught.exception.parecido, "João")
        self.assertFalse(imp.faixas[1].confirmada)
        imp.confirmar(1, "Joao", confirmar_parecido=True)
        self.assertTrue(imp.faixas[1].confirmada)

    def test_uma_pessoa_pode_ter_varias_faixas(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("1b-joao.wav", tom(2400))])
        imp.confirmar(0, "João"); imp.confirmar(1, "João")
        self.assertTrue(all(f.confirmada for f in imp.faixas))

    def test_rejeitar_sugestao_limpa_participante_e_confirmacao(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav")])
        imp.confirmar(0, "João"); imp.rejeitar_sugestao(0)
        self.assertEqual((imp.faixas[0].participante, imp.faixas[0].confirmada), (None, False))

    def test_participante_invalido_e_recusado(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav")])
        for invalido in ["", "   ", "a\nb", "x" * 256, None]:
            with self.subTest(invalido=invalido), self.assertRaises(ValueError): imp.confirmar(0, invalido)

    # --- offset manual --------------------------------------------------
    def test_offset_manual_nao_mexe_nos_tempos_brutos_nem_nas_outras_faixas(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("2-maria.wav", silencio(24000) + tom(4800))])
        duracoes = [f.info.duracao_ms for f in imp.faixas]
        silencios = [f.info.silencio_inicial_ms for f in imp.faixas]
        imp.ajustar_offset(1, -750)
        self.assertEqual([f.deslocamento_ms for f in imp.faixas], [0, -750])
        self.assertEqual([f.info.duracao_ms for f in imp.faixas], duracoes)
        self.assertEqual([f.info.silencio_inicial_ms for f in imp.faixas], silencios)  # silêncio é só medido

    def test_silencio_inicial_nunca_vira_offset_sozinho(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav", silencio(72000) + tom(4800))])
        self.assertEqual(imp.faixas[0].info.silencio_inicial_ms, 1500)
        self.assertEqual(imp.faixas[0].deslocamento_ms, 0)

    def test_offset_invalido_e_recusado(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav")])
        for invalido in [1.5, "10", None, 2 ** 53, True]:
            with self.subTest(invalido=invalido), self.assertRaises(ValueError): imp.ajustar_offset(0, invalido)

    # --- registro no servidor: só metadados ------------------------------
    def preparar_e_registrar(self, servidor=None, **opcoes):
        caminho = self.wav("1-joao.wav", MARCADOR + tom(4800))
        imp = self.importacao()
        imp.adicionar([caminho])
        imp.confirmar(0, "João"); imp.ajustar_offset(0, -250)
        api = Api("https://api.example"); servidor = servidor or Servidor()
        api.opener = servidor
        return imp, api, servidor, caminho, imp.registrar(api, "segredo-do-dispositivo", **opcoes)

    def test_registro_cria_a_faixa_e_confirma_com_offset_e_silencio(self):
        imp, _, servidor, _, resumo = self.preparar_e_registrar()
        self.assertEqual([r["ok"] for r in resumo], [True])
        criar, alterar = servidor.pedidos
        self.assertEqual((criar["metodo"], criar["url"]), ("POST", "https://api.example/transcricao/aplicativo/sessao/11/faixa"))
        self.assertEqual(criar["corpo"], {"nomeArquivo": "1-joao.wav", "participante": "João", "deslocamentoMilissegundos": -250})
        self.assertEqual((alterar["metodo"], alterar["url"]), ("PUT", "https://api.example/transcricao/aplicativo/faixa/101"))
        self.assertEqual(alterar["corpo"], {"participante": "João", "identidadeConfirmada": True, "deslocamentoMilissegundos": -250,
                                            "silencioInicialMilissegundos": 0})
        self.assertEqual((imp.faixas[0].faixa_id, imp.faixas[0].sincronizada), (101, True))

    def test_prova_de_rede_nada_de_wav_caminho_ou_hash_sai_do_computador(self):
        imp, _, servidor, caminho, _ = self.preparar_e_registrar()
        proibidos = [MARCADOR, str(self.raiz).encode(), str(self.raiz).replace("\\", "/").encode(), calcular_hash(caminho).encode(),
                     b"caminho", b"hash", b"sha256", b"wav\":"]
        for pedido in servidor.pedidos:
            tudo = pedido["url"].encode() + pedido["bruto"] + json.dumps(pedido["cabecalhos"]).encode()
            for proibido in proibidos:
                self.assertNotIn(proibido, tudo, f"{proibido!r} vazou em {pedido['url']}")
        self.assertTrue(all(set(p["corpo"]) <= {"nomeArquivo", "participante", "deslocamentoMilissegundos", "identidadeConfirmada",
                                                "silencioInicialMilissegundos", "campanhaId", "nomeOrigem", "confirmarParecido"} for p in servidor.pedidos))

    def test_so_registra_o_que_foi_confirmado(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("3-carlos.wav", tom(2400))])
        imp.confirmar(0, "João")
        api = Api("https://api.example"); servidor = Servidor(); api.opener = servidor
        resumo = imp.registrar(api, "s")
        self.assertEqual([r["indice"] for r in resumo], [0])
        self.assertEqual(len([p for p in servidor.pedidos if p["metodo"] == "POST"]), 1)

    def test_associacao_nova_e_salva_para_reuso_e_conhecida_nao_repete(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("3-carlos.wav", tom(2400))])
        imp.confirmar(0, "João"); imp.confirmar(1, "Carlos")
        api = Api("https://api.example"); servidor = Servidor(); api.opener = servidor
        imp.registrar(api, "s")
        identidades = [p["corpo"] for p in servidor.pedidos if p["url"].endswith("/identidade")]
        self.assertEqual(identidades, [{"campanhaId": 9, "nomeOrigem": "carlos", "participante": "Carlos"}])

    def test_repetir_o_registro_nao_duplica_faixas_no_servidor(self):
        imp, api, servidor, _, _ = self.preparar_e_registrar()
        antes = len(servidor.pedidos)
        imp.registrar(api, "segredo-do-dispositivo")
        self.assertEqual(len(servidor.pedidos), antes)

    def test_se_o_servidor_cair_no_meio_a_faixa_criada_nao_e_recriada_no_retry(self):
        caminho = self.wav("1-joao.wav"); imp = self.importacao(); imp.adicionar([caminho]); imp.confirmar(0, "João")
        api = Api("https://api.example"); servidor = Servidor(); api.opener = servidor
        servidor.falhar_em = ("PUT", "faixa")
        with self.assertRaises(OfflineError): imp.registrar(api, "s")
        self.assertEqual((imp.faixas[0].faixa_id, imp.faixas[0].sincronizada), (101, False))  # criada, ainda não confirmada
        servidor.falhar_em = None
        resumo = imp.registrar(api, "s")
        self.assertTrue(resumo[0]["ok"])
        self.assertEqual(len([p for p in servidor.pedidos if p["metodo"] == "POST" and p["url"].endswith("/faixa")]), 1)

    def test_conflito_do_servidor_em_uma_faixa_nao_derruba_as_outras(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav"), self.wav("2-maria.wav", tom(2400))])
        imp.confirmar(0, "João"); imp.confirmar(1, "Maria")
        api = Api("https://api.example"); servidor = Servidor(); api.opener = servidor
        original = servidor.open
        def com_conflito(req, timeout=None):
            if req.get_method() == "PUT" and req.full_url.endswith("/faixa/101"): raise HTTPError(req.full_url, 409, "x", {}, None)
            return original(req, timeout)
        servidor.open = com_conflito
        resumo = imp.registrar(api, "s")
        self.assertEqual([r["ok"] for r in resumo], [False, True])
        self.assertIn("revise", resumo[0]["erro"].lower())

    # --- pacote do motor -------------------------------------------------
    def test_pacote_do_motor_so_sai_com_tudo_confirmado_e_registrado(self):
        imp, api, _, _, _ = self.preparar_e_registrar()
        resultado = imp.pacote_trabalho(["Aragorn", "zé"], "pt")
        self.assertTrue(resultado["ok"], resultado)
        pacote = resultado["pacote"]
        self.assertEqual((pacote["campanhaId"], pacote["sessaoId"], pacote["idioma"]), (9, 11, "pt"))
        self.assertEqual(pacote["glossario"], ["Aragorn", "zé"])
        self.assertEqual(pacote["faixas"][0]["deslocamentoMilissegundos"], -250)
        self.assertEqual(pacote["faixas"][0]["silencioInicialMilissegundos"], 0)  # informado, nunca aplicado

    def test_pacote_recusa_faixa_nao_confirmada_e_pacote_vazio(self):
        imp = self.importacao()
        imp.adicionar([self.wav("1-joao.wav")])
        self.assertFalse(imp.pacote_trabalho([], "pt")["ok"])
        self.assertFalse(self.importacao().pacote_trabalho([], "pt")["ok"])

    def test_glossario_de_outra_campanha_nao_entra(self):
        imp, *_ = self.preparar_e_registrar()
        resultado = imp.pacote_trabalho([], "pt", glossario_por_campanha=[{"campanhaId": 8, "termo": "Alheio"}])
        self.assertFalse(resultado["ok"])
        self.assertNotIn("Alheio", json.dumps(resultado["erros"], ensure_ascii=False))

    def test_dois_pacotes_de_campanhas_diferentes_nao_misturam_glossario(self):
        a, *_ = self.preparar_e_registrar()
        b = Importacao({"sessaoId": 12, "campanhaId": 10, "titulo": "Outra"}, [])
        caminho = self.wav("x.wav"); b.adicionar([caminho]); b.confirmar(0, "Ana")
        api = Api("https://api.example"); api.opener = Servidor(); b.registrar(api, "s")
        self.assertEqual(a.pacote_trabalho(["Termo A"], "pt")["pacote"]["glossario"], ["Termo A"])
        self.assertEqual(b.pacote_trabalho(["Termo B"], "pt")["pacote"]["glossario"], ["Termo B"])

    # --- persistência local por conta -----------------------------------
    def test_estado_persiste_localmente_e_e_separado_por_pasta_de_conta(self):
        caminho = self.wav("1-joao.wav")
        imp = self.importacao(); imp.adicionar([caminho]); imp.confirmar(0, "João"); imp.ajustar_offset(0, 120)
        conta_a, conta_b = self.raiz / "conta-a", self.raiz / "conta-b"
        imp.salvar(conta_a)
        recarregada = Importacao.carregar(conta_a, CONTEXTO, ASSOCIACOES)
        self.assertEqual((recarregada.faixas[0].participante, recarregada.faixas[0].confirmada, recarregada.faixas[0].deslocamento_ms),
                         ("João", True, 120))
        self.assertEqual(len(Importacao.carregar(conta_b, CONTEXTO, ASSOCIACOES).faixas), 0)  # outra conta não enxerga
        # o arquivo local guarda caminho (é local); nada disso é usado em requisição, como provado acima

    def test_arquivo_alterado_depois_da_confirmacao_perde_a_confirmacao(self):
        caminho = self.wav("1-joao.wav")
        imp = self.importacao(); imp.adicionar([caminho]); imp.confirmar(0, "João")
        imp.salvar(self.raiz / "conta")
        caminho.write_bytes(wav(tom(4800) + tom(24)))  # alterado no disco
        recarregada = Importacao.carregar(self.raiz / "conta", CONTEXTO, ASSOCIACOES)
        self.assertFalse(recarregada.faixas[0].confirmada)
        self.assertIn("ARQUIVO_ALTERADO", recarregada.faixas[0].avisos)

    def test_arquivo_renomeado_ou_removido_vira_erro_isolado_sem_derrubar_o_resto(self):
        a, b = self.wav("1-joao.wav"), self.wav("2-maria.wav", tom(2400))
        imp = self.importacao(); imp.adicionar([a, b]); imp.confirmar(0, "João"); imp.confirmar(1, "Maria")
        imp.salvar(self.raiz / "conta")
        a.rename(self.raiz / "novo-nome.wav")
        recarregada = Importacao.carregar(self.raiz / "conta", CONTEXTO, ASSOCIACOES)
        self.assertEqual(recarregada.faixas[0].codigo_erro, "ILEGIVEL")
        self.assertTrue(recarregada.faixas[1].confirmada)

    def test_estado_de_outra_sessao_nao_e_carregado(self):
        imp = self.importacao(); imp.adicionar([self.wav("1-joao.wav")]); imp.salvar(self.raiz / "conta")
        outra = Importacao.carregar(self.raiz / "conta", {"sessaoId": 99, "campanhaId": 9, "titulo": "x"}, ASSOCIACOES)
        self.assertEqual(len(outra.faixas), 0)

    def test_api_recusa_nome_com_caminho_e_consulta_nao_inteira(self):
        api = Api("https://api.example"); api.opener = Servidor()
        for nome in ["C:\\x\\a.wav", "/tmp/a.wav", "a/b.wav", "..", "."]:
            with self.subTest(nome=nome), self.assertRaises(ValueError): api.criar_faixa("s", 1, nome, "A", 0)
        for consulta in [{"campanhaId": "9; DROP"}, {"campanhaId": 0}, {"campanhaId": True}, {"campanha Id": 1}]:
            with self.subTest(consulta=consulta), self.assertRaises(ValueError): api.request("/transcricao/aplicativo/glossario", secret="s", consulta=consulta)

    def test_api_conflito_409_vira_erro_proprio_sem_eco_do_corpo(self):
        api = Api("https://api.example")
        with patch.object(api.opener, "open", side_effect=HTTPError("https://x", 409, "privado", {}, None)):
            with self.assertRaises(ConflitoError) as caught: api.criar_identidade("s", 9, "a", "A")
        self.assertNotIn("privado", str(caught.exception))


class ApiFalsa:
    """Servidor fictício para a Session: o que o app lê é só o que o Mestre atual pode ver."""
    origin = "https://api.example"
    def __init__(self, status_usuario=1):
        self.usuario = status_usuario; self.chamadas = []
    def status(self, segredo): return {"vinculado": True, "usuarioId": self.usuario, "login": f"u{self.usuario}", "expirado": False}
    def identidades(self, segredo, campanha_id):
        self.chamadas.append(("identidades", segredo, campanha_id))
        return [{"nomeOrigem": "joao", "participante": "João"}, {"nomeOrigem": "maria", "participante": "Maria"}]
    def faixas(self, segredo, sessao_id): return [{"participante": "Pedro"}]
    def glossario(self, segredo, campanha_id):
        self.chamadas.append(("glossario", segredo, campanha_id))
        return [{"termo": "Aragorn"}, {"termo": "Zé"}]


class SessaoComContaTests(unittest.TestCase):
    def sessao(self, raiz: Path, usuario: int, contexto=CONTEXTO):
        loja = SecureStore(raiz, lambda b: b[::-1], lambda b: b[::-1])
        api = ApiFalsa(usuario)
        loja.save({"secret": f"segredo-{usuario}", "origin": api.origin, "request_id": "x"})
        sessao = Session(api, loja)
        sessao.refresh()
        sessao.context = dict(contexto) if contexto else None
        return sessao

    def test_preparar_importacao_le_associacoes_participantes_e_sugere_o_que_falta(self):
        with TemporaryDirectory() as d:
            sessao = self.sessao(Path(d), 1)
            imp = preparar_importacao(sessao)
            self.assertEqual(imp.associacoes[0]["nomeOrigem"], "joao")
            self.assertEqual(imp.participantes_esperados, ["João", "Maria"])
            self.assertIn("Pedro", imp.participantes_conhecidos)
            self.assertEqual(obter_glossario(sessao), ["Aragorn", "Zé"])
            self.assertEqual({c[1] for c in sessao.api.chamadas}, {"segredo-1"})

    def test_sem_sessao_aberta_ou_sem_vinculo_nao_importa(self):
        with TemporaryDirectory() as d:
            with self.assertRaises(ValueError): preparar_importacao(self.sessao(Path(d), 1, contexto=None))
            loja = SecureStore(Path(d) / "vazio", lambda b: b[::-1], lambda b: b[::-1])
            sem_vinculo = Session(ApiFalsa(), loja); sem_vinculo.context = dict(CONTEXTO)
            with self.assertRaises(CredentialError): preparar_importacao(sem_vinculo)

    def test_duas_contas_na_mesma_origem_nao_enxergam_a_importacao_uma_da_outra(self):
        # O app tem um vínculo por vez: a conta 2 assume depois de a 1 sair, na MESMA origem e com a MESMA sessão.
        with TemporaryDirectory() as d:
            raiz = Path(d); wavs = raiz / "audio"; wavs.mkdir()
            (wavs / "1-joao.wav").write_bytes(wav(tom(4800)))
            conta1 = self.sessao(raiz, 1)
            pasta1 = conta1.pasta_da_conta()
            imp = preparar_importacao(conta1); imp.adicionar([wavs / "1-joao.wav"]); imp.confirmar(0, "João")
            imp.salvar(pasta1)
            conta2 = self.sessao(raiz, 2)
            pasta2 = conta2.pasta_da_conta()
            self.assertNotEqual(pasta1, pasta2)
            self.assertEqual(pasta1.name, account_namespace("https://api.example", 1))
            self.assertEqual(pasta2.name, account_namespace("https://api.example", 2))
            self.assertEqual(len(preparar_importacao(conta2).faixas), 0)  # a conta 2 não vê a importação da conta 1
            volta = preparar_importacao(self.sessao(raiz, 1))
            self.assertEqual((len(volta.faixas), volta.faixas[0].participante), (1, "João"))  # a da conta 1 continua intacta


if __name__ == "__main__":
    unittest.main()
