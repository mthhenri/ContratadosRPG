import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from contratados_transcriber.api import Api, NoRedirect
from contratados_transcriber.core import OfflineError, CredentialError
class Response:
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, count): return b'{"sucesso":true,"dados":{"vinculado":false}}'
class ApiTests(unittest.TestCase):
    def test_secret_only_in_header_and_time_bounded(self):
        api = Api("https://api.example")
        with patch.object(api.opener, "open", return_value=Response()) as call:
            api.status("secret")
            req = call.call_args.args[0]
            self.assertEqual(req.full_url, "https://api.example/transcricao/vinculo/estado")
            self.assertEqual(req.headers["Authorization"], "Bearer secret")
            self.assertEqual(call.call_args.kwargs["timeout"], 10)
    def test_no_redirect_can_forward_secret(self):
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, "", {}, "https://evil.example"))
    def test_errors_do_not_echo_header_or_private_body(self):
        api = Api("https://api.example")
        for error, kind in [(HTTPError("https://x", 401, "secret-private", {}, None), CredentialError), (URLError("secret-private"), OfflineError)]:
            with patch.object(api.opener, "open", side_effect=error):
                with self.assertRaises(kind) as caught: api.status("secret-private")
                self.assertNotIn("secret-private", str(caught.exception))
    def test_large_response_is_rejected(self):
        api = Api("https://api.example")
        response = Response(); response.read = lambda count: b"x" * count
        with patch.object(api.opener, "open", return_value=response):
            with self.assertRaises(ValueError): api.status("s")
    def test_dpapi_has_no_plaintext_fallback(self):
        import os
        from contratados_transcriber.windows import crypt
        if os.name != "nt":
            with self.assertRaises(OSError): crypt(b"secret")
        else:
            encrypted = crypt(b"secret")
            self.assertNotEqual(encrypted, b"secret")
            self.assertEqual(crypt(encrypted, True), b"secret")
if __name__ == '__main__': unittest.main()
