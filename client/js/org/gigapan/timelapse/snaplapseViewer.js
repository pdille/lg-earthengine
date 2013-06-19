// Copyright 2011 Carnegie Mellon University. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//    conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//    of conditions and the following disclaimer in the documentation and/or other materials
//    provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ''AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those of the
// authors and should not be interpreted as representing official policies, either expressed
// or implied, of Carnegie Mellon University.
//
// Authors:
// Chris Bartley (bartley@cmu.edu)
// Paul Dille (pdille@andrew.cmu.edu)
// Yen-Chia Hsu (legenddolphin@gmail.com)
// Randy Sargent (randy.sargent@cs.cmu.edu)

var cachedSnaplapses = {};
var currentlyDisplayedVideoId = 1;
var KEYFRAME_THUMBNAIL_WIDTH = 100;
var KEYFRAME_THUMBNAIL_HEIGHT = 56;
// should really be 56.25

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

// Repeat the creation and type-checking for the next level
if (!org.gigapan.timelapse.snaplapse) {
  org.gigapan.timelapse.snaplapse = {};
} else {
  if ( typeof org.gigapan.timelapse.snaplapse != "object") {
    var orgGigapanTimelapseExistsMessage = "Error: failed to create org.gigapan.timelapse.snaplapse namespace: org.gigapan.timelapse.snaplapse already exists and is not an object";
    alert(orgGigapanTimelapseExistsMessage);
    throw new Error(orgGigapanTimelapseExistsMessage);
  }
}

//
// CODE
//

var activeSnaplapse;

function playCachedSnaplapse(snaplapseId) {
  org.gigapan.Util.log("playCachedSnaplapse(" + snaplapseId + ")");
  var s = cachedSnaplapses[snaplapseId];
  var snaplapse = timelapse.getSnaplapse();
  var snaplapseViewer = snaplapse.getSnaplapseViewer();
  if ( typeof s != 'undefined' && s) {
    if (snaplapse && snaplapse.isPlaying()) {
      snaplapse.stop();
    }
    if (snaplapseViewer.loadNewSnaplapse(JSON.stringify(s))) {
      snaplapseViewer.playStopSnaplapse();
    } else {
      alert("ERROR: Invalid time warp file.");
    }
  }
}

