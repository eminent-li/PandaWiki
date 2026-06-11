FROM node:22-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app/app

# 从 web 根上下文复制 pnpm workspace 依赖和 app 构建产物。
# app/node_modules 在 Windows 下是指向 web/node_modules/.pnpm 的 junction，单独复制会断链。
COPY --chown=nextjs:nodejs node_modules ../node_modules
COPY --chown=nextjs:nodejs app/package.json ./package.json
COPY --chown=nextjs:nodejs app/public ./public
COPY --chown=nextjs:nodejs app/dist ./dist

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node ../node_modules/.pnpm/next@*/node_modules/next/dist/bin/next start -p 3010 -H 0.0.0.0"]