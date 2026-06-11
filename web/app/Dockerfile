FROM node:22-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

COPY --chown=nextjs:nodejs dist/runtime-deploy/node_modules ./node_modules
COPY --chown=nextjs:nodejs dist/runtime-deploy/package.json ./package.json
COPY --chown=nextjs:nodejs dist/runtime-deploy/next.config.mjs ./next.config.mjs
COPY --chown=nextjs:nodejs dist/runtime-deploy/public ./public
COPY --chown=nextjs:nodejs dist ./dist

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3010", "-H", "0.0.0.0"]