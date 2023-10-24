#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias grep='grep --color=auto'
# https://wiki.archlinux.org/title/Bash/Prompt_customization
GREEN="\[$(tput setaf 2)\]"
BLUE="\[$(tput setaf 4)\]"
RESET="\[$(tput sgr0)\]"
PS1="[${GREEN}\u@\h ${BLUE}\W${RESET}]\$ "
neofetch

test -r ~/.dir_colors && eval $(dircolors ~/.dir_colors)

