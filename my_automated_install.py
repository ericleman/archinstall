from pathlib import Path
import sys, os
from urllib.request import urlretrieve
import zipfile

import archinstall
from archinstall import disk
from archinstall.lib import locale
from archinstall import Installer, SysCommand
from archinstall import profile
from archinstall.default_profiles.minimal import MinimalProfile
#from archinstall.default_profiles.desktops.qtile import QtileProfile
#from archinstall.default_profiles.profile import GreeterType
from archinstall.lib.hardware import GfxDriver
from archinstall.lib.models import User
from archinstall.lib.models.bootloader import Bootloader 
from archinstall.lib.models.audio_configuration import Audio, AudioConfiguration
from archinstall.lib.mirrors import use_mirrors, list_mirrors, MirrorConfiguration

# Constant
PASSWORD = 'DUMMYPASSWORD'

# TEMPORARY AS WAITING OCT'23 FIX OF archinstall.run_custom_user_commands
def my_run_custom_user_commands(commands, installation):
	for index, command in enumerate(commands):
		script_path = f"/var/tmp/user-command.{index}.sh"
		chroot_path = f"{installation.target}/{script_path}"

		with open(chroot_path, "w") as user_script:
			user_script.write(command)

		SysCommand(f"arch-chroot {installation.target} bash {script_path}")

		os.unlink(chroot_path)



# Helper Print
def print_section(section: str):
    white_len = (68 - len(section)) // 2
    print(70*'#'+'\n'+70*'#'+'\n#'+white_len*' '+section+(68-white_len-len(section))*' '+'#\n'+70*'#'+'\n'+70*'#')

# Retrieving Password from Arguments
print_section('Retrieving Password from Arguments')
if len(sys.argv) > 1:
    PASSWORD = sys.argv[1]
print("Password to use is: " + PASSWORD)

# Download Repo
print_section('Download Repo')
urlretrieve('https://github.com/ericleman/archinstall/archive/main.zip', 'main.zip')
zipfile.ZipFile('main.zip', 'r').extractall() # folder name is archinstall-main
os.remove('main.zip')

# Pacman parallel download
print_section('Config Pacman on live OS')
pacman_conf_path = Path("/etc/pacman.conf")
with pacman_conf_path.open() as f:
    pacman_conf = f.read().split("\n")

with pacman_conf_path.open("w") as fwrite:
    for line in pacman_conf:
        if "ParallelDownloads" in line:
            fwrite.write(f"ParallelDownloads = 5\n")
        else:
            fwrite.write(f"{line}\n")

# Partition
print_section('Create Partitions')
# we're creating a new ext4 filesystem installation
fs_type = disk.FilesystemType('ext4')
device_path = Path('/dev/sda')

# get the physical disk device
device = disk.device_handler.get_device(device_path)

if not device:
	raise ValueError('No device found for given path')

# create a new modification for the specific device
device_modification = disk.DeviceModification(device, wipe=True)

# create a new boot partition
boot_partition = disk.PartitionModification(
	status=disk.ModificationStatus.Create,
	type=disk.PartitionType.Primary,
	start=disk.Size(1, disk.Unit.MiB, device.device_info.sector_size),
	length=disk.Size(512, disk.Unit.MiB, device.device_info.sector_size),
	mountpoint=Path('/boot'),
	fs_type=disk.FilesystemType.Fat32,
	flags=[disk.PartitionFlag.Boot]
)
device_modification.add_partition(boot_partition)

# create a root partition
root_partition = disk.PartitionModification(
	status=disk.ModificationStatus.Create,
	type=disk.PartitionType.Primary,
	start=disk.Size(513, disk.Unit.MiB, device.device_info.sector_size),
	length=disk.Size(20, disk.Unit.GiB, device.device_info.sector_size),
	mountpoint=Path('/'),
	fs_type=fs_type,
	mount_options=[],
)
device_modification.add_partition(root_partition)

start_home = root_partition.length
length_home = device.device_info.total_size - start_home

