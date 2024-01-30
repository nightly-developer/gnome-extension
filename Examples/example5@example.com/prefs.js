// Example#5

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function init () {}

function buildPrefsWidget () {
  let widget = new MyPrefsWidget();
  widget.show_all();
  return widget;
}

const MyPrefsWidget = GObject.registerClass(
class MyPrefsWidget extends Gtk.ScrolledWindow {

  _init (params) {

    super._init(params);

    let builder = new Gtk.Builder();
    builder.set_translation_domain('example');
    builder.add_from_file(Me.path + '/prefs.ui');

    // On GNOME SHELL +3.36 you don't need to quit on destroy
    //this.connect("destroy", Gtk.main_quit);

    let SignalHandler = {

      on_my_spinbutton_value_changed (w) {
        log(w.get_value_as_int());
      },

      on_my_switch_state_set (w) {
        log(w.get_active());
      }
    };

    builder.connect_signals_full((builder, object, signal, handler) => {
      object.connect(signal, SignalHandler[handler].bind(this));
    });

    this.add( builder.get_object('main_prefs') );
  }
});

