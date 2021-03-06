// @license
// Redistribution and use in source and binary forms ...

/*
 Class for managing the default UI

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
// DEPENDECIES
//
if (!org.gigapan.timelapse.Timelapse) {
  var noTimelapseMsg = "The org.gigapan.timelapse.Timelapse library is required by org.gigapan.timelapse.DefaultUI";
  alert(noTimelapseMsg);
  throw new Error(noTimelapseMsg);
}

//
// CODE
//
(function() {
  org.gigapan.timelapse.DefaultUI = function(timelapse, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Class variables
    //
    var mode = "player";
    var viewerDivId = timelapse.getViewerDivId();
    var tmJSON = timelapse.getTmJSON();
    var panInterval;
    var translationSpeedConstant = 20;
    var $playbackButton = $("#" + viewerDivId + " .playbackButton");
    var $toolbar = $("#" + viewerDivId + " .toolbar");
    var $controls = $("#" + viewerDivId + " .controls");
    var $editorModeToolbar = $("#" + viewerDivId + " .editorModeToolbar");
    var $annotatorModeToolbar = $("#" + viewerDivId + " .annotatorModeToolbar");
    var toolbarHeight = $toolbar.outerHeight();
    var minViewportHeight = timelapse.getMinViewportHeight();
    var minViewportWidth = timelapse.getMinViewportWidth();
    var datasetType = timelapse.getDatasetType();

    var visualizer = timelapse.getVisualizer();
    var annotator = timelapse.getAnnotator();
    var videoset = timelapse.getVideoset();

    var showShareBtn = ( typeof (settings["showShareBtn"]) == "undefined") ? true : settings["showShareBtn"];
    var showHomeBtn = ( typeof (settings["showHomeBtn"]) == "undefined") ? true : settings["showHomeBtn"];
    var showMainControls = ( typeof (settings["showMainControls"]) == "undefined") ? true : settings["showMainControls"];
    var showZoomControls = ( typeof (settings["showZoomControls"]) == "undefined") ? true : settings["showZoomControls"];
    var showPanControls = ( typeof (settings["showPanControls"]) == "undefined") ? true : settings["showPanControls"];
    var showFullScreenBtn = ( typeof (settings["showFullScreenBtn"]) == "undefined") ? true : settings["showFullScreenBtn"];
    var startEditorFromPresentationMode = ( typeof (settings["startEditorFromPresentationMode"]) == "undefined") ? false : settings["startEditorFromPresentationMode"];
    var showEditorModeButton = ( typeof (settings["showEditorModeButton"]) == "undefined") ? true : settings["showEditorModeButton"];
    var showLogoOnDefaultUI = ( typeof (settings["showLogoOnDefaultUI"]) == "undefined") ? true : settings["showLogoOnDefaultUI"];
    var showEditorOnLoad = ( typeof (settings["showEditorOnLoad"]) == "undefined") ? false : settings["showEditorOnLoad"];
    var editorEnabled = timelapse.getEditorEnabled();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //

    //create the toolbar
    var createToolbar = function() {
      createPlayerModeToolbar();
      createSideToolBar();
      // Play button
      $playbackButton.button({
        icons: {
          secondary: "ui-icon-custom-play"
        },
        text: false
      }).on("click", function() {
        if ($(this).hasClass("from_help"))
          return;
        timelapse.handlePlayPause();
      });
      // Create fullscreen button
      if (showFullScreenBtn) {
        var $fullScreenBtnContainer = $("#" + viewerDivId + " .fullScreenBtnContainer");
        $fullScreenBtnContainer.append('<input type="checkbox" class="fullscreenCheckbox"/>');
        $fullScreenBtnContainer.append('<label class="fullscreenLabel" title="Toggle fullscreen"></label>');
        var $fullscreenCheckbox = $("#" + viewerDivId + " .fullscreenCheckbox");
        $fullscreenCheckbox.attr("id", viewerDivId + "_fullscreenCheckbox");
        $("#" + viewerDivId + " .fullscreenLabel").attr("for", viewerDivId + "_fullscreenCheckbox");
        $fullscreenCheckbox.button({
          icons: {
            primary: "ui-icon-arrow-4-diag"
          },
          text: false
        }).change(function() {
          if ($fullscreenCheckbox.is(":checked"))
            timelapse.fullScreen(true);
          else
            timelapse.fullScreen(false);
        });
      }
      // Create mode switch button
      createModeSwitchButton();
      if (settings["composerDiv"] || settings["annotatorDiv"]) {
        if (settings["composerDiv"])
          createEditorModeToolbar();
        if (settings["annotatorDiv"])
          createAnnotatorModeToolbar();
      }

      // Layers for a dataset
      if (tmJSON["layers"]) {
        $("#" + viewerDivId + " .layerSlider").show();
        populateLayers();
        $("#" + viewerDivId + " .layerSlider .jCarouselLite").jCarouselLite({
          btnNext: "#" + viewerDivId + " .layerSlider .next",
          btnPrev: "#" + viewerDivId + " .layerSlider .prev",
          circular: true,
          visible: 3.5
        });
      }
      if (showEditorOnLoad && editorEnabled && datasetType == undefined)
        $("#" + viewerDivId + " .viewerModeCheckbox").trigger("click");
    };

    var createPanControl = function() {
      var $pan = $("#" + viewerDivId + " .pan");
      // Create pan left button
      $pan.append('<div class="panLeft"></div>');
      $("#" + viewerDivId + " .panLeft").button({
        icons: {
          primary: "ui-icon-triangle-1-w"
        },
        text: false
      }).position({
        "my": "left center",
        "at": "left center",
        "of": $("#" + viewerDivId + " .panLeft").parent()
      }).on("mousedown", function() {
        panInterval = setInterval(function() {
          var offset = {
            x: -translationSpeedConstant,
            y: 0
          };
          timelapse.setTargetView(undefined, undefined, offset);
        }, 50);
        $(document).one("mouseup", function() {
          clearInterval(panInterval);
        });
      });
      // Create pan left button
      $pan.append('<div class="panRight"></div>');
      $("#" + viewerDivId + " .panRight").button({
        icons: {
          primary: "ui-icon-triangle-1-e"
        },
        text: false
      }).position({
        "my": "right center",
        "at": "right center",
        "of": $("#" + viewerDivId + " .panLeft").parent()
      }).on("mousedown", function() {
        panInterval = setInterval(function() {
          var offset = {
            x: translationSpeedConstant,
            y: 0
          };
          timelapse.setTargetView(undefined, undefined, offset);
        }, 50);
        $(document).one("mouseup", function() {
          clearInterval(panInterval);
        });
      });
      // Create pan left button
      $pan.append('<div class="panUp"></div>');
      $("#" + viewerDivId + " .panUp").button({
        icons: {
          primary: "ui-icon-triangle-1-n"
        },
        text: false
      }).position({
        "my": "center top",
        "at": "center top",
        "of": $("#" + viewerDivId + " .panLeft").parent()
      }).on("mousedown", function() {
        panInterval = setInterval(function() {
          var offset = {
            x: 0,
            y: -translationSpeedConstant
          };
          timelapse.setTargetView(undefined, undefined, offset);
        }, 50);
        $(document).one("mouseup", function() {
          clearInterval(panInterval);
        });
      });
      // Create pan left button
      $pan.append('<div class="panDown"></div>');
      $("#" + viewerDivId + " .panDown").button({
        icons: {
          primary: "ui-icon-triangle-1-s"
        },
        text: false
      }).position({
        "my": "center bottom",
        "at": "center bottom",
        "of": $("#" + viewerDivId + " .panLeft").parent()
      }).on("mousedown", function() {
        panInterval = setInterval(function() {
          var offset = {
            x: 0,
            y: translationSpeedConstant
          };
          timelapse.setTargetView(undefined, undefined, offset);
        }, 50);
        $(document).one("mouseup", function() {
          clearInterval(panInterval);
        });
      });
    };

    var createZoomControl = function() {
      var intervalId;
      var $zoom = $("#" + viewerDivId + " .zoom");
      // Create zoom in button
      $zoom.append('<button class="zoomin" title="Zoom in"></button>');
      $("#" + viewerDivId + " .zoomin").button({
        icons: {
          primary: "ui-icon-plus"
        },
        text: false
      }).mousedown(function() {
        intervalId = setInterval(function() {
          zoomIn();
        }, 50);
      }).click(function() {
        zoomIn();
      }).mouseup(function() {
        clearInterval(intervalId);
      }).mouseout(function() {
        clearInterval(intervalId);
      });
      // Create zoom slider
      createZoomSlider($zoom);
      // Create zoom out button
      $zoom.append('<button class="zoomout" title="Zoom out"></button>');
      $("#" + viewerDivId + " .zoomout").button({
        icons: {
          primary: "ui-icon-minus"
        },
        text: false
      }).mousedown(function() {
        intervalId = setInterval(function() {
          zoomOut();
        }, 50);
      }).click(function() {
        zoomOut();
      }).mouseup(function() {
        clearInterval(intervalId);
      }).mouseout(function() {
        clearInterval(intervalId);
      });
      // Create zoom all button
      $zoom.append('<button class="zoomall" title="Home"></button>');
      $("#" + viewerDivId + " .zoomall").button({
        icons: {
          primary: "ui-icon-home"
        },
        text: false
      }).click(function() {
        timelapse.warpTo(timelapse.homeView());
      });
    };

    var createSideToolBar = function() {
      createPanControl();
      createZoomControl();
      var $tools = $("#" + viewerDivId + " .tools");
      // Create hide annotation button
      if (settings["annotatorDiv"]) {
        $tools.append('<input type="checkbox" class="hideAnnotationCheckbox"/>');
        $tools.append('<label class="hideAnnotationLabel" title="Toggle hiding annotations">Hide</label>');
        var hideAnnotationCheckbox = $("#" + viewerDivId + " .hideAnnotationCheckbox");
        hideAnnotationCheckbox.attr("id", viewerDivId + "_hideAnnotationCheckbox");
        $("#" + viewerDivId + " .hideAnnotationLabel").attr("for", viewerDivId + "_hideAnnotationCheckbox");
        hideAnnotationCheckbox.button({
          icons: {
            primary: "ui-icon-tag"
          },
          text: false
        }).change(function() {
          if (hideAnnotationCheckbox.is(":checked")) {
            annotator.getAnnotationLayer().hide();
          } else {
            annotator.getAnnotationLayer().show();
            annotator.getAnnotationLayer().draw();
          }
        });
      }
    };

    // Create the player mode toolbar
    var createPlayerModeToolbar = function() {
      // Create share button
      if (showShareBtn) {
        $("#" + viewerDivId + " .share").button({
          icons: {
            primary: "ui-icon-person"
          },
          text: true
        }).click(function() {
          var shareViewDialog = $("#" + viewerDivId + " .shareView");
          if (shareViewDialog.dialog("isOpen"))
            shareViewDialog.dialog("close");
          else
            shareView();
        });
      }
      // Share view window
      $("#" + viewerDivId + " .shareView").dialog({
        resizable: false,
        autoOpen: false,
        width: 632,
        height: 95,
        create: function() {
          $(this).parents("#" + viewerDivId + " .ui-dialog").css({
            'border': '1px solid #000'
          });
        }
      }).parent().appendTo($("#" + viewerDivId));
      // Create playbackSpeed menu and button
      createPlaybackSpeedMenu();
      var $playbackSpeed = $("#" + viewerDivId + " .playbackSpeed");
      var $playbackSpeedOptions = $("#" + viewerDivId + " .playbackSpeedOptions");
      $playbackSpeed.button({
        icons: {
          secondary: "ui-icon-triangle-1-s"
        },
        text: true
      }).click(function() {
        if ($playbackSpeedOptions.is(":visible")) {
          $playbackSpeedOptions.hide();
        } else {
          $playbackSpeedOptions.show().position({
            my: "center bottom",
            at: "center top",
            of: $playbackSpeed
          });
          $(document).one("mouseup", function(e) {
            var targetGroup = $(e.target).parents().addBack();
            if (!targetGroup.is(".playbackSpeed"))
              $playbackSpeedOptions.hide();
          });
        }
      });
      // Create help button
      var helpPlayerCheckbox = $("#" + viewerDivId + " .helpPlayerCheckbox");
      helpPlayerCheckbox.attr("id", viewerDivId + "_helpPlayerCheckbox");
      var $helpPlayerLabel = $("#" + viewerDivId + " .helpPlayerLabel");
      $helpPlayerLabel.attr("for", viewerDivId + "_helpPlayerCheckbox");
      helpPlayerCheckbox.button({
        icons: {
          primary: "ui-icon-help"
        },
        text: true
      }).change(function() {
        if (helpPlayerCheckbox.is(":checked")) {
          doHelpOverlay();
          $(document).one("mouseup", function(e) {
            if ($helpPlayerLabel.has(e.target).length == 0)
              helpPlayerCheckbox.prop("checked", false).button("refresh").change();
          });
        } else {
          removeHelpOverlay();
        }
      });
    };

    // Create the editor mode toolbar
    var createEditorModeToolbar = function() {
      var $editorModeToolbar = $("#" + viewerDivId + " .editorModeToolbar");
      // Create add button
      $editorModeToolbar.append('<button class="addTimetag" title="Add a keyframe">Add</button>');
      $("#" + viewerDivId + " .addTimetag").button({
        icons: {
          primary: "ui-icon-plus"
        },
        text: true,
        disabled: true
      }).click(function() {
        // The button will be enabled at the end of addSnaplapseKeyframeListItem() in snaplapseViewer
        $("#" + viewerDivId + " .addTimetag").button("option", "disabled", true);
        timelapse.getSnaplapse().getSnaplapseViewer().recordKeyframe();
      });
      // Create save button
      $editorModeToolbar.append('<button class="saveTimewarp" title="Share a tour">Share</button>');
      $("#" + viewerDivId + " .saveTimewarp").button({
        icons: {
          primary: "ui-icon-person"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().saveSnaplapse();
      });
      // Create load button
      $editorModeToolbar.append('<button class="loadTimewarp" title="Load a tour">Load</button>');
      $("#" + viewerDivId + " .loadTimewarp").button({
        icons: {
          primary: "ui-icon-folder-open"
        },
        text: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().showLoadSnaplapseWindow();
      });
      // Create delete button
      $editorModeToolbar.append('<button class="deleteTimetag" title="Delete a keyframe">Del</button>');
      $("#" + viewerDivId + " .deleteTimetag").button({
        icons: {
          primary: "ui-icon-minus"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().deleteSelectedKeyframes();
      });
      // Create new button
      $editorModeToolbar.append('<button class="newTimewarp" title="Remove all keyframes">Clear</button>');
      $("#" + viewerDivId + " .newTimewarp").button({
        icons: {
          primary: "ui-icon-trash"
        },
        text: true
      }).click(function() {
        var confirmClearAlert = confirm("Are you sure you want to delete all keyframes?");
        if (!confirmClearAlert)
          return;
        timelapse.getSnaplapse().getSnaplapseViewer().loadNewSnaplapse(null);
        handleEditorModeToolbarChange();
      });
      // Create play button
      $editorModeToolbar.append('<button class="playStopTimewarp" title="Play or stop a tour">Play Tour</button>');
      $("#" + viewerDivId + " .playStopTimewarp").button({
        icons: {
          primary: "ui-icon-play"
        },
        text: true,
        disabled: true
      }).click(function() {
        timelapse.getSnaplapse().getSnaplapseViewer().playStopSnaplapse();
      });
      // Create mode toggle button and options
      if (showEditorModeButton) {
        // Populate the dropdown
        var editorModeOptions = "";
        editorModeOptions += '<li><a href="javascript:void(0);">' + getEditorModeText("presentation") + '</a></li>';
        editorModeOptions += '<li><a href="javascript:void(0);">' + getEditorModeText("tour") + '</a></li>';
        var $editorModeOptions = $("#" + viewerDivId + " .editorModeOptions").append(editorModeOptions);
        // Create button
        $("#" + viewerDivId + " .toggleMode").button({
          icons: {
            secondary: "ui-icon-triangle-1-s"
          },
          text: true
        }).click(function() {
          if ($editorModeOptions.is(":visible")) {
            $editorModeOptions.hide();
          } else {
            $editorModeOptions.show().position({
              my: "center top",
              at: "center bottom",
              of: $(this)
            });
            $(document).one("mouseup", function(e) {
              var targetGroup = $(e.target).parents().addBack();
              if (!targetGroup.is(".toggleMode"))
                $editorModeOptions.hide();
            });
          }
        });
        if (startEditorFromPresentationMode)
          $("#" + viewerDivId + " .toggleMode .ui-button-text").text(getEditorModeText("presentation"));
        else
          $("#" + viewerDivId + " .toggleMode .ui-button-text").text(getEditorModeText("tour"));
        $editorModeOptions.hide().menu();
        // Set the dropdown
        $("#" + viewerDivId + " .editorModeOptions li a").click(function() {
          var selectedModeTxt = $(this).text();
          if (selectedModeTxt == getEditorModeText("tour"))
            setPresentationMode(false);
          else if (selectedModeTxt == getEditorModeText("presentation"))
            setPresentationMode(true);
          $("#" + viewerDivId + " .toggleMode span").text(selectedModeTxt);
        });
      } else {
        $("#" + viewerDivId + " .toggleMode").remove();
        $("#" + viewerDivId + " .editorModeOptions").remove();
      }
    };

    var getEditorModeText = function(mode) {
      if (mode == "tour")
        return "Tour Editor";
      else if (mode == "presentation")
        return "Presentation Editor";
    };

    var setPresentationMode = function(status) {
      var snaplapseViewer = timelapse.getSnaplapse().getSnaplapseViewer();
      if (status == true) {
        startEditorFromPresentationMode = true;
        $("#" + viewerDivId + " .toolbar .playStopTimewarp").hide();
        if (snaplapseViewer)
          snaplapseViewer.setPresentationMode(true);
      } else {
        startEditorFromPresentationMode = false;
        $("#" + viewerDivId + " .toolbar .playStopTimewarp").show();
        if (snaplapseViewer)
          snaplapseViewer.setPresentationMode(false);
      }
    };

    // Hide the area for editing the timewarp
    var hideEditorArea = function() {
      $("#" + settings["composerDiv"]).hide();
    };

    // Show the area for editing the timewarp
    var showEditorArea = function() {
      $("#" + settings["composerDiv"]).show();
    };

    // Create the annotator toolbar
    var createAnnotatorModeToolbar = function() {
      var $annotatorModeToolbar = $("#" + viewerDivId + " .annotatorModeToolbar");
      // Create add button
      $annotatorModeToolbar.append('<input type="checkbox" class="addAnnotationCheckbox"/>');
      $annotatorModeToolbar.append('<label class="addAnnotationLabel" title="Enable/Disable adding annotations (CTRL key or COMMAND key)">Add</label>');
      var $addAnnotationCheckbox = $("#" + viewerDivId + " .addAnnotationCheckbox");
      $addAnnotationCheckbox.attr("id", viewerDivId + "_addAnnotationCheckbox");
      $("#" + viewerDivId + " .addAnnotationLabel").attr("for", viewerDivId + "_addAnnotationCheckbox");
      $addAnnotationCheckbox.button({
        icons: {
          primary: "ui-icon-plus"
        },
        text: true
      }).change(function() {
        var $hideAnnotationCheckbox = $("#" + viewerDivId + " .hideAnnotationCheckbox");
        if ($hideAnnotationCheckbox.is(":checked")) {
          $hideAnnotationCheckbox.prop("checked", false).button("refresh").change();
        }
        if ($addAnnotationCheckbox.is(":checked")) {
          annotator.setCanAddAnnotation(true);
          if (!$("#" + viewerDivId + " .moveAnnotationCheckbox").is(":checked"))
            $hideAnnotationCheckbox.button("option", "disabled", true);
        } else {
          annotator.setCanAddAnnotation(false);
          if (!$("#" + viewerDivId + " .moveAnnotationCheckbox").is(":checked"))
            $hideAnnotationCheckbox.button("option", "disabled", false);
        }
      });
      // Create move button
      $annotatorModeToolbar.append('<input type="checkbox" class="moveAnnotationCheckbox"/>');
      $annotatorModeToolbar.append('<label class="moveAnnotationLabel" title="Enable/Disable moving annotations (ALT key)">Move</label>');
      var $moveAnnotationCheckbox = $("#" + viewerDivId + " .moveAnnotationCheckbox");
      $moveAnnotationCheckbox.attr("id", viewerDivId + "_moveAnnotationCheckbox");
      $("#" + viewerDivId + " .moveAnnotationLabel").attr("for", viewerDivId + "_moveAnnotationCheckbox");
      $moveAnnotationCheckbox.button({
        icons: {
          primary: "ui-icon-arrow-4"
        },
        text: true,
        disabled: true
      }).change(function() {
        var $hideAnnotationCheckbox = $("#" + viewerDivId + " .hideAnnotationCheckbox");
        var $addAnnotationCheckbox = $("#" + viewerDivId + " .addAnnotationCheckbox");
        if ($hideAnnotationCheckbox.is(":checked")) {
          $hideAnnotationCheckbox.prop("checked", false).button("refresh").change();
        }
        if ($moveAnnotationCheckbox.is(":checked")) {
          annotator.setCanMoveAnnotation(true);
          if (!$addAnnotationCheckbox.is(":checked"))
            $hideAnnotationCheckbox.button("option", "disabled", true);
        } else {
          annotator.setCanMoveAnnotation(false);
          if (!$addAnnotationCheckbox.is(":checked"))
            $hideAnnotationCheckbox.button("option", "disabled", false);
        }
      });
      // Create delete button
      $annotatorModeToolbar.append('<button class="deleteAnnotation" title="Delete an annotation">Del</button>');
      $("#" + viewerDivId + " .deleteAnnotation").button({
        icons: {
          primary: "ui-icon-minus"
        },
        text: true,
        disabled: true
      }).click(function() {
        annotator.deleteSelectedAnnotations();
        handleAnnotatorModeToolbarChange();
      });
      // Create save button
      $annotatorModeToolbar.append('<button class="saveAnnotation" title="Save annotations">Save</button>');
      $("#" + viewerDivId + " .saveAnnotation").button({
        icons: {
          primary: "ui-icon-folder-collapsed"
        },
        text: true,
        disabled: true
      }).click(function() {
        annotator.showSaveAnnotatorWindow();
      });
      // Create load button
      $annotatorModeToolbar.append('<button class="loadAnnotation" title="Load annotations">Load</button>');
      $("#" + viewerDivId + " .loadAnnotation").button({
        icons: {
          primary: "ui-icon-folder-open"
        },
        text: true
      }).click(function() {
        annotator.showLoadAnnotatorWindow();
      });
      // Create clear button
      $annotatorModeToolbar.append('<button class="clearAnnotation" title="Clear all annotations">Clear</button>');
      $("#" + viewerDivId + " .clearAnnotation").button({
        icons: {
          primary: "ui-icon-trash"
        },
        text: true,
        disabled: true
      }).click(function() {
        var confirmClearAlert = confirm("Are you sure you want to clear all annotations?");
        if (!confirmClearAlert)
          return;
        annotator.clearAnnotations();
      });
      // Create buttonset
      $annotatorModeToolbar.buttonset();
    };

    // Hide the area for annotation
    var hideAnnotatorArea = function() {
      if (annotator != undefined) {
        $("#" + settings["annotatorDiv"]).hide();
      }
    };

    // Show the area for annotation
    var showAnnotatorArea = function() {
      if (annotator != undefined) {
        $("#" + settings["annotatorDiv"]).show();
      }
    };

    // Change the UI according to different modes
    var setMode = function(newMode) {
      var snaplapse = timelapse.getSnaplapse();
      var fullScreen = timelapse.isFullScreen();
      var smallGoogleMap = timelapse.getSmallGoogleMap();
      var enableSmallGoogleMap = timelapse.isSmallGoogleMapEnable();
      var panoVideo, snaplapseViewer;
      if (visualizer)
        panoVideo = visualizer.getPanoVideo();
      if (snaplapse)
        snaplapseViewer = timelapse.getSnaplapse().getSnaplapseViewer();

      if (newMode == "player") {
        mode = newMode;
        $annotatorModeToolbar.hide();
        $editorModeToolbar.hide();
        $toolbar.hide();
        $controls.css("bottom", "0px");
        $("#" + viewerDivId + " .fullscreenCheckbox").prop("checked", fullScreen).button("refresh");
        $("#" + viewerDivId + " .moveAnnotationCheckbox").prop("checked", false).button("refresh").change();
        if (!fullScreen) {
          hideAnnotatorArea();
          hideEditorArea();
        }
        if (snaplapse) {
          snaplapseViewer.hideAnnotationBubble();
        }
        if (smallGoogleMap && enableSmallGoogleMap == true) {
          smallGoogleMap.drawSmallMapBoxColor({
            r: 219,
            g: 48,
            b: 48
          });
        }
        if (mode == "player" && panoVideo != undefined) {
          panoVideo.pause();
        }
      } else if (newMode == "editor") {
        mode = newMode;
        $toolbar.show();
        $controls.css("bottom", toolbarHeight + "px");
        $annotatorModeToolbar.hide();
        $editorModeToolbar.show();
        $("#" + viewerDivId + " .fullscreenCheckbox").prop("checked", fullScreen).button("refresh");
        $("#" + viewerDivId + " .moveAnnotationCheckbox").prop("checked", false).button("refresh").change();
        if (!fullScreen) {
          hideAnnotatorArea();
          showEditorArea();
          enableEditorToolbarButtons();
          handleEditorModeToolbarChange();
          timelapse.seek_panoVideo(videoset.getCurrentTime());
          if (!videoset.isPaused() && panoVideo) {
            panoVideo.play();
          }
        } else {
          disableEditorToolbarButtons();
        }
        timelapse.updateTagInfo_locationData();
      } else if (newMode == "annotator") {
        mode = newMode;
        $("#" + viewerDivId + " .controls").show();
        $("#" + viewerDivId + " .editorModeToolbar").hide();
        $("#" + viewerDivId + " .annotatorModeToolbar").show();
        $("#" + viewerDivId + " .fullscreenCheckbox").prop("checked", fullScreen).button("refresh");
        if (!fullScreen) {
          hideEditorArea();
          showAnnotatorArea();
          timelapse.seek_panoVideo(videoset.getCurrentTime());
          if (!videoset.isPaused() && panoVideo) {
            panoVideo.play();
          }
        }
        if (snaplapse) {
          snaplapseViewer.hideAnnotationBubble();
        }
        timelapse.updateTagInfo_locationData();
      }
      if (visualizer)
        visualizer.setMode(mode, fullScreen);
      if (settings["viewportGeometry"] && settings["viewportGeometry"]["max"])
        fitToWindow();
    };

    // Create the mode switching button
    var createModeSwitchButton = function() {
      var $viewerModeBtn = $("#" + viewerDivId + " .viewerModeBtn");
      var $viewerModeCheckbox = $("#" + viewerDivId + " .viewerModeCheckbox");
      if (editorEnabled) {
        $viewerModeBtn.attr("id", viewerDivId + "_viewerModeBtn");
        $viewerModeCheckbox.attr("id", viewerDivId + "_viewerModeCheckbox");
        $viewerModeBtn.attr("for", viewerDivId + "_viewerModeCheckbox");
        $viewerModeCheckbox.button({
          icons: {
            primary: "ui-icon-note"
          },
          text: true
        }).click(function() {
          if ($viewerModeCheckbox.is(":checked"))
            setMode("editor");
          else
            setMode("player");
        });
      } else {
        $viewerModeBtn.remove();
        $viewerModeCheckbox.remove();
      }
    };

    var shareView = function() {
      var $shareUrl = $("#" + viewerDivId + " .shareurl");
      var parentUrl = "";
      if (window.top === window.self) {
        // no iframe
        parentUrl = window.location.href.split("#")[0];
      } else {
        // inside iframe
        parentUrl = document.referrer.split("#")[0];
      }
      $shareUrl.val(parentUrl + timelapse.getShareView()).focus(function() {
        $(this).select();
      }).click(function() {
        $(this).select();
      }).mouseup(function(e) {
        e.preventDefault();
      });
      $("#" + viewerDivId + " .shareView").dialog("open");
    };

    function createPlaybackSpeedMenu() {
      // Populate playback speed dropdown (the function is in timelapseViewer.js)
      populateSpeedPlaybackChoices();

      var $playbackSpeedOptionsSelection = $("#" + viewerDivId + " .playbackSpeedOptions li a");
      $playbackSpeedOptionsSelection.bind("click", function() {
        timelapse.changePlaybackRate(this);
      });
      $("#" + viewerDivId + " .playbackSpeedOptions").hide().menu();

      timelapse.addPlaybackRateChangeListener(function(rate, fromUI) {
        var speedChoice;
        // Set the playback speed dropdown
        var $playbackSpeedOptionsSelection = $("#" + viewerDivId + " .playbackSpeedOptions li a");
        $playbackSpeedOptionsSelection.each(function() {
          speedChoice = $(this);
          if (speedChoice.attr("data-speed") == rate) {
            return false;
          }
        });
        $("#" + viewerDivId + " .playbackSpeed span").text(speedChoice.text());
      });
    }

    function populateSpeedPlaybackChoices() {
      var choices = [];

      // Only show backward playback options for non-split video datasets
      // Backward playback - emulated since Chrome/Safari doesn't properly handle it
      if ( typeof (timelapse.getDatasetJSON()["frames_per_fragment"]) == "undefined") {
        choices.push({
          "name": "Backward, Full Speed",
          "value": -1.0
        }, {
          "name": "Backward, &#189; Speed",
          "value": -0.5
        }, {
          "name": "Backward, &#188; Speed",
          "value": -0.25
        });
      }

      // Forward playback - 1/4 speed is emulated on Safari but we still give the option
      choices.push({
        "name": "Forward, &#188; Speed",
        "value": 0.25
      }, {
        "name": "Forward, &#189; Speed",
        "value": 0.5
      }, {
        "name": "Forward, Full Speed",
        "value": 1.0
      });
      var html = "";
      var numChoices = choices.length;
      for (var i = 0; i < numChoices; i++) {
        html += '<li><a href="javascript:void(0);" data-speed=\'' + choices[i]["value"] + '\'>' + choices[i]["name"] + '</a></li>';
      }
      $("#" + viewerDivId + " .playbackSpeedOptions").append(html);
    }

    function doHelpOverlay() {
      $("#" + viewerDivId + " .instructions").fadeIn(200);

      if ($playbackButton.hasClass('pause')) {
        timelapse.handlePlayPause();
        $playbackButton.removeClass("pause").addClass("play from_help");
      }
    }

    function removeHelpOverlay() {
      $("#" + viewerDivId + " .instructions").fadeOut(200);

      if ($playbackButton.hasClass('from_help')) {
        timelapse.handlePlayPause();
        $playbackButton.addClass("pause").removeClass("play from_help");
      }
    }

    function populateLayers() {
      var numLayers = tmJSON["layers"].length;
      var html = "";
      for (var i = 0; i < numLayers; i++) {
        html += "<li data-index=" + i + "><img src=\"" + tmJSON["layers"][i]["tn-path"] + "\" " + "alt='layer' width='45' height='45' ><br/><span style='font-size:small; text-align:center; display:block; margin: -5px 0px 0px 0px !important;'>" + tmJSON["layers"][i]["description"] + "</span></li>";
      }
      $("#" + viewerDivId + " .layerChoices").append(html);

      $("#" + viewerDivId + " .layerChoices li").bind("click", function() {
        timelapse.switchLayer($(this).attr("data-index"));
      });
    }

    function zoomIn() {
      var val = Math.min($("#" + viewerDivId + " .zoomSlider").slider("value") + 0.01, 1);
      timelapse.setScaleFromSlider(val);
    }

    function zoomOut() {
      var val = Math.max($("#" + viewerDivId + " .zoomSlider").slider("value") - 0.01, 0);
      timelapse.setScaleFromSlider(val);
    }

    function createZoomSlider($zoom) {
      $zoom.append('<div class="zoomSlider" title="Click to zoom"></div>');
      var $zoomSlider = $("#" + viewerDivId + " .zoomSlider");
      $zoomSlider.slider({
        orientation: "vertical",
        value: timelapse.viewScaleToZoomSlider(timelapse.getDefaultScale()),
        min: 0,
        max: 1,
        step: 0.01,
        slide: function(e, ui) {
          timelapse.setScaleFromSlider(ui.value);
        }
      }).removeClass("ui-corner-all");

      $zoomSlider.bind("mousedown", function() {
        if (window && (window.self !== window.top)) {
          $("body").one("mouseleave", function(event) {
            $zoomSlider.trigger("mouseup");
          });
        }
      });

      $("#" + viewerDivId + " .zoomSlider .ui-slider-handle").attr("title", "Drag to zoom");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //
    this.getMode = function() {
      return mode;
    };

    this.isShowMainControls = function() {
      return showMainControls;
    };

    // Change the status of the editor toolbar
    var handleAnnotatorModeToolbarChange = function() {
      var $Annotationtems = $("#" + settings["annotatorDiv"] + " .annotation_list > .ui-selectee");
      var numItems = $Annotationtems.size();
      if (numItems > 0) {
        $("#" + viewerDivId + " .deleteAnnotation").button("option", "disabled", false);
        $("#" + viewerDivId + " .saveAnnotation").button("option", "disabled", false);
        $("#" + viewerDivId + " .clearAnnotation").button("option", "disabled", false);
        $("#" + viewerDivId + " .moveAnnotationCheckbox").button("option", "disabled", false);
      } else {
        $("#" + viewerDivId + " .deleteAnnotation").button("option", "disabled", true);
        $("#" + viewerDivId + " .saveAnnotation").button("option", "disabled", true);
        $("#" + viewerDivId + " .clearAnnotation").button("option", "disabled", true);
        $("#" + viewerDivId + " .moveAnnotationCheckbox").button("option", "disabled", true);
      }
    };
    this.handleAnnotatorModeToolbarChange = handleAnnotatorModeToolbarChange;

    // Change the status of the editor toolbar
    var handleEditorModeToolbarChange = function() {
      var $keyframeItems = $("#" + settings["composerDiv"] + " .snaplapse_keyframe_list").children();
      var numItems = $keyframeItems.size();
      if (numItems >= 1) {
        $("#" + viewerDivId + " .deleteTimetag").button("option", "disabled", false);
        $("#" + viewerDivId + " .saveTimewarp").button("option", "disabled", false);
        $("#" + viewerDivId + " .newTimewarp").button("option", "disabled", false);
      } else {
        $("#" + viewerDivId + " .deleteTimetag").button("option", "disabled", true);
        $("#" + viewerDivId + " .saveTimewarp").button("option", "disabled", true);
        $("#" + viewerDivId + " .newTimewarp").button("option", "disabled", true);
      }
      if (numItems >= 2) {
        $("#" + viewerDivId + " .playStopTimewarp").button("option", "disabled", false);
      } else {
        $("#" + viewerDivId + " .playStopTimewarp").button("option", "disabled", true);
      }
    };
    this.handleEditorModeToolbarChange = handleEditorModeToolbarChange;

    var handleFitToWindowChange = function(isFitToWindow) {
      var panoVideo;
      if (visualizer)
        panoVideo = visualizer.getPanoVideo();
      if (isFitToWindow) {
        if (mode == "editor") {
          if (panoVideo) {
            panoVideo.pause();
          }
        } else if (mode == "annotator") {
          if (panoVideo)
            panoVideo.pause();
        }
      } else {
        if (mode == "editor") {
          if (!timelapse.getSnaplapse().isPlaying()) {
            enableEditorToolbarButtons();
            handleEditorModeToolbarChange();
          }
          timelapse.seek_panoVideo(videoset.getCurrentTime());
          if (!videoset.isPaused() && panoVideo) {
            panoVideo.play();
          }
          showEditorArea();
        } else if (mode == "annotator") {
          showAnnotatorArea();
          timelapse.seek_panoVideo(videoset.getCurrentTime());
          if (!videoset.isPaused() && panoVideo)
            panoVideo.play();
        }
      }
      if (visualizer)
        visualizer.setMode(mode, isFitToWindow);
    };
    this.handleFitToWindowChange = handleFitToWindowChange;

    var _toggleMainControls = function() {
      showMainControls = !showMainControls;
      $("#" + viewerDivId + " .controls").toggle();
      $("#" + viewerDivId + " .timelineSliderFiller").toggle();
      fitToWindow();
    };
    this.toggleMainControls = _toggleMainControls;

    var _toggleZoomControls = function() {
      showZoomControls = !showZoomControls;
      $("#" + viewerDivId + " .zoom").toggle();
    };
    this.toggleZoomControls = _toggleZoomControls;

    var _togglePanControls = function() {
      showPanControls = !showPanControls;
      $("#" + viewerDivId + " .pan").toggle();
    };
    this.togglePanControls = _togglePanControls;

    // Disable buttons in editor full screen mode
    var disableEditorToolbarButtons = function() {
      $("#" + viewerDivId + " .addTimetag").button("option", "disabled", true);
      $("#" + viewerDivId + " .deleteTimetag").button("option", "disabled", true);
      $("#" + viewerDivId + " .saveTimewarp").button("option", "disabled", true);
      $("#" + viewerDivId + " .loadTimewarp").button("option", "disabled", true);
      $("#" + viewerDivId + " .newTimewarp").button("option", "disabled", true);
      $("#" + viewerDivId + " .setTimewarp").button("option", "disabled", true);
      if (showEditorModeButton)
        $("#" + viewerDivId + " .toggleMode").button("option", "disabled", true);
    };
    this.disableEditorToolbarButtons = disableEditorToolbarButtons;

    // Enable buttons from editor full screen mode
    var enableEditorToolbarButtons = function() {
      $("#" + viewerDivId + " .addTimetag").button("option", "disabled", false);
      $("#" + viewerDivId + " .deleteTimetag").button("option", "disabled", false);
      $("#" + viewerDivId + " .saveTimewarp").button("option", "disabled", false);
      $("#" + viewerDivId + " .loadTimewarp").button("option", "disabled", false);
      $("#" + viewerDivId + " .newTimewarp").button("option", "disabled", false);
      $("#" + viewerDivId + " .setTimewarp").button("option", "disabled", false);
      if (showEditorModeButton)
        $("#" + viewerDivId + " .toggleMode").button("option", "disabled", false);
    };
    this.enableEditorToolbarButtons = enableEditorToolbarButtons;

    var fitToWindow = function() {
      var newViewportWidth, newViewportHeight;
      newViewportWidth = window.innerWidth - 2;
      // Extra 2px for the borders
      newViewportHeight = window.innerHeight;
      // Extra 1px for the borders
      var scaleBar = timelapse.getScaleBar();
      if (scaleBar)
        scaleBar.updateVideoSize();

      var $snaplapseKeyframeContainer = $("#" + settings["composerDiv"] + " .snaplapse_keyframe_container");
      var $presentationSliderKeyframeContainer = $("#" + settings["presentationSliderDiv"] + " .snaplapse_keyframe_container");

      // 175 is the height of the keyframe container
      var extraHeight = 175 + toolbarHeight;
      newViewportHeight -= extraHeight;

      // Ensure minimum dimensions to not break controls
      if (newViewportWidth < minViewportWidth)
        newViewportWidth = minViewportWidth;
      if (newViewportHeight < minViewportHeight)
        newViewportHeight = minViewportHeight;

      $snaplapseKeyframeContainer.css({
        "top": newViewportHeight + toolbarHeight,
        "width": newViewportWidth
      });

      $presentationSliderKeyframeContainer.css({
        "top": newViewportHeight + 6,
        "width": "inherit",
        "max-width": newViewportWidth
      });

      timelapse.fitVideoToViewport(newViewportWidth, newViewportHeight);
      window.scrollTo(0, 0);

      handleFitToWindowChange(true);
      timelapse.updateTagInfo_locationData();
    };
    this.fitToWindow = fitToWindow;

    var createTimelineSlider = function() {
      var numFrames = timelapse.getNumFrames();
      var FPS = timelapse.getFps();
      var captureTimes = timelapse.getCaptureTimes();

      $("#" + viewerDivId + " .currentTime").html(org.gigapan.Util.formatTime(timelapse.getTimelapseCurrentTimeInSeconds(), true));
      $("#" + viewerDivId + " .totalTime").html(org.gigapan.Util.formatTime(timelapse.getDuration(), true));
      $("#" + viewerDivId + " .currentCaptureTime").html(org.gigapan.Util.htmlForTextWithEmbeddedNewlines(captureTimes[timelapse.getTimelapseCurrentCaptureTimeIndex()]));

      var $timelineSlider = $("#" + viewerDivId + " .timelineSlider");
      $timelineSlider.slider({
        min: 0,
        max: numFrames - 1, // this way the time scrubber goes exactly to the end of timeline
        range: "min",
        step: 1,
        slide: function(e, ui) {
          // $(this).slider('value')  --> previous value
          // ui.value                 --> current value
          // If we are manually using the slider and we are pulling it back to the start
          // we wont actually get to time 0 because of how we are snapping.
          // Manually seek to position 0 when this happens.
          if (($(this).slider('value') > ui.value) && ui.value == 0)
            timelapse.seek(0);
          else
            timelapse.seek((ui.value + 0.3) / FPS);
        }
      }).removeClass("ui-corner-all").children().removeClass("ui-corner-all");
      $("#" + viewerDivId + " .timelineSlider .ui-slider-handle").attr("title", "Drag to go to a different point in time");

      $timelineSlider.bind("mousedown", function() {
        if (window && (window.self !== window.top)) {
          $("body").one("mouseleave", function(event) {
            $timelineSlider.trigger("mouseup");
          });
        }
      });
    };
    this.createTimelineSlider = createTimelineSlider;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor code
    //
    createTimelineSlider();
    createToolbar();

    if (!showZoomControls)
      $("#" + viewerDivId + " .zoom").hide();

    if (!showPanControls)
      $("#" + viewerDivId + " .pan").hide();

    if (!showMainControls || datasetType != undefined) {
      $("#" + viewerDivId + " .controls").hide();
      $("#" + viewerDivId + " .timelineSliderFiller").hide();
    }

    if (showLogoOnDefaultUI)
      $("#" + viewerDivId + " .createLabLogo").show();

    if (!showHomeBtn)
      $("#" + viewerDivId + " .zoomall").hide();

    if (settings["viewportGeometry"] && settings["viewportGeometry"]["max"]) {
      // We already add a resizing handler in customUI.js, so don't add it again.
      if ( typeof settings["enableCustomUI"] == "undefined" || settings["enableCustomUI"] == false) {
        window.onresize = function() {
          fitToWindow();
        };
        fitToWindow();
      }
    }

    if (timelapse.getPlayOnLoad() && datasetType == undefined)
      timelapse.play();
  };
  //end of org.gigapan.timelapse.DefaultUI
})();
//end of (function() {
