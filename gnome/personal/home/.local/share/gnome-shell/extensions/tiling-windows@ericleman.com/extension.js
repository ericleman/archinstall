/****************
 * Ideas for keybindings
 * SUPER + R: redraw workspace
 * SUPER + F: toggle from tiled -> floating -> fullscreen -> tiled
 * SUPER + O: change orientation of a node and its descendants
 * SUPER + middlebutton: create new workspace and put focused window there
 * 
 * 
 */


const Main = imports.ui.main;

const ORIENTATION = {vertical:0, horizontal: 1};
const GAP = {inner: 30, outter: 30};
const PANEL_HEIGHT = Main.panel.height;
const DEBUG = true;

if (DEBUG) {global.tilingWindowsEricLeman = this;}

function _log(msg) {
  if (DEBUG) log('TILING-WINDOWS *** ' + msg);
}

let WinNode = class WinNode {
  // WinNode is a window within a Layout
  constructor(area,win,parent,parentSide,orientation=ORIENTATION.vertical) {
    this.area = area;
    this.win = win;
    this.id = win ? win.get_id() : null;
    this.orientation = orientation;
    this.children = [];
    this.parent = parent;
    this.parentSide = parentSide;
  }

  print(prefix='') {
    // print node and its children
    if (this.win) _log(prefix + 'node: x:' + this.area.x + ', y:' + this.area.y + ', w:' + this.area.width + ', h:' + this.area.height + ', win:' + this.win.get_id() + ', o:' + this.orientation + ', c:' + this.children)
    this.children.forEach((item) => item.print(prefix+'-'));
  }  
}

let WinTree = class WinTree {
  // WinTree is a tree of WinNodes. There should be one tree per workspae x monitor
  constructor(area) {
    this.root = null;
    this.area = area;
  }

  *preOrderTraversal(node = this.root) {
    yield node;
    if (node.children[0]) yield* this.preOrderTraversal(node.children[0]);
    if (node.children[1]) yield* this.preOrderTraversal(node.children[1]);
  }

  find(id) {
    // returns WinNode with specified id
    for (let node of this.preOrderTraversal()) {
      if (node.id && node.id === id) return node;
    }
    return undefined;
  }

  add(parent,win) {
    // add a win to a parent.
    // if called with parent=root, then recursively put it on last leaf
    // can be called from an existing leaf, for instance to to split an existing window with the new one
    _log("WinTree.add FUNCTION");
    if (parent === null) { //empty tree means we start a new root
      this.root = new WinNode(this.area, win);
    } else if (parent.win) {
      this.split(parent,win);
    } else {
      this.add(parent.children[1],win);
    }
  }

  split(node,win) {
    // split the node (which already has its windows), to add a new node with an new window win
    _log("WinTree.split FUNCTION");
    //_log("Node structure before split");node.print();
    let area0 = {
      x: node.area.x,
      y: node.area.y,
      width: node.orientation ? node.area.width : Math.floor(node.area.width/2) - GAP.inner/2,
      height: node.orientation ? Math.floor(node.area.height/2) - GAP.inner/2 : node.area.height
    };
    let area1 = {
      x: node.orientation ? node.area.x : node.area.x + Math.floor(node.area.width/2) + GAP.inner/2,
      y: node.orientation ? node.area.y + Math.floor(node.area.height/2) + GAP.inner/2 : node.area.y,
      width: node.orientation ? node.area.width : Math.floor(node.area.width/2) - GAP.inner/2,
      height: node.orientation ? Math.floor(node.area.height/2) - GAP.inner/2 : node.area.height
    };
    let node0 = new WinNode(area0,node.win,node,0,1-node.orientation);
    let node1 = new WinNode(area1,win,node,1,1-node.orientation);  
    node.win = null;
    node.children = [node0, node1];
    //_log("Node structure after split");node.print();
  }

  remove(id) {
    // remove a node with a win and upgrade its sibling one step up
    let nodeToRemove = this.find(id);
    let parent = nodeToRemove.parent;
    let siblingToStay = nodeToRemove.parentSide ? parent.children[0] : parent.children[1];   
    parent.win = siblingToStay.win;
    parent.children = siblingToStay.children;
    parent.id = siblingToStay.win ? siblingToStay.win.get_id() : null;
    nodeToRemove = null;
    siblingToStay = null;
  }

  draw(node = this.root) {
    // redraw all windows of the tree on the display starting from a node (e.g. this.root)
    _log("WinTree.draw FUNCTION");
    if (node.win) {
      node.win.move_resize_frame(true,node.area.x,node.area.y,node.area.width,node.area.height);
    } else {
      this.draw(node.children[0]);
      this.draw(node.children[1]);
    }
  }
}

