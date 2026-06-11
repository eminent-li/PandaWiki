#!/bin/sh
set -eu

for candidate in ./server.js ./app/server.js; do
  if [ -f "$candidate" ]; then
    echo "Starting Next.js from $candidate"
    exec node "$candidate"
  fi
done

discovered_entrypoint="$(find . \
  \( -path './node_modules' -o -path './app/node_modules' \) -prune -o \
  -type f -name 'server.js' -print | sort | head -n 1)"

if [ -n "$discovered_entrypoint" ]; then
  echo "Starting discovered Next.js entrypoint: $discovered_entrypoint"
  exec node "$discovered_entrypoint"
fi

echo 'Unable to find Next.js entrypoint under /app'
find . -maxdepth 4 \
  \( -path './node_modules' -o -path './app/node_modules' \) -prune -o \
  -type f -print | sort | sed -n '1,200p'
exit 1