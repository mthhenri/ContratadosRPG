import importlib.util
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from contratados_transcriber.api import Api
from contratados_transcriber.core import SecureStore, Session
from wav_fixtures import silencio, tom, wav
from test_importacao import ApiFalsa, CONTEXTO, Servidor


@unittest.skipUnless(importlib.util.find_spec("PySide6"), "PySide6 precisa estar instalado")
class PainelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        from contratados_transcriber.painel_importacao import PainelImportacao
        self.pasta = TemporaryDirectory(); self.addCleanup(self.pasta.cleanup)
        self.raiz = Path(self.pasta.name)
        loja = SecureStore(self.raiz / "dados", lambda b: b[::-1], lambda b: b[::-1])
        self.api = ApiFalsa(1)
        loja.save({"secret": "segredo-1", "origin": self.api.origin, "request_id": "x"})
        self.sessao = Session(self.api, loja); self.sessao.refresh(); self.sessao.context = dict(CONTEXTO)
        self.servidor = Servidor()
        self.sessao.api = Api("https://api.example"); self.sessao.api.opener = self.servidor
        # métodos de leitura vêm da ApiFalsa (associações/glossário); escrita vai ao Servidor registrador
        self.sessao.api.identidades, self.sessao.api.faixas, self.sessao.api.glossario = self.api.identidades, self.api.faixas, self.api.glossario
        self.painel = PainelImportacao(lambda operacao, sucesso: sucesso(operacao()), selecionar=lambda pai: [])
        self.addCleanup(self.painel.deleteLater)
        self.painel.abrir(self.sessao)

    def wav(self, nome, dados=None):
        caminho = self.raiz / nome
        caminho.write_bytes(wav(dados if dados is not None else tom(4800)))
        return caminho

    def faixas(self):
        itens = [self.painel.lista.itemAt(i).widget() for i in range(self.painel.lista.count())]
        return itens

    def textos(self, widget, tipo):
        return [c.text() for c in widget.findChildren(tipo)]

    def clicar(self, widget, texto):
        from PySide6.QtWidgets import QPushButton
        botao = next(b for b in widget.findChildren(QPushButton) if b.text() == texto)
        botao.click()

    def campos(self, faixa):
        from PySide6.QtWidgets import QLineEdit
        return faixa.findChildren(QLineEdit)

    # --- visibilidade ---------------------------------------------------
    def test_oculto_sem_sessao_e_visivel_com_sessao(self):
        from contratados_transcriber.painel_importacao import PainelImportacao
        vazio = PainelImportacao(lambda operacao, sucesso: sucesso(operacao()))
        self.addCleanup(vazio.deleteLater)
        self.assertTrue(vazio.isHidden())
        self.assertFalse(self.painel.isHidden())
        self.painel.fechar()
        self.assertTrue(self.painel.isHidden())

    def test_janela_mostra_o_cartao_so_com_sessao_autorizada(self):
        from contratados_transcriber.app import Window
        janela = Window(); self.addCleanup(janela.close)
        self.assertTrue(janela.painel.isHidden())
        janela.painel.abrir(self.sessao)
        self.app.processEvents()
        import time
        fim = time.monotonic() + 3
        while janela.painel.isHidden() and time.monotonic() < fim:
            self.app.processEvents(); time.sleep(.01)
        self.assertFalse(janela.painel.isHidden())
        janela.sem_sessao()
        self.assertTrue(janela.painel.isHidden())
        self.assertEqual(janela.context.text(), "Nenhuma sessão aberta.")

    # --- lista, sugestão, estados ---------------------------------------
    def test_arquivos_escolhidos_aparecem_com_sugestao_dados_e_estado(self):
        from PySide6.QtWidgets import QLabel
        self.painel.receber([self.wav("1-joao.wav"), self.wav("9-carlos.wav", silencio(24000) + tom(4800))])
        faixas = self.faixas()
        self.assertEqual(len(faixas), 2)
        primeiro = self.textos(faixas[0], QLabel)
        self.assertIn("Sugerida", primeiro)
        self.assertTrue(any("48000 Hz · mono · 16 bits · 0:00,100" in t for t in primeiro))
        self.assertEqual(self.campos(faixas[0])[0].text(), "João")
        self.assertIn("Sem identidade", self.textos(faixas[1], QLabel))
        self.assertEqual(self.campos(faixas[1])[0].text(), "")
        self.assertTrue(any("silêncio inicial 0,5 s" in t for t in self.textos(faixas[1], QLabel)))
        self.assertFalse(self.painel.registrar_botao.isEnabled())

    def test_so_wav_entra_e_a_mensagem_explica(self):
        (self.raiz / "nota.mp3").write_bytes(b"x")
        self.painel.receber([self.wav("1-joao.wav"), self.raiz / "nota.mp3"])
        self.assertEqual(len(self.faixas()), 1)
        self.assertIn("1 ignorado(s)", self.painel.status.text())
        self.painel.receber([self.raiz / "nota.mp3"])
        self.assertIn(".wav", self.painel.status.text())

    def test_arquivo_ruim_vira_erro_isolado_com_remocao(self):
        from PySide6.QtWidgets import QLabel
        (self.raiz / "falso.wav").write_bytes(b"isto nao e wav")
        self.painel.receber([self.wav("1-joao.wav"), self.raiz / "falso.wav"])
        ruim = self.faixas()[1]
        self.assertEqual(ruim.property("estado"), "erro")
        self.assertIn("Erro", self.textos(ruim, QLabel))
        self.assertTrue(any("não é um arquivo WAV" in t for t in self.textos(ruim, QLabel)))
        self.assertEqual(ruim.findChildren(QLabel)[0].toolTip(), "falso.wav")  # o nome fica no cabeçalho da faixa
        self.assertEqual(len(self.campos(ruim)), 0)  # nada a confirmar numa faixa com erro
        self.assertIn("1 com erro", self.painel.status.text())
        self.clicar(ruim, "Remover da lista")
        self.assertEqual(len(self.faixas()), 1)

    # --- confirmação, parecido, offset ---------------------------------
    def test_confirmar_muda_o_estado_habilita_registrar_e_registra_so_metadados(self):
        from PySide6.QtWidgets import QLabel
        self.painel.receber([self.wav("1-joao.wav")])
        self.clicar(self.faixas()[0], "Confirmar")
        self.assertIn("Confirmada", self.textos(self.faixas()[0], QLabel))
        self.assertTrue(self.painel.registrar_botao.isEnabled())
        self.assertIn("registre 1 faixa(s) no servidor", self.painel.pacote.text())  # ainda não registrada
        self.painel.registrar_botao.click()
        self.assertIn("Registrada", self.textos(self.faixas()[0], QLabel))
        self.assertIn("1 faixa(s) registrada(s)", self.painel.status.text())
        self.assertIn("Pacote do motor: pronto — 1 faixa(s), 2 termo(s) de glossário.", self.painel.pacote.text())
        self.assertFalse(self.painel.registrar_botao.isEnabled())
        for pedido in self.servidor.pedidos:
            self.assertNotIn(str(self.raiz).encode(), pedido["bruto"])

    def test_participante_parecido_pede_confirmacao_explicita_na_tela(self):
        from PySide6.QtWidgets import QLabel, QPushButton
        self.painel.receber([self.wav("1-joao.wav"), self.wav("9-x.wav", tom(2400))])
        self.clicar(self.faixas()[0], "Confirmar")
        self.campos(self.faixas()[1])[0].setText("Joao")
        self.clicar(self.faixas()[1], "Confirmar")
        faixa = self.faixas()[1]
        self.assertTrue(any("Já existe o participante" in t for t in self.textos(faixa, QLabel)))
        self.assertIn("Confirmar mesmo assim", [b.text() for b in faixa.findChildren(QPushButton)])
        self.assertNotIn("Confirmada", self.textos(faixa, QLabel))
        self.clicar(faixa, "Confirmar mesmo assim")
        self.assertIn("Confirmada", self.textos(self.faixas()[1], QLabel))

    def test_mudar_o_nome_depois_do_aviso_exige_nova_confirmacao(self):
        from PySide6.QtWidgets import QPushButton
        self.painel.receber([self.wav("1-joao.wav"), self.wav("9-x.wav", tom(2400))])
        self.clicar(self.faixas()[0], "Confirmar")
        self.campos(self.faixas()[1])[0].setText("Joao")
        self.clicar(self.faixas()[1], "Confirmar")
        self.campos(self.faixas()[1])[0].setText("JOAO")  # outra variante: o aviso anterior não vale para ela
        self.clicar(self.faixas()[1], "Confirmar mesmo assim")
        self.assertIn("Confirmar mesmo assim", [b.text() for b in self.faixas()[1].findChildren(QPushButton)])

    def test_deslocamento_invalido_mostra_mensagem_e_valido_e_aplicado_sem_mexer_no_resto(self):
        from PySide6.QtWidgets import QLabel
        self.painel.receber([self.wav("1-joao.wav")])
        self.campos(self.faixas()[0])[1].setText("abc")
        self.clicar(self.faixas()[0], "Confirmar")
        self.assertTrue(any("número inteiro de milissegundos" in t for t in self.textos(self.faixas()[0], QLabel)))
        self.campos(self.faixas()[0])[1].setText("-750")
        self.clicar(self.faixas()[0], "Confirmar")
        self.assertEqual(self.painel.importacao.faixas[0].deslocamento_ms, -750)
        self.assertEqual(self.painel.importacao.faixas[0].info.duracao_ms, 100)

    def test_limpar_descarta_a_sugestao(self):
        from PySide6.QtWidgets import QLabel
        self.painel.receber([self.wav("1-joao.wav")])
        self.clicar(self.faixas()[0], "Limpar nome")
        self.assertIn("Sem identidade", self.textos(self.faixas()[0], QLabel))

    # --- alertas e pacote -------------------------------------------------
    def test_alertas_de_duplicidade_e_de_participante_sem_faixa(self):
        self.painel.receber([self.wav("1-joao.wav"), self.wav("copia.wav")])
        self.assertFalse(self.painel.alertas.isHidden())
        self.assertIn("Possível cópia com outro nome: 1-joao.wav, copia.wav.", self.painel.alertas.text())
        self.assertIn("Sem faixa neste lote: João, Maria", self.painel.alertas.text().replace("Maria, João", "João, Maria"))

    def test_pacote_acompanha_o_idioma_e_nunca_mistura_outra_campanha(self):
        self.painel.receber([self.wav("1-joao.wav")])
        self.clicar(self.faixas()[0], "Confirmar")
        self.painel.registrar_botao.click()
        self.painel.idioma.setText("pt br!")
        self.assertIn("Idioma inválido", self.painel.pacote.text())
        self.painel.idioma.setText("en")
        self.assertIn("pronto", self.painel.pacote.text())

    # --- nomes longos e formatação ---------------------------------------
    def test_nome_longo_e_cortado_no_meio_e_a_dica_guarda_o_inteiro(self):
        from contratados_transcriber.widgets import RotuloElidido
        nome = "participante-com-um-nome-de-arquivo-muito-longo-e-sem-espacos-nenhum-1234567890.wav"
        rotulo = RotuloElidido(nome); rotulo.resize(180, 20); rotulo.show(); self.app.processEvents()
        self.addCleanup(rotulo.deleteLater)
        self.assertIn("…", rotulo.text())
        self.assertLess(len(rotulo.text()), len(nome))
        self.assertEqual(rotulo.toolTip(), nome)

    def test_formatacao_de_duracao_e_segundos(self):
        from contratados_transcriber.painel_importacao import formatar_duracao, formatar_segundos
        self.assertEqual(formatar_duracao(0), "0:00,000")
        self.assertEqual(formatar_duracao(83456), "1:23,456")
        self.assertEqual(formatar_duracao(3723004), "1:02:03,004")
        self.assertEqual(formatar_segundos(1500), "1,5 s")
        self.assertEqual(formatar_segundos(0), "0,0 s")

    def test_arrastar_e_soltar_encaminha_so_arquivos_locais_ao_painel(self):
        from PySide6.QtCore import QMimeData, QPointF, QUrl, Qt
        from PySide6.QtGui import QDropEvent
        from contratados_transcriber.app import Window
        janela = Window(); self.addCleanup(janela.close)
        janela.painel.importacao = self.painel.importacao
        janela.painel.show()
        recebidos = []
        janela.painel.receber = lambda caminhos: recebidos.extend(caminhos)
        mime = QMimeData(); mime.setUrls([QUrl.fromLocalFile(str(self.wav("1-joao.wav"))), QUrl("https://exemplo.com/a.wav")])
        janela.dropEvent(QDropEvent(QPointF(5, 5), Qt.DropAction.CopyAction, mime, Qt.MouseButton.LeftButton, Qt.KeyboardModifier.NoModifier))
        self.assertEqual([p.name for p in recebidos], ["1-joao.wav"])


if __name__ == "__main__":
    unittest.main()
