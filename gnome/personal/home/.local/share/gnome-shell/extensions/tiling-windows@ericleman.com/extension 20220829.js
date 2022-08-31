const {GLib, Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const ORIENTATION = {vertical:0, horizontal: 1};
const GAP = {inner: 30, outter: 30};
const PANEL_HEIGHT = 30;
const DEBUG = true;

//const primary_display = global.display.get_primary_monitor();
const wm = global.window_manager;
const wom = global.workspace_manager;

if (DEBUG) {global.tilingWindowsEricLeman = this;}

let NodeWin = class NodeWin {
  /* NodeWin is a window within a Layout
  */
  constructor(layout,x,y,w,h,win,orientation=ORIENTATION.vertical) {
    this.layout = layout;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.win = win;
    this.orientation = orientation;
    //this.level = level;
    this.children = [];
    if (this.win) {
      this.move();
      this.win.connect('unmanaged',() => this.layout.remove_win(this.win.get_id()));
    }
  }

  move() {
    // resize the window and move it to its position in the layout
    this.win.move_resize_frame(true,this.x,this.y,this.w,this.h);
  }

  print(prefix='') {
    // print node and its children
    if (this.win) _log(prefix + 'node: x:' + this.x + ', y:' + this.y + ', w:' + this.w + ', h:' + this.h + ', win:' + this.win.get_id() + ', o:' + this.orientation + ', c:' + this.children)
    this.children.forEach((item) => item.print(prefix+'-'));
  }
  
}

let Layout = class Layout {
  /* this is the layout of windows within a workspace in a monitor
  */ 
  constructor() {
    this.root = null;
    this.display = wom.get_active_workspace().get_display();
    this.x = GAP.outter;
    this.y = PANEL_HEIGHT+ GAP.outter;
    this.width = this.display.get_size()[0] - 2*GAP.outter;
    this.height = this.display.get_size()[1] - 2*GAP.outter - PANEL_HEIGHT;
    this.grabHandlerId = this.display.connect('grab-op-end', (display,win,op) => this.grab_win(display,win,op))
  }

  grab_win(display,win,op) {
    _log('GRAB '+ win + ' '+ op);
    if (op === 1) { //MOVING = 1 — Moving with pointer
      let cur_node = this.find(win.get_id());
      let r = win.get_buffer_rect();
      let win_center = [Math.floor(r.x+r.width/2),Math.floor(r.y+r.height/2)];
      let new_node = this.find_by_geom(...win_center);
      if (cur_node && new_node) this.swap(cur_node,new_node);
    }
  }

  swap(cur_node,new_node) {
    let tmp_win = new_node.win;
    new_node.win = cur_node.win;
    cur_node.win = tmp_win;
    this.root.print();
    this.redraw();
  }

  find_by_geom(x,y) {
    for (let node of this.preOrderTraversal()) {
      if (node.win && node.x < x && node.x + node.w > x && node.y < y && node.y + node.h > y) return node;
    }
    return undefined;
  }

  *preOrderTraversal(node = this.root) {
    yield node;
    if (node.children[0]) yield* this.preOrderTraversal(node.children[0]);
    if (node.children[1]) yield* this.preOrderTraversal(node.children[1]);
  }

  find(id) {
    for (let node of this.preOrderTraversal()) {
      if (node.win && node.win.get_id() === id) return node;
    }
    return undefined;
  }

  add_win(node,win) {
    /* add a window (create its NodeWin) within node's children. 
    Should be called with node = this.root to put a window in the layout */
    _log("ADD_WIN FUNCTION")
    if (node === null) { //empty Layout means we start a new root
      this.root = new NodeWin(this, this.x, this.y, this.width, this.height, win);
    } else {
      let focus = wom.get_active_workspace().get_display().get_focus_window();
      let id = focus?.get_id();
      let focused_node = null;
      if (focused_node=this.find(id)) {
        this.split(focused_node,win);
      } else {
        this.add_win(node.children[1],win);
      }
    }
  }

  split(node,win) {
    _log("SPLIT FUNCTION");
    node.print();
    let orientation = node.orientation;
    let [x0,y0,w0,h0,x1,y1,w1,h1] = [0,0,0,0,0,0,0,0];
    if (orientation) {
      [x0,y0,w0,h0,x1,y1,w1,h1] = this.split_horizontal(node);
    } else {
      [x0,y0,w0,h0,x1,y1,w1,h1] = this.split_vertical(node);
    }
    let node0 = new NodeWin(this, x0,y0,w0,h0,node.win,1-orientation);
    let node1 = new NodeWin(this, x1,y1,w1,h1,win,1-orientation);  
    node.win = null;
    node.children = [node0, node1];
  }
  
  split_vertical(node) {
    _log("SPLIT_VERTICAL FUNCTION");
    let [x,y,w,h] = [node.x,node.y,node.w,node.h]
    let [x0,y0,w0,h0] = [x,y,Math.floor(w/2)-GAP.inner/2,h];
    let [x1,y1,w1,h1] = [x+Math.floor(w/2)+GAP.inner/2,y,Math.floor(w/2)-GAP.inner/2,h];
    return [x0,y0,w0,h0,x1,y1,w1,h1]
  }
  
  split_horizontal(node) {
    let [x,y,w,h] = [node.x,node.y,node.w,node.h]
    let [x0,y0,w0,h0] = [x,y,w,Math.floor(h/2)-GAP.inner/2];
    let [x1,y1,w1,h1] = [x,y+Math.floor(h/2)+GAP.inner/2,w,Math.floor(h/2)-GAP.inner/2];
    return [x0,y0,w0,h0,x1,y1,w1,h1]
  }

  remove_win(id) {
    _log('REMOVE_NODE FUNCTION');
    _log('window unmanaged, remove node ' + id);
    // check first if window is the only one:
    if (this.root.win && this.root.win.get_id() === id) {
      this.root = null;
      return;
    } else
    {
      this.root = this.tree_without_win(id);
    }
    this.root.print();
    this.redraw();
  }

  tree_without_win(id,node=this.root) {
    if (node.children.length>0 && node.children[0].win && node.children[0].win.get_id() === id) {
      return this.upgrade_node(node.children[1],node);
    } else if (node.children.length>0 && node.children[1].win && node.children[1].win.get_id() === id) {
      return this.upgrade_node(node.children[0],node);
    } else if (node.children.length == 0) {
      return node;
    } else {
      let new_node = node;
      new_node.children = [this.tree_without_win(id,node.children[0]),this.tree_without_win(id,node.children[1])];
      return new_node
    }

  }

  upgrade_node(node_to_upgrade,parent_to_replace) {
    // move one node up
    let new_node = node_to_upgrade;
    new_node.x = parent_to_replace.x;
    new_node.y = parent_to_replace.y;
    new_node.w = parent_to_replace.w;
    new_node.h = parent_to_replace.h;
    new_node.orientation = parent_to_replace.orientation;
    //new_node.move();
    return new_node;
  }

  redraw(node=this.root) {
    //redraw the whole layout from node
    if (node.win) {
      node.move();
    } else {
      this.redraw(node.children[0]);
      this.redraw(node.children[1]);
    }
  }

}

function init () {
}

function enable () {
  _log("\n\n***** ENABLE EXTENSION ******");
  this.layout = new Layout();

  let ws_windows = wom.get_active_workspace().list_windows()
  ws_windows.forEach((win) => this.layout.add_win(this.layout.root,win));

  this.winHandlerId = wm.connect('map', (_, actor) => {
    win = actor.get_meta_window();
    this.layout.add_win(this.layout.root,win);
    this.layout.root.print();
    //actor.connect('destroy',() => destroy(win));
  });

}

function disable () {
  this.layout.display.disconnect(this.layout.grabHandlerId);
  this.layout = null;
  if (this.winHandlerId) {
    wm.disconnect(this.winHandlerId);
    this.winHandlerId = null;
  }
}

function destroy(win) {
  _log('*** Destroy window',win);
  //node = searchTree(layout,win);
  _log(node.level);
}

function searchTree(node, win){
  //_log('***SEARCHTREE:', node.win, win);
  if(node.win === win){
       return node;
  } else if (node.children != null){
       var i;
       var result = null;
       for(i=0; result == null && i < node.children.length; i++){
            result = searchTree(node.children[i], win);
       }
       return result;
  }
  return null;
}



function _log(msg) {
  if (DEBUG) log('TILING-WINDOWS *** ' + msg);
}