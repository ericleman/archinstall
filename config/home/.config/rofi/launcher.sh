#!/bin/bash
#rofi -show drun -theme $HOME/.config/rofi/themes/launcher.rasi
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