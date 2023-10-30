/* To compute CPU, see:
- https://github.com/corecoding/Vitals
- https://rosettacode.org/wiki/Linux_CPU_utilization
*/
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

function _log(msg) {
    console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

const Network = GObject.registerClass({
  GTypeName: 'Network',
}, 
class Network extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin_dn = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin_dn.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    //this.bin_dn.style_class = 'panel-button';
    this.bin_dn.label.style_class = 'ubuntu-mono-font-cyan';
    this.bin_dn.set_child(this.bin_dn.label);
    this.bar.add_actor(this.bin_dn);

    this.bin_up = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin_up.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    //this.bin_up.style_class = 'panel-button custom-color3';
    this.bin_up.label.style_class = 'ubuntu-mono-font-cyan';
    this.bin_up.set_child(this.bin_up.label);
    this.bar.add_actor(this.bin_up);

    this.add_child(this.bar);
    Main.panel.addToStatusArea('network-info', this, 1, 'right');

    this.last_query_dn = new Date().getTime();
    this.last_query_up = new Date().getTime();
    this.last_dn = 0;
    this.last_up = 0;

    this.binary = [ 'B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s' ];
    this.upload_file = Gio.File.new_for_path('/sys/class/net/ens33/statistics/tx_bytes');
    this.download_file = Gio.File.new_for_path('/sys/class/net/ens33/statistics/rx_bytes');
    // run the command once now
    this.checkDown();
    GLib.timeout_add_seconds(0, 5, () => {this.checkDown();return GLib.SOURCE_CONTINUE;});
    this.checkUp();
    GLib.timeout_add_seconds(0, 5, () => {this.checkUp();return GLib.SOURCE_CONTINUE;});
  }

  unload() {
    this.bar.destroy();
  }
  
  checkDown() {
    // figure out last run time
    let now = new Date().getTime();
    let dwell = (now - this.last_query_dn) / 1000;
    this.last_query_dn = now;
    try {
      this.download_file.load_contents_async(null, (_file, res) => {
        try {
          let [length, contents] = this.download_file.load_contents_finish(res);
          let decoder = new TextDecoder('utf-8');
          let bytes = decoder.decode(contents);
          let delta = bytes - this.last_dn;
          this.last_dn = bytes;
          let exponent = 0;
          if (delta > 0) {
            exponent = Math.floor(Math.log(delta) / Math.log(1024));
            if (delta >= Math.pow(1024, exponent) * (1024 - 0.05)) exponent++;
            delta = parseFloat((delta / Math.pow(1024, exponent)));
          }
          let unit = this.binary[exponent];
          let speed = (delta/dwell).toFixed(2) + ' ' + unit;
          this.bin_dn.label.set_text(' ' + speed); 
        } catch (e) {
          _log(e);
          logError(e);
        }
      });
    } catch (e) {
      _log(e);logError(e);
    }
  }
  checkUp() {
    // figure out last run time
    let now = new Date().getTime();
    let dwell = (now - this.last_query_up) / 1000;
    this.last_query_up = now;
    try {
      this.upload_file.load_contents_async(null, (_file, res) => {
        try {
          let [length, contents] = this.upload_file.load_contents_finish(res);
          let decoder = new TextDecoder('utf-8');
          let bytes = decoder.decode(contents);
          let delta = bytes - this.last_up;
          this.last_up = bytes;
          let exponent = 0;
          if (delta > 0) {
            exponent = Math.floor(Math.log(delta) / Math.log(1024));
            if (delta >= Math.pow(1024, exponent) * (1024 - 0.05)) exponent++;
            delta = parseFloat((delta / Math.pow(1024, exponent)));
          }
          let unit = this.binary[exponent];
          let speed = (delta/dwell).toFixed(2) + ' ' + unit;
          this.bin_up.label.set_text(' ' + speed); 
        } catch (e) {
          _log(e);
          logError(e);
        }
      });
    } catch (e) {
      _log(e);logError(e);
    }
  }
});

let network;

export function enable() {
  network = new Network();
}
export function disable() {
  network.unload();
  network.destroy();
  network = null;
}