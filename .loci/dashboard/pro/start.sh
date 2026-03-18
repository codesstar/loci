#!/bin/bash
echo "Starting Loci Dashboard Pro on http://localhost:8765"
node "$(dirname "$0")/server.js"
