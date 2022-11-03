const AggMenu = imports.ui.main.panel.statusArea.quickSettings;


var enable = () => {
  AggMenu.add_style_class_name('custom-color2');

}

var disable = () => {
  AggMenu.remove_style_class_name('custom-color2');
}

