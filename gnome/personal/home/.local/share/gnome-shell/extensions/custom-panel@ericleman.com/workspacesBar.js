const { Clutter, GObject, Shell, St } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const ICONS = {
  'Alacritty': '',
  'kitty': '',
  'Google-chrome': '',
  'Code': '',
  'Org.gnome.Nautilus': '', 
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
    // this.winCreated = global.display.connect("window-created",(display, win) => this.updateWs.bind(this));
    // this.winLeft = global.display.connect("window-left-monitor",(display, number, win) => this.updateWs.bind(this));
    // this.restacked = global.display.connect('restacked', this.updateWs.bind(this));
    this.windowsChanged = Shell.WindowTracker.get_default().connect('tracked-windows-changed', this.updateWs.bind(this));
  }

  destroy() {
    if (this.wsActiveChanged) global.workspace_manager.disconnect(this.wsActiveChanged);
    if (this.wsNumberChanged) global.workspace_manager.disconnect(this.wsNumberChanged);
    // if (this.winCreated) global.display.disconnect(this.winCreated);
    // if (this.winLeft) global.display.disconnect(this.winLeft);
    // if (this.restacked) global.display.disconnect(this.restacked);
    if (this.windowsChanged) Shell.WindowTracker.get_default().disconnect(this.windowsChanged);
    this.wsBar.destroy();
		super.destroy();
  }

  updateWs() {
    _log('updateWs FUNCTION');
    this.wsBar.destroy_all_children();
    for (let wsIndex = 0; wsIndex < global.workspace_manager.get_n_workspaces(); ++wsIndex) {
      _log('updateWs wsIndex: '+wsIndex);
      this.wsBox = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
      //this.wsBox.reactive = true;
      this.wsBox.style_class = 'panel-button';
      this.wsBox.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
      this.wsBox.label.set_text(this.wsText(wsIndex));
      this.wsBox.label.style_class = 'noto-mono-font';
      if (wsIndex == global.workspace_manager.get_active_workspace_index()) {
        this.wsBox.add_style_class_name('custom-color2');
      } else {
        this.wsBox.add_style_class_name('custom-color3');
      }
      this.wsBox.set_child(this.wsBox.label);
      this.wsBox.connect('button-release-event', () => this.switchWs(wsIndex) );
      this.wsBar.add_actor(this.wsBox);
    }

  }

  wsText(wsIndex) {
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
    let text = ' ';
    if (nWindows > 0) {
      text = ICONS[wmClass];
      if (!text) text = ''
      if (nWindows > 1) text += ' +'
    }
    text = ' ' + text + ' ';
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
  Main.panel.addToStatusArea('workspaces-icons', workspacesBar, 1, 'left');
}
var disable = () => {
  workspacesBar.destroy();
}