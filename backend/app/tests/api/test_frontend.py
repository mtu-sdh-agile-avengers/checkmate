"""The production image serves the React build at "/" next to the API (src/frontend.py)."""

from pathlib import Path

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.frontend import add_frontend, static_file

PAGE = '<div id="root"></div>'


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    """A built frontend: index.html, a hashed asset and a file of public/."""
    build = tmp_path / "dist"
    (build / "assets").mkdir(parents=True)
    (build / "index.html").write_text(PAGE)
    (build / "assets" / "index-abc123.js").write_text("console.log('app')")
    (build / "favicon.svg").write_text("<svg/>")
    (tmp_path / "secret.txt").write_text("not for the web")
    return build


def site(dist: str | Path | None) -> TestClient:
    app = FastAPI()

    @app.get("/api/v1/ping")
    async def ping() -> dict:
        return {"pong": True}

    add_frontend(app, dist)
    return TestClient(app)


@pytest.mark.parametrize("path", ["/", "/players/hikaru", "/play", "/deliberation"])
def test_every_page_of_the_app_gets_index_html(dist, path):
    response = site(dist).get(path)

    assert response.status_code == status.HTTP_200_OK
    assert response.text == PAGE
    assert response.headers["cache-control"] == "no-cache"


def test_build_files_are_served(dist):
    client = site(dist)

    assert client.get("/assets/index-abc123.js").text == "console.log('app')"
    assert client.get("/favicon.svg").text == "<svg/>"
    assert client.get("/assets/missing.js").status_code == status.HTTP_404_NOT_FOUND


def test_the_api_keeps_its_own_answers(dist):
    client = site(dist)

    assert client.get("/api/v1/ping").json() == {"pong": True}
    assert client.get("/api/v1/unknown").status_code == status.HTTP_404_NOT_FOUND
    assert client.get("/docs-missing").status_code == status.HTTP_404_NOT_FOUND


def test_no_file_outside_the_build_is_served(dist):
    assert static_file(dist.resolve(), "../secret.txt") is None
    assert (
        static_file(dist.resolve(), "favicon.svg") == (dist / "favicon.svg").resolve()
    )
    assert static_file(dist.resolve(), "") is None


@pytest.mark.parametrize("unset", [None, ""])
def test_without_a_build_the_root_redirects_to_health(unset):
    response = site(unset).get("/", follow_redirects=False)

    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    assert response.headers["location"] == "/health"
