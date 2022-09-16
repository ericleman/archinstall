const Activities = imports.ui.main.panel.statusArea.activities;

var enable = () => {
  Activities.label_actor.text = '';
}
var disable = () => {
  Activities.label_actor.text = 'Activities';
}