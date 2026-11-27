#!/bin/sh
cd "$(dirname "$0")"
(sleep 1; xdg-open http://localhost:8000/index.html || open http://localhost:8000/index.html) 2>/dev/null &
python3 -m http.server 8000
