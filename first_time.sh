sudo pacman -S --noconfirm --needed screenfetch
sudo pacman -S --noconfirm --needed hplip
sudo pacman -S --noconfirm --needed go
sudo pacman -S --noconfirm --needed meld
sudo pacman -S --noconfirm --needed linux-headers
sudo pacman -S --noconfirm --needed dkms

cd /home/eric && git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si
yay -S pamac-aur
yay -S google-chrome
yay -S gnome-shell-extension-dash-to-dock
yay -S rtl88xxau-aircrack-dkms-git

sudo chown -R eric:eric /archinstall/personal
cp -rv /archinstall/personal/. /home/eric
