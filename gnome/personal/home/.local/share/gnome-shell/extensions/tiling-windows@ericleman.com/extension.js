/****************
 *     ^
 *    / \    For now, this extension considers there is only one monitor. 
 *   / ! \   Need to add multi monitor support. For instance, look at https://github.com/rustysec/tidalwm
 *  /  !  \
 *  -------
 * 
 * Keybindings
 * SUPER + R: redraw workspace
 * SUPER + F: toggle from tiled -> floating -> fullscreen -> tiled
 * SHIFT + SUPER + F: create new workspace and put focused window there
 * SUPER + O: change orientation of a node and its descendants
 * 
 * 
 */

const {Gio, Shell, Meta, GLib} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

// User parameters:
const ORIENTATION = {vertical:0, horizontal: 1};
const GAP = {inner: 30, outter: 30};
const MIN_WIN_SIZE = 100;
const INACTIVE_OPACITY = 180;
const WM_CLASSES_FOR_OPACITY =  ['Alacritty', 'kitty'];
const EXCEPTIONS = ['com-itfinance-core-Starter']; // window classes to be excluded from tiling
const DEBUG = true;

if (DEBUG) {global.tilingWindowsEricLeman = this;}

function _log(msg) {
  if (DEBUG) log('TILING-WINDOWS '+Date.now()+' *** ' + msg);
}

