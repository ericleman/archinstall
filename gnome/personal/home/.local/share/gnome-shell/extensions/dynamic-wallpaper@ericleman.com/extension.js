
'use strict';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { GLib } = imports.gi;
const Main = imports.ui.main;

const HOME = GLib.get_home_dir();
const WALLPAPER_SCHEMA = 'org.gnome.desktop.background';
const EXTENSIONDIR = Me.dir.get_path();

const DEBUG = true;
function _log(msg) {
  let d = new Date();
  if (DEBUG) log('DYNAMIC WALLPAPER '+d.toISOString()+' *** ' + msg);
}
if (DEBUG) {global.dynamicColorsEricLeman = this;}

function enable(){
  this.lastHour = "";
  this.wallpaperSettings = ExtensionUtils.getSettings(WALLPAPER_SCHEMA);
  changeWallpaper();
  GLib.timeout_add_seconds(0, 120, () => {changeWallpaper();return GLib.SOURCE_CONTINUE;});
}

function disable(){

}

function changeWallpaper() {
  let d = new Date();
  this.currentHour = addZero(d.getHours());
  if (this.currentHour != this.lastHour) {

    let filename = EXTENSIONDIR + '/wallpapers/' + this.currentHour + '.png';

    this.wallpaperSettings.set_string('picture-uri', filename);
    this.wallpaperSettings.set_string('picture-uri-dark', filename);
    this.wallpaperSettings.apply();
  
    this.lastHour = this.currentHour;
    _log("Changing wallpaper to : " + filename);
  }
}

function addZero(i) {
  if (i < 10) {i = "0" + i}
  return i;
}