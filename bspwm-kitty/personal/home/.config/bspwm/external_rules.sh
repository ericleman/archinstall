#!/bin/sh
logfile=/tmp/bspwm_external_rules.log
echo "Start Log" > $logfile

window_id="$1"
window_class="$2"
window_instance="$3"

exist_desktop () {
	echo "entering function with argument: $1" >> "$logfile"
	new_desktop="0"
	for d in $(bspc query -D --names); do
		echo "STEP 10: $new_desktop and $d" >> "$logfile"
#		if test "${d: -1}" = "$1"
		if test "$d" = "$1"
		then
			new_desktop="$d"
		fi
	done
	echo "STEP 20: $new_desktop" >> "$logfile"
	if [ "$new_desktop" = "0" ]
	then
		number_desktop=$(bspc query -D | wc -l)
		echo "STEP 25: $number_desktop" >> "$logfile"
#		new_desktop="$(( $number_desktop + 1 ))-$1"
		new_desktop=$1
		bspc monitor -a "$new_desktop"
	fi
	echo "STEP 30: $new_desktop" >> "$logfile"
	echo "desktop=$new_desktop"
}


case $window_class in
    'Google-chrome')
		desktop_icon=''
		exist_desktop $desktop_icon
        ;;
     'com-itfinance-core-Starter')
		desktop_icon=''
		exist_desktop $desktop_icon
        ;;
    *)
	exit 0
        ;;
esac


echo "---" >> "$logfile"

