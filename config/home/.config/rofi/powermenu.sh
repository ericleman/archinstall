#!/usr/bin/env bash

## Copyright (C) 2020-2022 Aditya Shakya <adi1090x@gmail.com>
## Everyone is permitted to copy and distribute copies of this file under GNU-GPL3

rofi_cmd="rofi -theme $HOME/.config/rofi/themes/launcher.rasi"
uptime=$(uptime -p | sed -e 's/up //g')

# Options
shutdown=" Shutdown"
reboot="󰜉 Reboot"
lock=" Lock"
logout="󰍃 Logout"
qtile="󰌧 Restart Qtile"

# Variable passed to rofi
options="$shutdown\n$reboot\n$lock\n$logout\n$qtile"
_msg="Options  -  yes / y / no / n"

chosen="$(echo -e "$options" | $rofi_cmd -i -p "UP - $uptime" -dmenu -selected-row 2)"
case $chosen in
    $shutdown)
		ans=$($HOME/.config/rofi/confirm.sh)
		if [[ $ans == "yes" ]] || [[ $ans == "YES" ]] || [[ $ans == "y" ]]; then
			systemctl poweroff
		elif [[ $ans == "no" ]] || [[ $ans == "NO" ]] || [[ $ans == "n" ]]; then
			exit
        else
			$rofi_cmd -e "$_msg"
        fi
        ;;
    $reboot)
		ans=$($HOME/.config/rofi/confirm.sh)
		if [[ $ans == "yes" ]] || [[ $ans == "YES" ]] || [[ $ans == "y" ]]; then
			systemctl reboot
		elif [[ $ans == "no" ]] || [[ $ans == "NO" ]] || [[ $ans == "n" ]]; then
			exit
        else
			$rofi_cmd -e "$_msg"
        fi
        ;;
    $lock)
        dm-tool lock
        ;;
    $qtile)
        qtile cmd-obj -o cmd -f restart
        ;;
    $logout)
		ans=$($HOME/.config/rofi/confirm.sh)
		if [[ $ans == "yes" ]] || [[ $ans == "YES" ]] || [[ $ans == "y" ]]; then
			qtile cmd-obj -o cmd -f shutdown
		elif [[ $ans == "no" ]] || [[ $ans == "NO" ]] || [[ $ans == "n" ]]; then
			exit
        else
			$rofi_cmd -e "$_msg"
        fi
        ;;
esac

