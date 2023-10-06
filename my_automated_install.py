from pathlib import Path

from archinstall import disk
from archinstall.lib import locale
from archinstall import Installer
from archinstall import profile
#from archinstall.default_profiles.minimal import MinimalProfile
from archinstall.default_profiles.desktops.qtile import QtileProfile
from archinstall.default_profiles.profile import GreeterType
from archinstall.lib.hardware import GfxDriver, SysInfo
from archinstall.lib.models import User
from archinstall.lib.models.bootloader import Bootloader 

# Helper Print
def print_section(section: str):
    white_len = (68 - len(section)) // 2
    print(70*'#'+'\n'+70*'#'+'\n#'+white_len*' '+section+(68-white_len-len(section))*' '+'#\n'+70*'#'+'\n'+70*'#')

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

start_root_partition = boot_partition.length
length_root_partition = device.device_info.total_size - start_root_partition

# create a root partition
root_partition = disk.PartitionModification(
	status=disk.ModificationStatus.Create,
	type=disk.PartitionType.Primary,
	start=start_root_partition,
	length=length_root_partition,
	mountpoint=None,
	fs_type=fs_type,
	mount_options=[],
)
device_modification.add_partition(root_partition)

disk_config = disk.DiskLayoutConfiguration(
	config_type=disk.DiskLayoutType.Default,
	device_modifications=[device_modification]
)

fs_handler = disk.FilesystemHandler(disk_config)

# perform all file operations
# WARNING: this will potentially format the filesystem and delete all data
fs_handler.perform_filesystem_operations(show_countdown=False)

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

# Installer creation
print_section('Start Installer')
mountpoint = Path('/tmp')
installation = Installer(mountpoint, disk_config, kernels=['linux'])
installation.mount_ordered_layout()
locale_config = locale.LocaleConfiguration('fr', 'en_DK', 'UTF-8')
installation.minimal_installation(multilib=True, hostname='archlinux', locale_config=locale_config)
installation.add_additional_packages(['base-devel', 'wget', 'git'])

# Swap
installation.setup_swap('zram')

# Grub
installation.add_bootloader(Bootloader.Grub)

# Network
print_section('Network and Audio')
installation.add_additional_packages(["networkmanager", "network-manager-applet"])
installation.enable_service('NetworkManager.service')

# Audio
installation.add_additional_packages("pulseaudio")
if SysInfo.requires_sof_fw():
    installation.add_additional_packages('sof-firmware')
if SysInfo.requires_alsa_fw():
    installation.add_additional_packages('alsa-firmware')

# Time
print_section('Time')
installation.set_timezone("Europe/Paris")
installation.activate_time_synchronization()

# User
print_section('User')
user = User('eric', 'DUMMYPASSWORD', True)
installation.create_users(user)

# QtileProfile config
print_section('QtileProfile Config')
profile_config = profile.ProfileConfiguration(QtileProfile(), GfxDriver.AllOpenSource, GreeterType.Lightdm) 
profile.profile_handler.install_profile_config(installation, profile_config)

# Keyboard layout (is not done in installation.minimal_installation)
print_section('Keyboard')
installation.set_keyboard_language(locale_config.kb_layout)

# Fstab
print_section('Fstab')
installation.genfstab()

#print_section('Gnome')
# gnome
#installation.add_additional_packages('gnome', 'xf86-video-vmware', 'xf86-input-vmmouse')
#installation.enable_service('gdm.service')
