/*
 Class for managing the small google map for the timelapse.

 Dependencies:
 * org.gigapan.timelapse.Timelapse
 * jQuery (http://jquery.com/)

 Copyright 2013 Carnegie Mellon University. All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are
 permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice, this list of
 conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright notice, this list
 of conditions and the following disclaimer in the documentation and/or other materials
 provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ''AS IS'' AND ANY EXPRESS OR IMPLIED
 WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 The views and conclusions contained in the software and documentation are those of the
 authors and should not be interpreted as representing official policies, either expressed
 or implied, of Carnegie Mellon University.

 Authors:
 Yen-Chia Hsu (legenddolphin@gmail.com)

 VERIFY NAMESPACE

 Create the global symbol "org" if it doesn't exist.  Throw an error if it does exist but is not an object.
 */"use strict";

// Create the global symbol "org" if it doesn't exist.  Throw an error if it does exist but is not an object.
var org;
if (!org) {
  org = {};
} else {
  if ( typeof org != "object") {
    var orgExistsMessage = "Error: failed to create org namespace: org already exists and is not an object";
    alert(orgExistsMessage);
    throw new Error(orgExistsMessage);
  }
}

// Repeat the creation and type-checking for the next level
if (!org.gigapan) {
  org.gigapan = {};
} else {
  if ( typeof org.gigapan != "object") {
    var orgGigapanExistsMessage = "Error: failed to create org.gigapan namespace: org.gigapan already exists and is not an object";
    alert(orgGigapanExistsMessage);
    throw new Error(orgGigapanExistsMessage);
  }
}

// Repeat the creation and type-checking for the next level
if (!org.gigapan.timelapse) {
  org.gigapan.timelapse = {};
} else {
  if ( typeof org.gigapan.timelapse != "object") {
    var orgGigapanTimelapseExistsMessage = "Error: failed to create org.gigapan.timelapse namespace: org.gigapan.timelapse already exists and is not an object";
    alert(orgGigapanTimelapseExistsMessage);
    throw new Error(orgGigapanTimelapseExistsMessage);
  }
}

//
// DEPENDECIES
//
if (!org.gigapan.timelapse.Timelapse) {
  var noTimelapseMsg = "The org.gigapan.timelapse.Timelapse library is required by org.gigapan.timelapse.SmallGoogleMap";
  alert(noTimelapseMsg);
  throw new Error(noTimelapseMsg);
}

