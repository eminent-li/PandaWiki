FROM node:22.16.0-alpine3.21

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs dist/standalone ./
COPY --chown=nextjs:nodejs dist/static ./dist/static

RUN set -eux; \
    server_file="$(find /app -maxdepth 8 -name server.js | head -n 1)"; \
    test -n "$server_file"; \
    server_dir="$(dirname "$server_file")"; \
    mkdir -p "$server_dir/public" "$server_dir/dist/static"; \
    cp -a /app/public/. "$server_dir/public/"; \
    cp -a /app/dist/static/. "$server_dir/dist/static/"; \
    chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "server_file=$(find /app -maxdepth 8 -name server.js | head -n 1); if [ -n \"$server_file\" ]; then exec node \"$server_file\"; else echo 'server.js not found'; find /app -maxdepth 8 -type f | sort | head -200; exit 1; fi"]