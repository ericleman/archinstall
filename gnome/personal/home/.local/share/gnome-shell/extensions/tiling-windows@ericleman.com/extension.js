/****************
 *     ^
 *    / \    For now, this extension considers there is only one monitor. 
 *   / ! \   Need to add multi monitor support. For instance, look at https://github.com/rustysec/tidalwm
 *  /  !  \
 *  -------
 * 
 * Ideas for keybindings
 * SUPER + R: redraw workspace
 * SUPER + F: toggle from tiled -> floating -> fullscreen -> tiled
 * SUPER + O: change orientation of a node and its descendants
 * SUPER + middlebutton: create new workspace and put focused window there
 * 
 * 
 */

const Meta = imports.gi.Meta;
const Main = imports.ui.main;

// User parameters:
const ORIENTATION = {vertical:0, horizontal: 1};
const GAP = {inner: 30, outter: 30};
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

  print(prefix=0) {
    // print node and its children
    _log(prefix+'-'.repeat(prefix) + '.x,y,w,h:' + this.area.x + ',' + this.area.y + ',' + this.area.width + ',' + this.area.height + ', win:' + (this.win && this.win.get_id()) + ', o:' + this.orientation + ', s:' + this.parentSide + ', c:' + this.children.length);
    this.children.forEach((item) => item.print(prefix+1));
  }  
}

