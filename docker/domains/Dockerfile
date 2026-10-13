# The domains agent (agent.sh): runs next to the shared Oblivion proxy and gives every site its address and
# certificate. It drives Oblivion's own scripts and nginx container, so it needs the Docker CLI with Compose.
FROM alpine:3.20
RUN apk add --no-cache bind-tools coreutils curl docker-cli docker-cli-compose jq openssl
COPY docker/domains/agent.sh /usr/local/bin/domains-agent
RUN chmod +x /usr/local/bin/domains-agent
ENTRYPOINT ["/usr/local/bin/domains-agent"]
CMD ["loop"]
