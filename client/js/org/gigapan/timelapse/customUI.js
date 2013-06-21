/*
 Class for managing custom UI

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
*/

"use strict";

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
// DEPENDENCIES
//
if (!org.gigapan.timelapse.Timelapse) {
  var noTimelapseMsg = "The org.gigapan.timelapse.Timelapse library is required by org.gigapan.timelapse.CustomUI";
  alert(noTimelapseMsg);
  throw new Error(noTimelapseMsg);
}

//
// CODE
//
(function() {
  org.gigapan.timelapse.CustomUI = function(timelapse, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Class variables
    //
    var viewerDivId = timelapse.getViewerDivId();
    var $viewer = $("#" + viewerDivId);
    var viewer_offset = $viewer.offset();
    var $video = $("#" + viewerDivId + " .tiledContentHolder");
    var playerWidth = $video.outerWidth();
    var customControl;
    var $customControl;
    var $customPlay;
    var $customHelpLabel;
    var $customTimeline;
    var $timeText;
    var $timeTextLeft;
    var $timeTextRight;
    var $currentTimeTick;
    var $fastSpeed;
    var $mediumSpeed;
    var $slowSpeed;
    var $timeTextHover;
    var videoset = timelapse.getVideoset();
    var captureTimes = timelapse.getCaptureTimes();
    var numFrames = timelapse.getNumFrames();
    var timeTickX = [];

    // In px.
    var viewerWidth;
    var sliderWidth;
    var sliderLeftMargin;
    var sliderRightMargin;

    // In % of total viewer width.
    var sliderWidth_pct;
    var sliderLeftMargin_pct;
    var sliderRightMargin_pct;

    var isShowHoverEffect = true;
    var timeTick_width = 2;
    var timeTick_height = 15;
    var currentTimeTick_width = 10;
    var currentTimeTick_height = 31;
    var timeTickGrow_width = 2;
    var timeTickGrow_height = 31;
    var originalIsPaused;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    var createCustomControl = function() {
      // Create element
      customControl = createAnElement("div", "customControl", viewerDivId + "_customControl");
      // jQuery
      $customControl = $(customControl);
      // Append element
      $viewer.append(customControl);
      // Set position
      $customControl.css({
        left: "0px",
        bottom: "0px",
        width: "100%"
      });
      // Create google logo
      $customControl.append('<img src="images/googleLogo.png" class="googleLogo">');
      // Create timeline toolbar
      createCustomButtons();
      // Create timeline slider
      createCustomTimeline();

      // Update certain properties on window resize
      $(window).resize(function() {
        updateVariableDimensions();
      });
      updateVariableDimensions();
    };

    var updateVariableDimensions = function() {
      timelapse.fitVideoToViewport(window.innerWidth, window.innerHeight);
      viewerWidth = $viewer.width();
      sliderLeftMargin_pct = (sliderLeftMargin / viewerWidth) * 100;
      sliderRightMargin_pct = (sliderRightMargin / viewerWidth) * 100;
      sliderWidth_pct = 100 - sliderLeftMargin_pct - sliderRightMargin_pct;
      $customTimeline.css({
        'width': sliderWidth_pct + "%",
        'left': sliderLeftMargin_pct + "%"
      });
      sliderWidth = $customTimeline.width();
    };

    var createCustomButtons = function() {
      // Toggle speed
      $fastSpeed = $('<button class="toggleSpeed" id="fastSpeed" title="Toggle playback speed">Fast</button>');
      $mediumSpeed = $('<button class="toggleSpeed" id="mediumSpeed" title="Toggle playback speed">Medium</button>');
      $slowSpeed = $('<button class="toggleSpeed" id="slowSpeed" title="Toggle playback speed">Slow</button>');
      $fastSpeed.button({
        text: true
      }).click(function() {
        timelapse.setPlaybackRate(0.5);
        $customControl.prepend($mediumSpeed);
        $mediumSpeed.show();
        $fastSpeed.slideUp(300, function() {
          $fastSpeed.detach();
        });
      });
      $mediumSpeed.button({
        text: true
      }).click(function() {
        timelapse.setPlaybackRate(0.25);
        $customControl.prepend($slowSpeed);
        $slowSpeed.show();
        $mediumSpeed.slideUp(300, function() {
          $mediumSpeed.detach();
        });
      });
      $slowSpeed.button({
        text: true
      }).click(function() {
        timelapse.setPlaybackRate(1);
        $customControl.prepend($fastSpeed);
        $fastSpeed.show();
        $slowSpeed.slideUp(300, function() {
          $slowSpeed.detach();
        });
      });
      var playbackRate = timelapse.getPlaybackRate();
      if (playbackRate >= 1) {
        $customControl.prepend($fastSpeed);
      } else if (playbackRate < 1 && playbackRate >= 0.5) {
        $customControl.prepend($mediumSpeed);
      } else {
        $customControl.prepend($slowSpeed);
      }
      // Instruction mask
      var content_instruction = "";
      content_instruction += '<div class="customInstructions">';
      content_instruction += '<span class="customZoomhelp"><p>Zoom in and out to explore in greater detail. Click or use the mouse scroll wheel.</p></span>';
      content_instruction += '<span class="customMovehelp"><p>Click and drag to explore.</p></span>';
      content_instruction += '<span class="customSpeedhelp"><p>Click to toggle the playback speed.</p></span>';
      content_instruction += '</div>';
      $viewer.append(content_instruction);
      // Play and stop button
      $customControl.append('<button class="customPlay" title="Play"></button>');
      $customPlay = $("#" + viewerDivId + " .customPlay");
      $customPlay.button({
        icons: {
          primary: "ui-icon-custom-play"
        },
        text: false
      }).click(function() {
        if ($("#" + viewerDivId + " .playbackButton").hasClass("from_help")) return;
        timelapse.handlePlayPause();
      });
      // Help button
      $customControl.append('<input type="checkbox" class="customHelpCheckbox"/>');
      $customControl.append('<label class="customHelpLabel" title="Show instructions"></label>');
      var $customHelpCheckbox = $("#" + viewerDivId + " .customHelpCheckbox");
      $customHelpCheckbox.attr("id", viewerDivId + "_customHelpCheckbox");
      $customHelpLabel = $("#" + viewerDivId + " .customHelpLabel");
      $customHelpLabel.attr("for", viewerDivId + "_customHelpCheckbox");
      $customHelpCheckbox.button({
        icons: {
          primary: "ui-icon-help"
        },
        text: false
      }).change(function() {
        if ($customHelpCheckbox.is(":checked")) {
          doCustomHelpOverlay();
          var toggle = function(e) {
            if (!$(e.target).hasClass("customHelpCheckbox")) {
              $customHelpCheckbox.prop("checked", false).button("refresh").change();
              $(document).unbind("click", toggle);
            }
          };
          $(document).bind("click", toggle);
        } else {
          removeCustomHelpOverlay();
        }
      });
    };
    var createCustomTimeline = function() {
      // Create slider container
      var timeText = createAnElement("div", "timeText", viewerDivId + "_customTimeline_timeText");
      var customTimeline = createAnElement("div", "customTimeline", viewerDivId + "_customTimeline");
      $timeText = $(timeText);
      $customTimeline = $(customTimeline);
      $customControl.append(timeText, customTimeline);
      sliderLeftMargin = $customPlay.width() + $timeText.width() + 30;
      sliderRightMargin = $customHelpLabel.width() + 35;
      var width_slider = (playerWidth - sliderLeftMargin - sliderRightMargin);
      $customTimeline.css({
        "left": sliderLeftMargin + "px",
        "width": width_slider + "px"
      });
      $timeText.css({
        "left": $customPlay.width() * 0.85 + "px",
        "top": $customTimeline.position().top + "px"
      });
      // Create left, right, and hover date text
      var timeTextLeft = createAnElement("div", "timeTextLeft", viewerDivId + "_customTimeline_timeTextLeft");
      var timeTextRight = createAnElement("div", "timeTextRight", viewerDivId + "_customTimeline_timeTextRight");
      var timeTextHover = createAnElement("div", "timeTextHover", viewerDivId + "_customTimeline_timeTextHover");
      $timeTextLeft = $(timeTextLeft);
      $timeTextRight = $(timeTextRight);
      $timeTextHover = $(timeTextHover);
      $customTimeline.append(timeTextLeft, timeTextRight, timeTextHover);
      // Create current time bar
      var currentTimeTick = createAnElement("div", "currentTimeTick", viewerDivId + "_customTimeline_currentTimeTick");
      $currentTimeTick = $(currentTimeTick);
      $customTimeline.append(currentTimeTick);
      $currentTimeTick.css({
        "top": "0px",
        "left": "0px",
        "width": currentTimeTick_width + "px",
        "height": currentTimeTick_height + "px",
        "margin-left": (currentTimeTick_width / -2) + "px"
      });
      // Create time tick
      var span = 100 / numFrames;
      for (var i = 0; i < numFrames; i++) {
        timeTickX[i] = span * (i + 0.5);
        var timeTickContainer = createAnElement("div", "timeTickContainer", viewerDivId + "_customTimeline_timeTickContainer_" + i);
        var timeTick = createAnElement("div", "timeTick", viewerDivId + "_customTimeline_timeTick_" + i);
        var timeTickClickRegion = createAnElement("div", "timeTickClickRegion", viewerDivId + "_customTimeline_timeTickClickRegion_" + i);
        var $timeTickContainer = $(timeTickContainer);
        var $timeTickClickRegion = $(timeTickClickRegion);
        $timeTickContainer.css({
          "top": "0px",
          "left": (span * i) + "%",
          "width": span + "%",
          "height": currentTimeTick_height + 28 + "px"
        });
        $timeTickClickRegion.css({
          "top": "0px",
          "left": "0px",
          "width": "100%",
          "height": "100%",
          "border": "1px solid white"
        }).attr("tabindex", i);
        $(timeTick).css({
          "margin-top": (timeTick_height / 2) + "px",
          "width": timeTick_width + "px",
          "height": timeTick_height + "px"
        });
        $timeTickContainer.on("mouseenter", handleTimeTickMouseover).on("mouseleave", handleTimeTickMouseout).on("mousedown", handleTimeTickMousedown);
        $timeTickContainer.append(timeTick, timeTickClickRegion);
        $customTimeline.append(timeTickContainer);
      }
      $timeTextLeft.text(captureTimes[0]).css({
        "left": timeTickX[0] + "%",
        "top": currentTimeTick_height + 5 + "px",
        "margin-left": ($timeTextLeft.width() / -2) + "px"
      });
      $timeTextRight.text(captureTimes[numFrames - 1]).css({
        "left": timeTickX[numFrames - 1] + "%",
        "top": currentTimeTick_height + 5 + "px",
        "margin-left": ($timeTextRight.width() / -2) + "px"
      });
      $timeTextHover.text(captureTimes[0]).css({
        "left": "50%",
        "top": currentTimeTick_height + 5 + "px",
        "margin-left": ($timeTextHover.width() / -2) + "px"
      });
      videoset.addEventListener('sync', function() {
        updateTimelineSlider(timelapse.getCurrentFrameNumber());
      });
      updateTimelineSlider(0);
    };

    var handleTimeTickMousedown = function(event) {
      originalIsPaused = timelapse.isPaused();
      if (!originalIsPaused)
        timelapse.handlePlayPause();
      var currentFrameIdx = parseInt(this.id.split("_")[3]);
      timelapse.seekToFrame(currentFrameIdx);
      focusTimeTick(currentFrameIdx);
      isShowHoverEffect = false;
      $(event.target).removeClass("openHand").addClass("closedHand");
      // Track mouse
      $viewer.on("mousemove", trackMouseAndSlide);
      $(document).one("mouseup", function(event) {
        $(event.target).removeClass("closedHand").addClass("openHand");
        if (!originalIsPaused)
          timelapse.handlePlayPause();
        $viewer.off("mousemove", trackMouseAndSlide);
        isShowHoverEffect = true;
      });
    };

    var handleTimeTickMouseover = function(event) {
      if (isShowHoverEffect) {
        var currentFrameIdx = parseInt(this.id.split("_")[3]);
        if (timelapse.getCurrentFrameNumber() == currentFrameIdx) {
          $(event.target).removeClass("closedHand").addClass("openHand").attr("title", "Drag to go to a different point in time");
        } else {
          $(event.target).attr("title", "");
        }
        var $timeTickContainer = $(event.target).parent();
        var $timeTick = $timeTickContainer.children("#" + viewerDivId + " .timeTick");
        growTimeTick($timeTick);
        if (currentFrameIdx != 0 && currentFrameIdx != numFrames - 1) {
          $timeTickContainer.append($timeTextHover.text(captureTimes[currentFrameIdx]).stop(true, true).fadeIn(200));
        }
      } else {
        $(event.target).addClass("closedHand");
      }
    };

    var handleTimeTickMouseout = function(event) {
      $(event.target).removeClass("openHand closedHand");
      var $timeTickContainer = $(event.target).parent();
      var $timeTick = $timeTickContainer.children("#" + viewerDivId + " .timeTick");
      resetTimeTick($timeTick);
      $timeTextHover.fadeOut(50);
    };

    var growTimeTick = function($timeTick) {
      $timeTick.stop(true, true).animate({
        "margin-top": ((currentTimeTick_height - timeTickGrow_height) / 2) + "px",
        "width": timeTickGrow_width + "px",
        "height": timeTickGrow_height + "px"
      }, {
        duration: 100
      });
    };

    var resetTimeTick = function($timeTick) {
      $timeTick.stop(true, true).animate({
        "margin-top": (timeTick_height / 2) + "px",
        "width": timeTick_width + "px",
        "height": timeTick_height + "px"
      }, {
        duration: 50
      });
    };

    var trackMouseAndSlide = function(event) {
      var nowXpx = event.pageX - viewer_offset.left - sliderLeftMargin;
      var nowX = (nowXpx / sliderWidth) * 100;
      // Binary search
      var minFrameIdx = 0;
      var maxFrameIdx = timeTickX.length - 1;
      var targetFrameIdx = Math.round((minFrameIdx + maxFrameIdx) / 2);
      while (minFrameIdx != maxFrameIdx) {
        if (nowX <= timeTickX[targetFrameIdx])
          maxFrameIdx = targetFrameIdx;
        else {
          minFrameIdx = targetFrameIdx;
        }
        if (maxFrameIdx == minFrameIdx + 1) {
          if (timeTickX[maxFrameIdx] - nowX <= nowX - timeTickX[minFrameIdx]) {
            targetFrameIdx = maxFrameIdx;
          } else {
            targetFrameIdx = minFrameIdx;
          }
          break;
        }
      }
      if (timelapse.getCurrentFrameNumber() != targetFrameIdx) {
        timelapse.seekToFrame(targetFrameIdx);
        $("#" + viewerDivId + "_customTimeline_timeTickClickRegion_" + targetFrameIdx).focus();
      }
    };

    var createAnElement = function(elemType, elemClass, elemId) {
      var element = document.createElement(elemType);
      $(element).addClass(elemClass);
      element.id = elemId;
      return element;
    };

    var doCustomHelpOverlay = function() {
      $("#" + viewerDivId + " .customInstructions").fadeIn(200);

      if ($("#" + viewerDivId + " .playbackButton").hasClass('pause')) {
        timelapse.handlePlayPause();
        $("#" + viewerDivId + " .playbackButton").removeClass("pause").addClass("play from_help");
      }
    };

    var removeCustomHelpOverlay = function() {
      $("#" + viewerDivId + " .customInstructions").fadeOut(200);

      if ($("#" + viewerDivId + " .playbackButton").hasClass('from_help')) {
        timelapse.handlePlayPause();
        $("#" + viewerDivId + " .playbackButton").addClass("pause").removeClass("play from_help");
      }
    };

    var createCustomEditorModeToolBar = function() {
      var customEditorControl = $('<div class="customEditorControl"></div>');
      var customEditorModeToolbar = $('<div class="customEditorModeToolbar"></div>');
      customEditorControl.append(customEditorModeToolbar);
      $("#" + viewerDivId).append(customEditorControl);
      // Create play button
      customEditorModeToolbar.append('<button class="playStopTimewarp" title="Play or stop a time warp">Play</button>');
      $(".customEditorControl .playStopTimewarp").button({
        icons: {
          primary: "ui-icon-play"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().playStopSnaplapse();
      });
      // Create add button
      customEditorModeToolbar.append('<button class="addTimetag" title="Add a time tag">Add</button>');
      $("#" + viewerDivId + " .addTimetag").button({
        icons: {
          primary: "ui-icon-plus"
        },
        text: true
      }).click(function() {
        // The button will be enabled at the end of addSnaplapseKeyframeListItem() in snaplapseViewer
        $("#" + viewerDivId + " .addTimetag").button("option", "disabled", true);
        timelapse.getSnaplapse().getSnaplapseViewer().recordKeyframe();
      });
      // Create delete button
      customEditorModeToolbar.append('<button class="deleteTimetag" title="Delete a time tag">Del</button>');
      $("#" + viewerDivId + " .deleteTimetag").button({
        icons: {
          primary: "ui-icon-minus"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().deleteSelectedKeyframes();
      });
      // Create save button
      customEditorModeToolbar.append('<button class="saveTimewarp" title="Save a time warp">Save</button>');
      $("#" + viewerDivId + " .saveTimewarp").button({
        icons: {
          primary: "ui-icon-folder-collapsed"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().saveSnaplapse();
      });
      // Create load button
      customEditorModeToolbar.append('<button class="loadTimewarp" title="Load a time warp">Load</button>');
      $("#" + viewerDivId + " .loadTimewarp").button({
        icons: {
          primary: "ui-icon-folder-open"
        },
        text: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().showLoadSnaplapseWindow();
      });
      // Create new button
      customEditorModeToolbar.append('<button class="newTimewarp" title="Clear time warp">Clear</button>');
      $("#" + viewerDivId + " .newTimewarp").button({
        icons: {
          primary: "ui-icon-trash"
        },
        text: true
      }).click(function() {
        var confirmClearAlert = confirm("Are you sure you want to clear the timewarp?");
        if (!confirmClearAlert)
          return;
        timelapse.getSnaplapse().getSnaplapseViewer().loadNewSnaplapse(null);
        timelapse.handleEditorModeToolbarChange();
      });
      // Create global setting button
      customEditorModeToolbar.append('<button class="setTimewarp" title="Global settings">Settings</button>');
      $("#" + viewerDivId + " .setTimewarp").button({
        icons: {
          primary: "ui-icon-wrench"
        },
        text: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().showSetSnaplapseWindow();
      });
      // Create buttonset
      customEditorModeToolbar.buttonset();
      var customEditorModeToolbar_height = customEditorModeToolbar.height() + 5;
      // Set position
      $customControl.css("bottom", "+=" + customEditorModeToolbar_height + "px");
      // Set event listeners
      timelapse.getSnaplapse().addEventListener('play', function() {
        $customTimeline.stop(true, true).fadeOut(100);
        $("#" + viewerDivId + " .toggleSpeed").stop(true, true).fadeOut(100);
        $customHelpLabel.stop(true, true).fadeOut(100);
        $("#" + viewerDivId + " .googleLogo").css("bottom", "-=" + 50 + "px");
        $customPlay.stop(true, true).fadeOut(100);
        $timeText.css({
          "text-align": "center",
          "left": "-=" + 14 + "px",
          "padding-left": "12px"
        });
        timelapse.getSnaplapse().getSnaplapseViewer().moveDescriptionBox("down");
        $("#" + viewerDivId + " .toggleGoogleMapBtn").fadeOut(100);
        $("#" + viewerDivId + " .smallMapResizer").fadeOut(100);
      });
      timelapse.getSnaplapse().addEventListener('stop', function() {
        $customTimeline.stop(true, true).fadeIn(100);
        $("#" + viewerDivId + " .toggleSpeed").stop(true, true).fadeIn(100);
        $customHelpLabel.stop(true, true).fadeIn(100);
        $("#" + viewerDivId + " .googleLogo").css("bottom", "+=" + 50 + "px");
        $customPlay.stop(true, true).fadeIn(100);
        $timeText.css({
          "text-align": "right",
          "left": "+=" + 14 + "px",
          "padding-left": "0px"
        });
        timelapse.getSnaplapse().getSnaplapseViewer().moveDescriptionBox("up");
        $("#" + viewerDivId + " .toggleGoogleMapBtn").fadeIn(100);
        $("#" + viewerDivId + " .smallMapResizer").fadeIn(100);
      });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //
    var updateTimelineSlider = function(frameIdx) {
      if (frameIdx < 0 || frameIdx > numFrames - 1)
        return;
      $currentTimeTick.css("left", timeTickX[frameIdx] + "%");
      $timeText.text(captureTimes[frameIdx]);
    };
    this.updateTimelineSlider = updateTimelineSlider;

    var focusTimeTick = function(frameIdx) {
      $("#" + viewerDivId + "_customTimeline_timeTickClickRegion_" + frameIdx).focus();
    };
    this.focusTimeTick = focusTimeTick;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor code
    //
    createCustomControl();
    if (settings["composerDiv"]) {
      createCustomEditorModeToolBar();
    }
  };
  //end of org.gigapan.timelapse.CustomUI
})();
//end of (function() {
