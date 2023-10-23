#!/bin/bash
echo "################################################################"
echo "###########################    START      ######################"
echo "################################################################"
MOUNTPOINT=/mnt/archinstall

echo -e "\n\n################################################################"
echo "# Get Password"
echo "################################################################"
PASSWD=$1
if [ -z "$1" ]
  then
    echo "Please provide password"
    read PASSWD
fi
echo "Password is $PASSWD"

echo -e "\n\n################################################################"
echo "# Download repo"
echo "################################################################"
curl -L https://github.com/ericleman/archinstall/archive/main.zip --output main.zip
bsdtar -x -f main.zip
# this is now in /root/archinstall-main

echo -e "\n\n################################################################"
echo "# Update Certificates"
echo "################################################################"
cp /root/archinstall-main/certificate/ma-trust.cer /etc/ca-certificates/trust-source/anchors
update-ca-trust

echo -e "\n\n################################################################"
echo "# PACMAN: Parallel download and mirrors, key"
echo "################################################################"
reflector --country France --latest 5 --sort rate --save /etc/pacman.d/mirrorlist
sed -i 's/#ParallelDownloads/ParallelDownloads/' /etc/pacman.conf
sed -i 's%#Color%Color\nILoveCandy%g' /etc/pacman.conf
#pacman-key --init

echo -e "\n\n################################################################"
echo "# Create Partitions"
echo "################################################################"
parted -s /dev/sda mklabel gpt \
    mkpart ESP fat32 1 512M \
    mkpart primary ext4 512M  100% \
    set 1 boot on
mkfs.fat -F32 /dev/sda1
mkfs.ext4 -F /dev/sda2
mkdir $MOUNTPOINT
mount /dev/sda2 $MOUNTPOINT
mkdir $MOUNTPOINT/boot
mount /dev/sda1 $MOUNTPOINT/boot

echo -e "\n\n################################################################"
echo "# Pacstrap"
echo "################################################################"
pacstrap $MOUNTPOINT base base-devel linux linux-firmware vim git grub efibootmgr zram-generator meld

echo -e "\n\n################################################################"
echo "# Update Certificates on Chroot"
echo "################################################################"
cp /root/archinstall-main/certificate/ma-trust.cer $MOUNTPOINT/etc/ca-certificates/trust-source/anchors
arch-chroot "${MOUNTPOINT}" update-ca-trust

echo -e "\n\n################################################################"
echo "# Gen fstab"
echo "################################################################"
genfstab -U -p $MOUNTPOINT >> $MOUNTPOINT/etc/fstab

echo -e "\n\n################################################################"
echo "# Time and clock"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" systemctl enable systemd-timesyncd.service
arch-chroot "${MOUNTPOINT}" ln -s /usr/share/zoneinfo/Europe/Paris /etc/localtime

echo -e "\n\n################################################################"
echo "# Hostname and Locale and Keyboard"
echo "################################################################"
echo "Archlinux" > $MOUNTPOINT/etc/hostname
echo "en_US.UTF-8 UTF-8" >> $MOUNTPOINT/etc/locale.gen
echo "en_DK.UTF-8 UTF-8" >> $MOUNTPOINT/etc/locale.gen
arch-chroot "${MOUNTPOINT}" locale-gen
echo 'LANG=en_US.UTF-8' >> $MOUNTPOINT/etc/locale.conf
echo 'LC_TIME=en_DK.UTF-8' >> $MOUNTPOINT/etc/locale.conf
echo 'KEYMAP="fr-pc"' >> $MOUNTPOINT/etc/vconsole.conf
echo 'CONSOLEFONT="lat9w-16"' >> $MOUNTPOINT/etc/vconsole.conf
#arch-chroot "${MOUNTPOINT}" localectl set-keymap ""
######## Oct 13th: I remove this I this localectl does not work during install: https://bbs.archlinux.org/viewtopic.php?id=241969 #arch-chroot "${MOUNTPOINT}" localectl set-keymap "fr-pc"
#arch-chroot "${MOUNTPOINT}" localectl set-x11-keymap fr pc # to be done after X11 installation

echo -e "\n\n################################################################"
echo "# PACMAN: Parallel download and mirrors on Chroot"
echo "################################################################"
cp /etc/pacman.d/mirrorlist $MOUNTPOINT/etc/pacman.d/mirrorlist
sed -i 's/#ParallelDownloads/ParallelDownloads/' $MOUNTPOINT/etc/pacman.conf
sed -i 's%#Color%Color\nILoveCandy%g' $MOUNTPOINT/etc/pacman.conf
echo '[multilib]' >> $MOUNTPOINT/etc/pacman.conf
echo 'Include = /etc/pacman.d/mirrorlist' >> $MOUNTPOINT/etc/pacman.conf
echo '' >> $MOUNTPOINT/etc/pacman.conf

