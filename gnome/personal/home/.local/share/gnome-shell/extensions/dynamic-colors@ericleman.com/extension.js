/* Inspired from 
https://github.com/avanishsubbiah/material-you-theme
 */
'use strict';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const string_utils = Me.imports.utils.string_utils;
const color_utils = Me.imports.utils.color_utils;

const HOME = GLib.get_home_dir();
const WALLPAPER_SCHEMA = 'org.gnome.desktop.background';
const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const SHELL_SCHEMA = 'org.gnome.shell.extensions.user-theme';
const EXTENSIONDIR = Me.dir.get_path();
const PYWAL_CACHE = HOME + '/.cache/wal/'

const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('DYNAMIC COLOR '+Date.now()+' *** ' + msg);
}
if (DEBUG) {global.dynamicColorsEricLeman = this;}

function enable(){
  this.interfaceSettings = ExtensionUtils.getSettings(INTERFACE_SCHEMA);
  this.interfaceSettings.connect('changed::color-scheme', () => {
    runPywal();
  });
  this.wallpaperSettings = ExtensionUtils.getSettings(WALLPAPER_SCHEMA);
  this.wallpaperSettings.connect('changed::picture-uri', () => {
    runPywal();
  });

  runPywal();
}

function disable(){
  remove_theme();
  this.interfaceSettings = null;
  this.wallpaperSettings = null;
}

function runPywal() {
  // Checking dark theme preference
  let interface_settings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
  let dark_pref = interface_settings.get_string('color-scheme');
  let isDark = (dark_pref === "prefer-dark");

  // Getting img and its color theme
  let desktop_settings = new Gio.Settings({ schema: WALLPAPER_SCHEMA });
  let wall_uri_type = isDark ? "-dark" : "";
  let wall_path = desktop_settings.get_string('picture-uri' + wall_uri_type);
  if (wall_path.includes("file://")) {
      wall_path = Gio.File.new_for_uri(wall_path).get_path();
  }

  let pywalCommand = ['/usr/bin/wal', '-i', wall_path];
  if (!isDark) pywalCommand.push('-l');
  runCommand(pywalCommand,getPalette.bind(this));
}

function getPalette() {
  _log('getPalette FUNCTION');
  read_file_async(PYWAL_CACHE + 'colors.json', (content) => {
    //_log(content);
    this.palette = JSON.parse(content);
    _log('palette: '+this.palette.colors.color1);
    applyTheme()
  });
}

function applyTheme() {
  _log('applyTheme FUNCTION');
  _log('palette: '+this.palette.colors.color1);
  
  applyColorTemplate('/templates/gtk.txt', HOME + '/.config/gtk-3.0', 'gtk.css');
  applyColorTemplate('/templates/gtk.txt', HOME + '/.config/gtk-4.0', 'gtk.css');
  applyColorTemplate('/templates/shell/42/gnome-shell-sass/_colors.txt', EXTENSIONDIR + '/templates/shell/42/gnome-shell-sass', '_colors.scss');

  create_dir_sync(HOME + "/.local/share/themes/DynamicColors");
  create_dir_sync(HOME + "/.local/share/themes/DynamicColors/gnome-shell");
  compile_sass(
    EXTENSIONDIR + '/templates/shell/42/gnome-shell.scss', 
    HOME + '/.local/share/themes/DynamicColors/gnome-shell/gnome-shell.css'
  );
  
  ExtensionUtils.getSettings(SHELL_SCHEMA).set_string("name", "reset"); // reset shell theme to update on the fly without restarting Shell
  GLib.timeout_add_seconds(0, 1, () => {ExtensionUtils.getSettings(SHELL_SCHEMA).set_string("name", "DynamicColors");return false;});
}


/**
 * Apply color scheme to template and copy it to destination file.
 */
function applyColorTemplate(template, destinationPath, destinationFile) {
  _log("applyColorTemplate FUNCTION");
  _log('palette: '+this.palette.colors.color1);
  create_dir_sync(destinationPath);
  let colorTemplate = read_file(EXTENSIONDIR + template);
  colorTemplate = colorTemplate.replace(/{{.*}}/gm, (match) => {
    let jsn = match.slice(2,-2); // remove first and last two curly brackets
    jsn = JSON.parse(jsn);
    if (!Array.isArray(jsn)) { // not an array, simple dict with color and opacity (default=1)
      if (!jsn.opacity) {jsn.opacity = 1;}
      let argb = this.palette.colors[jsn.color];
      _log('argb: '+argb)
      if (jsn.hex) return string_utils.hexFromArgb(argb);
      let r = color_utils.redFromArgb(argb);
      let g = color_utils.greenFromArgb(argb);
      let b = color_utils.blueFromArgb(argb);
      let colorStr = "rgba(" + r + ", " + g + ", " + b + ", " + jsn.opacity + ")"
      return colorStr;
    } else { // this is an array so mixing colors
      if (jsn.length > 0) {
        let totalColor = this.palette.colors[jsn[0].color]; // Setting base color
        // Mixing in added colors
        for (let i = 1; i < jsn.length; i++) {
            let argb = this.palette.colors[jsn[i].color];
            let r = color_utils.redFromArgb(argb);
            let g = color_utils.greenFromArgb(argb);
            let b = color_utils.blueFromArgb(argb);
            let a = jsn[i].opacity;
            let addedColor = color_utils.argbFromRgba(r, g, b, a);
            totalColor = color_utils.blendArgb(totalColor, addedColor);
        }
        let colorStr = string_utils.hexFromArgb(totalColor);
        return colorStr
      }
    }
  });
  write_str_sync(colorTemplate, destinationPath + '/' + destinationFile);
}

