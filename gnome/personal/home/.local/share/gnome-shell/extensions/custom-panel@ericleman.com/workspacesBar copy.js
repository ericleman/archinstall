const { Clutter, Gio, GObject, Shell, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

// const ICONS = {
//   'Alacritty': '',
//   'kitty': '',
//   'Google-chrome': '',
//   'Code': '',
//   'Org.gnome.Nautilus': '', 
// }

const ICONS = {
  'Alacritty': 'baseline-terminal.svg',
  'kitty': 'baseline-terminal.svg',
  'Google-chrome': 'google-chrome.svg',
  'Code': 'brand-vscode.svg',
  'Org.gnome.Nautilus': 'folder-open-outline.svg', 
}

const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}


let WorkspacesBar = GObject.registerClass(
class WorkspacesBar extends PanelMenu.Button {
  constructor() {
    super();
    this.wsBar = new St.BoxLayout({});
    this.updateWs();
    this.add_child(this.wsBar);

    // signals for workspaces state: active workspace, number of workspaces
    this.wsActiveChanged = global.workspace_manager.connect('active-workspace-changed', this.updateWs.bind(this));
    this.wsNumberChanged = global.workspace_manager.connect('notify::n-workspaces', this.updateWs.bind(this));
  }

  destroy() {
    if (this.wsActiveChanged) global.workspace_manager.disconnect(this.wsActiveChanged);
    if (this.wsNumberChanged) global.workspace_manager.disconnect(this.wsNumberChanged);
    this.wsBar.destroy();
		super.destroy();
  }

  updateWs() {
    _log('updateWs FUNCTION');
    this.wsBar.destroy_all_children();
    for (let wsIndex = 0; wsIndex < global.workspace_manager.get_n_workspaces(); ++wsIndex) {
      _log('updateWs wsIndex: '+wsIndex);
      this.wsBox = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
      this.wsBox.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
      this.wsBox.label.set_text(this.ws_text(wsIndex));
      this.wsBox.set_child(this.wsBox.label);
      this.wsBox.connect('button-release-event', () => this.switchWs(wsIndex) );
      this.wsBar.add_actor(this.wsBox);
    }

  }

  ws_text(wsIndex) {
    let workspace = global.workspace_manager.get_workspace_by_index(wsIndex);
    let biggestWin = {size: 0, class: null}
    workspace.list_windows().forEach((win) => {
      let size = win.get_frame_rect().area();
      if (size > biggestWin.size) {
        biggestWin.size = size;
        biggestWin.class = win.get_wm_class();
      }
    });
    return this.text_for_class(biggestWin.class, workspace.n_windows);
  }

  text_for_class(wmClass, nWindows) {
    let text = ICONS[wmClass];
    if (!text) text = 'laptop.svg';
    if (nWindows > 1) text += '/'
    return text;
  }

  switchWs(wsIndex) {
    global.workspace_manager.get_workspace_by_index(wsIndex).activate(global.get_current_time());
  }

  
});


let workspacesBar;

var enable = () => {
  workspacesBar = new WorkspacesBar();
  _log('workspacesBar is created');
  //Main.panel._leftBox.insert_child_at_index(workspacesBar, 0);
  Main.panel.addToStatusArea('workspaces-bar', workspacesBar, 1, 'left');
}
var disable = () => {
  //ain.panel._leftBox.remove_child(workspacesBar);
  workspacesBar.destroy();
}