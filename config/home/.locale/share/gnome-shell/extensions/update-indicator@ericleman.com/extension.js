import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const CHECK_SCRIPT = `yay -Qu | wc -l`;
//const CHECK_SCRIPT = `yay -Sy &> /dev/null && (n_up=$(yay -Qu | wc -l);(([ "$n_up" -eq 0 ] && echo "󰅢  ") || echo " 󰅢 $n_up ")) || echo " yay N/A "`;
const COMMAND_CHECK = ['bash', '-c', CHECK_SCRIPT]
const COMMAND_UPDATE = ['alacritty', '-e', 'yay']

const DEBUG = true;
function _log(msg) {
  if (DEBUG) console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

var UpdateBar = GObject.registerClass({
  GTypeName: 'UpdateBar',
}, 
class UpdateBar extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    this.bin.style_class = 'panel-button custom-color3';
    this.bin.label.style_class = 'ubuntu-mono-font';
    this.bin.set_child(this.bin.label);
    this.bin.connect('button-release-event', () => this.runUpdates() );
    this.bar.add_actor(this.bin);

    this.add_child(this.bar);
    // run the command once now
    this.checkUpdates();
    // then run the command regularly (every 1800 seconds)
    GLib.timeout_add_seconds(0, 1800, () => {this.checkUpdates();return GLib.SOURCE_CONTINUE;});
  }

  destroy() {
    this.bar.destroy();
    super.destroy();
  }

  checkUpdates() {
    let proc = Gio.Subprocess.new(COMMAND_CHECK, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    let text = 'Error in yay';
    proc.communicate_utf8_async(null, null, (proc, res) => {
      try {
          let [, stdout, stderr] = proc.communicate_utf8_finish(res);
          if (proc.get_successful()) {
            let n_upt  = stdout.split('\n')[0];
            if (Number(n_upt)>0) {
              this.bin.label.style_class = 'ubuntu-mono-font-red';
              text = ' '+n_upt;
            } else {
              this.bin.label.style_class = 'ubuntu-mono-font';
              text = '';
            }
            this.bin.label.set_text(text);
          } else {
              throw new Error(stderr);
          }
      } catch (e) {
        _log(e);
        logError(e);
      }
    });
  }

  runUpdates() {
    let proc = Gio.Subprocess.new(COMMAND_UPDATE, Gio.SubprocessFlags.NONE);
    let cancellable = new Gio.Cancellable();
  
    proc.wait_async(cancellable, (proc, result) => {
      try {
          proc.wait_finish(result);
          
          if (proc.get_successful()) {
              _log('YAY process succeeded');
          } else {
              _log('YAY process failed');
          }
          this.checkUpdates();
      } catch (e) {
          logError(e);
      }
    });
  }
 
});

let updateBar;

export default class MyIndicator extends Extension {
  enable(){
    _log('STARTING UPDATE INDICATOR EXTENSION *************');
    updateBar = new UpdateBar(this);
    Main.panel.addToStatusArea('update-bar', updateBar, 1, 'right');
  }

  disable(){
    updateBar.destroy();
    updateBar = null;
  }
  
}

