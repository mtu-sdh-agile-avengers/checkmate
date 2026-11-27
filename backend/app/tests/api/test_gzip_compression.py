"""GZip compression of responses (GZipMiddleware in src/main.py)."""


def test_large_responses_are_gzipped(api_client):
    response = api_client.get("/docs/openapi.json", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert response.headers["Content-Encoding"] == "gzip"
    assert response.json()["openapi"]  # httpx decompresses: the body is still valid JSON


def test_small_responses_are_not_compressed(api_client):
    response = api_client.get("/health", headers={"Accept-Encoding": "gzip"})

    assert "Content-Encoding" not in response.headers  # under minimum_size (1000 bytes)


def test_clients_without_gzip_get_plain_responses(api_client):
    response = api_client.get("/docs/openapi.json", headers={"Accept-Encoding": "identity"})

    assert "Content-Encoding" not in response.headers
