# arch

 Boot machine with Arch linux ISO in CDROM Drive (on VMWare: VM > Power > Power on to firmware)  
`loadkeys fr-pc` # i.e.: loqdkeys fr)pc as I am on French keyboard

## via SSH:
on Arch (if used on VM, use NAT, not Bridged): 
`passwd`

Note the IP adress with:
`ip a`

On local machine where the repo is:

`cat .\my_automated_install.py | ssh root@[ip address] python - [PASSWORD]`

## via curl
On Arch:
### get script

`curl -k -L https://raw.githubusercontent.com/ericleman/archinstall/main/my_automated_install.py --output i.py`  

or (this one below does not work, needs to change the tiny url):

`curl -k -L https://bit.ly/3ZLPn7w -o i.py`  

### then:

`python i.py [PASSWORD]`


# Old tips
## Some Notes
When 3D acceleration is activated on VMWare, then deactivate it on Google Chrome (or it does not work: https://communities.vmware.com/t5/VMware-Workstation-Pro/Guest-Display-Broken-With-Accelerate-3D-Graphics-Enabled/td-p/2898816)
![image](https://user-images.githubusercontent.com/26767717/177496730-38f3be75-ae3c-4329-a49e-0002abfc595a.png)


## Prorealtime on KDE
From KDE guest, go to : https://www.java.com/fr/download/.

That creates /home/eric/Downloads/jre-8u351-linux-x64.tar.gz

```
sudo su
mkdir /usr/java
mv jre-8u351-linux-x64.tar.gz /usr/java/
cd /usr/java
tar zxvf jre-8u351-linux-x64.tar.gz
```

Now we have /usr/java/jre1.8.0_351/bin/javaws

On IG site, launch Prorealtime in java mode, to get /home/eric/Downloads/itcharts.jnlp

`/usr/java/jre1.8.0_351/bin/javaws /home/eric/Downloads/itcharts.jnlp`

Or change KDE Dolphin settings so *.jnlp open with /usr/java/jre1.8.0_351/bin/javaws


