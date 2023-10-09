#!/bin/bash
echo "################################################################"
echo "###########################    START      ######################"
echo "################################################################"
MOUNTPOINT=/mnt/archinstall


echo "\n\n################################################################"
echo "# Get Password"
echo "################################################################"
PASSWD=$1
if [ -z "$1" ]
  then
    echo "Please provide password"
    read PASSWD
fi
echo "Password is $PASSWD"

echo "\n\n################################################################"
echo "# Download repo"
echo "################################################################"
curl -L https://github.com/ericleman/archinstall/archive/main.zip --output main.zip
bsdtar -x -f main.zip
# this is now in /root/archinstall-main

echo "\n\n################################################################"
echo "# Update Certificates"
echo "################################################################"
cp /root/archinstall-main/certificate/ma-trust.cer /etc/ca-certificates/trust-source/anchors
update-ca-trust

echo "\n\n################################################################"
echo "# Parallel download and mirrors"
echo "################################################################"
reflector --country France --latest 5 --sort rate --save /etc/pacman.d/mirrorlist
sed -i 's/#ParallelDownloads/ParallelDownloads/' /etc/pacman.conf

echo "\n\n################################################################"
echo "# Create Partitions"
echo "################################################################"
parted -s /dev/sda mklabel gpt \
    mkpart ESP fat32 1 512M \
    mkpart primary ext4 512M  100% \
    set 1 boot on
mkfs.fat -F32 /dev/sda1
mkfs.ext4 /dev/sda2
mkdir $MOUNTPOINT
mount /dev/sda2 $MOUNTPOINT
mkdir $MOUNTPOINT/boot
mount /dev/sda1 $MOUNTPOINT/boot

echo "\n\n################################################################"
echo "# Pacstrap"
echo "################################################################"
pacstrap $MOUNTPOINT base base-devel linux linux-firmware vim git grub zram-generator

echo "\n\n################################################################"
echo "# Gen fstab"
echo "################################################################"
genfstab -U -p /mnt >> /mnt/etc/fstab

echo "\n\n################################################################"
echo "# Time and clock"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" systemctl enable systemd-timesyncd.service
arch-chroot "${MOUNTPOINT}" ln -s /usr/share/zoneinfo/Europe/Paris /etc/localtime

echo "\n\n################################################################"
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
arch-chroot localectl set-keymap fr-pc

echo "\n\n################################################################"
echo "# Parallel download and mirrors on Chroot"
echo "################################################################"
cp /etc/pacman.d/mirrorlist $MOUNTPOINT/etc/pacman.d/mirrorlist
sed -i 's/#ParallelDownloads/ParallelDownloads/' $MOUNTPOINT/etc/pacman.conf

echo "\n\n################################################################"
echo "# Zram"
echo "################################################################"
echo "[zram0]\n" > $MOUNTPOINT/etc/systemd/zram-generator.conf
arch-chroot "${MOUNTPOINT}" systemctl enable systemd-zram-setup@zram0.service

echo "\n\n################################################################"
echo "# Grub and mkinitcpio"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" mkinitcpio -p linux
arch-chroot "${MOUNTPOINT}" grub-install --target=x86_64-efi --efi-directory=/boot
arch-chroot "${MOUNTPOINT}" grub-mkconfig -o /boot/grub/grub.cfg

echo "\n\n################################################################"
echo "# Network"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm networkmanager network-manager-applet
arch-chroot "${MOUNTPOINT}" systemctl enable NetworkManager.service

echo "\n\n################################################################"
echo "# Audio"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm pulseaudio


echo "\n\n################################################################"
echo "# User"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" useradd -m -s /bin/bash -G wheel,games,network,video,audio,storage,power,input -c "Eric" eric
echo "eric ALL=(ALL) NOPASSWD:ALL" > $MOUNTPOINT/etc/sudoers.d/00_eric

echo "\n\n################################################################"
echo "# Paru"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm cargo
arch-chroot "${MOUNTPOINT}" su - eric -c 'cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si --noconfirm --skippgpcheck'

echo "\n\n################################################################"
echo "# LightDM"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm lightdm lightdm-gtk-greeter
arch-chroot "${MOUNTPOINT}" systemctl enable lightdm.service

echo "\n\n################################################################"
echo "# X11 and QTile"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm qtile xf86-video-vmware xf86-input-vmmouse xorg-server xorg-xinit

echo "\n\n################################################################"
echo "# Alacritty"
echo "################################################################"
arch-chroot "${MOUNTPOINT}" pacman -Syu --noconfirm alacritty


echo "\n\n################################################################"
echo "# end of CHROOT, rebooting"
echo "################################################################"
umount -R $MOUNTPOINT
echo "Type: systemctl reboot"