echo -e "\n\n################################################################"
echo "# Zram"
echo "################################################################"
echo "[zram0]\n" > $MOUNTPOINT/etc/systemd/zram-generator.conf
arch-chroot "${MOUNTPOINT}" systemctl enable systemd-zram-setup@zram0.service

echo -e "\n\n################################################################"
echo "# Grub and mkinitcpio"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" mkinitcpio -p linux
# UEFI:
arch-chroot "${MOUNTPOINT}" grub-install --target=x86_64-efi --efi-directory=/boot
# BIOS:
#arch-chroot "${MOUNTPOINT}" grub-install --target=i386-pc /dev/sda

arch-chroot "${MOUNTPOINT}" grub-mkconfig -o /boot/grub/grub.cfg

echo -e "\n\n################################################################"
echo "# Network"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm networkmanager network-manager-applet
arch-chroot "${MOUNTPOINT}" systemctl enable NetworkManager.service

echo -e "\n\n################################################################"
echo "# User"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" useradd -m -s /bin/bash -G wheel,games,network,video,audio,storage,power,input -c "Eric" eric
printf "%s\n%s" "$PASSWD" "$PASSWD" | arch-chroot "${MOUNTPOINT}" passwd "eric"
echo "eric ALL=(ALL) NOPASSWD:ALL" > $MOUNTPOINT/etc/sudoers.d/00_eric
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm xdg-user-dirs
arch-chroot "${MOUNTPOINT}" su - eric -c 'xdg-user-dirs-update'
cp /root/archinstall-main/config/home/.bashrc $MOUNTPOINT/home/eric/
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.bashrc
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.bashrc
# dir_colors to have Nord theme in ls...
cp /root/archinstall-main/config/home/.dir_colors $MOUNTPOINT/home/eric/
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.dir_colors
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.dir_colors

echo -e "\n\n################################################################"
echo "# Yay"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm go
arch-chroot "${MOUNTPOINT}" su - eric -c 'cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/yay-bin.git && cd yay-bin && makepkg -si --noconfirm --skippgpcheck'
arch-chroot "${MOUNTPOINT}" rm -rf /home/eric/yay-bin

echo -e "\n\n################################################################"
echo "# Audio"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm pulseaudio alsa-utils pulseaudio-alsa pavucontrol pamixer
#arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm pipewire pipewire-alsa pipewire-jack pipewire-pulse gst-plugin-pipewire libpulse wireplumber alsa-utils
#arch-chroot "${MOUNTPOINT}" su - eric -c 'systemctl enable --user pipewire-pulse.service'

echo -e "\n\n################################################################"
echo "# VMWare Specificities"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm open-vm-tools gtkmm3 
# gtkmm3 required to copy paste
cp /root/archinstall-main/config/etc/systemd/system/share-vmware-folder.service $MOUNTPOINT/etc/systemd/system/share-vmware-folder.service
arch-chroot "${MOUNTPOINT}" systemctl enable vmtoolsd.service
arch-chroot "${MOUNTPOINT}" systemctl enable vmware-vmblock-fuse.service
arch-chroot "${MOUNTPOINT}" systemctl enable share-vmware-folder.service
arch-chroot "${MOUNTPOINT}" mkdir /home/eric/Laptop
arch-chroot "${MOUNTPOINT}" chown eric /home/eric/Laptop
arch-chroot "${MOUNTPOINT}" chmod 755 /home/eric/Laptop

<<pause-for-gnome

echo -e "\n\n################################################################"
echo "# LightDM"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm lightdm lightdm-gtk-greeter lightdm-webkit-theme-litarvan lightdm-webkit2-greeter
arch-chroot "${MOUNTPOINT}" systemctl enable lightdm.service
sed -i 's/#autologin-user=/autologin-user=eric/' $MOUNTPOINT/etc/lightdm/lightdm.conf
arch-chroot "${MOUNTPOINT}" groupadd -r autologin
arch-chroot "${MOUNTPOINT}" usermod -a -G autologin eric
cp /root/archinstall-main/config/etc/lightdm/lightdm-gtk-greeter.conf $MOUNTPOINT/etc/lightdm/lightdm-gtk-greeter.conf

