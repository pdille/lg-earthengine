#!/usr/bin/env node
// node deps:
// socket.io connect

var path = require('path');

// additional console output
var DEBUG = true;
// listen on this port for all http, socket.io, and multi-axis requests
var viewsyncPort = 8080;
// serve http from this path
var clientroot = path.join(__dirname, 'time-machine-explorer');

//
// start up the HTTP server
//

var connect = require('connect');

var app = connect()
    .use( connect.logger( 'dev' ) )
    .use( connect.static( clientroot ) ).listen( viewsyncPort );

//
// this is the viewsync app
//
var io = require('socket.io').listen(app);

// log level defaults to 3
// The amount of detail that the server should output to the logger.
// 0 - error
// 1 - warn
// 2 - info
// 3 - debug
io.set('log level', 2);

var state = {};

function syncAll( socket, sig, data ) {
  socket.broadcast.emit( 'sync ' + sig, data );
  //console.log( "broadcast: ", JSON.stringify(data));
  //socket.send( data );
  //socket.emit("message", JSON.stringify(data));
}

function syncSingle( socket, sig, data ) {
  socket.emit( 'sync ' + sig, data );
}

function bounce( socket, sig, source ) {
  socket.on( sig, function (data) {
    if (DEBUG) console.log( 'from ' + source + ' bouncing ' + sig + " " + JSON.stringify(data));
    state[sig] = data; // save the last packet broadcast
    syncAll( socket, sig, data );
  });
}

var viewsync = io
  .of('/viewsync')
  .on('connection', function (socket) {
    // send the last known state to the client on connection
    for( var sig in state ) {
      //syncSingle( socket, sig, state[sig] );
    }
    bounce( socket, 'view', 'viewsync' );
    bounce( socket, 'time', 'viewsync' );
    bounce( socket, 'play', 'viewsync' );
  });

//
// the controller for the webpage with buttons
//
var controller = io
.of('/controller')
.on('connection', function (socket) {
    bounce( socket, 'setLocation', 'controller' );
    bounce( socket, 'mapViewUpdate', 'controller' );
    bounce( socket, 'mapZoomTo', 'controller' );
    bounce( socket, 'playTour', 'controller' );
    bounce( socket, 'addKeyframe', 'controller' );
    bounce( socket, 'returnAndAddKeyframe', 'controller' );
    bounce( socket, 'updateKeyframe', 'controller' );
    bounce( socket, 'returnAndUpdateKeyframe', 'controller' );
    bounce( socket, 'decodeTour', 'controller' );
    bounce( socket, 'returnDecodeTour', 'controller' );
    bounce( socket, 'encodeTour', 'controller' );
    bounce( socket, 'returnEncodeTour', 'controller' );
    bounce( socket, 'handlePlayPauseServer', 'controller' );
    bounce( socket, 'handlePlayPauseController', 'controller' );
    bounce( socket, 'setControllerPlayButton', 'controller' );
    });

//
// spacenav, to be modularized
//
var EV_REL = 2;
var EV_ABS = 3;
var ABS_X = 0;
var ABS_Y = 1;
var ABS_Z = 2;
var ABS_RX = 3;
var ABS_RY = 4;
var ABS_RZ = 5;
var NAV_GUTTER = 20;

var multiaxis = io
    .of('/multiaxis')

var navstate = function MultiAxisState() {
  var abs = [0,0,0,0,0,0];
  var updates = 0;

  function LogState() {
    console.log(
      'abs state:'
    + ' ABS_X: ' + abs[ABS_X]
    + ' ABS_Y: ' + abs[ABS_Y]
    + ' ABS_Z: ' + abs[ABS_Z]
    + ' ABS_RX: ' + abs[ABS_RX]
    + ' ABS_RY: ' + abs[ABS_RY]
    + ' ABS_RZ: ' + abs[ABS_RZ]
    );
  }

  function InputEvent( data ) {
    var type = Number( data[0] );
    var axis = Number( data[1] );
    var value = Number( data[2] );
    switch( type ) {
      case EV_REL:
      case EV_ABS:
        abs[axis] = value;
        updates += 1;
        LogState();
        break;
    }
  }

  function FlushState() {
    var flushed = updates;
    updates = 0;
    return {
      updates: flushed,
      abs: abs
    }
  }

  // public access
  return {
    InputEvent: InputEvent,
    FlushState: FlushState
  };
}();

var axisevents = require('dgram').createSocket("udp4");

axisevents.on('message', function (buf, rinfo) {
  var data = buf.toString('utf8').replace('\0','').split(',');
  navstate.InputEvent( data );
});

var axissync = setInterval( function () {
  var state = navstate.FlushState();
  if (state.updates > 0) {
    delete state['updates'];
    io.of('/multiaxis').emit( 'state', state );
  }
}, 17);

axisevents.bind(viewsyncPort);

//vim:set noai