let WinNode = class WinNode {
  // WinNode is a window within a Layout
  constructor(area,win,parent,parentSide,orientation=ORIENTATION.horizontal) {
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

  sibling(node) {
    if (node !== this.root) {// root has no sibling
      return node.parent.children[1-node.parentSide];
    }
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
    let [area0, area1] = this.splitArea(node.area,1-node.orientation);
    let node0 = new WinNode(area0,node.win,node,0,1-node.orientation);
    let node1 = new WinNode(area1,win,node,1,1-node.orientation);  
    node.win = null;
    node.id = null;
    node.children = [node0, node1];
    _log("Tree structure after split");this.root.print();
  }

  splitArea(area,orientation,ratio=0.5) {
    // split an area in two half. Used in split and cascadeArea.
    // ratio is portion of first node on all width (or height) including GAP.
    let area0 = {
      x: area.x,
      y: area.y,
      width: orientation ? area.width : Math.max(MIN_WIN_SIZE, Math.round(area.width*ratio)),
      height: orientation ? Math.max(MIN_WIN_SIZE, Math.round(area.height*ratio)) : area.height
    };
    let area1 = {
      x: orientation ? area.x : area0.x + area0.width + GAP.inner,
      y: orientation ? area0.y + area0.height + GAP.inner : area.y,
      width: orientation ? area.width : Math.max(MIN_WIN_SIZE, area.width - area0.width - GAP.inner),
      height: orientation ? Math.max(MIN_WIN_SIZE, area.height - area0.height - GAP.inner) : area.height
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
    let survivor = parent.children[1-childSide];
    parent.win = survivor.win;
    parent.id = survivor.id;
    parent.children = survivor.children;
    let switchOrientation = (survivor.orientation != parent.orientation);
    // if (survivor.orientation != parent.orientation) {
    //   this.switchChildrenOrientations(parent);
    // }
    this.cascadeArea(parent,switchOrientation);
    _log("Tree structure after removing");this.root.print();
  }

  // switchChildrenOrientations(node) {
  //   // switch the orientation to all descendant of node. 
  //   // This is the case when a block has been upgraded to a parent with another orientation, after deletion of a sibling node
  //   node.children.forEach(child => {
  //     child.orientation = 1 - child.orientation;
  //     this.switchChildrenOrientations(child);
  //   })
  // }

  cascadeArea(node,switchOrientation=false) {
    // cascade down the positions (x, y, width, height) to all descendant of node. 
    // This is the case when a block has been upgraded after deletion of a sibling node
    // This is the case after a resize
    _log("WinTree.cascadeArea FUNCTION: " + node.id);
    let ratio = this.childrenRatio(node);
    _log("WinTree.cascadeArea Ratio: " + ratio);
    if (node.children.length == 2) {
      let newOrientation = (switchOrientation) ? 1 - node.children[0].orientation : node.children[0].orientation;
      let areas = this.splitArea(node.area,newOrientation,ratio);
      node.children.forEach(child => {
        child.area = areas.shift();
        child.orientation = newOrientation;
        this.cascadeArea(child,switchOrientation);
      });
   } 
  }

  childrenRatio(node) {
    // if a node has 2 children, it returns the ratio between them
    if (node.children.length < 2) return 0.5;
    //return (node.children[0].orientation) ? node.children[0].area.width / node.area.width : node.children[0].area.height / node.area.height
    return (node.children[0].orientation) ? node.children[0].area.height / (node.children[0].area.height + node.children[1].area.height + GAP.inner)
                                          : node.children[0].area.width / (node.children[0].area.width + node.children[1].area.width + GAP.inner);
  }
}

let SignalsManager = class SignalsManager {
  constructor() {
    this.signals = []; // array of object {handlerId, object connected to signal}
  }

  connectSignal(object,property,callback) {
    // connect a new signal
    let handler = object.connect(property,callback);
    this.signals.push({handler: handler, object: object, property: property});
  }

  disconnectSignals(object,property) {
    // disconnect all signals (if object and property are null) or signal for specific object, specific property if specified
    _log('disconnectSignal ' + object + ',' + property)
    let newSignals = []
    this.signals.forEach(signal => {
      if ((!object || signal.object === object) && (!property || signal.property === property)) {
        try {
          signal.object.disconnect(signal.handler);
        }
        catch (e) {_log(e);}
      } else {
        newSignals.push(signal);
      }
    });
    this.signals = newSignals;
  }
}

let KeybindingsManager = class KeybindingsManager {
  constructor(schema) {
    this.mode = Shell.ActionMode.ALL;
    this.flag = Meta.KeyBindingFlags.NONE;
    this.schema = schema;
    this.keys = [];
    this.settings = this.getSettings();
  }

  getSettings () {
    let GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(
      Me.dir.get_child("schemas").get_path(),
      GioSSS.get_default(),
      false
    );
    let schemaObj = schemaSource.lookup(this.schema,true);
    if (!schemaObj) {
      throw new Error('cannot find schemas');
    }
    return new Gio.Settings({ settings_schema : schemaObj });
  }
  
  addKeybinding(key,callback) {
    Main.wm.addKeybinding(key, this.settings, this.flag, this.mode, callback);
    _log('addKeybinding: '+ key);
    this.keys.push(key);
  }

  removeKeybindings() {
    this.keys.forEach(k => {
      _log('removeKeybindings: '+ k)
      Main.wm.removeKeybinding(k);
    });
  }

}
let TilingManager = class TilingManager {
  constructor() {
    this.sm = new SignalsManager();
    this.km = new KeybindingsManager('org.gnome.shell.extensions.tiling-windows');
    this.lastFocusedWin = null;
    this.focusedWin = null;
    this.initSignals();
    this.initKeybindings();
    this.initFocus();
    this.initWorkspace();
  }

  initKeybindings() {
    this.km.addKeybinding('change-orientation', () => this.changeOrientation());
    this.km.addKeybinding('toggle-floating', () => this.toggleFloating());
    this.km.addKeybinding('dedicated-workspace', () => this.dedicatedWorkspace());
    this.km.addKeybinding('redraw-tiling', () => this.redraw());
  }

  initSignals() {
    this.sm.connectSignal(global.display,"window-created",(display, win) => this.newWindow(win));
    // this.sm.connectSignal(global.display,"window-left-monitor",(display, number, win) => this.xxx(number, win)); // to use for multi monitor support
    this.sm.connectSignal(global.display, "grab-op-begin", (display, win, op) => this.grabBegin(win, op));
    this.sm.connectSignal(global.display, "grab-op-end", (display, win, op) => this.grabEnd(win, op));
    this.sm.connectSignal(global.workspace_manager, "workspace-added", (manager, workspace) => this.initWorkspace(workspace));
    this.sm.connectSignal(global.workspace_manager, 'workspace-switched', (object, p0, p1) => this.redraw());
    this.sm.connectSignal(global.display, 'notify::focus-window', (obj) => this.updateFocusedWin(obj));
  }


  initFocus() {
    this.lastFocusedWin = global.workspace_manager.get_active_workspace().get_display().get_focus_window();
    this.focusedWin = global.workspace_manager.get_active_workspace().get_display().get_focus_window();
  }

  updateFocusedWin(obj) {
    this.lastFocusedWin = this.focusedWin;
    this.focusedWin = obj.focus_window;
    if (this.focusedWin) this.draw(this.focusedWin.get_workspace().winTree.root);
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
    if (EXCEPTIONS.includes(win.get_wm_class())) return;
    let windowType = win.get_window_type();
    if (windowType === 0 || windowType === 4) {
      let actor = win.get_compositor_private();
      actor.connect('first-frame', () =>  this.addWindow(win));
    } else if (windowType === 9) {
      win.make_above();
   }
  }

  changeOrientation() {
    _log("changeOrientation FUNCTION")
    let win = this.focusedWin
    let workspace = win.get_workspace();
    _log("Tree structure before changeOrientation");workspace.winTree.root.print();
    let node = workspace.winTree.find(win.get_id());
    let [parent,childSide] = workspace.winTree.findParent(node.id);
    if (!parent) {
      // this was the root, last window on desktop.
      this.root = null;
      return;
    }
     //node.orientation = 1 - node.orientation;
     //parent[1-childSide].orientation = 1 - node.orientation;
     _log("Tree structure during changeOrientation");workspace.winTree.root.print();
     workspace.winTree.cascadeArea(parent,true);
     _log("Tree structure after changeOrientation");workspace.winTree.root.print();
     this.draw(workspace.winTree.root);
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
    this.sm.disconnectSignals(win);
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
          this.sm.disconnectSignals(win, 'unmanaged');
          otherWorkspace.winTree.remove(id);
          this.draw(otherWorkspace.winTree.root);

          this.sm.connectSignal(win,'unmanaged',() => this.removeWindow(workspace, win));
          workspace.winTree.add(workspace.winTree.root, win);
          this.draw(workspace.winTree.root);
          break;
        }
      }
    }
  }

  grabBegin(win,op) {
    _log("grabBegin FUNCTION: " + op);
    if (!win.get_workspace().winTree.find(win.get_id())) return; // window not in tiling tree
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
    if (!win.get_workspace().winTree.find(win.get_id())) return; // window not in tiling tree
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
        this.sm.disconnectSignals(win, 'size-changed');
      }
    }
  }

  resizeWindow(win,op) {
    let workspace = win.get_workspace();
    let [x, y, z] = global.get_pointer();
    _log("resizeWindow FUNCTION: "+win + ',' + op);
    _log("Tree structure before resizeWindow");workspace.winTree.root.print();
    let node = workspace.winTree.find(win.get_id());
    //let curArea = node.area;
    //_log("resizeWindow FUNCTION: starting x,y,w,h: "+ curArea.x+","+curArea.y+","+curArea.width+","+curArea.height);
    //let newArea = win.get_frame_rect();
    //_log("resizeWindow FUNCTION: current  x,y,w,h: "+ newArea.x+","+newArea.y+","+newArea.width+","+newArea.height);
    if ([36865,20481,4097,8193,24577,40961].includes(op)) { // West/East Direction
      let direction = [36865,20481,4097].includes(op) ? 'W' : 'E';
      _log("resizeWindow FUNCTION: " + direction);
      let ultimate = ultimateResized(node,direction);
      if (ultimate !== workspace.winTree.root) {// we cannot resize the full working area of root
        let ultimateSibling = workspace.winTree.sibling(ultimate);
        let left = (direction == 'W') ? ultimateSibling : ultimate;
        let right = (direction == 'W') ? ultimate : ultimateSibling;
        let xMove = x - right.area.x; // xMove is positive when moving to right
        xMove = Math.min(xMove,right.area.width - MIN_WIN_SIZE - GAP.inner); // move to the right cannot reduce right window to minimum
        xMove = Math.max(xMove,-left.area.width + MIN_WIN_SIZE + GAP.inner) // move to the left cannot reduce left window to minimum
        left.area.width += xMove;
        right.area.x += xMove;
        right.area.width -= xMove;
        workspace.winTree.cascadeArea(right);
        workspace.winTree.cascadeArea(left);
        _log("Tree structure after resizeWindow");workspace.winTree.root.print();
      }
    }
    if ([32769,36865,40961,16385,24577,20481].includes(op)) { // North/South Direction
      let direction = [32769,36865,40961].includes(op) ? 'N' : 'S';
      _log("resizeWindow FUNCTION: " + direction);
      let ultimate = ultimateResized(node,direction);
      if (ultimate !== workspace.winTree.root) {// we cannot resize the full working area of root
        let ultimateSibling = workspace.winTree.sibling(ultimate);
        let top = (direction == 'N') ? ultimateSibling : ultimate;
        let bottom = (direction == 'N') ? ultimate : ultimateSibling;
        let yMove = y - bottom.area.y; // yMove is positive when moving to bottom
        yMove = Math.min(yMove,bottom.area.height - MIN_WIN_SIZE - GAP.inner); // move to bottom cannot reduce bottom window to minimum
        yMove = Math.max(yMove,-top.area.height + MIN_WIN_SIZE + GAP.inner) // move to top cannot reduce top window to minimum
        top.area.height += yMove;
        bottom.area.y += yMove;
        bottom.area.height -= yMove;
        workspace.winTree.cascadeArea(top);
        workspace.winTree.cascadeArea(bottom);
        _log("Tree structure after resizeWindow");workspace.winTree.root.print();
      }
    }
    this.draw(workspace.winTree.root);
    
    function ultimateResized(node,dir) {
      switch(dir) {
        case 'W': return (node.orientation == 0 && node.parentSide == 1) ? node : ultimateResized(node.parent,dir);
        case 'E': return (node.orientation == 0 && node.parentSide == 0) ? node : ultimateResized(node.parent,dir);
        case 'N': return (node.orientation == 1 && node.parentSide == 1) ? node : ultimateResized(node.parent,dir);
        case 'S': return (node.orientation == 1 && node.parentSide == 0) ? node : ultimateResized(node.parent,dir);
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
      // _log("draw FUNCTION: " + node.id);
      node.win.unmaximize(Meta.MaximizeFlags.BOTH);
      node.win.unmake_fullscreen();
      node.win.move_resize_frame(true,node.area.x,node.area.y,node.area.width,node.area.height);
    } else {
      this.draw(node.children[0]);
      this.draw(node.children[1]);
    }
    this.setOpacities();
  }

  setOpacities() {
    //_log("setOpacities FUNCTION");
    global.get_window_actors().forEach(actor => {
      let win = actor.get_meta_window();
      if (WM_CLASSES_FOR_OPACITY.includes(win.get_wm_class())) {
        if (win.appears_focused) {
          actor.opacity = 255;
        } else {
          actor.opacity = INACTIVE_OPACITY;
        }
      }
    });
  }

  redraw() {
    _log("redraw FUNCTION");
    let workspace = global.workspace_manager.get_active_workspace()
    let area = this.getWorkingArea(workspace);
    workspace.winTree.area = area;
    workspace.winTree.root.area = area;
    workspace.winTree.cascadeArea(workspace.winTree.root);
    this.draw(workspace.winTree.root);
  }

  toggleFloating() {
    if (!this.focusedWin) return;
    let win = this.focusedWin;
    let workspace = win.get_workspace();
    let node = workspace.winTree.find(win.get_id());
    if (!node) { // not in winTree. If maximized, put it in tree, if not, it is floating and maximize it
      if (win.maximized_vertically && win.maximized_horizontally) { // maximized so going back to tree
        this.addWindow(win);
      } else { // maximizing it
        win.maximize(Meta.MaximizeFlags.BOTH);
      }
    } else { // in winTree. We need to remove it from tree and let it float (in the middle of screen?)
      this.floatWindow(workspace, win);
    }
  }

  floatWindow(workspace,win) {
    this.removeWindow(workspace, win);
    win.make_above();
    let winRect = win.get_frame_rect();
    let workArea = workspace.winTree.area
    let maxHeight = workArea.height - 4 * GAP.outter;
    let maxWidth = workArea.width - 4 * GAP.outter;
    if (winRect.height > maxHeight) {
      winRect.height = maxHeight;
    }
    if (winRect.width > maxWidth) {
      winRect.width = maxWidth;
    }
    winRect.x = workArea.x + (workArea.width / 2) - (winRect.width / 2);
    winRect.y = workArea.y + (workArea.height / 2) - (winRect.height / 2);
    win.move_resize_frame(true,
      winRect.x,
      winRect.y,
      winRect.width,
      winRect.height,
    );
  }

  dedicatedWorkspace() {
    if (!this.focusedWin) return;
    let win = this.focusedWin;
    let workspace = win.get_workspace();
    this.removeWindow(workspace, win);
    let newWorkspace = global.workspace_manager.append_new_workspace(true, 0);
    win.change_workspace(newWorkspace);
    this.addWindow(win);
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, this.redraw.bind(this));
  }
}


function init () {
}

function enable () {
  _log("\n\n***** ENABLE EXTENSION ******");
  this.tm = new TilingManager();
}

function disable () {
  this.tm.sm.disconnectSignals();
  this.tm.km.removeKeybindings();
  this.tm.removeTrees();
}

