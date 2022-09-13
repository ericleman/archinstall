const { Clutter, Gio, GObject, St, GLib } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const CHECK_SCRIPT = `yay -Sy &> /dev/null && (n_up=$(yay -Qu | wc -l);(([ "$n_up" -eq 0 ] && echo "") || echo " $n_up")) || echo "yay N/A"`;

const COMMAND_CHECK = ['bash', '-c', CHECK_SCRIPT]
const COMMAND_UPDATE = ['kitty', 'yay']


const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}


let UpdateBar = GObject.registerClass(
class UpdateBar extends PanelMenu.Button {
  constructor() {
    super();
    this.bar = new St.BoxLayout({});
    this.bin0 = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin0.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    this.bin0.label.style_class = 'mono-font';
    this.bin0.label.set_text('');
    this.bin0.set_child(this.bin0.label);
    this.bin0.connect('button-release-event', () => this.runUpdates() );
    this.bar.add_actor(this.bin0);

    this.bin = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
    this.bin.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
    this.bin.set_child(this.bin.label);
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
            text  = stdout.split('\n')[0];
            this.bin.label.set_text(text);
          } else {
              throw new Error(stderr);
          }
      } catch (e) {
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

var enable = () => {
  updateBar = new UpdateBar();
  _log('updateBar is created');
  Main.panel.addToStatusArea('update-bar', updateBar, 1, 'right');
}
var disable = () => {
  updateBar.destroy();
}