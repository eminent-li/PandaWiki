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

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/start-frontend.sh
RUN chmod +x /usr/local/bin/start-frontend.sh

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["/usr/local/bin/start-frontend.sh"]