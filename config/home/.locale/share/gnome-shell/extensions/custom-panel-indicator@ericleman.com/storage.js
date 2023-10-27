import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import GTop from 'gi://GTop';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

function _log(msg) {
    console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

const StorageInfo = GObject.registerClass({
  GTypeName: 'StorageInfo',
}, 
class StorageInfo extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    this.bin.style_class = 'panel-button custom-color3';
    this.bin.label.style_class = 'ubuntu-mono-font';
    this.bin.set_child(this.bin.label);
    this.bin.connect('button-release-event', (actor, e) => {
      let proc;
      switch (e.get_button()) {
        case 1: // Left click
          proc = Gio.Subprocess.new(['alacritty', '-e', 'ncdu'], Gio.SubprocessFlags.NONE);
          break;
        case 3: // Right click
          this.checkStorage();
          break;
      }
    } );
    this.bar.add_actor(this.bin);

    this.add_child(this.bar);
    Main.panel.addToStatusArea('storage-info', this, 1, 'right');

    this.storage = new GTop.glibtop_fsusage();
    // run the command once now
    this.checkStorage();
    // then run the command regularly (every 1800 seconds)
    GLib.timeout_add_seconds(0, 1800, () => {this.checkStorage();return GLib.SOURCE_CONTINUE;});
  }

  unload() {
    this.bar.destroy();
  }
  
  checkStorage() {
    GTop.glibtop_get_fsusage(this.storage, '/');
    let total = this.storage.blocks * this.storage.block_size;
    let free = this.storage.bfree * this.storage.block_size;
    let used = (100*(total - free)/total).toFixed(0);
    this.bin.label.set_text('󱛟 ' + used + '%');  
  }
});

let storageInfo;

export function enable() {
  storageInfo = new StorageInfo();
}
export function disable() {
  storageInfo.unload();
  storageInfo.destroy();
  storageInfo = null;
}