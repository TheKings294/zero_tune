#!/bin/sh
set -e
# Répare les droits du volume (monté en root par la plateforme), puis lâche les privilèges
chown -R node:node /data
exec setpriv --reuid=node --regid=node --init-groups "$@"