(function() {
  var UTIL = org.gigapan.Util;
  var didOnce = false;
  org.gigapan.timelapse.snaplapse.SnaplapseViewer = function(snaplapse, timelapse, settings) {
    //var visualizer = timelapse.getVisualizer();
    var thisObj = this;
    var videoset = timelapse.getVideoset();
    var viewerType = UTIL.getViewerType();
    var composerDivId = snaplapse.getComposerDivId();
    var timelapseViewerDivId = timelapse.getViewerDivId();
    var maxSubtitleLength = 120;

    var initializeSnaplapseUI = function() {
      // hide the annotation bubble
      hideAnnotationBubble();

      //load window
      $("#" + composerDivId + " .loadTimewarpWindow").dialog({
        resizable: false,
        autoOpen: false,
        width: 400,
        height: 700
      }).parent().appendTo($("#" + composerDivId));
      $("#loadSnaplapseButton").button({
        text: true
      }).click(function() {
        thisObj.loadSnaplapse($(".loadTimewarpWindow_JSON").val());
      });

      //Save window
      $("#" + composerDivId + " .saveTimewarpWindow").dialog({
        resizable: false,
        autoOpen: false,
        width: 400,
        height: 700
      }).parent().appendTo($("#" + composerDivId));

      //Global setting window
      $("#" + composerDivId + " .setTimewarpWindow").dialog({
        resizable: false,
        autoOpen: false,
        width: 365,
        height: 160
      }).parent().appendTo($("#" + composerDivId));

      $("#setPauseStartBtn").button({
        text: true
      }).click(function() {
        //debug
        $(this).button("disable");
        var thisValue = $("#setPauseStartInput").val();
        if (UTIL.isNumber(thisValue))
          thisValue = parseFloat(thisValue);
        else {
          thisValue = 0.5;
          $("#setPauseStartInput").val(0.5);
        }
        var keyframes = snaplapse.getKeyframes();
        for (var i = 0; i < keyframes.length; i++) {
          var thisKeyframeId = keyframes[i].id;
          var thisDOM_Id = composerDivId + "_snaplapse_keyframe_" + thisKeyframeId;
          snaplapse.setWaitDurationForKeyframe(thisKeyframeId, thisValue, "start");
          $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop_pauseStart").val(thisValue);
        }
        $(this).button("enable");
      });

      $("#setPauseEndBtn").button({
        text: true
      }).click(function() {
        $(this).button("disable");
        var thisValue = $("#setPauseEndInput").val();
        if (UTIL.isNumber(thisValue))
          thisValue = parseFloat(thisValue);
        else {
          thisValue = 0.5;
          $("#setPauseEndInput").val(0.5);
        }
        var keyframes = snaplapse.getKeyframes();
        for (var i = 0; i < keyframes.length; i++) {
          var thisKeyframeId = keyframes[i].id;
          var thisDOM_Id = composerDivId + "_snaplapse_keyframe_" + thisKeyframeId;
          snaplapse.setWaitDurationForKeyframe(thisKeyframeId, thisValue, "end");
          $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop_pauseEnd").val(thisValue);
        }
        $(this).button("enable");
      });

      // add an event listener to the videoset so we can keep track of which video is currently visible, so that we can
      // create the keyframe thumbnails
      timelapse.getVideoset().addEventListener('video-made-visible', function(videoId) {
        currentlyDisplayedVideoId = videoId;
      });

      // add mouseover actions to all of the buttons
      $('.button').hover(function() {
        $(this).addClass('ui-state-hover');
      }, function() {
        $(this).removeClass('ui-state-hover');
      });

      // hide the snaplapse Stop button
      $("#" + timelapseViewerDivId + ' .stopTimeWarp').hide();

      // configure the keyframe list's selectable handlers
      $("#" + composerDivId + " .snaplapse_keyframe_list")['selectable']({
        selected: function(event, ui) {
          if ($(ui.selected).hasClass("snaplapse_keyframe_list_item")) {
            //get the original color
            var tagColor = ui.selected.style.backgroundColor;
            var rgb = tagColor.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),.*\)$/);
            //change the selected color
            $(ui.selected).css("background-color", "rgba(" + rgb[1] + "," + rgb[2] + "," + rgb[3] + ",0.15)");
          }
          handleSnaplapseFrameSelectionChange(false);
        },
        selecting: function(event, ui) {
          if ($(ui.selecting).hasClass("snaplapse_keyframe_list_item")) {
            //get the original color
            var tagColor = ui.selecting.style.backgroundColor;
            var rgb = tagColor.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),.*\)$/);
            //change the selected color
            $(ui.selecting).css("background-color", "rgba(" + rgb[1] + "," + rgb[2] + "," + rgb[3] + ",0.1)");
          }
        },
        unselected: function(event, ui) {
          //get the original color
          var tagColor = ui.unselected.style.backgroundColor;
          var rgb = tagColor.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),.*\)$/);
          //restore the original color
          if ($(ui.unselected).hasClass("snaplapse_keyframe_list_item"))
            $(ui.unselected).css("background-color", "rgba(" + rgb[1] + "," + rgb[2] + "," + rgb[3] + ",0)");
          handleSnaplapseFrameSelectionChange(false);
        },
        unselecting: function(event, ui) {
          //get the original color
          var tagColor = ui.unselecting.style.backgroundColor;
          var rgb = tagColor.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),.*\)$/);
          //restore the original color
          if ($(ui.unselecting).hasClass("snaplapse_keyframe_list_item"))
            $(ui.unselecting).css("background-color", "rgba(" + rgb[1] + "," + rgb[2] + "," + rgb[3] + ",0)");
        },
        stop: function() {
          handleSnaplapseFrameSelectionChange(true);
        },
        cancel: ':input,textarea,.button,label'
      });

      // add mouse event handlers to the Play/Stop button in the viewer
      $("#" + timelapseViewerDivId + ' .stopTimeWarp').click(function() {
        _playStopSnaplapse();
        return false;
      });

      // finally, set up the snaplapse links
      setupSnaplapseLinks();

      $(".createSubtitle_dialog").dialog({
        autoOpen: false,
        height: 300,
        width: 350,
        modal: true,
        buttons: {
          "Finish and Close": function() {
            $(this).dialog("close");
          }
        },
        close: function() {
        },
      });

      //set the position
      var $tiledContentHolder = $("#" + timelapseViewerDivId + " .tiledContentHolder");
      var playerOffset = $tiledContentHolder.offset();
      var newTop = $("#" + timelapseViewerDivId + " .timelineSliderFiller").outerHeight() + $("#" + timelapseViewerDivId + " .controls").outerHeight() + $tiledContentHolder.outerHeight() + playerOffset.top - 1;
      var newLeft = playerOffset.left;
      var newWidth = $tiledContentHolder.width();
      $("#" + composerDivId + " .snaplapse_keyframe_container").css({
        "position": "absolute",
        "top": newTop + "px",
        "left": newLeft + "px",
        "width": newWidth + "px"
      });
      if (settings["enableCustomUI"] != true) {
        $("#" + composerDivId).hide();
      } else {
        var customEditorControlHeight = $("#" + timelapseViewerDivId + " .customEditorControl").outerHeight();
        $("#" + composerDivId + " .snaplapse_keyframe_container").css({
          "top": $tiledContentHolder.outerHeight() + playerOffset.top + customEditorControlHeight + "px",
        });
        moveDescriptionBox("up");
      }
    };

    var moveDescriptionBox = function(direction) {
      var descriptionOffset = $("#" + timelapseViewerDivId + " .customEditorControl").outerHeight() + 20;
      if (direction == "up") {
        $("#" + timelapseViewerDivId + " .snaplapse-annotation-description").css({
          "bottom": "+=" + descriptionOffset + "px"
        });
      } else if (direction == "down") {
        $("#" + timelapseViewerDivId + " .snaplapse-annotation-description").css({
          "bottom": "-=" + descriptionOffset + "px"
        });
      }
    };
    this.moveDescriptionBox = moveDescriptionBox;

    var handleSnaplapseFrameSelectionChange = function(willWarp) {
      if (snaplapse.isPlaying()) {
        return;
      }

      var selectedItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selected");
      var numSelected = selectedItems.size();

      if (numSelected == 1) {
        var id = selectedItems.get(0).id;
        var keyframeId = id.split("_")[3];
        var frame = snaplapse.getKeyframeById(keyframeId);
        displaySnaplapseFrameAnnotation(frame);

        if ( typeof willWarp != 'undefined' && willWarp) {
          timelapse.warpToBoundingBox(frame['bounds']);
          timelapse.seek(frame['time']);
        }
      } else {
        // either 0 or more than 1
        displaySnaplapseFrameAnnotation(null);
      }
    };

    var displaySnaplapseFrameAnnotation = function(frame) {
      if (frame) {
        if (frame['is-description-visible']) {
          if (isTextNonEmpty(frame['description'])) {
            $("#" + timelapseViewerDivId + " .snaplapse-annotation-description > div").text(frame['description']);
            // this must use .text() and not .html() to prevent cross-site scripting
            $("#" + timelapseViewerDivId + " .snaplapse-annotation-description").show();
          } else {
            hideAnnotationBubble();
          }
        } else {
          hideAnnotationBubble();
        }
      } else {
        hideAnnotationBubble();
      }
    };

    var clearKeyframeSelection = function() {
      var keyframes = $("#" + composerDivId + " .snaplapse_keyframe_list > div");
      for (var i = 0; i < keyframes.size(); i++) {
        $(keyframes[i]).removeClass().addClass("snaplapse_keyframe_list_item");
      }
    };

    var newSnaplapse = function(json) {
      //$('#' + composerDivId + " .snaplapse_composer_controls").show();
      snaplapse.clearSnaplapse();
      //timelapse.handleEditorModeToolbarChange();
      //snaplapse = new org.gigapan.timelapse.Snaplapse(composerDivId,timelapse);

      if (!didOnce) {
        snaplapse.addEventListener('play', function() {

          //add mask to viewer to prevent clicking
          $("#" + timelapseViewerDivId).append('<div class="snaplapsePlayingMask"></div>');
          //add mask to keyframes container to prevent clicking
          $("#" + composerDivId + " .snaplapse_keyframe_container").append('<div class="snaplapsePlayingMask"></div>');
          var leftOffset = $("#" + composerDivId + " .snaplapse_keyframe_container").offset().left;
          $("#" + composerDivId + " .snaplapse_keyframe_container .snaplapsePlayingMask").css({
            "left": leftOffset + 1,
            "top": $("#" + timelapseViewerDivId).height() + leftOffset,
            "width": $("#" + composerDivId + " .snaplapse_keyframe_container").width(),
            "height": $("#" + composerDivId + " .snaplapse_keyframe_container").height()
          });

          //other UI
          $("#" + timelapseViewerDivId + " .timelineSlider")['slider']("option", "disabled", true);
          $("#" + timelapseViewerDivId + " .viewerModeBtn").button("disable");
          if (!timelapse.isFullScreen())
            timelapse.disableEditorToolbarButtons();
          if (timelapse.getVisualizer()) {
            timelapse.getVisualizer().handleShowHideNavigationMap("hide");
            timelapse.setPanoVideoEnableStatus(false);
            timelapse.getVisualizer().setMode(timelapse.getMode(), timelapse.isFullScreen(), true);
          }
          $("#" + timelapseViewerDivId + " .sideToolBar").stop(true, true).fadeOut(200);
          //change the play stop button icon
          $("#" + timelapseViewerDivId + " .playStopTimewarp").text("stop").button("option", {
            icons: {
              primary: "ui-icon-stop"
            },
            label: "Stop"
          });
          if (timelapse.getMode() != "player") {
            $("#" + timelapseViewerDivId + " .stopTimeWarp").button("option", {
              icons: {
                primary: "ui-icon-custom-play"
              }
            });
            $("#" + timelapseViewerDivId + " .stopTimeWarp").button("disable");
          }

          $("#" + timelapseViewerDivId + ' .help').removeClass("enabled").addClass("disabled");
          $("#" + timelapseViewerDivId + " .instructions").stop(true, true).fadeOut(50);
          $("#" + timelapseViewerDivId + " .instructions").removeClass('on');
          if ($("#" + timelapseViewerDivId + ' .playbackButton').hasClass("pause_disabled")) {
            $("#" + timelapseViewerDivId + ' .playbackButton').removeClass('pause_disabled').addClass("pause");
          } else {
            $("#" + timelapseViewerDivId + ' .playbackButton').removeClass('play_disabled').addClass("play");
          }
          $("#" + timelapseViewerDivId + ' .repeatCheckbox').button("disable");
          $("#" + timelapseViewerDivId + ' .playbackButton').hide();
          $("#" + timelapseViewerDivId + ' .stopTimeWarp').show();
        });

        snaplapse.addEventListener('stop', function() {
          $("#" + timelapseViewerDivId + " .snaplapsePlayingMask").remove();
          $("#" + composerDivId + " .snaplapsePlayingMask").remove();
          $("#" + timelapseViewerDivId + " .timelineSlider")['slider']("option", "disabled", false);
          $("#" + timelapseViewerDivId + " .viewerModeBtn").button("enable");
          if (!timelapse.isFullScreen())
            timelapse.enableEditorToolbarButtons();
          if (timelapse.getVisualizer() && !timelapse.isFullScreen())
            timelapse.getVisualizer().handleShowHideNavigationMap("show");
          if (timelapse.getVisualizer()) {
            timelapse.setPanoVideoEnableStatus(true);
            timelapse.seek(timelapse.getCurrentTime());
          }
          $("#" + timelapseViewerDivId + " .sideToolBar").stop(true, true).fadeIn(200);
          //change the play stop button icon
          $("#" + timelapseViewerDivId + " .playStopTimewarp").button("option", {
            icons: {
              primary: "ui-icon-play"
            },
            label: "Play"
          });
          if (timelapse.getMode() != "player") {
            $("#" + timelapseViewerDivId + " .stopTimeWarp").button("option", {
              icons: {
                primary: "ui-icon-custom-stop"
              }
            });
            $("#" + timelapseViewerDivId + " .stopTimeWarp").button("enable");
          }
          $("#" + timelapseViewerDivId + ' .stopTimeWarp').hide();
          $("#" + timelapseViewerDivId + ' .playbackButton').removeClass("pause").addClass("play");
          $("#" + timelapseViewerDivId + ' .playbackButton').attr("title", "Play");
          $("#" + timelapseViewerDivId + ' .playbackButton').show();
          $("#" + timelapseViewerDivId + ' .repeatCheckbox').button("enable");
          $("#" + timelapseViewerDivId + ' .help').removeClass("disabled").addClass("enabled");

          hideAnnotationBubble();
        });

        snaplapse.addEventListener('keyframe-added', function(keyframe, insertionIndex) {
          addSnaplapseKeyframeListItem(keyframe, insertionIndex, true);
        });

        snaplapse.addEventListener('keyframe-loaded', function(keyframe, insertionIndex, keyframes, loadKeyframesLength) {
          addSnaplapseKeyframeListItem(keyframe, insertionIndex, true, true, keyframes, loadKeyframesLength);
        });

        snaplapse.addEventListener('keyframe-modified', function(keyframe) {
          $("#" + composerDivId + "_snaplapse_keyframe_" + keyframe['id'] + "_timestamp").text(keyframe['captureTime']);
          setKeyframeThumbail(keyframe);
        });

        snaplapse.addEventListener('keyframe-interval-change', function(keyframe) {
          org.gigapan.Util.log("##################### snaplapse keyframe-interval-change: " + JSON.stringify(keyframe));

          // render the keyframe as selected to show that it's being played
          //$("#" + composerDivId + "_snaplapse_keyframe_" + keyframe['id']).addClass("snaplapse_keyframe_list_item ui-selected");
          displaySnaplapseFrameAnnotation(keyframe);
        });

        // TODO: add videoset listener which listens for the stall event so we can disable the recordKeyframeButton (if not already disabled due to playback)
        didOnce = true;
      }

      $("#" + composerDivId + " .snaplapse_keyframe_list").empty();

      if ( typeof json != 'undefined' && json != null) {
        return snaplapse.loadFromJSON(json, 0);
      }

      return true;
    };
    this.loadNewSnaplapse = newSnaplapse;

    var setKeyframeThumbail = function(keyframe) {
      try {
        // find max video id
        /*
        var activeVideosMap = timelapse.getVideoset().getActiveVideos();
        var videoIdPrefix = null;
        var maxVideoId = -1;
        for (var id in activeVideosMap) {
        videoIdPrefix = id.substring(0, id.lastIndexOf('_') + 1);
        maxVideoId = Math.max(maxVideoId, id.substring(id.lastIndexOf('_') + 1));
        }*/

        // now that we know the max video id, count backwards until we find a ready video, or we run out of videos to check
        /*
        var videoElement = null;
        var videoId = videoIdPrefix + maxVideoId;
        do {
        videoElement = activeVideosMap[videoId];
        videoId = videoId - 1;
        } while (videoElement != null && (typeof videoElement.ready == 'undefined' || !videoElement.ready));*/
        //var videoId = videoIdPrefix + maxVideoId;
        //var videoElement = activeVideosMap[videoId];
        var videoElement = videoset.getCurrentActiveVideo();
        if (videoElement != null) {
          //TODO: refactoring
          //debug
          if (viewerType == "video") {
            var vid = $(videoElement);
            //var scale = KEYFRAME_THUMBNAIL_WIDTH / $("#" + timelapse.getVideoDivId()).width();
            var scale = KEYFRAME_THUMBNAIL_WIDTH / timelapse.getViewportWidth();
            var vWidth = vid.width();
            var vHeight = vid.height();
            var vTopLeftX = vid.position()['left'];
            var vTopLeftY = vid.position()['top'];
            var theCanvas = $("#" + composerDivId + "_snaplapse_keyframe_" + keyframe['id'] + "_thumbnail").get(0);
            var ctx = theCanvas.getContext("2d");
            ctx.clearRect(0, 0, KEYFRAME_THUMBNAIL_WIDTH, KEYFRAME_THUMBNAIL_HEIGHT);
            ctx.drawImage(vid.get(0), 0, 0, timelapse.getVideoWidth(), timelapse.getVideoHeight(), vTopLeftX * scale, vTopLeftY * scale, vWidth * scale, vHeight * scale);
            //ctx.drawImage(videoElement, -vTopLeftX, -vTopLeftY, timelapse.getViewportWidth(), timelapse.getViewportHeight(), 0, 0, KEYFRAME_THUMBNAIL_WIDTH, KEYFRAME_THUMBNAIL_HEIGHT);
          } else if (viewerType == "canvas") {
            var canvas = timelapse.getCanvas();
            //var scale = KEYFRAME_THUMBNAIL_WIDTH / $("#" + timelapse.getVideoDivId()).width();
            var scale = KEYFRAME_THUMBNAIL_WIDTH / timelapse.getViewportWidth();
            var cWidth = canvas.width;
            var cHeight = canvas.height;
            var theCanvas = $("#" + composerDivId + "_snaplapse_keyframe_" + keyframe['id'] + "_thumbnail").get(0);
            var ctx = theCanvas.getContext("2d");
            ctx.clearRect(0, 0, KEYFRAME_THUMBNAIL_WIDTH, KEYFRAME_THUMBNAIL_HEIGHT);
            //ctx.drawImage(canvas, 0, 0, cWidth * scale, cHeight * scale);
            ctx.drawImage(canvas, 0, 0, cWidth, cHeight, 0, 0, KEYFRAME_THUMBNAIL_WIDTH, KEYFRAME_THUMBNAIL_HEIGHT);
          }
        } else {
          org.gigapan.Util.error("setKeyframeThumbail(): failed to find a good video");
        }
      } catch(e) {
        org.gigapan.Util.error("Exception while trying to create thumbnail: " + e + "  Video: " + theCanvas);
        //console.log("Exception while trying to create thumbnail: " + e + "  Video: " + theCanvas);
      }
    };

    var isTextNonEmpty = function(text) {
      return ( typeof text != 'undefined' && text.length > 0);
    };

    var hideAnnotationBubble = function() {
      $("#" + timelapseViewerDivId + " .snaplapse-annotation-description").hide();
    };
    this.hideAnnotationBubble = hideAnnotationBubble;

    var addSnaplapseKeyframeListItem = function(frame, insertionIndex, shouldDrawThumbnail, isKeyframeFromLoad, keyframes, loadKeyframesLength) {
      var keyframeId = frame['id'];
      var keyframeListItem = document.createElement("div");
      keyframeListItem.id = composerDivId + "_snaplapse_keyframe_" + keyframeId;

      var keyframeListItems = $("#" + composerDivId + " .snaplapse_keyframe_list_item").get();
      if (insertionIndex < keyframeListItems.length && isKeyframeFromLoad != true) {
        $("#" + keyframeListItems[insertionIndex - 1]['id']).after(keyframeListItem);
      } else {
        $("#" + composerDivId + " .snaplapse_keyframe_list").append(keyframeListItem);
      }

      var thumbnailId = keyframeListItem.id + "_thumbnail";
      var timestampId = keyframeListItem.id + "_timestamp";
      var descriptionVisibleCheckboxId = keyframeListItem.id + "_description_visible";
      var loopCheckboxId = keyframeListItem.id + "_loop";
      var durationId = keyframeListItem.id + "_duration";
      var speedId = keyframeListItem.id + "_speed";
      var loopTimesId = keyframeListItem.id + "_loopTimes";
      var pauseStartId = keyframeListItem.id + "_pauseStart";
      var pauseEndId = keyframeListItem.id + "_pauseEnd";
      var buttonContainerId = keyframeListItem.id + "_buttons";
      var updateButtonId = keyframeListItem.id + "_update";
      var duplicateButtonId = keyframeListItem.id + "_duplicate";
      var playFromHereButtonId = keyframeListItem.id + "_play";
      var duration = typeof frame['duration'] != 'undefined' && frame['duration'] != null ? frame['duration'] : '';
      var speed = typeof frame['duration'] != 'undefined' && frame['duration'] != null ? frame['speed'] : 100;
      var isDescriptionVisible = typeof frame['is-description-visible'] == 'undefined' ? true : frame['is-description-visible'];
      var isLoop = typeof frame['is-loop'] == 'undefined' ? false : frame['is-loop'];
      var loopTimes_default = 2;
      var pauseStart_default = 0.5;
      var pauseEnd_default = 0.5;
      var loopTimes = typeof frame['loopTimes'] == 'undefined' ? loopTimes_default : frame['loopTimes'];
      var pauseStart = typeof frame['waitStart'] == 'undefined' ? pauseStart_default : frame['waitStart'];
      var pauseEnd = typeof frame['waitEnd'] == 'undefined' ? pauseEnd_default : frame['waitEnd'];
      var content = '';
      content += '<table border="0" cellspacing="0" cellpadding="0" class="snaplapse_keyframe_list_item_table">';
      content += '	<tr valign="center">';
      content += '		<td valign="center" class="keyframe_table">';
      content += '			<div id="' + timestampId + '" class="snaplapse_keyframe_list_item_timestamp">' + frame['captureTime'] + '</div>';
      content += '			<canvas id="' + thumbnailId + '" width="' + KEYFRAME_THUMBNAIL_WIDTH + '" height="' + KEYFRAME_THUMBNAIL_HEIGHT + '" class="snaplapse_keyframe_list_item_thumbnail"></canvas>';
      content += '			<div id="' + buttonContainerId + '" class="keyframe-button-container">';
      content += '				<button id="' + updateButtonId + '" title="Update this keyframe to current view">&nbsp</button>';
      content += '				<button id="' + duplicateButtonId + '" title="Duplicate this keyframe">&nbsp</button>';
      content += '				<button id="' + playFromHereButtonId + '" class="snaplapse_keyframe_list_item_play_button" title="Play warp starting at this keyframe">&nbsp</button>';
      content += '				<input class="snaplapse_keyframe_list_item_description_checkbox" id="' + descriptionVisibleCheckboxId + '" type="checkbox" ' + ( isDescriptionVisible ? 'checked="checked"' : '') + '/>';
      content += '				<label class="snaplapse_keyframe_list_item_description_label" title="Enable/Disable subtitle" for="' + descriptionVisibleCheckboxId + '">&nbsp</label>';
      content += '			</div>';
      content += '		</td>';
      content += '		<td valign="center" class="transition_table">';
      content += '			<div class="transition_table_mask">';
      content += '				<div class="snaplapse_keyframe_list_item_duration_container">';
      content += '					<span class="snaplapse_keyframe_list_item_duration_label_1">Duration:</span>';
      content += '					<input type="text" id="' + durationId + '" class="snaplapse_keyframe_list_item_duration" value="' + duration + '">';
      content += '					<span class="snaplapse_keyframe_list_item_duration_label_2">secs</span>';
      content += '				</div>';
      content += '				<div class="snaplapse_keyframe_list_item_speed_container">';
      content += '					<span class="snaplapse_keyframe_list_item_speed_label_1">Speed:</span>';
      content += '					<input type="text" id="' + speedId + '" class="snaplapse_keyframe_list_item_speed" value="' + speed + '">';
      content += '					<span class="snaplapse_keyframe_list_item_speed_label_2">%</span>';
      content += '				</div>';
      content += '				<div class="snaplapse_keyframe_list_item_loop_container">';
      content += '					<div style="display: block; height: 15px;">';
      content += '						<input class="snaplapse_keyframe_list_item_loop_checkbox" id="' + loopCheckboxId + '" type="checkbox" ' + ( isLoop ? 'checked="checked"' : '') + '/>';
      content += '						<span class="snaplapse_keyframe_list_item_loop_label_1">Loop:</span>';
      content += ' 					</div>';
      content += '					<input type="text" id="' + loopTimesId + '" class="snaplapse_keyframe_list_item_loop" title="Times for looping the entire video" value="' + loopTimes + '"' + (!isLoop ? 'disabled' : '') + '>';
      content += '					<span class="snaplapse_keyframe_list_item_loop_label_2">times</span>';
      content += '					<span class="snaplapse_keyframe_list_item_loop_label_3">Pause:</span>';
      content += '					<input type="text" id="' + pauseStartId + '" class="snaplapse_keyframe_list_item_loop_pauseStart" title="Loop dwell time at the beginning" value="' + pauseStart + '"' + (!isLoop ? 'disabled' : '') + '>';
      content += '					<input type="text" id="' + pauseEndId + '" class="snaplapse_keyframe_list_item_loop_pauseEnd" title="Loop dwell time at the end" value="' + pauseEnd + '"' + (!isLoop ? 'disabled' : '') + '>';
      content += '					<span class="snaplapse_keyframe_list_item_loop_label_4">secs</span>';
      content += '				</div>';
      content += '			</div>';
      content += '		</td>';
      content += '	</tr>';
      content += '</table>';

      $("#" + keyframeListItem.id).html(content).addClass("snaplapse_keyframe_list_item");

      // toggle the description field enabled/disabled
      $("#" + descriptionVisibleCheckboxId).button({
        icons: {
          primary: "ui-icon-comment"
        },
        text: true
      }).change(function() {
        var thisKeyframeId = this.id.split("_")[3];
        if (this.checked) {
          snaplapse.setTextAnnotationForKeyframe(thisKeyframeId, undefined, true);
          var thisKeyframe = snaplapse.getKeyframeById(thisKeyframeId);
          if (thisKeyframe["description"] != undefined) {
            $(".subtitle_textarea").val(thisKeyframe["description"]);
          }
          $(".createSubtitle_dialog").dialog("option", {
            "keyframeId": thisKeyframeId
          });
          $(".createSubtitle_dialog").dialog("option", {
            "descriptionVisibleCheckboxId": this.id
          });
          $(".createSubtitle_dialog").dialog("open");
        } else {
          snaplapse.setTextAnnotationForKeyframe(thisKeyframeId, undefined, false);
          displaySnaplapseFrameAnnotation(snaplapse.getKeyframeById(thisKeyframeId));
        }
      });

      //create update button
      $("#" + updateButtonId).button({
        icons: {
          primary: "ui-icon-refresh"
        },
        text: true
      }).click(function() {
        var thisKeyframeId = this.id.split("_")[3];
        var color_head = snaplapse.updateTimeAndPositionForKeyframe(thisKeyframeId);
        keyframeListItem.style.backgroundColor = color_head + "0.15)";
        //select the element
        UTIL.selectSelectableElements($("#" + composerDivId + " .snaplapse_keyframe_list"), $("#" + keyframeListItem.id));
      });

      //create duplicate button
      $("#" + duplicateButtonId).button({
        icons: {
          primary: "ui-icon-copy"
        },
        text: true
      }).click(function() {
        var thisKeyframeId = this.id.split("_")[3];
        snaplapse.duplicateKeyframe(thisKeyframeId);
        //select the element
        UTIL.selectSelectableElements($("#" + composerDivId + " .snaplapse_keyframe_list"), $("#" + keyframeListItem.id));
      });

      //create play button
      $("#" + playFromHereButtonId).button({
        icons: {
          primary: "ui-icon-play"
        },
        text: true,
        disabled: false
      }).click(function() {
        if (snaplapse.isPlaying()) {
          snaplapse.stop();
        }
        var thisKeyframeId = this.id.split("_")[3];
        snaplapse.play(thisKeyframeId);
      });

      //create buttonset
      $(".keyframe-button-container").buttonset();

      //display the text annotation when you focus on the description field.
      $(".subtitle_textarea")['focus'](function(event) {
        var thisKeyframeId = $(event.target.parentNode).dialog("option", "keyframeId");
        displaySnaplapseFrameAnnotation(snaplapse.getKeyframeById(thisKeyframeId));
        checkTextareaMaxlength(this, maxSubtitleLength);
      });

      //save the text annotation on keyup, so that we don't need a save button
      $(".subtitle_textarea")['keyup'](function(event) {
        var thisKeyframeId = $(event.target.parentNode).dialog("option", "keyframeId");
        snaplapse.setTextAnnotationForKeyframe(thisKeyframeId, $(this).val(), true);
        displaySnaplapseFrameAnnotation(snaplapse.getKeyframeById(thisKeyframeId));
        checkTextareaMaxlength(this, maxSubtitleLength);
      });

      //set text limit
      $(".subtitle_textarea").on("paste", function(event) {
        checkTextareaMaxlength(this, maxSubtitleLength);
      });

      //validate the duration on keyup, reformat it on change
      $("#" + durationId)['change'](function() {
        // validate and sanitize, and get the cleaned duration.
        var newDuration = validateAndSanitizeDuration(durationId);
        var thisKeyframeId = this.id.split("_")[3];
        var keyframe = snaplapse.setDurationForKeyframe(thisKeyframeId, newDuration);
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().updateTagPaths(keyframeListItem.id, keyframe);
      });

      $("#" + speedId)['change'](function() {
        var newSpeed = parseInt(this.value);
        var max = 10000;
        var min = 0;
        if (isNaN(newSpeed)) {
          this.value = 100;
          newSpeed = 100;
        }
        if (newSpeed > max) {
          this.value = max;
          newSpeed = max;
        } else if (newSpeed < min) {
          this.value = min;
          newSpeed = min;
        }
        var thisKeyframeId = this.id.split("_")[3];
        var keyframe = snaplapse.setSpeedForKeyframe(thisKeyframeId, newSpeed);
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().updateTagPaths(keyframeListItem.id, keyframe);
      });

      $("#" + loopCheckboxId).change(function() {
        var thisKeyframeId = this.id.split("_")[3];
        var keyframe = snaplapse.setIsLoopForKeyframe(thisKeyframeId, this.checked);
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().updateTagPaths(keyframeListItem.id, keyframe);
        $("#" + loopTimesId).prop('disabled', !this.checked);
        $("#" + pauseStartId).prop('disabled', !this.checked).val(pauseStart_default);
        $("#" + pauseEndId).prop('disabled', !this.checked).val(pauseEnd_default);
        snaplapse.setWaitDurationForKeyframe(thisKeyframeId, pauseStart_default, "start");
        snaplapse.setWaitDurationForKeyframe(thisKeyframeId, pauseEnd_default, "end");
      });

      $("#" + loopTimesId).change(function() {
        if (this.value == "" || !UTIL.isNumber(this.value))
          this.value = 1;
        var newLoopTimes = Math.round(parseInt(this.value));
        this.value = newLoopTimes;
        var thisKeyframeId = this.id.split("_")[3];
        var keyframe = snaplapse.setLoopTimesForKeyframe(thisKeyframeId, newLoopTimes);
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().updateTagPaths(keyframeListItem.id, keyframe);
      });

      $("#" + pauseStartId).change(function() {
        if (this.value == "" || !UTIL.isNumber(this.value))
          this.value = 0;
        var newPauseStart = parseFloat(this.value);
        var thisKeyframeId = this.id.split("_")[3];
        snaplapse.setWaitDurationForKeyframe(thisKeyframeId, newPauseStart, "start");
      });

      $("#" + pauseEndId).change(function() {
        if (this.value == "" || !UTIL.isNumber(this.value))
          this.value = 0;
        var newPauseEnd = parseFloat(this.value);
        var thisKeyframeId = this.id.split("_")[3];
        snaplapse.setWaitDurationForKeyframe(thisKeyframeId, newPauseEnd, "end");
      });

      //grab the current video frame and store it as the thumbnail in the canvas
      if (!isKeyframeFromLoad) {
        if (shouldDrawThumbnail) {
          setTimeout(function() {
            setKeyframeThumbail(frame);
          }, 100);
        }
      } else {
        var loadNextKeyframe = function() {
          setTimeout(function() {
            if (timelapse.getVisualizer())
              timelapse.getVisualizer().addTimeTag(keyframes, insertionIndex);
            if (shouldDrawThumbnail) {
              setKeyframeThumbail(frame);
            }
            if (insertionIndex == loadKeyframesLength - 1) {
              $(".loadingOverlay").remove();
              $(document.body).css("cursor", "default");
            } else {
              snaplapse.loadFromJSON(undefined, insertionIndex + 1);
            }
          }, 700);
          videoset.removeEventListener('video-seeked', loadNextKeyframe);
        };
        videoset.addEventListener('video-seeked', loadNextKeyframe);
      }
      //override the color of keyframe items
      var tagColor;
      if (timelapse.getVisualizer()) {
        tagColor = timelapse.getTagColor();
      } else {
        tagColor = [1, 1, 1];
      }
      keyframeListItem.style.backgroundColor = "rgba(" + tagColor[0] + "," + tagColor[1] + "," + tagColor[2] + ",0)";
      //select the element
      UTIL.selectSelectableElements($("#" + composerDivId + " .snaplapse_keyframe_list"), $("#" + keyframeListItem.id));
      //hide the last keyframe transition area
      snaplapse.hideLastKeyframeTransition();
      timelapse.handleEditorModeToolbarChange();
      $(".addTimetag").button("option", "disabled", false);
      //the reason to hide and show the elements is the workaround for a webkit refresh bug
      $(".snaplapse_keyframe_container").hide().show(0);

      //when the video is in looping mode, the keyframes created should be also in looping mode
      if (!isKeyframeFromLoad && timelapse.getLoopPlayback() && insertionIndex > 0) {
        var allKeyframes = snaplapse.getKeyframes();
        var lastKeyframe = allKeyframes[insertionIndex - 1];
        var thisDOM_Id = composerDivId + "_snaplapse_keyframe_" + lastKeyframe.id;
        $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop_checkbox").prop('checked', true);
        $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop").prop('disabled', false).val(loopTimes_default);
        $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop_pauseStart").prop('disabled', false).val(pauseStart_default);
        $("#" + thisDOM_Id + " .snaplapse_keyframe_list_item_loop_pauseEnd").prop('disabled', false).val(pauseEnd_default);
        snaplapse.setIsLoopForKeyframe(lastKeyframe.id, true);
        snaplapse.setLoopTimesForKeyframe(lastKeyframe.id, loopTimes_default);
        snaplapse.setWaitDurationForKeyframe(lastKeyframe.id, pauseStart_default, "start");
        snaplapse.setWaitDurationForKeyframe(lastKeyframe.id, pauseEnd_default, "end");
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().updateTagPaths(thisDOM_Id, lastKeyframe);
      }
    };

    var checkTextareaMaxlength = function(thisTextarea, maxlength) {
      if ($(thisTextarea).val().length > maxlength) {
        var text = $(thisTextarea).val();
        $(thisTextarea).val(text.substr(0, maxlength));
      }
    };

    var validateAndSanitizeDuration = function(durationId) {
      var durationField = $("#" + durationId);
      var durationStr = durationField.val().trim();

      //durationField.removeClass('validation-fault');
      if (durationStr.length > 0) {
        var num = parseFloat(durationStr);

        if (!isNaN(num) && (num >= 0)) {
          //durationField.removeClass('validation-fault');
          return num.toFixed(1);
        } else {
          //durationField.addClass('validation-fault');
        }
      }
      return '';
    };

    var recordKeyframe = function() {
      if (snaplapse) {
        // If there's a keyframe already selected, then we'll append after that one.  Otherwise, just append to the end.
        var selectedItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selected");
        var numSelected = selectedItems.size();

        if (numSelected == 1) {
          var id = selectedItems.get(0).id;
          var keyframeId = id.split("_")[3];
          snaplapse.recordKeyframe(keyframeId);
        } else {
          snaplapse.recordKeyframe();
        }
      }
    };
    this.recordKeyframe = recordKeyframe;

    var cacheSnaplapse = function(snaplapseJsonUrl, callback) {
      $.ajax({
        dataType: 'json',
        url: snaplapseJsonUrl,
        success: function(snaplapseJSON) {
          if (snaplapseJSON) {
            //org.gigapan.Util.log("Loaded this snaplapse JSON: [" + JSON.stringify(snaplapseJSON) + "]");
            cachedSnaplapses[snaplapseJsonUrl] = snaplapseJSON;
            if (callback && typeof callback == 'function') {
              callback();
            }
          } else {
            org.gigapan.Util.error("Failed to load snaplapse json from URL [" + snaplapseJsonUrl + "]");
          }
        },
        error: function() {
          org.gigapan.Util.error("Error loading snaplapse json from URL [" + snaplapseJsonUrl + "]");
        }
      });
      return false;
    };

    // This function finds all the links to snaplapses generated by the Template:SnaplapseLinkAJAX wiki template, fetches
    // the referenced snaplapse JSON via AJAX (and caches it), and creates a link to play the snaplapse.  This code assumes
    // that the wiki template Template:SnaplapseLinkAJAX converts this wiki code...
    //
    //    {{SnaplapseLinkAJAX|filename=Brassica_1.warp|label=cotyledon development}}
    //
    // ...to this HTML...
    //
    //    <span class="snaplapse_link">
    //       <span class="snaplapse_label">cotyledon development</span>
    //       <span class="snaplapse_filename" style="display:none"><a href="/images/8/8d/Brassica_1.warp" class="internal" title="Brassica 1.warp">Media:Brassica_1.warp</a></span>
    //    </span>
    //
    // This code will take the above HTML and modify it to be simply:
    //
    //    <a href="#timelapse_viewer_anchor" onclick="playCachedSnaplapse('http://lauwers.ece.cmu.edu/images/8/8d/Brassica_1.warp');">cotyledon development</a>
    //

    var setupSnaplapseLinks = function() {
      $(".snaplapse_link").each(function(index, elmt) {
        var linkSpan = $(elmt);
        var labelSpan = linkSpan.children().first();
        var filenameSpan = labelSpan.next();
        var snaplapseJsonUrl = filenameSpan.children('a').first().get(0).href;
        filenameSpan.detach();
        var originalContent = labelSpan.html();

        org.gigapan.Util.log("setupSnaplapseLinks(): [" + index + "]" + labelSpan.text() + "|" + snaplapseJsonUrl + "|" + originalContent);

        if (!browserSupported) {
          linkSpan.replaceWith('<a class="time_warp_link" href="#" onclick="loadVideoSnaplapse(\'' + filenameSpan.text() + '\');return false;">' + originalContent + '</a>');
        } else {
          cacheSnaplapse(snaplapseJsonUrl, function() {
            linkSpan.replaceWith('<a class="time_warp_link" href="#" onclick="playCachedSnaplapse(\'' + snaplapseJsonUrl + '\');return false;">' + originalContent + '</a>');
          });
        }
      });
    };

    var _playStopSnaplapse = function() {
      if (snaplapse.isPlaying()) {
        snaplapse.stop();
      } else {
        snaplapse.play();
      }
    };
    this.playStopSnaplapse = _playStopSnaplapse;

    var saveSnaplapse = function() {
      if (snaplapse && (snaplapse.getNumKeyframes() >= 1)) {
        $("#" + composerDivId + " .saveTimewarpWindow").dialog("open");
        $("#" + composerDivId + " .saveTimewarpWindow_JSON").val(snaplapse.getAsJSON()).focus().select().click(function() {
          $(this).focus().select();
        });
      } else {
        alert("ERROR: No time warp to save--please create a time warp and add at least two keyframes to it.")
      }
    };
    this.saveSnaplapse = saveSnaplapse;

    var getSnaplapseJSON = function() {
      return snaplapse.getAsJSON();
    };

    var showLoadSnaplapseWindow = function() {
      activeSnaplapse = thisObj;
      $("#" + composerDivId + " .loadTimewarpWindow").dialog("open");
      $("#" + composerDivId + " .loadTimewarpWindow_JSON").val("");
    };
    this.showLoadSnaplapseWindow = showLoadSnaplapseWindow;

    var showSetSnaplapseWindow = function() {
      activeSnaplapse = thisObj;
      $("#" + composerDivId + " .setTimewarpWindow").dialog("open");
    };
    this.showSetSnaplapseWindow = showSetSnaplapseWindow;

    var _loadSnaplapse = function(json) {
      if (newSnaplapse(json)) {
        $('#' + composerDivId + " .snaplapse_composer_controls").show();
        $("#" + composerDivId + " .loadTimewarpWindow").dialog("close");
        //clearKeyframeSelection();
        hideAnnotationBubble();
        timelapse.handleEditorModeToolbarChange();
      } else {
        alert("ERROR: Invalid time warp file.");
      }
    };
    this.loadSnaplapse = _loadSnaplapse;

    var deleteSelectedKeyframes = function() {
      var selectedItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selected");
      var numSelected = selectedItems.size();

      if (numSelected > 0) {
        var selectedKeyframeElements = selectedItems.get();
        for (var i = 0; i < numSelected; i++) {
          var keyframeElement = selectedKeyframeElements[i];
          var id = keyframeElement['id'];
          var keyframeId = id.split("_")[3];
          $("#" + id).remove();
          snaplapse.deleteKeyframeById(keyframeId);

          timelapse.handleEditorModeToolbarChange();
          //the reason to hide and show the elements is the workaround for a webkit refresh bug
          $(".snaplapse_keyframe_container").hide().show(0);
        }

        handleSnaplapseFrameSelectionChange(false);
      }
    };
    this.deleteSelectedKeyframes = deleteSelectedKeyframes;
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor code
    //
    timelapse.setSnaplapseViewer(thisObj);
    initializeSnaplapseUI();
    newSnaplapse(null);
  };
})();

