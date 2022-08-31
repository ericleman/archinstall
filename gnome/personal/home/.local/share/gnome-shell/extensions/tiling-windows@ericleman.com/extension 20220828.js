const {GLib, Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const ORIENTATION = {vertical:0, horizontal: 1};
const GAP = {inner: 30, outter: 30};
const DEBUG = true;

const primary_display = global.display.get_primary_monitor();
const wm = global.window_manager;
const wom = global.workspace_manager;

global.tilingWindowsEricLeman.com = this;


let layout = null;

let TreeNode = class TreeNode {
  constructor(x,y,w,h,win,orientation=ORIENTATION.vertical,level=0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.win = win;
    this.orientation = orientation;
    this.level = level;
    this.children = [];
  }
}


function init () {
}

function enable () {
  area = wom.get_active_workspace().get_work_area_for_monitor(primary_display);
  _log(area.x,area.y,area.width,area.height)
  layout = new TreeNode(area.x + GAP.outter,area.y + GAP.outter, area.width - 2*GAP.outter,area.height - 2*GAP.outter);
  handlerId = wm.connect('map', (_, actor) => {
    win = actor.get_meta_window();
    tile(layout,win);
    print(layout);
    actor.connect('destroy',() => destroy(win));
  });
}

function disable () {
}

function destroy(win) {
  _log('*** Destroy window',layout,win);
  node = searchTree(layout,win);
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

function tile(node,win) {
  _log('*** ENTERING TILE')
  let [x,y,w,h] = [node.x,node.y,node.w,node.h]
  _log('[x,y,w,h]:', [x,y,w,h])
  if (node.children.length === 0) {
    _log('No children')
    win.move_resize_frame(true,x,y,w,h);
    if (!node.win) { // this is the case for root of layout
      node.win = win
    } else {
      split(node,win);
    }
  } else if (node.children.length === 2) {
    _log('2 children')
    tile(node.children[1],win);
  }
}

function split(node,win) {
  let orientation = node.orientation;
  if (orientation) {
    [x0,y0,w0,h0,x1,y1,w1,h1] = split_horizontal(node);
  } else {
    [x0,y0,w0,h0,x1,y1,w1,h1] = split_vertical(node);
  }

  node.win.move_resize_frame(true,x0,y0,w0,h0);
  node0 = new TreeNode(x0,y0,w0,h0,node.win,1-orientation,node.level+1);

  win.move_resize_frame(true,x1,y1,w1,h1);
  node1 = new TreeNode(x1,y1,w1,h1,win,1-orientation,node.level+1);

  node.win = null;
  node.children.push(node0);
  node.children.push(node1);
}

function split_vertical(node,win) {
  let [x,y,w,h] = [node.x,node.y,node.w,node.h]
  let [x0,y0,w0,h0] = [x,y,Math.floor(w/2)-GAP.inner/2,h];
  let [x1,y1,w1,h1] = [x+Math.floor(w/2)+GAP.inner/2,y,Math.floor(w/2)-GAP.inner/2,h];
  return [x0,y0,w0,h0,x1,y1,w1,h1]
}

function split_horizontal(node,win) {
  let [x,y,w,h] = [node.x,node.y,node.w,node.h]
  let [x0,y0,w0,h0] = [x,y,w,Math.floor(h/2)-GAP.inner/2];
  let [x1,y1,w1,h1] = [x,y+Math.floor(h/2)+GAP.inner/2,w,Math.floor(h/2)-GAP.inner/2];
  return [x0,y0,w0,h0,x1,y1,w1,h1]
}

function print(node) {
  if (node.win) _log('level ',node.level,' / node: ', node)
  node.children.forEach((item) => print(item));
}


function _log(msg) {
  if DEBUG log(msg);
}