echo -e "\n\n################################################################"
echo "# X11 and QTile"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm qtile xf86-video-vmware xf86-input-vmmouse xorg-server xorg-xinit mesa xorg-xrandr xorg-xdpyinfo xcb-util-cursor python-psutil python-dbus-next
# xcb-util-cursor is requried to have cursor theme applied.
arch-chroot "${MOUNTPOINT}" su eric -c 'mkdir -p /home/eric/.config/qtile'
cp -r /root/archinstall-main/config/home/.config/qtile $MOUNTPOINT/home/eric/.config/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config
#arch-chroot "${MOUNTPOINT}" localectl set-x11-keymap fr pc #I think `localectl set-x11-keymap` does not work during install in chroot. SO I copy the config directly (see below)
cp -r /root/archinstall-main/config/etc/X11/xorg.conf.d $MOUNTPOINT/etc/X11/
cp /root/archinstall-main/config/home/.Xresources $MOUNTPOINT/home/eric/ # set dpi for 4K screens
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.config/.Xresources
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.config/.Xresources
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm qtile-extras'

echo -e "\n\n################################################################"
echo "# udiskie ntfs-3g"
echo "################################################################"
# basic utility we might need for automounting external hard drives or USBs
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm udiskie ntfs-3g

echo -e "\n\n################################################################"
echo "# brightnessctl"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm brightnessctl

echo -e "\n\n################################################################"
echo "# Picom"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm picom
arch-chroot "${MOUNTPOINT}" su eric -c 'mkdir -p /home/eric/.config/picom'
cp -r /root/archinstall-main/config/home/.config/picom $MOUNTPOINT/home/eric/.config/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config

pause-for-gnome

echo -e "\n\n################################################################"
echo "# Gnome"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm gnome gnome-tweaks dconf-editor
arch-chroot "${MOUNTPOINT}" systemctl enable gdm.service
sed -i 's/#WaylandEnable=false/WaylandEnable=false\nAutomaticLogin=eric\nAutomaticLoginEnable=True/' $MOUNTPOINT/etc/gdm/custom.conf

echo -e "\n\n################################################################"
echo "# X11"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm xf86-video-vmware xf86-input-vmmouse xorg-server xorg-xinit mesa xorg-xrandr xorg-xdpyinfo
#arch-chroot "${MOUNTPOINT}" localectl set-x11-keymap fr pc #I think `localectl set-x11-keymap` does not work during install in chroot. SO I copy the config directly (see below)
cp -r /root/archinstall-main/config/etc/X11/xorg.conf.d $MOUNTPOINT/etc/X11/
cp /root/archinstall-main/config/home/.Xresources $MOUNTPOINT/home/eric/ # set dpi for 4K screens
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.config/.Xresources
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.config/.Xresources

#<<pause-for-theme

echo -e "\n\n################################################################"
echo "# Fonts"
echo "################################################################"
#arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm ttf-noto-nerd
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm ttf-ubuntu-mono-nerd ttf-ubuntu-nerd
# braille fonts for Btop
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm ttf-ubraille'