let SignalsManager = class SignalsManager {
  constructor(tm) {
    this.tm = tm;
    this.signals = []; // array of object {handlerId, object connected to signal}
    this.setupSignals();
  }

  setupSignals() {
    this.connectSignal(global.display,"window-created",(display, window) => this.tm.xxx(window));
    this.connectSignal(global.display,"window-left-monitor",(display, number, window) => this.tm.xxx(number, window));
    this.connectSignal(global.display, "grab-op-end", (obj, display, window, op) => this.tm.xxx(window, op));
    this.connectSignal(global.workspace_manager, "workspace-added", (manager, workspace) => this.tm.initWorkspace(workspace));
    this.connectSignal(global.workspace_manager, "active-workspace-changed", () => this.tm.xxx());
    this.connectSignal(global.workspace_manager, "workspace-switched", (object, p0, p1) => this.tm.xxx(workspace));
  }

  connectSignal(object,property,callback) {
    let handler = object.connect(property,callback);
    this.signals.push({handler: handler, object: object});
  }

  disconnectSignal(signal) {
    if (signal.object) {
      signal.object.disconnect(signal.handler);
    }
  }

  disconnectAllSignals() {
    this.signals.forEach(signal => this.disconnectSignal(signal));
  }
}

let TilingManager = class TilingManager {
  constructor() {
    this.sm = new SignalsManager(this);
    this.trees = [];
    this.initWorkspace();
  }

  initWorkspace(workspaceIndex) {
    if (workspaceIndex !== undefined && workspaceIndex !== null) {
      _log(`initWorkspace ${workspaceIndex}`);
      let workspace = global.workspace_manager.get_workspace_by_index(workspaceIndex);
      this.sm.connectSignal(workspace,"window-added", (ws, w) => this.windowAdded(ws, w));
      this.sm.connectSignal(workspace,"window-removed", (ws, w) => this.windowAdded(ws, w));
      /***************************** 
      PLACEHOLDER: ADD A TREE IN this.trees, WITH CORRECT AREA. SHOULD this.TREES BE AN ARRAY OR A DICT?
      *********************************/
    } else {
      for (let i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
          this.initWorkspace(i);
      }
    }
  }

}


function init () {
}

function enable () {
  _log("\n\n***** ENABLE EXTENSION ******");
  this.tm = new TilingManager();



  let display = global.workspace_manager.get_active_workspace().get_display();
  work_area.x = GAP.outter;
  work_area.y = PANEL_HEIGHT + GAP.outter;
  work_area.width = display.get_size()[0] - 2*GAP.outter;
  work_area.height = display.get_size()[1] - 2*GAP.outter - PANEL_HEIGHT;
  this.win_tree = new WinTree(work_area);

  let ws_windows = global.workspace_manager.get_active_workspace().list_windows()
  
  ws_windows.forEach((win) => {
    this.win_tree.add(this.win_tree.root,win); 
    this.win_tree.draw();
    win.connect('unmanaged',() => {this.win_tree.remove(this.win.get_id());this.win_tree.draw();});
  });

  this.winHandlerId = global.window_manager.connect('map', (_, actor) => {
    win = actor.get_meta_window();
    this.win_tree.add(this.win_tree.root,win);
    this.win_tree.draw();
    win.connect('unmanaged',() => {this.win_tree.remove(win.get_id());this.win_tree.draw();});
    this.win_tree.root.print();
  });

}

function disable () {
  this.win_tree = null;
  this.tm.sm.disconnectAllSignals();
}

