import unittest
import api
from unittest.mock import patch, MagicMock
import base64
import os
import json


# Primero creamos las credenciales mock
def setup_mock_credentials():
    mock_creds = {
        "type": "service_account",
        "project_id": "dnsfire-8c6fd",
        "private_key_id": "0c1a5a0b20ff45e923db0eaa86eab1dee520dc1d",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCsq4CAmvlJ/EnS\nnCzf9V7qgR6H/Hk6neeUFFbvSB1cQDdTxMXzTKMw7N4hScskechn7LyWAA6znFk9\nbW05OQMbWNFM7GGTnK0P1ErUwWiC+yWNw/MqkGgyIdgsyEGxq4JUQks/1AN4RsNH\njABhTzWE9sdCUxUFuZqWfLAtNPmRZkiVMB4ARnj8D/fztwW7/uz4nJLi/NONMMTu\ne7gU+EQY3+Yy53H1sP8aQGUJrFtwUcmAxLOHPaXqQ98+L4gPBQAxxnGiEXbf1d2u\nMI/pXkZFYQLyOGizH3X4GlJef6za7mDv/1SHzVERdzlclyEWXbkDlP24uo9sIvTG\nKHgBb0ixAgMBAAECggEAB5uQ0FnDpQpcGE7wPTfa5DsnJLevgbEmXGRfBjDntkJQ\nDb1MOXGFeSjeipntPOCuv0Fzd6pt+2Tmm6nAF7bW17QcmKaLkAzlpR5l46TX3XmC\nSJI7GwN8y8So+SQjnNfhKKQ5G4lUU87OWM8mzyLFyWN0GQx/Dx8D3CCHRJ6iZlEI\nTIzUp3xwjD/WwK9ppFHRJiPSEr9aqmy//zp2mFJMAZorUcHEnZ8L03XZo+TJkJmV\nAfefYMjQAt/vMkPi1W+LzZ+ZMQK7SYi67AJK9ibNnU9fANPeXW6g4Ift2HNE4ERj\n4QCrAJvjoqpn1mK7XdorVGSCpiW8sEmf1m78EoTPCQKBgQDhOjBnHTUtTg5Quash\n4uW5VNJ5XGIHLPZUBfDzBpIIWPgxb3vpIv4t4x2a4fu4lo/l+VPcFjKTBS1O9ksV\nBxexyc0FTZ/K7ir4fI9a781hSdHrb/5ARo7i4webj4BWC6VLtyJMzX3VK0KY/jYo\n1VI2HucIGOrArKYfwpjLZJZ2xQKBgQDEQwFhezJF/STOUqJm/zmb58r3pwP/ryQx\n39trfIWtjRaoUD7ctA2E4Vf5viYn76/tDjB9VDZmv63lggAaFBVyeZTmwcQkOrhg\nDXuHp0SUpgFYH23fbo9lAqZAgVKmERcnzjQi4HzEPUOb/6Q9IkcHbnff2ECvDPJt\nA0+eS0rI/QKBgQCX65Yml479Bj+lt/d1HgVyo4JtFiGRUYS+XFuQsgfi1ZBkWByu\nv0nQTff0NyaB9h0ONMWaGOb4QG+1aXBvuJ8E72f5gcidK1WU0wAniMVyMEcGlj5b\nwLw00oqZJYydfbF7hwX95EZSeaGsbRy/IlUX6HRSA+ylFk/f8HT8DNdpOQKBgAPc\nMYXCT43S2ct5EpqmAHMRjwtp7Ik136dfeMhXbaWpNb3fvizHGdD4Qau20rdMXpBy\nDAAbDOrecEQoV2or5PQYchZLz1jLEt9IxJo5bv7hePtLuvR/DzD0aWKxaHe9tE/j\nHWFmOu39KnxB/e/54Z3CzXbIoRUQUyBTxVgesPzdAoGAPM5megBSJUccSjBmfkMC\n3ooXR1zlmb7xdqx5ubi4FzIbhTDwFEb9Cg3LY2ciZ+PIX4U4ms8oP5rBWf35MLQm\n4RqFE/Kn10NJ6GzbxyLob40WksG4AHJmP3HM+cdo5J9YThRqeu4aU++RIL5pSIH8\nY8yS0z0UTOtN/8Q9uXMSsqE=\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-fbsvc@dnsfire-8c6fd.iam.gserviceaccount.com",
        "client_id": "108510226590535553759",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dnsfire-8c6fd.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com",
    }

    # Asegurarse de que el directorio existe
    os.makedirs("DNS_API", exist_ok=True)

    # Crear el archivo de credenciales
    cred_path = "DNS_API/dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json"
    with open(cred_path, "w") as f:
        json.dump(mock_creds, f)
    return cred_path


