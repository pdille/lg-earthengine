// Testing the controller
if (fields.master) {
  var mapLatLng = {
    "lat": 99999,
    "lng": 99999
  };
  var controlReciever = io.connect('/controller');
  controlReciever.on('connect',function() {
                     console.log('controlReciever connected');
                     });
  controlReciever.on('sync setLocation', function (data) { console.log(data); setViewGracefully(data,false,true)});
  
  controlReciever.on('sync mapViewUpdate', function (data) {
                     console.log("MapViewUpdate : "+data);
                     var maxGmapsScale = 12;
                     var formattedData = data.split(" ");
                     mapLatLng.lat = parseFloat(formattedData[0]);
                     mapLatLng.lng = parseFloat(formattedData[1]);
                     var movePoint = timelapse.getProjection().latlngToPoint(mapLatLng);
                     movePoint.scale = Math.pow(2,parseFloat(formattedData[2]) - maxGmapsScale);
                     timelapse.setTargetView(movePoint);
                     });
  controlReciever.on('sync mapZoomTo', function (data) {
                     console.log("mapZoomTo : "+data);
                     
                     var viewArray = data.split(",");
            		 if (viewArray.length < 3) return;
            		 var newView = {center: {"lat": viewArray[0], "lng":
            		 viewArray[1]}, "zoom": viewArray[2]};
            		 setViewGracefully(newView,false,true);
                     
                     });

}