let WinTree = class WinTree {
  // WinTree is a tree of WinNodes. There should be one tree per workspae x monitor
  constructor(area) {
    this.root = null;
    this.area = area;
  }

  *preOrderTraversal(node = this.root) {
    if (!node) {return;}
    yield node;
    if (node.children[0]) yield* this.preOrderTraversal(node.children[0]);
    if (node.children[1]) yield* this.preOrderTraversal(node.children[1]);
  }

  find(id) {
    // returns WinNode with specified id
    for (let node of this.preOrderTraversal()) {
      if (node && node.id && node.id === id) return node;
    }
    return undefined;
  }

  findParent(id) {
    // returns WinNode which is parent of node with specified id, and return children position (0 or 1)
    for (let node of this.preOrderTraversal()) {
      if (node && node.children.length > 0) {
        if (node.children[0].id === id) return [node, 0];
        if (node.children[1].id === id) return [node, 1];
      } 
    }
    return [undefined,undefined];
  }

  findByGeom(x,y) {
    // returns WinNode with a window and which contains position(x,y) within its frame
    for (let node of this.preOrderTraversal()) {
      if (node.win && node.area.x < x && node.area.x + node.area.width > x && node.area.y < y && node.area.y + node.area.height > y) {
        _log("WinTree.findByGeom FUNCTION:"+x+','+y+','+node.id+','+node.area.x+','+node.area.y+','+node.area.width+','+node.area.height);  
        return node;
      }
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
    _log("WinTree.split FUNCTION: " + win.get_id());
    _log("Tree structure before split");this.root.print();
    let [area0, area1] = this.splitArea(node.area,node.orientation);
    let node0 = new WinNode(area0,node.win,node,0,1-node.orientation);
    let node1 = new WinNode(area1,win,node,1,1-node.orientation);  
    node.win = null;
    node.id = null;
    node.children = [node0, node1];
    _log("Tree structure after split");this.root.print();
  }

  splitArea(area,orientation,ratio=0.5) {
    // split an area in two half. Used in split and cascadeArea.
    let area0 = {
      x: area.x,
      y: area.y,
      width: orientation ? area.width : Math.floor(area.width*ratio - GAP.inner/2),
      height: orientation ? Math.floor(area.height*ratio - GAP.inner/2) : area.height
    };
    let area1 = {
      x: orientation ? area.x : area.x + Math.floor(area.width*ratio + GAP.inner/2),
      y: orientation ? area.y + Math.floor(area.height*ratio + GAP.inner/2) : area.y,
      width: orientation ? area.width : Math.floor(area.width*(1-ratio) - GAP.inner/2),
      height: orientation ? Math.floor(area.height*(1-ratio) - GAP.inner/2) : area.height
    };
    return [area0, area1];
  }
  
  swap(cur_node,new_node) {
    _log("WinTree.swap FUNCTION:" + cur_node.id + ',' + new_node.id);
    _log("Tree structure before swap");this.root.print();
    let tmp_win = new_node.win; let tmp_id = new_node.id;
    new_node.win = cur_node.win; new_node.id = cur_node.id;
    cur_node.win = tmp_win; cur_node.id = tmp_id;
    _log("Tree structure after swap");this.root.print();
  }

  remove(id) {
    // remove a node with a win and upgrade its sibling one step up
    _log("WinTree.remove FUNCTION: " + id);
    _log("Tree structure before removing");this.root.print();
    let [parent,childSide] = this.findParent(id);
    if (!parent) {
      // this was the root, last window on desktop.
      this.root = null;
      return;
    }
    parent.children[childSide] = null;
    parent.win = parent.children[1-childSide].win;
    parent.id = parent.children[1-childSide].id;
    parent.children = parent.children[1-childSide].children;
    this.cascadeArea(parent);
    _log("Tree structure after removing");this.root.print();
  }


  cascadeArea(node) {
    // cascade down the positions (x, y, width, height) to all descendant of node. 
    // This is the case when a block has been upgraded after deletion of a sibling node
    let ratio = this.childrenRatio(node);
    let [area0, area1] = this.splitArea(node.area,node.orientation,ratio);
    if (node.children && node.children[0]) {
      node.children[0].area = area0;
      node.children[0].orientation = 1-node.orientation;
    }
    if (node.children && node.children[1]) {
      node.children[1].area = area1;
      node.children[1].orientation = 1-node.orientation;
    }
  }

  childrenRatio(node) {
    // if a node has 2 children, it returns the ratio between them
    if (node.children.length < 2) return 0.5;
    return (node.orientation == 0) ? node.children[0].area.height / node.area.height : node.children[0].area.width / node.area.width
  }
}

let SignalsManager = class SignalsManager {
  constructor(tm) {
    this.tm = tm;
    this.signals = []; // array of object {handlerId, object connected to signal}
  }

  connectSignal(object,property,callback) {
    let handler = object.connect(property,callback);
    this.signals.push({handler: handler, object: object, property: property});
  }

  disconnectSignal(signal) {
    _log('disconnectSignal ' + signal.object)
    try {
      signal.object.disconnect(signal.handler);
      let newSignals = this.signals.filter(s => s !== signal);
      this.signals = newSignals;
    }
    catch (e) {_log(e);}
  }

  disconnectAllSignals() {
    this.signals.forEach(signal => this.disconnectSignal(signal));
  }

  disconnectObjectSignals(object) {
    if (object) {
      this.signals.filter(signal => signal.object === object).forEach(signal => this.disconnectSignal(signal));
    }
  }

  disconnectObjectOneSignal(object,property) {
    if (object) {
      this.signals.filter(signal => signal.object === object).filter(signal => signal.property === property).forEach(signal => this.disconnectSignal(signal));
    }
  }
}

let TilingManager = class TilingManager {
  constructor() {
    this.sm = new SignalsManager(this);
    this.lastFocusedWin = null;
    this.focusedWin = null;
    this.setupSignals();
    this.initFocus();
    this.initWorkspace();
  }

  setupSignals() {
    this.sm.connectSignal(global.display,"window-created",(display, win) => this.newWindow(win));
    // this.sm.connectSignal(global.display,"window-left-monitor",(display, number, win) => this.tm.xxx(number, win)); // to use for multi monitor support
    this.sm.connectSignal(global.display, "grab-op-begin", (display, win, op) => this.grabBegin(win, op));
    this.sm.connectSignal(global.display, "grab-op-end", (display, win, op) => this.grabEnd(win, op));
    this.sm.connectSignal(global.workspace_manager, "workspace-added", (manager, workspace) => this.initWorkspace(workspace));
    this.sm.connectSignal(global.display, 'notify::focus-window', (obj) => this.updateFocusedWin(obj));
  }


  initFocus() {
    this.lastFocusedWin = global.workspace_manager.get_active_workspace().get_display().get_focus_window();
    this.focusedWin = global.workspace_manager.get_active_workspace().get_display().get_focus_window();
  }

  updateFocusedWin(obj) {
    this.lastFocusedWin = this.focusedWin;
    this.focusedWin = obj.focus_window;
  }

  initWorkspace(workspaceIndex) {
    if (workspaceIndex !== undefined && workspaceIndex !== null) {
      _log(`initWorkspace ${workspaceIndex}`);
      let workspace = global.workspace_manager.get_workspace_by_index(workspaceIndex);
      this.sm.connectSignal(workspace,"window-added", (ws, win) => this.windowAddedToWorkspace(ws, win));
      //this.sm.connectSignal(workspace,"window-removed", (ws, w) => this.removeWindow(ws, w));
      let area = this.getWorkingArea(workspace);
      workspace.winTree = new WinTree(area);
      workspace.list_windows().forEach((win) => this.addWindow(win));
    } else {
      for (let i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
          this.initWorkspace(i);
      }
    }
  }

  removeTrees() {
    for (let i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
      let workspace = global.workspace_manager.get_workspace_by_index(i); 
      if (workspace.winTree) delete workspace.winTree;
    }
  }

  getWorkingArea(workspace) {
    let area = workspace.get_work_area_all_monitors();
    area.x = area.x + GAP.outter;
    area.y = area.y + GAP.outter;
    area.width = area.width - 2*GAP.outter;
    area.height = area.height - 2*GAP.outter;
    return area;
  }

  newWindow(win) {
    let windowType = win.get_window_type();
    if (windowType === 0 || windowType === 4) {
      let actor = win.get_compositor_private();
      actor.connect('first-frame', () =>  this.addWindow(win));
    } else if (windowType === 9) {
      win.make_above();
   }
  }

  addWindow(win) {
    // add window to workspace tree
    _log("addWindow FUNCTION")
    let workspace = win.get_workspace();
    let insertNode = (this.lastFocusedWin && workspace.winTree.find(this.lastFocusedWin.get_id())) || workspace.winTree.root
    if (insertNode) _log(insertNode.id);
    workspace.winTree.add(insertNode, win);
    this.draw(workspace.winTree.root);
    this.sm.connectSignal(win,'unmanaged',() => this.removeWindow(workspace, win));
  }

  removeWindow(workspace, win) {
    // delete window from tree
    workspace.winTree.remove(win.get_id());
    this.draw(workspace.winTree.root);
    this.sm.disconnectObjectSignals(win);
  }

  windowAddedToWorkspace(workspace, win) {
    // when a window is created in a workspace (either creation or moved from another workspace)
    // we need to check if it existed already (not a brand new window) so we remove from the other workspace's tree
    // in such case, we need also to update the unmanaged signal from previous workspace to new one.
    _log("windowAddedToWorkspace FUNCTION");
    let id = win.get_id();
    for (let i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
      if (i != workspace.index()) {
        let otherWorkspace = global.workspace_manager.get_workspace_by_index(i);
        if (otherWorkspace.winTree.find(id)) {
          _log("windowAddedToWorkspace from previous workspace index: "+ i);
          this.sm.disconnectObjectOneSignal(win, 'unmanaged');
          this.sm.connectSignal(win,'unmanaged',() => this.removeWindow(workspace, win));
          otherWorkspace.winTree.remove(id);
          this.draw(otherWorkspace.winTree.root);
          workspace.winTree.add(workspace.winTree.root, win);
          this.draw(workspace.winTree.root);
          break;
        }
      }
    }
  }

  grabBegin(win,op) {
    _log("grabBegin FUNCTION: " + op);
    if (win && win.get_window_type() === 0) { 
      if (win &&
          (op == 36865        // resize (nw)
          || op == 40961      // resize (ne)
          || op == 24577      // resize (se)
          || op == 20481      // resize (sw)
          || op == 16385      // resize (s)
          || op == 32769      // resize (n)
          || op == 4097       // resize (w)
          || op == 8193)) {   // resize (e)
            this.sm.connectSignal(win,'size-changed',(win) => this.resizeWindow(win,op));
      }
    }
  }

  grabEnd(win,op) {
    if (win && op == 1 /* move */) {
      this.swapWindow(win);
    }
    if (win && win.get_window_type() === 0) { 
      if (win &&
          (op == 36865        // resize (nw)
          || op == 40961      // resize (ne)
          || op == 24577      // resize (se)
          || op == 20481      // resize (sw)
          || op == 16385      // resize (s)
          || op == 32769      // resize (n)
          || op == 4097       // resize (w)
          || op == 8193)) {   // resize (e)
        this.sm.disconnectObjectOneSignal(win, 'size-changed');
      }
    }
  }

  resizeWindow(win,op) {
    let workspace = win.get_workspace();
    let [x, y, z] = global.get_pointer();
    _log("resizeWindow FUNCTION: "+win + ',' + op);
    let node = workspace.winTree.find(win.get_id());
    let curArea = node.area;
    _log("resizeWindow FUNCTION: starting x,y,w,h: "+ curArea.x+","+curArea.y+","+curArea.width+","+curArea.height);
    let newArea = win.get_frame_rect();
    _log("resizeWindow FUNCTION: current  x,y,w,h: "+ newArea.x+","+newArea.y+","+newArea.width+","+newArea.height);
    if ([36865,20481,4097].includes(op)) { // West Direction
      _log("resizeWindow FUNCTION: WEST");
      let ultimate = ultimateResized(node,'W');
      if (ultimate === workspace.winTree.root) return; // we cannot resize the full working area
      let ultimateSibling = ultimate.parent.children[1-ultimate.parentSide];
      let xMove = x - ultimate.area.x;
      ultimateSibling.area.width += xMove;
      ultimate.area.x += xMove;
      ultimate.area.width -= xMove;
      workspace.winTree.cascadeArea(ultimate);
      workspace.winTree.cascadeArea(ultimateSibling);
    }
    this.draw(workspace.winTree.root);
    
    function ultimateResized(node,dir) {
      switch(dir) {
        case 'W': return (node.orientation == 1 && node.parentSide == 1) ? node : ultimateResized(node.parent,dir);
        case 'E': return (node.orientation == 1 && node.parentSide == 0) ? node : ultimateResized(node.parent,dir);
        case 'N': return (node.orientation == 0 && node.parentSide == 1) ? node : ultimateResized(node.parent,dir);
        case 'S': return (node.orientation == 0 && node.parentSide == 0) ? node : ultimateResized(node.parent,dir);
      }
    }



  }

  swapWindow(win) {
    let workspace = win.get_workspace();
    let node = workspace.winTree.find(win.get_id());
    if (!node) {
      return;
    }
    let [x, y, z] = global.get_pointer();
    let new_node = workspace.winTree.findByGeom(x,y);
    if (new_node) {
      _log("swapWindow FUNCTION: (x, y): " + x + ', ' + y);
      _log("swapWindow FUNCTION: (id0, id1): " + node.id + ', ' + new_node.id);
      workspace.winTree.swap(node,new_node);
      this.draw(workspace.winTree.root);
    }
  }


  draw(node) {
    // redraw all windows of the tree on the display starting from a node (e.g. this.root)
    if (!node) {return;}
    if (node.win) {
      _log("draw FUNCTION: " + node.id);
      node.win.unmaximize(Meta.MaximizeFlags.BOTH);
      node.win.unmake_fullscreen();
      node.win.move_resize_frame(true,node.area.x,node.area.y,node.area.width,node.area.height);
    } else {
      this.draw(node.children[0]);
      this.draw(node.children[1]);
    }
  }

}


function init () {
}

function enable () {
  _log("\n\n***** ENABLE EXTENSION ******");
  this.tm = new TilingManager();

}

function disable () {
  this.tm.sm.disconnectAllSignals();
  this.tm.removeTrees();
}

