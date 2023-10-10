# arch

 Boot machine with Arch linux ISO in CDROM Drive (on VMWare: VM > Power > Power on to firmware)  
`loadkeys fr-pc` # i.e.: loqdkeys fr)pc as I am on French keyboard

## SSH (optional):
on Arch (if used on VM, use NAT, not Bridged): 
`passwd`

Note the IP adress with:
`ip a`

On local machine where the repo is:

`ssh root@[ip address]`

~~`cat .\my_automated_install.py | ssh root@[ip address] python - [PASSWORD]`~~

## curl
On Arch:
### get script

~~`curl -k -L https://raw.githubusercontent.com/ericleman/archinstall/main/my_automated_install.py --output i.py`~~  

or (this one below does not work, needs to change the tiny url):

~~`curl -k -L https://bit.ly/3ZLPn7w -o i.py`~~

`curl -k -L https://bit.ly/3RRpr8K -o i.sh`  

or 

`curl -H 'Cache-Control: no-cache, no-store' -k -L https://bit.ly/3RRpr8K -o i.sh` 

if we want to ignore cache

### then:

`sh i.sh [PASSWORD]`

# VMWare:
Need to add:

`firmware="efi"`

https://www.fosstools.net/how-to-enable-uefi-in-vmware-workstation-player


# Old tips
## Some Notes
When 3D acceleration is activated on VMWare, then deactivate it on Google Chrome (or it does not work: https://communities.vmware.com/t5/VMware-Workstation-Pro/Guest-Display-Broken-With-Accelerate-3D-Graphics-Enabled/td-p/2898816)
![image](https://user-images.githubusercontent.com/26767717/177496730-38f3be75-ae3c-4329-a49e-0002abfc595a.png)


## Prorealtime workaround
From Arch guest, go to : https://www.java.com/fr/download/ and get Linux 64 file.

That creates a file like /home/eric/Downloads/jre-8u381-linux-x64.tar.gz

```
sudo su
mkdir /usr/java
mv jre-8u381-linux-x64.tar.gz /usr/java/
cd /usr/java
tar zxvf jre-8u381-linux-x64.tar.gz
```

Now we have /usr/java/jre1.8.0_381/bin/javaws

On IG site, launch Prorealtime in java mode, to get /home/eric/Downloads/itcharts.jnlp

`/usr/java/jre1.8.0_381/bin/javaws /home/eric/Downloads/itcharts.jnlp`

TODO: Try to change settings so *.jnlp open with /usr/java/jre1.8.0_381/bin/javaws


# Good scripts to consider:
https://github.com/MatMoul/archfi/blob/master/archfi
https://github.com/picodotdev/alis/blob/master/alis.sh
https://github.com/tom5760/arch-install/blob/master/arch_install.sh
