#!/bin/bash
echo "################################################################"
echo "###########################    START      ######################"
echo "################################################################"
read PASSWD
read -s 'Password: ' passvar
sleep 2
PASSWD=abc
echo "Password is $PASSWD"