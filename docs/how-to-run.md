# How to run?

**First**, we need to run FastAPI server.

In the project root, change directory to `bakend\app`:

```bash
cd ..\backend\app
```

Create the backend `.env` file from the example (`API_CHESSCOM_*` variables are required, otherwise the app won't start):

```bash
Copy-Item .env.example .env
```

> [!NOTE]
> `CORS_ORIGINS` is optional and must be a JSON list of origins with a scheme, i.e.:
> `CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]`.


Then simply run:

```bash
uv run fastapi dev
```

> [!NOTE]
> Don't forget to set up `RUN_MODE` environment variable, i.e.:
> ``$env:RUN_MODE = "prod"``.
(If `uv` is not recognised: install it with `py -m pip install uv`, then run `py -m uv run fastapi dev`.)

**Optional: Stockfish** (the chess engine for "02 / In-Game Chess" and the game analysis).

Stockfish is a program of about 40-80 MB, so it is installed on each machine and **never
committed** to the repository (GitHub refuses files over 100 MB, and the repo would grow
with every version). Download it from https://stockfishchess.org/download/, unzip it
**outside** the project folder (e.g. `C:\Tools\stockfish`) and set the path to the
executable in `backend\app\.env`:

```bash
STOCKFISH_PATH=C:\Tools\stockfish\stockfish-windows-x86-64-avx2.exe
```

Without it, `RUN_MODE=dev` plays with a simple built-in computer player, and
`RUN_MODE=prod` answers "The computer can't play right now".

**Second**, we need to start our React client.

In the project root, change directory to `frontend`:

```bash
cd ..\frontend
```

Then download all required dependencies by running:

```bash
npm install
```

And, finally run:

```bash
npm run dev
```
## Tests

Backend (in `backend\app`; with `STOCKFISH_PATH` set, the Stockfish tests run too):

```bash
uv run pytest                      # all tests
uv run pytest -m unit              # one level: unit, integration or acceptance
uv run pytest --cov                # with coverage
```

Frontend (in `frontend`):

```bash
npm test                           # unit + integration tests (Vitest)
npm run test:coverage              # with coverage
npm run build; npm run test:e2e    # acceptance tests in a browser (Playwright); needs `uv`
```

The first time, `npx playwright install chromium` downloads the browser for the acceptance
tests. They start the backend (dev mode) and the built frontend themselves.

The same checks run on GitHub for every push: see `.github/workflows/ci-cd.yml` and
[deployment-azure.md](deployment-azure.md).