/**
 * Get the source color from an image.
 *
 * @param image The image element
 * @return Source color - the color most suitable for creating a UI theme
 */
 function sourceColorFromImage(image) {
  // Convert Image data to Pixel Array
  const image_pixels = image.get_pixels();
  const n_channels = image.get_n_channels();
  const rowstride = image.get_rowstride();
  const pixels = [];
  for (let x = 0; x < image.get_width(); x++) {
      for (let y = 0; y < image.get_height(); y++) {
          const pixel = get_pixel(image_pixels, n_channels, rowstride, x, y);
          const argb = color_utils.argbFromRgb(pixel[0], pixel[1], pixel[2]);
          pixels.push(argb);
      }
  }

  // Convert Pixels to Material Colors
  const result = QuantizerCelebi.quantize(pixels, 128);
  const ranked = Score.score(result);
  const top = ranked[0];
  return top;
}

function get_pixel (pixels, n_channels, rowstride, x, y)
{
  // The pixel we wish to modify
  let pixel_start = y * rowstride + x * n_channels;
  return [pixels[pixel_start], pixels[pixel_start + 1], pixels[pixel_start + 2]]
}


function remove_theme() {
  delete_file(HOME + "/.config/gtk-4.0/gtk.css");
  delete_file(HOME + "/.config/gtk-3.0/gtk.css");
}

async function create_dir(path) {
  const file = Gio.File.new_for_path(path);
  try {
      await new Promise((resolve, reject) => {
          file.make_directory_async(
              GLib.PRIORITY_DEFAULT,
              null,
              (file_, result) => {
                  try {
                      resolve(file.make_directory_finish(result));
                  } catch (e) {
                      reject(e);
                  }
              }
          );
      });
  } catch (e) {
      log(e);
  }
}

function create_dir_sync(path) {
  const file = Gio.File.new_for_path(path);
  // Synchronous, blocking method
  try {
      file.make_directory(null);
  } catch(e) {
      log(e);
  }
}

async function delete_file(path) {
  const file = Gio.File.new_for_path(path);
  try {
      await new Promise((resolve, reject) => {
          file.delete_async(
              GLib.PRIORITY_DEFAULT,
              null,
              (file_, result) => {
                  try {
                      resolve(file.delete_finish(result));
                  } catch (e) {
                      reject(e);
                  }
              }
          );
      });
  } catch (e) {
      log(e);
  }
}

async function write_str(str, path) {
  //_log("write_str " + str);
  const file = Gio.File.new_for_path(path);
  try {
      await new Promise((resolve, reject) => {
          file.replace_contents_bytes_async(
              new GLib.Bytes(str),
              null,
              false,
              Gio.FileCreateFlags.REPLACE_DESTINATION,
              null,
              (file_, result) => {
                  try {
                      resolve(file.replace_contents_finish(result));
                  } catch (e) {
                      reject(e);
                  }
              }
          );
      });
  } catch (e) {
      log(e);
  }
}

function write_str_sync(str, path) {
  const file = Gio.File.new_for_path(path);
  const [, etag] = file.replace_contents(str, null, false,
  Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}

function read_file(path) {
  const file = Gio.File.new_for_path(path);
  const [, contents, etag] = file.load_contents(null);
  const decoder = new TextDecoder('utf-8');
  const contentsString = decoder.decode(contents);
  return contentsString;
}

function read_file_async(path,callback) {
  const file = Gio.File.new_for_path(path);
  let cancellable = new Gio.Cancellable();
  file.load_contents_async(cancellable, (file, res) => {
    try {
      const [, contents] = file.load_contents_finish(res);
      callback(contents);
    } catch (e) {
      logError(e);
    }
  });
}


function compile_sass(scss, output) {
  runCommand(['sassc', scss, output]);
}

function runCommand(cmd,callback) {
  let proc = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.NONE);
  let cancellable = new Gio.Cancellable();

  proc.wait_async(cancellable, (proc, result) => {
    try {
        proc.wait_finish(result);
        
        if (proc.get_successful()) {
            _log('runCommand process succeeded');
            if (callback) callback();
        } else {
            _log('runCommand process failed');
        }
    } catch (e) {
        logError(e);
    }
  });
}
