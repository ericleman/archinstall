cd /home/eric && git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si
yay -S pamac-aur
yay -S google-chrome
yay -S gnome-shell-extension-dash-to-dock

sudo chown -R eric:eric /archinstall/personal
cp -rv /archinstall/personal/. /home/eric
