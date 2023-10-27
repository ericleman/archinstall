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

const CPUInfo = GObject.registerClass({
  GTypeName: 'CPUInfo',
}, 
class CPUInfo extends PanelMenu.Button {
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
    this.bar.add_actor(this.bin);

    this.add_child(this.bar);
    Main.panel.addToStatusArea('cpu-info', this, 1, 'right');

    this.last_query = new Date().getTime();
    this.last_cpu = 0;
    this.cpuFile = Gio.File.new_for_path('/proc/stat');
    // run the command once now
    this.checkCPU();
    // then run the command regularly (every 1800 seconds)
    GLib.timeout_add_seconds(0, 5, () => {this.checkCPU();return GLib.SOURCE_CONTINUE;});
  }

  unload() {
    this.bar.destroy();
  }
  
  checkCPU() {
    // figure out last run time
    let now = new Date().getTime();
    let dwell = (now - this.last_query) / 1000;
    this.last_query = now;
    try {
      this.cpuFile.load_contents_async(null, (_file, res) => {
        try {
          let utilized = 0;
          let [length, contents] = this.cpuFile.load_contents_finish(res);
          let decoder = new TextDecoder('utf-8');
          let procstat = decoder.decode(contents);
          let nb_cores = procstat.match(/cpu\d+/g).length;
          let lines = procstat.split('\n');
          // we use only first line (lines[0]) which contains aggreted cpu data (not cpu0, cpu1...)
          let stats = lines[0].split(/\s+/); // cpu user nice system idle...
          let total = parseInt(stats[1]) + parseInt(stats[2]) + parseInt(stats[3]);
          if (this.last_cpu > 0) {
            utilized = ((total - this.last_cpu) / dwell / nb_cores).toFixed(0);;
          }
          this.last_cpu = total;
          this.bin.label.set_text(' ' + utilized + '%');  
    
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

let cpuInfo;

export function enable() {
  cpuInfo = new CPUInfo();
}
export function disable() {
  cpuInfo.unload();
  cpuInfo.destroy();
  cpuInfo = null;
}