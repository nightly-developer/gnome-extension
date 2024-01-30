// Example#6

const Main = imports.ui.main;
const St = imports.gi.St;

let container;

function init () {

  let pMonitor = Main.layoutManager.primaryMonitor;

  container = new St.Bin({
    style_class : 'bg-color',
    reactive : true,
    can_focus : true,
    track_hover : true,
    height : 30,
    width : pMonitor.width,
  });

  container.set_position(0, pMonitor.height - 30);

  container.connect("enter-event", () => {
    log('entered');
  });

  container.connect("leave-event", () => {
    log('left');
  });

  container.connect("button-press-event", () => {
    log('clicked');
  });
}

function enable () {
  Main.layoutManager.addChrome(container, {
    affectsInputRegion : true,
    affectsStruts : true,
    trackFullscreen : true,
  });
}

function disable () {
  Main.layoutManager.removeChrome(container);
}

