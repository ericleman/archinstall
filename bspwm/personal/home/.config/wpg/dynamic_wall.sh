h=$1

if [ -z "$1" ]
  then
    h=$(date +%H)
fi


picture_path=/usr/share/backgrounds/dynamic/



picture=$(echo $picture_path$h.png)

/usr/bin/wpg -a $picture

/usr/bin/wpg -s $picture

/home/eric/.config/polybar/launch.sh