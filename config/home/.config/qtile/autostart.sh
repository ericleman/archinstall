#!/bin/bash

killall -q vmware-user
vmware-user & #required to enable copy paste on VMWare
#killall -q VBoxClient-all
#VBoxClient-all & #required to enable copy paste on Virtualbox

## PICOM
# Terminate if picom is already running
#killall -q picom
# Wait until the processes have been shut down
#while pgrep -u $UID -x picom >/dev/null; do sleep 1; done
# Launch picom
#picom --config ~/.config/picom/picom.conf --log-file ~/.local/share/picom.log & # --experimental-backends &

#volumeicon &
#cbatticon &
udiskie -t &
#nm-applet &

ksuperkey -e 'Super_L=Alt_L|F1' &