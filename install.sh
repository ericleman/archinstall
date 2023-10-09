#!/bin/bash
echo "################################################################"
echo "###########################    START      ######################"
echo "################################################################"

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
reflector --country France --age 12 --protocol https --sort rate --save /etc/pacman.d/mirrorlist