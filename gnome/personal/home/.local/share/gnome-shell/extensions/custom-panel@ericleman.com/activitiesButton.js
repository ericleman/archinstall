const Activities = imports.ui.main.panel.statusArea.activities;

var enable = () => {
  Activities.label_actor.text = '';
  Activities.add_style_class_name('custom-color1');
}
var disable = () => {
  Activities.label_actor.text = 'Activities';
  Activities.remove_style_class_name('custom-color1');
}