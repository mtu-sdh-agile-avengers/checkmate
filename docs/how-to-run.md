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