# Crear las credenciales mock antes de importar la app
CRED_PATH = setup_mock_credentials()

class TestDNSAPI(unittest.TestCase):

    def setUp(self):
        self.app = api.app.test_client()
        self.app.testing = True
        self.app_context = api.app.app_context()
        self.app_context.push()

    def tearDown(self):
        # Pop el contexto de la aplicación
        self.app_context.pop()
        # Limpiar después de las pruebas
        if os.path.exists(CRED_PATH):
            os.remove(CRED_PATH)

    def test_ip_to_int(self):
        result = api.ip_to_int("1.0.1.0")
        self.assertEqual(result, 16777472)

    def test_validate_domain(self):
        # Prueba con un dominio válido
        data = {"domain": "example.com"}
        domain, error_response, status = api.validate_domain(data)
        self.assertEqual(domain, "example.com")
        self.assertIsNone(error_response)
        self.assertIsNone(status)

        # Prueba con una llave faltante
        data = {}
        domain, error_response, status = api.validate_domain(data)
        self.assertIsNone(domain)
        self.assertIsNotNone(error_response)
        self.assertEqual(status, 400)

    def test_status_endpoint_success(self):
        response = self.app.get("/api/status")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])

    @patch("api.jsonify")
    def test_status_endpoint_error(self, mock_jsonify):
        mock_jsonify.side_effect = lambda arg: (
            (_ for _ in ()).throw(Exception("Test error"))
            if arg == []
            else {"error": "Fake JSON"}
        )

        response = self.app.get("/api/status")
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.json)

    @patch("api.domain_ref")
    def test_all_domains_empty(self, mock_domain_ref):
        mock_domain_ref.get.return_value = None
        response = self.app.get("/api/all-domains")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])

    @patch("api.domain_ref")
    def test_all_domains_with_single_policy(self, mock_domain_ref):
        mock_data = {
            "com": {
                "example": {
                    "www": {
                        "routing_policy": "single",
                        "ip": {"address": "192.168.1.1", "health": "healthy"},
                    }
                }
            }
        }
        mock_domain_ref.get.return_value = mock_data
        response = self.app.get("/api/all-domains")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(response.json[0]["domain"], "example.com")
        self.assertEqual(response.json[0]["type"], "single")
        self.assertEqual(response.json[0]["direction"], "192.168.1.1")

    def test_exists_no_domain(self):
        response = self.app.get("/api/exists")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    @patch("api.domain_ref")
    def test_exists_domain_not_found(self, mock_domain_ref):
        mock_domain_ref.child().get.return_value = None
        response = self.app.get("/api/exists?domain=nonexistent.com")
        self.assertEqual(response.status_code, 404)

    @patch("api.domain_ref")
    def test_exists_single_policy(self, mock_domain_ref):
        mock_data = {
            "routing_policy": "single",
            "ip": {"address": "192.168.1.1", "health": "healthy"},
        }
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_data
        mock_domain_ref.child.return_value = mock_ref

        response = self.app.get("/api/exists?domain=example.com")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.decode(), "3232235777")

    @patch("api.db.reference")
    def test_create_Domain(self, mock_ref):
        data = {
            "type": "single",
            "direction": "192.168.1.1",
            "status": True,
            "healthcheck_settings": {
                "acceptable_codes": [200],
                "crontab": "* * * * *",
                "max_retries": 3,
                "path": "/health",
                "port": 80,
                "timeout": 5,
                "type": "http",
            },
        }
        mock_ref.get.return_value = data
        response, status_code = api.create_Domain(mock_ref, "example.com", data)
        self.assertEqual(status_code, 201)
        self.assertIn("creado exitosamente", response.json["message"])

    def test_set_dns_server(self):
        response = self.app.post("/api/set_dns_server?server=8.8.4.4&port=53")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Servidor DNS actualizado", response.json["message"])

        response = self.app.post("/api/set_dns_server?server=8.8.4.4&port=invalid")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Puerto inválido", response.json["error"])

    @patch("api.socket.socket")
    def test_dns_resolver(self, mock_socket):
        mock_socket_instance = MagicMock()
        mock_socket.return_value.__enter__.return_value = mock_socket_instance
        mock_socket_instance.recvfrom.return_value = (b"response_data", None)

        dns_query = b'\xaa\xbb\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' \
                    b'\x03www\x06google\x03com\x00\x00\x01\x00\x01' 
        encoded_query = base64.b64encode(dns_query).decode("utf-8")
        response = self.app.post("/api/dns_resolver", data=encoded_query)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data.decode("utf-8"),
            base64.b64encode(b"response_data").decode("utf-8"),
        )

    @patch("api.ip_to_country_ref")
    def test_get_country_from_ip(self, mock_ip_to_country):
        mock_data = {
            "16777472": {
                "start_ip": "1.0.1.0",
                "end_ip": "1.0.3.255",
                "continent_code": "AS",
                "continent_name": "Asia",
                "country_iso_code": "CN",
                "country_name": "China"
            }
        }
        mock_ip_to_country.order_by_key.return_value.end_at.return_value.limit_to_last.return_value.get.return_value = mock_data
       
        response = self.app.get("/api/ip-to-country?ip=1.0.1.50")
        self.assertEqual(response.status_code, 200)
        self.assertIn("China", response.json["country_name"])

    def test_make_conflict_obj(self):
        key = "12345"
        record = {
            "start_ip": "1.0.0.0",
            "end_ip": "1.0.0.255",
            "continent_code": "NA",
            "continent_name": "North America",
            "country_iso_code": "US",
            "country_name": "United States",
        }
        expected_result = {
            "id": "12345",
            "start_ip": "1.0.0.0",
            "end_ip": "1.0.0.255",
            "continent_code": "NA",
            "continent_name": "North America",
            "country_iso_code": "US",
            "country_name": "United States",
        }
        result = api.make_conflict_obj(key, record)
        self.assertEqual(result, expected_result)

    @patch("api.ip_to_country_ref")
    def test_get_previous_conflict(self, mock_ref):
        mock_ref.order_by_key.return_value.end_at.return_value.limit_to_last.return_value.get.return_value = {
            "12345": {
                "start_ip": "1.0.0.0",
                "end_ip": "1.0.0.255",
                "continent_code": "NA",
                "continent_name": "North America",
                "country_iso_code": "US",
                "country_name": "United States",
            }
        }
        start_int = 16777216  # 1.0.0.0
        key, record = api.get_previous_conflict(start_int)
        self.assertEqual(key, "12345")
        self.assertEqual(record["start_ip"], "1.0.0.0")
        self.assertEqual(record["end_ip"], "1.0.0.255")

    @patch("api.ip_to_country_ref")
    def test_get_next_conflict(self, mock_ref):
        mock_ref.order_by_key.return_value.start_at.return_value.limit_to_first.return_value.get.return_value = {
            "16777216": {
                "start_ip": "1.0.0.0",
                "end_ip": "1.0.0.255",
                "continent_code": "NA",
                "continent_name": "North America",
                "country_iso_code": "US",
                "country_name": "United States",
            }
        }
        start_int = 16777216  # 1.0.0.0
        end_int = 16777471  # 1.0.0.255
        key, record = api.get_next_conflict(start_int, end_int)
        self.assertEqual(key, "16777216")
        self.assertEqual(record["start_ip"], "1.0.0.0")
        self.assertEqual(record["end_ip"], "1.0.0.255")

    @patch("api.countries_ref")
    def test_countries_exists(self, mock_ref):
        mock_ref.child.return_value.get.return_value = {"exists": True}
        response = self.app.get("/api/countries?country_code=US").json
        
        self.assertEqual(response["exists"], True)

    @patch("api.countries_ref")
    def test_countries_not_exists(self, mock_ref):
        mock_ref.child.return_value.get.return_value = None
        response = self.app.get("/api/countries?country_code=US").json
        self.assertEqual(response["exists"], False)

    @patch("api.countries_ref")
    def test_countries_no_country_code(self, mock_ref):
        mock_ref.child.return_value.get.return_value = None
        response = self.app.get("/api/countries?country_code=US").json
        self.assertEqual(response["exists"], False)

    @patch("api.domain_ref")
    @patch("api.create_Domain")
    def test_manage_domain_post(self, mock_create_domain, mock_domain_ref):
        mock_create_domain.return_value = ("Domain created successfully", 201)
        data = {
            "domain": "example.com",
            "type": "single",
            "direction": "192.168.1.1",
            "status": True,
            "healthcheck_settings": {
                "acceptable_codes": [200],
                "crontab": "* * * * *",
                "max_retries": 3,
                "path": "/health",
                "port": 80,
                "timeout": 5,
                "type": "http",
            },
        }
        response = self.app.post("/api/domains", json=data)
        self.assertEqual(response.status_code, 201)
        mock_create_domain.assert_called_once()

    @patch("api.domain_ref")
    @patch("api.create_Domain")
    def test_manage_domain_put(self, mock_create_domain, mock_domain_ref):
        mock_ref = MagicMock()
        mock_domain_ref.child.return_value = mock_ref
        mock_create_domain.return_value = ("Domain updated successfully", 200)

        data = {
            "domain": "example.com",
            "type": "single",
            "direction": "192.168.1.1",
            "status": True,
            "healthcheck_settings": {
                "acceptable_codes": [200],
                "crontab": "* * * * *",
                "max_retries": 3,
                "path": "/health",
                "port": 80,
                "timeout": 5,
                "type": "http",
            },
        }
        response = self.app.put("/api/domains", json=data)
        self.assertEqual(response.status_code, 200)
        mock_ref.delete.assert_called_once()
        mock_create_domain.assert_called_once()

    @patch("api.domain_ref")
    def test_manage_domain_delete(self, mock_domain_ref):
        mock_ref = MagicMock()
        mock_domain_ref.child.return_value = mock_ref

        data = {"domain": "example.com"}
        response = self.app.delete("/api/domains", json=data)
        self.assertEqual(response.status_code, 200)
        self.assertIn("Dominio eliminado", response.json["message"])
        mock_ref.delete.assert_called_once()

    def test_manage_domain_invalid_json(self):
        response = self.app.post("/api/domains", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Cuerpo del JSON inválido o faltante", response.json["error"])

    def test_manage_domain_invalid_domain_format(self):
        data = {"domain": "invalid"}
        response = self.app.post("/api/domains", json=data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Formato de dominio inválido", response.json["error"])

    def test_get_country_from_ip_missing_ip(self):
        response = self.app.get("/api/ip-to-country")
        self.assertEqual(response.status_code, 400)
        self.assertIn("La dirección IP address es requerida", response.json["error"])

    @patch("api.ip_to_country_ref")
    def test_get_country_from_ip_no_match(self, mock_ip_to_country_ref):
        mock_data = {
            "16777472": {
                "start_ip": "1.0.1.0",
                "end_ip": "1.0.3.255",
                "continent_code": "AS",
                "continent_name": "Asia",
                "country_iso_code": "CN",
                "country_name": "China"
            }
        }
        
        mock_ip_to_country_ref.order_by_key.return_value.end_at.return_value.limit_to_last.return_value.get.return_value = mock_data
        response = self.app.get("/api/ip-to-country?ip=128.0.1.50")
        self.assertEqual(response.status_code, 404)
        self.assertIn("No hay un registro para este IP", response.json["error"])

    @patch("api.ip_to_country_ref")
    def test_get_country_from_ip_match(self, mock_ip_to_country_ref):
        mock_data = {
            "16777472": {
                "start_ip": "1.0.1.0",
                "end_ip": "1.0.3.255",
                "continent_code": "AS",
                "continent_name": "Asia",
                "country_iso_code": "CN",
                "country_name": "China"
            }
        }
        mock_ip_to_country_ref.order_by_key.return_value.end_at.return_value.limit_to_last.return_value.get.return_value = mock_data

        response = self.app.get("/api/ip-to-country?ip=1.0.1.50")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["country_name"], "China")
        self.assertEqual(response.json["country_iso_code"], "CN")
        self.assertEqual(response.json["continent_name"], "Asia")
        self.assertEqual(response.json["continent_code"], "AS")
        self.assertEqual(response.json["start_ip"], "1.0.1.0")
        self.assertEqual(response.json["end_ip"], "1.0.3.255")

    @patch("api.ip_to_country_ref")
    def test_delete_record_success(self, mock_ref):
        mock_child = MagicMock()
        mock_child.get.return_value = {"start_ip": "1.0.0.0", "end_ip": "1.0.0.255"}
        mock_ref.child.return_value = mock_child

        response = self.app.delete("/api/ip-to-country", json={"id": "16777216"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Eliminado el registro 16777216", response.json["message"])
        mock_child.delete.assert_called_once()

    @patch("api.ip_to_country_ref")
    def test_delete_record_not_found(self, mock_ref):
        mock_child = MagicMock()
        mock_child.get.return_value = None
        mock_ref.child.return_value = mock_child

        response = self.app.delete("/api/ip-to-country", json={"id": "16777216"})
        self.assertEqual(response.status_code, 404)
        self.assertIn("No hay un registro 16777216", response.json["error"])

    def test_delete_record_missing_id(self):
        response = self.app.delete("/api/ip-to-country", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Falta el 'id' para la eliminación", response.json["error"])

    @patch("api.ip_to_country_ref")
    @patch("api.get_previous_conflict")
    @patch("api.get_next_conflict")
    def test_post_record_success(self, mock_get_next, mock_get_previous, mock_ref):
        mock_get_previous.return_value = (None, None)
        mock_get_next.return_value = (None, None)
        mock_child = MagicMock()
        mock_child.get.return_value = None
        mock_ref.child.return_value = mock_child

        data = {
            "start_ip": "1.0.0.0",
            "end_ip": "1.0.0.255",
            "continent_code": "NA",
            "continent_name": "North America",
            "country_iso_code": "US",
            "country_name": "United States",
        }
        response = self.app.post("/api/ip-to-country", json=data)
        self.assertEqual(response.status_code, 201)
        self.assertIn("Registro creado en 1.0.0.0", response.json["message"])
        mock_child.set.assert_called_once()


    def test_post_record_missing_fields(self):
        data = {"start_ip": "1.0.0.0"}
        response = self.app.post("/api/ip-to-country", json=data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Se necesitan 'start_ip' y 'end_ip'", response.json["error"])

    def test_unsupported_method(self):
        response = self.app.patch("/api/ip-to-country", json={})
        self.assertEqual(response.status_code, 405)