echo -e "\n\n################################################################"
echo "# Wallpaper"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" su eric -c 'mkdir -p /home/eric/.local/share/backgrounds'
cp -r /root/archinstall-main/config/home/Pictures/Wallpapers/* $MOUNTPOINT/home/eric/.local/share/backgrounds/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.local/share/backgrounds
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.local/share/backgrounds
cp /root/archinstall-main/config/home/Pictures/Wallpapers/* $MOUNTPOINT/usr/share/backgrounds/
arch-chroot "${MOUNTPOINT}" chmod -R 777 /usr/share/backgrounds/


echo -e "\n\n################################################################"
echo "# GTK Nord Themes"
echo "################################################################"
curl -L https://github.com/EliverLara/Nordic/archive/master.zip --output master.zip
bsdtar -x -f master.zip

cp -r /root/Nordic-master $MOUNTPOINT/usr/share/themes/Nord/
cp -r /root/archinstall-main/config/home/.config/gtk-3.0 $MOUNTPOINT/home/eric/.config/
cp -r /root/archinstall-main/config/home/.config/gtk-4.0 $MOUNTPOINT/home/eric/.config/
cp /root/archinstall-main/config/home/.gtkrc-2.0 $MOUNTPOINT/home/eric/
# Adw-GTK3 will enable libadwaita theme using Nord colors
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm adw-gtk3'
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config/gtk-3.0
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config/gtk-3.0
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config/gtk-4.0
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config/gtk-4.0
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.gtkrc-2.0
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.gtkrc-2.0

echo -e "\n\n################################################################"
echo "# Cursor Theme"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm nordzy-cursors' # this is installed in /usr/share/icons
# the theme Nordzy-cursors is defined in ~/.gtkrc-2.0, ~/.Xresources and ~/.config/gtk-3.0/settings.ini
# the package xcb-util-cursor is required for Qtile.

echo -e "\n\n################################################################"
echo "# Icons Theme"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm papirus-icon-theme
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm papirus-folders-git' 
arch-chroot "${MOUNTPOINT}" papirus-folders -C nordic --theme Papirus
# the theme Papirus theme is defined in ~/.gtkrc-2.0 and ~/.config/gtk-3.0/settings.ini

#curl -L https://github.com/alvatip/Nordzy-icon/releases/download/1.8.5/Nordzy.tar.gz --output Nordzy.tar.gz
#tar -xf Nordzy.tar.gz
## this is now in /root/Nordzy
#cp -r /root/Nordzy $MOUNTPOINT/usr/share/icons/

echo -e "\n\n################################################################"
echo "# Alacritty"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm alacritty
cp -r /root/archinstall-main/config/home/.config/alacritty $MOUNTPOINT/home/eric/.config/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config
# remove gnome-console and make alacritty default terminal: see https://www.reddit.com/r/Alacritty/comments/hecdqv/changing_default_terminal_to_alacritty_in_gnome/
arch-chroot "${MOUNTPOINT}" pacman -Rs --noconfirm gnome-console
arch-chroot "${MOUNTPOINT}" ln -s /usr/bin/alacritty /usr/bin/xterm


<<pause-for-gnome

echo -e "\n\n################################################################"
echo "# KSuperkey. Use it to launch Rofi. Launch ksuperkey w/ Qtile autostart"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm ksuperkey'

echo -e "\n\n################################################################"
echo "# Rofi"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm rofi
cp -r /root/archinstall-main/config/home/.config/rofi $MOUNTPOINT/home/eric/.config/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config

echo -e "\n\n################################################################"
echo "# Thunar"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm thunar gvfs
# gvfs is to have a trash

pause-for-gnome

echo -e "\n\n################################################################"
echo "# NNN"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm nnn

echo -e "\n\n################################################################"
echo "# NeoFetch"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm neofetch

echo -e "\n\n################################################################"
echo "# Zsh"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm zsh zsh-autosuggestions zsh-completions zsh-syntax-highlighting zsh-theme-powerlevel10k
arch-chroot "${MOUNTPOINT}" su - eric -c "echo $PASSWD | chsh -s /bin/zsh"
cp /root/archinstall-main/config/home/.zshrc $MOUNTPOINT/home/eric/
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.zshrc
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.zshrc
cp /root/archinstall-main/config/home/.p10k.zsh $MOUNTPOINT/home/eric/
arch-chroot "${MOUNTPOINT}" chown eric:eric /home/eric/.p10k.zsh
arch-chroot "${MOUNTPOINT}" chmod u=rwx,g=rx,o=x /home/eric/.p10k.zsh

echo -e "\n\n################################################################"
echo "# BTOP"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm btop
cp -r /root/archinstall-main/config/home/.config/btop $MOUNTPOINT/home/eric/.config/

#<<pause-for-apps

echo -e "\n\n################################################################"
echo "# Chrome"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm google-chrome'

echo -e "\n\n################################################################"
echo "# Firefox"
echo "################################################################"
#arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm firefox

echo -e "\n\n################################################################"
echo "# VS Code"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" su - eric -c 'yay -S --noconfirm visual-studio-code-bin'

#pause-for-apps

echo -e "\n\n################################################################"
echo "# Dconf setup"
echo "################################################################"
add_dconf_value() {
  echo Running DCONF for key $1 and value $2
  if [ -z "$3" ]; then
    arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write $1 \"'$2'\""
  else
    arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write $1 \"$2\""
  fi
}

add_value_in_dconf_list() {
  list=$(arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf read $1")
  echo list=$list
  if [[ $list == *"'$2'"* ]]; then
    echo "value is already in the list!"
  elif [ -z "$list"]; then
    arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write $1 \"['$2']\""
    echo "Added value to the list which was empty."
  else
    arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write $1 \"${list%]*}, '$2']\""
    echo "Added value to the list."
  fi
}
# Show Seconds and weekday
add_dconf_value '/org/gnome/desktop/interface/clock-show-seconds' 'true' 'noquote'
add_dconf_value '/org/gnome/desktop/interface/clock-show-weekday' 'true' 'noquote'
# Fonts and Themes and Wallpaper
add_dconf_value "/org/gnome/desktop/interface/document-font-name" "Ubuntu Nerd Font 11"
add_dconf_value "/org/gnome/desktop/interface/font-name" "Ubuntu Nerd Font 11"
add_dconf_value "/org/gnome/desktop/interface/monospace-font-name" "UbuntuMono Nerd Font Mono 10"
add_dconf_value "/org/gnome/desktop/wm/preferences/titlebar-font" "Ubuntu Nerd Font 11"
add_dconf_value "/org/gnome/desktop/interface/cursor-theme" "Nordzy-cursors"
add_dconf_value "/org/gnome/desktop/interface/gtk-theme" "adw-gtk3-dark"
add_dconf_value "/org/gnome/desktop/interface/icon-theme" "Papirus"
add_dconf_value "/org/gnome/desktop/interface/color-scheme" "prefer-dark"
add_dconf_value "/org/gnome/desktop/background/picture-uri" "file:///home/eric/.local/share/backgrounds/dj-nord.jpg"
add_dconf_value "/org/gnome/desktop/background/picture-uri-dark" "file:///home/eric/.local/share/backgrounds/dj-nord.jpg"
add_value_in_dconf_list '/org/gnome/shell/enabled-extensions' 'user-theme@gnome-shell-extensions.gcampax.github.com'
add_dconf_value "/org/gnome/shell/extensions/user-theme/name" "Nord"

# Favorites Apps on Dock
add_dconf_value "/org/gnome/shell/favorite-apps" "['org.gnome.Nautilus.desktop', 'google-chrome.desktop', 'Alacritty.desktop', 'nnn.desktop', 'btop.desktop', 'code.desktop']" "noquote"
# Window Buttons
add_dconf_value "/org/gnome/desktop/wm/preferences/button-layout" "appmenu:minimize,maximize,close"
add_dconf_value "/org/gnome/desktop/wm/preferences/resize-with-right-button" "true" "noquote"

# Font Scaling factor (4K screen)
add_dconf_value "/org/gnome/desktop/interface/text-scaling-factor" "1.5" "noquote"
# Mouse cursor size from 24 to 32 (4K screen)
add_dconf_value "/org/gnome/desktop/interface/cursor-size" "32" "noquote"
# Nerver Dim Screen
add_dconf_value "/org/gnome/desktop/session/idle-delay" "unit32 0"
# Show hidden files
add_dconf_value "/org/gtk/settings/file-chooser/show-hidden" "true" "noquote"
# Super+Return for alacritty
add_dconf_value "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/binding" "<Super>Return"
add_dconf_value "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/name" "Alacritty"
add_dconf_value "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/command" "alacritty"
add_value_in_dconf_list '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings' '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/'

<< test
# Show Seconds and weekday
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/clock-show-seconds true"
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/clock-show-weekday true"
# Fonts and Themes and Wallpaper
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/document-font-name \"'Ubuntu Nerd Font 11'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/font-name \"'Ubuntu Nerd Font 11'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/monospace-font-name \"'UbuntuMono Nerd Font Mono 10'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/wm/preferences/titlebar-font \"'Ubuntu Nerd Font 11'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/cursor-theme \"'Nordzy-cursors'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/gtk-theme \"'adw-gtk3-dark'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/icon-theme \"'Papirus'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/color-scheme \"'prefer-dark'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/background/picture-uri \"'file:///home/eric/.local/share/backgrounds/dj-nord.jpg'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/background/picture-uri-dark \"'file:///home/eric/.local/share/backgrounds/dj-nord.jpg'\""
add_value_in_dconf_list '/org/gnome/shell/enabled-extensions' 'user-theme@gnome-shell-extensions.gcampax.github.com'
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/shell/extensions/user-theme/name \"'Nord'\""

# Font Scaling factor (4K screen)
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/text-scaling-factor 1.5"
# Mouse cursor size from 24 to 32 (4K screen)
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/interface/cursor-size 32"
# Nerver Dim Screen
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/desktop/session/idle-delay \"unit32 0\""
# Show hidden files
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gtk/settings/file-chooser/show-hidden true"
# Super+Return for alacritty
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/binding \"'<Super>Return'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/name \"'Alacritty'\""
arch-chroot "${MOUNTPOINT}" su - eric -c "dbus-launch dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/command \"'alacritty'\""
add_value_in_dconf_list '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings' '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/'
test



echo -e "\n\n################################################################"
echo "# end of CHROOT, rebooting"
echo "################################################################"
umount -R $MOUNTPOINT
echo "Type: systemctl reboot"