"""Serving the built frontend from the API server (the production image).

In production one container serves both: the React build at "/" and the API at "/api/v1",
on the same origin (so the browser needs no CORS). In development Vite serves the frontend
and FRONTEND_DIST is not set: "/" then redirects to /health.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from src.rate_limiting import limiter

# Unknown paths under these stay a 404 instead of the page
NOT_PAGES = ("api/", "docs")


def static_file(root: Path, path: str) -> Path | None:
    """The file `path` inside `root`, or None (no such file, or outside `root`)."""
    file = (root / path).resolve()
    if path and file.is_file() and file.is_relative_to(root):
        return file
    return None


# Decorated once here: each @limiter.limit adds a limit, and two would count a request twice
@limiter.limit("1/second")
async def redirect_to_health(request: Request) -> RedirectResponse:
    return RedirectResponse("/health")


def add_frontend(app: FastAPI, dist: str | Path | None) -> None:
    """Serves the build in `dist` at "/", or without one ("" too), redirects "/" to /health.

    Call it after the API routers: its catch-all route must come last.
    """
    if not dist:
        app.add_api_route(
            "/",
            redirect_to_health,
            methods=["GET"],
            tags=["root"],
            description='Redirects to "/health"',
        )
        return

    root_dir = Path(dist).resolve()
    index = root_dir / "index.html"
    # file names in assets/ change with every build, so browsers may cache them for good
    app.mount("/assets", StaticFiles(directory=root_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def page(path: str) -> FileResponse:
        if path.startswith(NOT_PAGES):
            raise HTTPException(status_code=404, detail="Not Found")
        file = static_file(root_dir, path)
        if file is not None:
            return FileResponse(file)
        # any other path is a page of the app (React Router): the latest index.html
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
