#!/bin/bash
echo "################################################################"
echo "###########################    START      ######################"
echo "################################################################"

PASSWD=$1

if [ -z "$1" ]
  then
    echo "Please provide password"
    read PASSWD
fi

echo "Password is $PASSWD"