# create a new home partition
home_partition = disk.PartitionModification(
	status=disk.ModificationStatus.Create,
	type=disk.PartitionType.Primary,
	start=start_home,
	length=length_home,
	mountpoint=Path('/home'),
	fs_type=fs_type,
	mount_options=[]
)
device_modification.add_partition(home_partition)

disk_config = disk.DiskLayoutConfiguration(
	config_type=disk.DiskLayoutType.Default,
	device_modifications=[device_modification]
)

fs_handler = disk.FilesystemHandler(disk_config)

# perform all file operations
# WARNING: this will potentially format the filesystem and delete all data
fs_handler.perform_filesystem_operations(show_countdown=False)

# Mirrors
print_section('Get Miirors')
my_mirrors = list_mirrors()
my_mirrors = {'France': my_mirrors['France']}
my_mirrors_config = MirrorConfiguration(mirror_regions=my_mirrors)

# Installer creation
print_section('Start Installer')
mountpoint = Path('/mnt/archinstall')
installation = Installer(mountpoint, disk_config, kernels=['linux'])
print_section('mount_ordered_layout')
installation.mount_ordered_layout()
print_section('minimal_installation')
use_mirrors(my_mirrors)
locale_config = locale.LocaleConfiguration('fr', 'en_DK', 'UTF-8')
installation.minimal_installation(multilib=True, hostname='archlinux', locale_config=locale_config)
installation.set_mirrors(my_mirrors_config)
print_section('base-devel, wget and git')
installation.add_additional_packages(['base-devel', 'wget', 'git', 'vim'])

# Swap
print_section('Swap memory')
installation.setup_swap('zram')

# Grub
print_section('Grub')
installation.add_bootloader(Bootloader.Grub)

# Network
print_section('Network')
installation.add_additional_packages(["networkmanager", "network-manager-applet"])
installation.enable_service('NetworkManager.service')

# Audio
print_section('Audio')
audio_config = AudioConfiguration(Audio.Pulseaudio)
audio_config.install_audio_config(installation)
#installation.add_additional_packages("pulseaudio")
#if SysInfo.requires_sof_fw():
#    installation.add_additional_packages('sof-firmware')
#if SysInfo.requires_alsa_fw():
#    installation.add_additional_packages('alsa-firmware')

# Time
print_section('Time')
installation.set_timezone("Europe/Paris")
installation.activate_time_syncronization()
# typo has been fixed in Sep'23. So in Oct ISO, should use the below: 
#installation.activate_time_synchronization()

# User
print_section('User')
user = User('eric', PASSWORD, True)
installation.create_users(user)

print_section('Sudoers')
my_run_custom_user_commands(['echo "eric ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/00_eric'], installation)
#archinstall.run_custom_user_commands(['echo "eric ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/00_eric'], installation)

# MinimalProfile config
print_section('MinimalProfile Config')
profile_config = profile.ProfileConfiguration(MinimalProfile(), GfxDriver.AllOpenSource) 
profile.profile_handler.install_profile_config(installation, profile_config)

# Keyboard layout (is not done in installation.minimal_installation)
print_section('Keyboard')
installation.set_keyboard_language(locale_config.kb_layout)

# Fstab
print_section('Fstab')
installation.genfstab()

# PARU
print_section('Paru')
installation.add_additional_packages(["cargo"])
installation.arch_chroot('cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si --noconfirm --skippgpcheck', run_as='eric')
#archinstall.run_custom_user_commands('pacman -S cargo --noconfirm', installation)
#archinstall.run_custom_user_commands('su - eric -c "cd /home/eric && git -c http.sslVerify=false clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si --noconfirm --skippgpcheck"', installation)

# LightDM
print_section('LightDM')
installation.add_additional_packages(['lightdm', 'lightdm-gtk-greeter'])
installation.enable_service('lightdm.service')

# Qtile
print_section('Qtile')
installation.add_additional_packages(['qtile', 'xf86-video-vmware', 'xf86-input-vmmouse', 'xorg-server', 'xorg-xinit'])
#installation.enable_service('gdm.service')

# Alacritty
print_section('Alacritty')
installation.add_additional_packages(['alacritty'])
