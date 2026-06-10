FROM node:22-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 复制 public 目录到两种可能的运行目录
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs public ./app/public

# 复制 standalone 构建输出到工作目录（包含可能的额外 app 子目录）
COPY --chown=nextjs:nodejs dist/standalone ./

# 复制静态资源到两种可能的相对路径位置
COPY --chown=nextjs:nodejs dist/static ./dist/static
COPY --chown=nextjs:nodejs dist/static ./app/dist/static

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "if [ -f app/server.js ]; then exec node app/server.js; elif [ -f server.js ]; then exec node server.js; elif [ -f app/package.json ]; then exec node ./node_modules/.pnpm/next@*/node_modules/next/dist/bin/next start app -p ${PORT:-3010} -H ${HOSTNAME:-0.0.0.0}; else echo 'Unable to find Next.js entrypoint under /app'; find . -maxdepth 3 -type f | sort | sed -n '1,200p'; exit 1; fi"]