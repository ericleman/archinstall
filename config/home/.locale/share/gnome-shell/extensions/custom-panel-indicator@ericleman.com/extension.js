import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as UpdateBar from './updateIndicator.js';
import * as AccessibilityButton from './accessibilityButton.js';


function _log(msg) {
  console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

export default class MyIndicator extends Extension {
  enable(){
    _log('************* STARTING CUSTOM PANEL EXTENSION *************');
    UpdateBar.enable();
    AccessibilityButton.enable();
  }

  disable(){
    UpdateBar.disable();
    AccessibilityButton.disable();
  }
  
}

