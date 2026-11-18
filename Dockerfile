FROM caddy:2-alpine

# Ausgeliefert wird nur, was hier ausdrücklich kopiert wird.
COPY Caddyfile /etc/caddy/Caddyfile
WORKDIR /srv
COPY index.html impressum.html llms.txt robots.txt /srv/
COPY assets /srv/assets

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
