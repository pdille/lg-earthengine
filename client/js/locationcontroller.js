// Testing the controller
if (fields.master) {
  var controlReciever = io.connect('/controller');
  controlReciever.on('connect',function() {
                     console.log('controlReciever connected');
                     });
  controlReciever.on('sync setLocation', function (data) { console.log(data); setViewGracefully(data,false,true)});
}
