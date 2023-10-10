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
echo "# Parallel download and mirrors"
echo "################################################################"
reflector --country France --latest 5 --sort rate --save /etc/pacman.d/mirrorlist
sed -i 's/#ParallelDownloads/ParallelDownloads/' /etc/pacman.conf
sed -i 's%#Color%Color\nILoveCandy%g' /etc/pacman.conf


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
pacstrap $MOUNTPOINT base base-devel linux linux-firmware vim git grub efibootmgr zram-generator

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
arch-chroot "${MOUNTPOINT}" localectl set-keymap "fr-pc"
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
arch-chroot "${MOUNTPOINT}" grub-install --target=x86_64-efi --efi-directory=/boot
arch-chroot "${MOUNTPOINT}" grub-mkconfig -o /boot/grub/grub.cfg

echo -e "\n\n################################################################"
echo "# Network"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm networkmanager network-manager-applet
arch-chroot "${MOUNTPOINT}" systemctl enable NetworkManager.service

echo -e "\n\n################################################################"
echo "# Audio"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm pulseaudio


echo -e "\n\n################################################################"
echo "# User"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" useradd -m -s /bin/bash -G wheel,games,network,video,audio,storage,power,input -c "Eric" eric
printf "%s\n%s" "$PASSWD" "$PASSWD" | arch-chroot "${MOUNTPOINT}" passwd "eric"
echo "eric ALL=(ALL) NOPASSWD:ALL" > $MOUNTPOINT/etc/sudoers.d/00_eric
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm xdg-user-dirs
arch-chroot "${MOUNTPOINT}" su - eric -c 'xdg-user-dirs-update'



#echo -e "\n\n################################################################"
#echo "# Paru"
#echo "################################################################"
#arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm cargo
#arch-chroot "${MOUNTPOINT}" su - eric -c 'cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si --noconfirm --skippgpcheck'
#arch-chroot "${MOUNTPOINT}" rm -rf /home/eric/paru

echo -e "\n\n################################################################"
echo "# Yay"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm go
arch-chroot "${MOUNTPOINT}" su - eric -c 'cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si --noconfirm --skippgpcheck'
arch-chroot "${MOUNTPOINT}" rm -rf /home/eric/yay

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


echo -e "\n\n################################################################"
echo "# LightDM"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm lightdm lightdm-gtk-greeter
arch-chroot "${MOUNTPOINT}" systemctl enable lightdm.service

echo -e "\n\n################################################################"
echo "# X11 and QTile"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm qtile xf86-video-vmware xf86-input-vmmouse xorg-server xorg-xinit mesa
arch-chroot "${MOUNTPOINT}" su eric -c 'mkdir -p /home/eric/.config/qtile'
cp -r /root/archinstall-main/config/home/.config/qtile $MOUNTPOINT/home/eric/.config/
arch-chroot "${MOUNTPOINT}" chown -R eric:eric /home/eric/.config
arch-chroot "${MOUNTPOINT}" chmod -R u=rwx,g=rx,o=x /home/eric/.config
arch-chroot "${MOUNTPOINT}" localectl set-x11-keymap fr pc

echo -e "\n\n################################################################"
echo "# Alacritty"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm alacritty


echo -e "\n\n################################################################"
echo "# end of CHROOT, rebooting"
echo "################################################################"
umount -R $MOUNTPOINT
echo "Type: systemctl reboot"