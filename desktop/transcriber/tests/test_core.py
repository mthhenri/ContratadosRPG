import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from contratados_transcriber.core import parse_uri, validate_origin, account_namespace, SecureStore, Session, OfflineError, CredentialError
ID = "e809de1e-005c-4943-9c68-5ce3b445065e"
class CoreTests(unittest.TestCase):
    def test_uri_accepts_only_opaque_open_intent(self):
        self.assertEqual(parse_uri("contratados-transcriber://abrir/" + ID), ID)
        for uri in ["https://abrir/"+ID, "contratados-transcriber://abrir/../x", "contratados-transcriber://abrir/"+ID+"?token=x", "contratados-transcriber://abrir/"+ID+"#x", "contratados-transcriber://evil/"+ID, "contratados-transcriber://abrir/"+ID+"/", "contratados-transcriber://user@abrir/"+ID]:
            with self.assertRaises(ValueError): parse_uri(uri)
    def test_https_and_no_userinfo_path_or_query(self):
        self.assertEqual(validate_origin("https://api.example"), "https://api.example")
        for origin in ["http://api.example", "https://x@api.example", "https://api.example/evil", "https://api.example?x=1"]:
            with self.assertRaises(ValueError): validate_origin(origin)
    def test_accounts_and_origins_have_distinct_namespaces(self):
        a = account_namespace("https://api.example", 1)
        self.assertNotEqual(a, account_namespace("https://api.example", 2))
        self.assertNotEqual(a, account_namespace("https://other.example", 1))
        self.assertNotIn("..", a)
    def test_store_persists_protected_blob_and_keeps_results_on_disconnect(self):
        with TemporaryDirectory() as d:
            root = Path(d)
            store = SecureStore(root, lambda b: b[::-1], lambda b: b[::-1])
            store.save({"secret": "test-secret"})
            self.assertNotIn(b"test-secret", (root/"vinculo.bin").read_bytes())
            self.assertEqual(store.load()["secret"], "test-secret")
            result = root / account_namespace("https://api.example", 1) / "resultado.txt"
            result.parent.mkdir(); result.write_text("pendente")
            store.save({"revocation_pending": True})
            self.assertEqual(result.read_text(), "pendente")
    def test_offline_disconnect_retains_secret_for_later_revocation_and_clears_context(self):
        with TemporaryDirectory() as d:
            store = SecureStore(Path(d), lambda b: b, lambda b: b)
            store.save({"secret": "s", "user_id": 1})
            class Api:
                def revoke(self, secret): raise OfflineError()
            session = Session(Api(), store)
            session.context = {"titulo": "antiga"}
            session.disconnect()
            self.assertIsNone(session.context)
            self.assertTrue(store.load()["revocation_pending"])
            self.assertEqual(store.load()["secret"], "s")
    def test_expired_credential_clears_context_but_does_not_delete_results(self):
        with TemporaryDirectory() as d:
            store = SecureStore(Path(d), lambda b: b, lambda b: b)
            store.save({"secret": "s", "user_id": 1})
            class Api:
                def resolve(self, intent, secret): raise CredentialError()
            session = Session(Api(), store); session.context = {"titulo": "antiga"}
            with self.assertRaises(CredentialError): session.resolve(ID)
            self.assertIsNone(session.context)
            self.assertEqual(store.load()["user_id"], 1)
    def test_pending_revocation_cannot_open_or_relink_to_another_account(self):
        with TemporaryDirectory() as d:
            store = SecureStore(Path(d), lambda b: b, lambda b: b)
            store.save({"secret": "s", "user_id": 1, "revocation_pending": True})
            session = Session(object(), store)
            with self.assertRaises(CredentialError): session.resolve(ID)
            with self.assertRaises(CredentialError): session.start_link("PC")
if __name__ == '__main__': unittest.main()

class PendingLinkTests(unittest.TestCase):
    def test_confirmed_but_not_refreshed_secret_is_never_overwritten(self):
        with TemporaryDirectory() as d:
            store = SecureStore(Path(d), lambda b: b, lambda b: b)
            store.save({"secret": "confirmed-secret", "request_id": ID})
            class Api:
                origin = "https://api.example"
                def start_link(self, digest, name): return {"identificador": ID}
            session = Session(Api(), store)
            with self.assertRaises(CredentialError): session.start_link("PC")
            self.assertEqual(store.load()["secret"], "confirmed-secret")
    def test_401_during_pending_disconnect_does_not_forget_unrevoked_secret(self):
        with TemporaryDirectory() as d:
            store = SecureStore(Path(d), lambda b: b, lambda b: b)
            store.save({"secret": "pending-secret", "request_id": ID})
            class Api:
                def revoke(self, secret): raise CredentialError()
            with self.assertRaises(CredentialError): Session(Api(), store).disconnect()
            self.assertEqual(store.load()["secret"], "pending-secret")
            self.assertTrue(store.load()["revocation_pending"])
