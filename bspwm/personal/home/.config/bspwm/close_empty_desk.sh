#!/bin/sh


for d in $(bspc query -D); do
	num_win=$(bspc query -N -n .window -d $d | wc -l)
	if [ "$num_win" -eq "0" ]; then
	    bspc desktop $d -r
	fi
done


