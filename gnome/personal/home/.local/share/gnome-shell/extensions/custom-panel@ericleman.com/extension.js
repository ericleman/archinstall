'use strict';

const Me = imports.misc.extensionUtils.getCurrentExtension()
const WorkspacesBar = Me.imports.workspacesBar;


const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

function enable(){
    WorkspacesBar.enable();
}

function disable(){
    WorkspacesBar.disable();
}
