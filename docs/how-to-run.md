# How to run?

**First**, we need to run FastAPI server.

In the project root, change directory to `bakend\app`:

```bash
cd ..\backend\app
```

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