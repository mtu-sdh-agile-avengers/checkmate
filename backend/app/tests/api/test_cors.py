"""The deployed frontend (another domain) may call the API from the browser."""

import pytest
from fastapi import status

ORIGIN = "http://localhost:5173"  # an allowed origin (CORS_ORIGINS)


@pytest.mark.parametrize(
    ("method", "path"),
    [("GET", "/api/v1/players/hikaru/profile"), ("POST", "/api/v1/computer/move")],
)
def test_preflight_allows_the_frontend(api_client, method, path):
    response = api_client.options(
        path,
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert method in response.headers["access-control-allow-methods"]


def test_other_sites_are_not_allowed(api_client):
    response = api_client.options(
        "/api/v1/computer/move",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
