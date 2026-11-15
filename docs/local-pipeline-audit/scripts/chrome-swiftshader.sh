#!/usr/bin/env bash
# Chrome drawing WebGL in software, as a GitHub runner's does.
exec /usr/bin/google-chrome --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader "$@"
