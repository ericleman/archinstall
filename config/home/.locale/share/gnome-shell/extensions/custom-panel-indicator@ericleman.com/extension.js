import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as UpdateBar from './updateIndicator.js';


function _log(msg) {
  console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

export default class MyIndicator extends Extension {
  enable(){
    _log('STARTING UPDATE INDICATOR EXTENSION *************');
    this.features = [
      new UpdateBar.UpdateBar(),
    ]

    for (const feature of this.features) {
      feature.load()
    }
  }

  disable(){
    for (const feature of this.features) {
      feature.unload()
      feature.destroy()
    }
    this.features = null;
  }
  
}

