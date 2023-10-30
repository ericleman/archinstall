import Gio from 'gi://Gio';

export function Read(path, callback) {
    const file = Gio.File.new_for_path(path);
    let cancellable = new Gio.Cancellable();
    file.load_contents_async(cancellable, (file, res) => {
      try {
        const [, contents] = file.load_contents_finish(res);
        const decoder = new TextDecoder('utf-8');
        const contentsString = decoder.decode(contents);
        callback(contentsString);
      } catch (e) {
        logError(e);
      }
    });
  
}
