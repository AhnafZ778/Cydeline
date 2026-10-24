#!/bin/sh
set -eu
Xtigervnc :1 -geometry 1600x900 -depth 24 -SecurityTypes None -localhost no -AlwaysShared -rfbport 5901 &
vnc_pid=$!
trap 'kill "$vnc_pid" 2>/dev/null || true' EXIT INT TERM
export DISPLAY=:1
while [ ! -S /tmp/.X11-unix/X1 ]; do sleep 0.1; done
exec dbus-launch --exit-with-session startxfce4
