#!/usr/bin/env bash

terminal=" Alacritty as root"
files=" Thunar as root"


if [ x"$@" = x"$terminal" ]
then
	coproc ( sudo -A alacritty --config-file /home/eric/.config/alacritty/alacritty.yml > /dev/null  2>&1 )
	exit 0
fi
if [ x"$@" = x"$files" ]
then
	coproc ( sudo -A thunar  > /dev/null  2>&1 )
	exit 0
fi


echo $terminal
echo $files
