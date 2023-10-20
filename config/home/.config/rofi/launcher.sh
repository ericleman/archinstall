#!/bin/bash

# make sure we are in AZERTY as if this script is called by
# ksuperkey, it messes keyboard layout
setxkbmap -model pc104 -layout fr


rofi \
	-show drun \
	-modi run,drun,window,:~/.config/rofi/root.sh \
	-no-lazy-grab \
	-scroll-method 1 \
	-drun-match-fields all \
	-drun-display-format "{name}" \
	-no-drun-show-actions \
	-terminal alacritty \
	-kb-cancel Escape,Alt-F1 \
	-theme $HOME/.config/rofi/themes/launcher.rasi