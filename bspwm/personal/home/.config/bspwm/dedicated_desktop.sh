#!/bin/sh

focused_window=$(bspc query -N -n focused.window)
json_fw=$(bspc query -T -n $focused_window)
class_fw=$(echo $json_fw | jq -r '.client.className')

case $class_fw in
    'kitty')
		desktop_icon=''
        ;;
    'Google-chrome')
		desktop_icon=''
        ;;
    'Thunar')
		desktop_icon=''
        ;;
    'Gedit')
		desktop_icon=''
        ;;
    *)
		desktop_icon=''
        ;;
esac

#number_desktop=$(bspc query -D | wc -l)
#new_desktop="$(( $number_desktop + 1 ))-$desktop_icon"
new_desktop=$desktop_icon

bspc monitor -a "$new_desktop"
number_desktop=$(bspc query -D | wc -l)
bspc node -d "^$number_desktop" --follow
#bspc node -d "$new_desktop" --follow
