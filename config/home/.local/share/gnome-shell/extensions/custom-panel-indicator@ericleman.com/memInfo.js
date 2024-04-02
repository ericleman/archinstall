import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as File from './file.js';

function _log(msg) {
    console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

const MemInfo = GObject.registerClass({
  GTypeName: 'MemInfo',
}, 
class MemInfo extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    //this.bin.style_class = 'panel-button custom-color3';
    this.bin.label.style_class = 'ubuntu-mono-font-pink';
    this.bin.set_child(this.bin.label);
    this.bin.connect('button-release-event', () => {
      let proc = Gio.Subprocess.new(['alacritty', '-e', 'btop'], Gio.SubprocessFlags.NONE);
    } );
    this.bar.add_child(this.bin);

    this.add_child(this.bar);
    Main.panel.addToStatusArea('mem-info', this, 1, 'right');

    // run the command once now
    this.checkMem();
    // then run the command regularly (every 1800 seconds)
    GLib.timeout_add_seconds(0, 5, () => {this.checkMem();return GLib.SOURCE_CONTINUE;});
  }

  unload() {
    this.bar.destroy();
  }
  
  checkMem() {
    try {
      File.Read('/proc/meminfo', (content) => {
        let lines = content;
        let values = '', total = 0, avail = 0, swapTotal = 0, swapFree = 0, cached = 0, memFree = 0;
        if (values = lines.match(/MemTotal:(\s+)(\d+) kB/)) total = values[2];
        if (values = lines.match(/MemAvailable:(\s+)(\d+) kB/)) avail = values[2];
        //if (values = lines.match(/SwapTotal:(\s+)(\d+) kB/)) swapTotal = values[2];
        //if (values = lines.match(/SwapFree:(\s+)(\d+) kB/)) swapFree = values[2];
        //if (values = lines.match(/Cached:(\s+)(\d+) kB/)) cached = values[2];
        //if (values = lines.match(/MemFree:(\s+)(\d+) kB/)) memFree = values[2];
        let used = total - avail
        let utilized = (100 * used / total).toFixed(0).padStart(2);
        this.bin.label.set_text(' ' + utilized + '%');    
      });
    } catch (e) {
      _log(e);logError(e);
    }
  }
});

let memInfo;

export function enable() {
    memInfo = new MemInfo();
}
export function disable() {
    memInfo.unload();
    memInfo.destroy();
    memInfo = null;
}