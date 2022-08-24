const {St, Clutter, Gio, GLib} = imports.gi;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const extensionFolderPath = Me.dir.get_path();
const COMMAND_CHECK = [extensionFolderPath + '/get_update.sh']
const COMMAND_UPDATE = ['alacritty', '-e', 'yay']

function init () {
}

function enable () {
  this.box = new St.Bin({style_class : "panel-button",reactive : true,});
  this.label = new St.Label({y_align: Clutter.ActorAlign.CENTER,}); 


  this.box.set_child(this.label);
  Main.panel._rightBox.insert_child_at_index(this.box, 0);
  // run the command once now
  runCheckUpdates();
  // then run the command regularly (every 1800 seconds)
  GLib.timeout_add_seconds(0, 1800, () => {runCheckUpdates();return GLib.SOURCE_CONTINUE;});

  this.box.connect("button-press-event", () => {
    runYay();
  });
}

function disable () {
  Main.panel._rightBox.remove_child(this.box);
  this.label = null;
  this.box = null;
}

function runCheckUpdates() {
  let proc = Gio.Subprocess.new(COMMAND_CHECK, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

  proc.communicate_utf8_async(null, null, (proc, res) => {
    try {
        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
        if (proc.get_successful()) {
            //log(stdout);
            let outputAsOneLine  = stdout.split('\n')[0]
            this.label.set_text(outputAsOneLine)
        } else {
            throw new Error(stderr);
        }
    } catch (e) {
        logError(e);
    }
  });
}

function runYay() {
  let proc = Gio.Subprocess.new(COMMAND_UPDATE, Gio.SubprocessFlags.NONE);
  let cancellable = new Gio.Cancellable();

  proc.wait_async(cancellable, (proc, result) => {
    try {
        // Strictly speaking, the only error that can be thrown by this
        // function is Gio.IOErrorEnum.CANCELLED.
        proc.wait_finish(result);
        
        // The process has completed and you can check the exit status or
        // ignore it if you just need notification the process completed.
        if (proc.get_successful()) {
            log('YAY process succeeded');
        } else {
            log('YAY process failed');
        }
        runCheckUpdates();
    } catch (e) {
        logError(e);
    }
  });

}