//
// CODE
//
(function() {
  org.gigapan.timelapse.SmallGoogleMap = function(smallGoogleMapOptions, timelapse) {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Class variables
    //
    var minHeight = 120;
    var minWidth = 160;
    var maxHeight = 768;
    var maxWidth = 1024;
    var startWidth = minWidth;
    var startHeight = minHeight;
    var smallGoogleMapDivId = ( typeof (smallGoogleMapOptions["smallGoogleMapDiv"]) == "undefined") ? "smallGoogleMap2013" : smallGoogleMapOptions["smallGoogleMapDiv"];
    var resizable = ( typeof (smallGoogleMapOptions["resizable"]) == "undefined") ? true : smallGoogleMapOptions["resizable"];
    var showToggleBtn = ( typeof (smallGoogleMapOptions["showToggleBtn"]) == "undefined") ? true : smallGoogleMapOptions["showToggleBtn"];
    var mapResizeStart = {
      "x": undefined,
      "y": undefined
    };
    var mapGeometry = {
      "width": minWidth,
      "height": minHeight
    };
    var lastMapGeometry;
    var googleMap;
    var googleMapBox;
    var newestLocation = {
      "lat": undefined,
      "lng": undefined
    };
    var lastLocation = {
      "lat": 99999,
      "lng": 99999
    };
    var videoDivID = timelapse.getVideoDivId();
    var smallMapContainer_width;
    var smallMapContainer_height;
    var smallMapResizer_width;
    var smallMapResizer_height;
    var mapBoxStrokeOpacity = 0.8;
    var mapBoxFillOpacity = 0.2;
    var isMapMinimized = false;
    var zoomOffset;
    var oldGoogleMapZoom;
    //variable for dom elements
    var smallMapContainer;
    var smallMap;
    var smallMapResizer;
    var $smallMapResizer;
    var $smallMapContainer;
    var $smallMap;
    var $viewport = $(".tiledContentHolder");

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //

    //resize the small google map (top-right mode)
    var resizeSmallMap = function(event) {
      var nowX = event.clientX;
      var nowY = event.clientY;
      var dx = parseInt(mapResizeStart.x - nowX);
      var dy = parseInt(nowY - mapResizeStart.y);
      //!!!!!NEED to set the border to 0px!!!!!
      var newHeight = mapGeometry.height + dy;
      var newWidth = mapGeometry.width + dx;
      //check max and min size
      if (newHeight > minHeight && newHeight < maxHeight) {
        mapResizeStart.y = nowY;
        mapGeometry.height += dy;
      }
      if (newWidth > minWidth && newWidth < maxWidth) {
        mapResizeStart.x = nowX;
        mapGeometry.width += dx;
      }
      setSmallMapSize(mapGeometry.height, mapGeometry.width);
      //update google map
      google.maps.event.trigger(googleMap, "resize");
    };

    //set small google map size
    var setSmallMapSize = function(newHeight, newWidth, animate, onComplete, callBackOnComplete) {
      if (animate) {
        $smallMapContainer.stop(true, true).animate({
          "height": newHeight + "px",
          "width": newWidth + "px"
        }, {
          duration: 200,
          progress: onComplete,
          complete: function() {
            onComplete();
            callBackOnComplete();
          }
        });
      } else {
        smallMapContainer.style.height = newHeight + "px";
        smallMapContainer.style.width = newWidth + "px";
      }
    };

    //Load Google Map
    var loadSmallGoogleMap = function() {
      //Load Google Map API
      var style = [{
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{
          hue: "#000000"
        }, {
          saturation: -100
        }]
      }, {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{
          hue: "#000000"
        }, {
          saturation: -100
        }, {
          lightness: 0
        }]
      }, {
        featureType: 'water',
        elementType: 'labels',
        stylers: [{
          hue: "#000000"
        }, {
          saturation: -100
        }, {
          lightness: 100
        }]
      }, {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{
          hue: "#ffffff"
        }, {
          saturation: -100
        }, {
          lightness: 100
        }]
      }];
      var latlng = new google.maps.LatLng(0, 0);
      var myOptions = {
        zoom: 0,
        center: latlng,
        disableDefaultUI: true,
        scrollwheel: false,
        draggable: true,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      googleMap = new google.maps.Map(smallMap, myOptions);
      googleMap.setOptions({
        styles: style
      });
      //draw the rectangle bounding box on the map
      var defaultLatLng_leftTop = new google.maps.LatLng(0, 0, true);
      var defaultLatLng_rightBot = new google.maps.LatLng(0, 0, true);
      /*googleMapBox = new google.maps.Rectangle({
        strokeColor: "rgb(219,48,48)",
        strokeOpacity: mapBoxStrokeOpacity,
        strokeWeight: 1,
        fillColor: "rgb(219,48,48)",
        fillOpacity: mapBoxFillOpacity,
        map: googleMap,
        bounds: new google.maps.LatLngBounds(defaultLatLng_leftTop, defaultLatLng_rightBot)
      });*/
      //add event listeners for the small google map
      //google.maps.event.addListener(googleMap, 'center_changed', timelapse.updateLocation);
      $(smallMapContainer).mousewheel(function(event, delta) {
        if (event.shiftKey) {
          if (delta > 0) {
            timelapse.zoomAbout(1 / .999, undefined, undefined, true);
          } else if (delta < 0) {
            timelapse.zoomAbout(.999, undefined, undefined, true);
          }
        } else {
          if (delta > 0) {
            timelapse.zoomAbout(1 / .9, undefined, undefined, true);
          } else if (delta < 0) {
            timelapse.zoomAbout(.9, undefined, undefined, true);
          }
        }
      }).dblclick(function(event) {
        event.stopPropagation();
        var $target = $(event.target);
        if ($target.hasClass("smallMapResizer") || $target.hasClass("toggleGoogleMapBtn"))
          return;
        timelapse.zoomAbout(2, undefined, undefined, true);
      });
      google.maps.event.addListener(googleMap, 'drag', updateLocation);
      google.maps.event.addListener(googleMap, 'resize', function() {
        google.maps.event.addListenerOnce(googleMap, 'bounds_changed', function() {
          timelapse.updateTagInfo_locationData();
        });
      });
      //create resizer
      if (resizable) {
        smallMapResizer = document.createElement("div");
        $smallMapResizer = $(smallMapResizer);
        $smallMapResizer.addClass("smallMapResizer");
        smallMapResizer.id = smallGoogleMapDivId + "_smallMapResizer";
        smallMapResizer.title = "Drag for resizing. Double click for resetting.";
        $smallMapContainer.append(smallMap, smallMapResizer);
        smallMapResizer_width = $smallMapResizer.width();
        smallMapResizer_height = $smallMapResizer.height();
        smallMapResizer.addEventListener('dblclick', resetSmallMapSize, false);
        smallMapResizer.addEventListener('mousedown', function(event) {
          event.stopPropagation();
          mapResizeStart.x = event.clientX;
          mapResizeStart.y = event.clientY;
          document.addEventListener('mousemove', resizeSmallMap, false);
          document.addEventListener('mouseup', addSmallMapMouseupEvents, false);
          $("body").bind("mouseleave", addSmallMapMouseupEvents);
        }, false);
      }
      //create toggle button
      if (showToggleBtn) {
        $smallMapContainer.append('<button class="toggleGoogleMapBtn" title="Toggle the map">Toggle</button>');
        var $toggleGoogleMapBtn = $(".toggleGoogleMapBtn");
        $toggleGoogleMapBtn.button({
          icons: {
            primary: "ui-icon-arrowthick-1-ne"
          },
          text: false
        }).click(function() {
          toggleSmallMapSize();
          var $icon = $(this).children(".ui-icon");
          if ($icon.hasClass("ui-icon-arrowthick-1-sw")) {
            $toggleGoogleMapBtn.button({
              icons: {
                primary: "ui-icon-arrowthick-1-ne"
              },
              text: false
            }).children(".ui-icon").css("margin-left", "-8px");
          } else if ($icon.hasClass("ui-icon-arrowthick-1-ne")) {
            $toggleGoogleMapBtn.button({
              icons: {
                primary: "ui-icon-arrowthick-1-sw"
              },
              text: false
            }).children(".ui-icon").css("margin-left", "-8px");
          }
        }).css({
          position: "absolute",
          right: "0px",
          top: "0px"
        });
      }
      //compute the zoom offset
      var maxView = timelapse.getView();
      maxView.scale = timelapse.getMaxScale();
      var maxViewBound = timelapse.computeBoundingBoxLatLng(maxView);
      var googleMapLatlngSW = new google.maps.LatLng(maxViewBound.max.lat, maxViewBound.max.lng);
      var googleMapLatlngNE = new google.maps.LatLng(maxViewBound.min.lat, maxViewBound.min.lng);
      var googleMapLatlngBound = new google.maps.LatLngBounds(googleMapLatlngNE, googleMapLatlngSW);
      googleMap.fitBounds(googleMapLatlngBound);
      google.maps.event.addListenerOnce(googleMap, 'bounds_changed', function() {
        var googleMapZoom = googleMap.getZoom();
        var maxViewerZoom = timelapse.scaleToZoom(timelapse.getMaxScale());
        oldGoogleMapZoom = googleMapZoom;
        // Google maps starts counting its zoom level at 1, so we need to add 1
        zoomOffset = googleMapZoom - maxViewerZoom + 1;
        //zoom back to the initial view
        timelapse.updateTagInfo_locationData();
      });
    };

    //add mouse events for resize
    var addSmallMapMouseupEvents = function(event) {
      mapResizeStart.x = undefined;
      mapResizeStart.y = undefined;
      document.removeEventListener('mousemove', resizeSmallMap);
      document.removeEventListener('mouseup', addSmallMapMouseupEvents);
      $("body").unbind("mouseleave", addSmallMapMouseupEvents);
    };

    //google map API calls
    var updateLocation = function() {
      var googleMapLatLng = googleMap.getCenter();
      newestLocation.lat = googleMapLatLng.lat();
      newestLocation.lng = googleMapLatLng.lng();
      if (needLocationUpdate() == true) {
        moveView_fromGoogleMap();
      }
    };

    //check location update
    var needLocationUpdate = function() {
      var roundTo = 100000;
      var last_lat = Math.round(lastLocation.lat * roundTo) / roundTo;
      var new_lat = Math.round(newestLocation.lat * roundTo) / roundTo;
      var last_lng = Math.round(lastLocation.lng * roundTo) / roundTo;
      var new_lng = Math.round(newestLocation.lng * roundTo) / roundTo;
      if (last_lat != new_lat || last_lng != new_lng)
        return true;
      else
        return false;
    };

    //move the view
    var moveView_fromGoogleMap = function() {
      var moveLatLng = $.extend({}, newestLocation);
      lastLocation = moveLatLng;
      //need to get the projection dynamically when the viewer size changes
      var movePoint = timelapse.getProjection().latlngToPoint(moveLatLng);
      movePoint.scale = timelapse.getView().scale;
      var fromGoogleMapflag = true;
      timelapse.warpTo(movePoint, fromGoogleMapflag);
    };

    //create small google map DOM elements
    var createSmallGoogleMapElements = function() {
      //create div elements
      smallMapContainer = document.createElement("div");
      smallMap = document.createElement("div");
      //jQuery variables
      $smallMapContainer = $(smallMapContainer);
      $smallMap = $(smallMap);
      //add class for css
      $smallMapContainer.addClass("smallMapContainer");
      $smallMap.addClass("smallGoogleMap");
      //set id
      smallMapContainer.id = smallGoogleMapDivId + "_smallMapContainer";
      smallMap.id = smallGoogleMapDivId + "_smallMap";
      //append elements
      $smallMapContainer.append(smallMap);
      $("#" + videoDivID).append(smallMapContainer);
      //set geometry
      var $tiledContentHolder = $(".tiledContentHolder");
      var playerWidth = $tiledContentHolder.outerWidth();
      var playerHeight = $tiledContentHolder.outerHeight();
      var offsetX = 0;
      var offsetY = 0;
      if (( typeof (smallGoogleMapOptions["geometry"]) != "undefined")) {
        if (( typeof (smallGoogleMapOptions["geometry"]["width"]) != "undefined")) {
          var newWidth = smallGoogleMapOptions["geometry"]["width"];
          if (newWidth <= maxWidth && newWidth >= minWidth)
            mapGeometry.width = newWidth;
        }
        if (( typeof (smallGoogleMapOptions["geometry"]["height"]) != "undefined")) {
          var newHeight = smallGoogleMapOptions["geometry"]["height"];
          if (newHeight <= maxHeight && newHeight >= minHeight)
            mapGeometry.height = newHeight;
        }
        if (( typeof (smallGoogleMapOptions["geometry"]["offsetX"]) != "undefined")) {
          offsetX = smallGoogleMapOptions["geometry"]["offsetX"];
        }
        if (( typeof (smallGoogleMapOptions["geometry"]["offsetY"]) != "undefined")) {
          offsetY = smallGoogleMapOptions["geometry"]["offsetY"];
        }
      }
      mapGeometry.right = offsetX + 1;
      mapGeometry.top = offsetY + 1;
      if (offsetX > 0 && offsetY > 0) {
        setSmallMapShadow(true);
      }
      $smallMapContainer.css({
        "top": mapGeometry.top + "px",
        "right": mapGeometry.right + "px",
        "width": mapGeometry.width + "px",
        "height": mapGeometry.height + "px"
      });
      //get attribute
      smallMapContainer_width = $smallMapContainer.width();
      smallMapContainer_height = $smallMapContainer.height();
      startHeight = mapGeometry.height;
      startWidth = mapGeometry.width;
    };

    var setSmallMapShadow = function(flag) {
      if (flag == true) {
        $smallMapContainer.css({
          "box-shadow": "2px 2px 3px rgba(0,0,0,0.3)",
          "border": "1px solid #656565"
        });
      } else {
        $smallMapContainer.css({
          "box-shadow": "0px 0px 0px rgba(0,0,0,0.3)",
          "border": "1px solid transparent"
        });
      }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //
    //hide the small google map size
    var hideSmallMap = function() {
      if ($smallMapContainer.is(":visible")) {
        $smallMapContainer.stop(true, true).fadeOut(200);
      }
    };
    this.hideSmallMap = hideSmallMap;

    //show the small google map size
    var showSmallMap = function() {
      if (!$smallMapContainer.is(":visible")) {
        $smallMapContainer.stop(true, true).fadeIn(200);
      }
    };
    this.showSmallMap = showSmallMap;

    //toggle the small google map size
    var toggleSmallMapSize = function() {
      if (mapGeometry.height != 20 || mapGeometry.width != 20) {
        lastMapGeometry = $.extend({}, mapGeometry);
        mapGeometry.height = 20;
        mapGeometry.width = 20;
        isMapMinimized = true;
      } else {
        $smallMap.show();
        setSmallMapShadow(true);
        isMapMinimized = false;
        if (lastMapGeometry != undefined) {
          mapGeometry = $.extend({}, lastMapGeometry);
        }
      }
      var callBackOnComplete = function() {
        if (isMapMinimized == true) {
          $smallMap.hide();
          setSmallMapShadow(false);
        }
      };
      setSmallMapSize(mapGeometry.height, mapGeometry.width, true, function() {
        //update google map
        google.maps.event.trigger(googleMap, "resize");
      }, callBackOnComplete);
    };
    this.toggleSmallMapSize = toggleSmallMapSize;

    //reset the small google map size
    var resetSmallMapSize = function() {
      if (mapGeometry.height != minHeight || mapGeometry.width != minWidth) {
        lastMapGeometry = $.extend({}, mapGeometry);
        mapGeometry.height = startHeight;
        mapGeometry.width = startWidth;
      } else {
        if (lastMapGeometry != undefined)
          mapGeometry = $.extend({}, lastMapGeometry);
      }
      setSmallMapSize(mapGeometry.height, mapGeometry.width, true, function() {
        //update google map
        google.maps.event.trigger(googleMap, "resize");
      });
    };
    this.resetSmallMapSize = resetSmallMapSize;

    //set the small google map
    var setSmallGoogleMap_ = function(tagLatLngCenter, viewerScale) {
      if (isMapMinimized == false) {
        var googleMapLatlngSW = new google.maps.LatLng(tagLatLngSW.lat, tagLatLngSW.lng);
        var googleMapLatlngNE = new google.maps.LatLng(tagLatLngNE.lat, tagLatLngNE.lng);
        var googleMapLatlngBound = new google.maps.LatLngBounds(googleMapLatlngNE, googleMapLatlngSW);
        googleMap.fitBounds(googleMapLatlngBound);
      }
    };
    this.setSmallGoogleMap = setSmallGoogleMap;

    //set the small google map
    var setSmallGoogleMap = function(tagLatLngCenter, viewerScale) {
      if (isMapMinimized == false) {
        if (zoomOffset == undefined)
          return;
        var extendRatio = (mapGeometry.width + mapGeometry.height) / (startHeight + startWidth);
        if (extendRatio >= 1)
          extendRatio *= 0.6;
        else
          extendRatio *= -0.5
        var googleMapLatlngCenter = new google.maps.LatLng(tagLatLngCenter.lat, tagLatLngCenter.lng);
        googleMap.setCenter(googleMapLatlngCenter);
		// corrected zooming for hyperwall usage
        var newZoom = Math.floor((timelapse.scaleToZoom(viewerScale) + zoomOffset) + extendRatio);
        if (oldGoogleMapZoom != newZoom) {
          oldGoogleMapZoom = newZoom;
          googleMap.setZoom(newZoom);
        }
		
		// Offset for hyperwall
		/*var bounds = googleMap.getBounds();
		var curCenter = googleMap.getCenter();
		var newCenter = new google.maps.LatLng(curCenter.lat() + fields.pitchOffset*(bounds.getNorthEast().lat() - bounds.getSouthWest().lat()),
											   curCenter.lng() + -1*fields.yawOffset*(bounds.getNorthEast().lng() - bounds.getSouthWest().lng()));
		console.log(curCenter);
		console.log("setting new center");									   
		googleMap.setCenter(newCenter);*/
		
      }
    };
    this.setSmallGoogleMap = setSmallGoogleMap;

    //set the location of small google map box
    var setSmallMapBoxLocation = function(tagLatLngNE, tagLatLngSW) {
      var boxLatLngNE_googleMap = new google.maps.LatLng(tagLatLngNE.lat, tagLatLngNE.lng, true);
      var boxLatLngSW_googleMap = new google.maps.LatLng(tagLatLngSW.lat, tagLatLngSW.lng, true);
      //googleMapBox.setBounds(new google.maps.LatLngBounds(boxLatLngNE_googleMap, boxLatLngSW_googleMap));
    };
    this.setSmallMapBoxLocation = setSmallMapBoxLocation;

    //draw the small google map color
    var drawSmallMapBoxColor = function(colorRGB) {
      //set the color
      var boxColor = "rgb(" + colorRGB.r + "," + colorRGB.g + "," + colorRGB.b + ")";
      var boxOption = {
        strokeColor: boxColor,
        strokeOpacity: mapBoxStrokeOpacity,
        fillColor: boxColor,
        fillOpacity: mapBoxFillOpacity
      };
      //googleMapBox.setOptions(boxOption);
    };
    this.drawSmallMapBoxColor = drawSmallMapBoxColor;

    var getSmallMapDivID = function() {
      return smallGoogleMapDivId + "_smallMap";
    };
    this.getSmallMapDivID = getSmallMapDivID;

    var getSmallMapContainer = function() {
      return smallMapContainer;
    };
    this.getSmallMapContainer = getSmallMapContainer;

    var updateMapGeometry = function(newTop, newRight, newViewportWidth, newViewportHeight) {
      if (newTop == undefined)
        newTop = mapGeometry.top;
      if (newRight == undefined)
        newRight = mapGeometry.right;
      if (newViewportWidth == undefined)
        newViewportWidth = mapGeometry.width;
      if (newViewportHeight == undefined)
        newViewportHeight = mapGeometry.height;
      mapGeometry.top = newTop;
      mapGeometry.right = newRight;
      smallMapContainer.style.right = mapGeometry.right + "px";
      smallMapContainer.style.top = mapGeometry.top + "px";
      google.maps.event.trigger(googleMap, "resize");
    };
    this.updateMapGeometry = updateMapGeometry;

    this.getMapGeometry = function() {
      return mapGeometry;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor code
    //
    createSmallGoogleMapElements();
    loadSmallGoogleMap();
  };
  //end of org.gigapan.timelapse.SmallGoogleMap
})();
//end of (function() {
