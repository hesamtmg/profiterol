#!/bin/sh
# Picks up renewed certificates: reload nginx every 6 hours (runs from the image's entrypoint).
(while :; do sleep 6h; nginx -s reload; done) &
