# arch
 Boot machine with Arch linux ISO in CDROM Drive (on VMWare: VM > Power > Power on to firmware)  
`loadkeys fr-pc` # i.e.: loqdkeys fr)pc

`curl -k -L https://raw.githubusercontent.com/ericleman/archinstall/main/start --output start`  
`sh start [PASSWORD]`

or

`curl -k -L https://t.ly/FYHk -o start`  
`sh start [PASSWORD]`

# Explanation
This install my Arch config in two part:
1. Archinstall will install Arch with a vanilla Gnome desktop and a user (password is entered at the with command: `sh start [PASSWORD]`
2. Ansible install the packages I want to use, my config (dotfile) and some system config as well.

I use those two parts as Archinstall and Ansible are both standard and maintained packages delivered by Arch linux. So if tomorrow Archway changes (new way to partition disk, new way to install packages, etc.), then Archlinux and Ansible should be adapted. I just have to put my config in json files (for Archintall) and yaml files (for Ansible).

The scrip `start` will first install Arch with Archinstall, and then it will execute the Ansible playbook.

