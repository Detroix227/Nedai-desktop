# Use the official Bun image
FROM oven/bun:latest AS base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY prisma /temp/dev/prisma
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY prisma /temp/prod/prisma
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build the app
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Generate Prisma client
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN bunx prisma generate

# Final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /usr/src/app/src src
COPY --from=build /usr/src/app/prisma prisma
COPY --from=build /usr/src/app/package.json .
COPY --from=build /usr/src/app/tsconfig.json .
COPY --from=build /usr/src/app/prisma.config.ts .

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/server.ts"]
