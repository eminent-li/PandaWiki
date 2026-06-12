FROM node:22.16.0-alpine3.21

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs public ./app/public

COPY --chown=nextjs:nodejs dist/standalone ./

COPY --chown=nextjs:nodejs dist/static ./dist/static
COPY --chown=nextjs:nodejs dist/static ./app/dist/static

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "if [ -f /app/app/server.js ]; then exec node /app/app/server.js; elif [ -f /app/server.js ]; then exec node /app/server.js; else find /app -maxdepth 5 -name server.js -print; exit 1; fi"]