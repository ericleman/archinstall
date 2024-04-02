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

const Uptime = GObject.registerClass({
  GTypeName: 'Uptime',
}, 
class Uptime extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    //this.bin.style_class = 'panel-button custom-color3';
    this.bin.label.style_class = 'ubuntu-mono-font-orange';
    this.bin.set_child(this.bin.label);
    this.bar.add_child(this.bin);

    this.add_child(this.bar);
    Main.panel.addToStatusArea('uptime', this, 1, 'right');

    // run the command once now
    this.checkUp();
    // then run the command regularly (every 1800 seconds)
    GLib.timeout_add_seconds(0, 5, () => {this.checkUp();return GLib.SOURCE_CONTINUE;});
  }

  unload() {
    this.bar.destroy();
  }
  
  checkUp() {
    try {
      File.Read('/proc/uptime', (content) => {
        let lines = content;
        let uptimeSec = lines.split(' ')[0];

        let scale = [24, 60, 60];
        let units = ['d ', 'h ', 'm '];
        let cbFun = (d, c) => {
          let bb = d[1] % c[0],
              aa = (d[1] - bb) / c[0];
          aa = aa > 0 ? aa + c[1] : '';
          return [d[0] + aa, bb];
        };

        let uptimeStr = scale.map((d, i, a) => a.slice(i).reduce((d, c) => d * c))
                  .map((d, i) => ([d, units[i]]))
                  .reduce(cbFun, ['', uptimeSec]);

        this.bin.label.set_text(' ' + uptimeStr[0]); 
      });
    } catch (e) {
      _log(e);logError(e);
    }
  }
});

let uptime;

export function enable() {
  uptime = new Uptime();
}
export function disable() {
  uptime.unload();
  uptime.destroy();
  uptime = null;
}