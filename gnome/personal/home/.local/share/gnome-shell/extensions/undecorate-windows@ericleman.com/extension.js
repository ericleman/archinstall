const {GLib} = imports.gi;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();

function init () {
}

function enable () {

  // remove decoration to all existing windows:
  const window_actors = global.get_window_actors ()
  for (const actor of window_actors) {
    undecorate(actor)
  }  

  // remove decoration to new windows
  const wm = global.window_manager
  this.handlerId = wm.connect('map', (_, actor) => {
    undecorate(actor)
  });
}

function disable () {
  const wm = global.window_manager
  if (this.handlerId) {
    wm.disconnect(this.handlerId);
  }
}


function undecorate(actor) {
  let win = actor.get_meta_window();
  let winId = parseInt(win.get_description(), 16);
  try {
    GLib.spawn_command_line_sync('xprop -id ' + winId
        + ' -f _MOTIF_WM_HINTS 32c -set'
        + ' _MOTIF_WM_HINTS "0x2, 0x0, 0x0, 0x0, 0x0"');
  } catch(e) {
    log(e);
  }
}