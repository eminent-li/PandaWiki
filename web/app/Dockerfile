FROM node:22-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 安装运行时依赖，使用完整 dist 产物通过 next start 启动
COPY --chown=nextjs:nodejs package.json ./package.json
RUN npm install --omit=dev --ignore-scripts

# 复制运行所需的构建产物和静态资源
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs dist ./dist

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3010", "-H", "0.0.0.0"]