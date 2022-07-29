# arch
 Boot machine with Arch linux ISO in CDROM Drive (on VMWare: VM > Power > Power on to firmware)  
`loadkeys fr-pc` # i.e.: loqdkeys fr)pc as I am on French keyboard

`curl -k -L https://raw.githubusercontent.com/ericleman/archinstall/main/start --output start`  
`sh start [PASSWORD]`

or

`curl -k -L https://t.ly/FYHk -o start`  
`sh start [PASSWORD] [DESKTOP/VM] [HARDWARE]`

Note: for whatever reason, first time I execute `start`, I get an error; this is because /usr/bin/blkid does not exists. But if I reexecute `start`, it works.

# What is it
This install my Arch config in two part:
1. Archinstall will install a minimal Arch and a user (password is entered at the with command: `sh start [PASSWORD]`). 
   - It also intalls required package for the next step: ansible, git. 
   - Then it calls a custom-commands which is the second part: executing the ansible playbook.
2. Ansible install the desktop environment and packages I want to use, my config (dotfile) and some system config as well.

# Explanation
The script `start` will takes 3 parameters: the password for the user, the desktop/wm to install (gnome, bspwm) and the hardware (vbox, vmware)
- it downloads the repository (git clone) on the live Arch to get the archinstall json configs.
- it updates creds.json with the user password 
- it updates config.json to start ansible playbook for the chosen desktop environment
- it updates config.json to start get ansible files for the chosen virtual hardware (vbox, vmware...)
- then it starts archinstall with the chosen configuration. This one installs a minimal arch, installs ansible (with aur helper), clones the repository on new system and as a last command starts the ansible playbook. The vm hardware (vbox or vmware) is passed as variable as it can be used in playbook.


# Why
I use those two parts as Archinstall and Ansible are both standard and maintained packages delivered by Arch linux. So if tomorrow Archway changes (new way to partition disk, new way to install packages, etc.), then Archlinux and Ansible should be adapted. I just have to put my config in json files (for Archintall) and yaml files (for Ansible).
Everything could be done in SH scripts, but it would require more maintenance anytime something change with Arch.


# Some Notes
When 3D acceleration is activated on VMWare, then deactivate it on Google Chrome (or it does not work: https://communities.vmware.com/t5/VMware-Workstation-Pro/Guest-Display-Broken-With-Accelerate-3D-Graphics-Enabled/td-p/2898816)
![image](https://user-images.githubusercontent.com/26767717/177496730-38f3be75-ae3c-4329-a49e-0002abfc595a.png)
