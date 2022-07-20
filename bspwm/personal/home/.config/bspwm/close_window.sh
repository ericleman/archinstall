#!/bin/sh

windows_on_cur_desktop=$(bspc query -N -n .local | wc -l)

bspc node -c

if [ $windows_on_cur_desktop -gt 1 ]; then
    exit 0
fi

bspc desktop -r


