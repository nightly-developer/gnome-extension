// Example#2

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;

Gettext.bindtextdomain("example", Me.dir.get_child("locale").get_path());
Gettext.textdomain("example");
const _ = Gettext.gettext;

function init () {}

function enable () {
  log(_("Hello My Friend"));
  log(Gettext.ngettext("%d item", "%d items", 10).replace("%d", 10));
}

function disable () {}

