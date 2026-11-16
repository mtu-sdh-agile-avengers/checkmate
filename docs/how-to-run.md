first terminal 

...\checkmate\backend\app"

$env:RUN_MODE = "prod"

uv run fastapi dev



second terminal

...\checkmate\frontend"

npm install

Copy-Item .env.example .env

npm run dev