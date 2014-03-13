/*
 * Copyright (C) 2012 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.timemachine.controller;

import io.socket.IOAcknowledge;
import io.socket.IOCallback;
import io.socket.SocketIO;
import io.socket.SocketIOException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.app.SearchManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.location.Address;
import android.location.Geocoder;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.support.v4.app.FragmentActivity;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewTreeObserver;
import android.view.ViewTreeObserver.OnGlobalLayoutListener;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.SearchView;
import android.widget.TextView;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.CameraPosition;
import com.google.android.gms.maps.model.LatLng;

/**
 * This shows how to create a simple activity with a map and a marker on the map.
 * <p>
 * Notice how we deal with the possibility that the Google Play services APK is not
 * installed/enabled/updated on a user's device.
 */
@SuppressLint("SetJavaScriptEnabled")
public class ControllerActivity extends FragmentActivity {
    // Google map variables, Note that mMap may be null if the Google Play services APK is not available.
    private GoogleMap mMap;
    private float maxZoom = 12.1f;
    private boolean isMapTimedUpdate = true;
    private int mapUpdateTime = 10;
    private Handler mapUpdateHandler = new Handler();
    private double lastLat = 0;
    private double lastLng = 0;
    private double lastZoom = 0;
    double roundTo = 1000000;

    // Controller variables
    private int setViewGracefullyTime = 7000;
    private SharedPreferences prefs = null;
    public ImageButton playPause;
    private ImageButton drag;
    public static WebView locationSlider;
    private FrameLayout locationSliderContainer;
    TextView searchTextView;
    private Boolean isSliderHidden = false;
    public static Boolean isEditorEnabled = false;
    private float locationSliderHeight;
    private float originLocationSliderContainerY;
    private float originPlayPauseButtonY;
    private float dragYDiffBetweenFingerAndSliderTop;
    private float dragYDiffBetweenFingerAndPlayPauseTop;
    private float maxLocationSliderContainerY;
    private float minLocationSliderContainerY;
    private float midLocationSliderContainerY;
    private int tapTimeout = ViewConfiguration.getTapTimeout();
    private int hideEditorTime = 120000;

    // Socket connection variables
    private SocketIO socket = null;
    private String controllerURL;
    private String locationDataFromControllerHTML;
    private String ipText;
    private AlertDialog connectDialog;
    private AlertDialog disconnectDialog;
    private String connectDialogTitle = "Connect to server";
    private String processDialogTitle;
    private ProgressDialog processDialog;
    private boolean isContentViewExist = false;

    // Auto mode variables
    private boolean isAutoModeDelayTimeoutRunning = false;

    // Time Machine zoom starts from 0, while google map starts from 1
    float timeMachineAndGoogleMapZoomOffset = 1.44f;

    // Variables for detecting the master
    private Boolean isMasterConnected = false;
    private Timer isMasterConnectedTimer = new Timer();
    private TimerTask isMasterConnectedTimerTask = null;

    // Need to set the value to null and do a null check before killing the task
    // or the thread dies without throwing errors and the code after .cancel() never gets run
    private TimerTask cancelPreviousZoomingTimerTask = null;
    private Timer cancelPreviousZoomingTimer = new Timer();
    private TimerTask hideEditorTimerTask = null;
    private Timer hideEditorTimer = new Timer();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = PreferenceManager.getDefaultSharedPreferences(this);
        createConnectDialog();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Handle Intent
        if(getIntent() != null)
        	handleIntent(getIntent());
    }


    @Override
    protected void onNewIntent(Intent intent) {
    	System.out.println(intent);
    	if(intent != null)
    		handleIntent(intent);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu items for use in the action bar
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_activity_actions, menu);

        // Associate searchable configuration with the SearchView
        // Get the SearchView and set the searchable configuration
        SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);
        SearchView searchView = (SearchView) menu.findItem(R.id.search).getActionView();
        searchView.setSearchableInfo(searchManager.getSearchableInfo(getComponentName()));

        // Change the text color in the search view
        int id = searchView.getContext().getResources().getIdentifier("android:id/search_src_text", null, null);
        searchTextView = (TextView) searchView.findViewById(id);
        searchTextView.setHintTextColor(Color.parseColor("#80ffffff"));
        searchTextView.setTextColor(Color.parseColor("#ffffff"));

        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle item selection
        switch (item.getItemId()) {
            case R.id.action_disconnect:
            	disconnectDialog.show();
                return true;
            case R.id.action_settings:
            	openSettings();
                return true;
            case R.id.action_toggleEditor:
            	if(isEditorEnabled)
            		setMode("player");
            	else
            		setMode("editor");
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

	@Override
	public boolean dispatchTouchEvent(MotionEvent event) {
		// Detect the general touch event of the entire screen
		if(event.getAction() == MotionEvent.ACTION_DOWN) {
			try {
				if(isEditorEnabled)
					stopHideEditorTimer();
				else
					locationSlider.loadUrl("javascript:stopScreenIdleTimeout()");
			} catch(Exception e) {
				e.printStackTrace();
			}
		}
		if(!isAutoModeDelayTimeoutRunning && event.getAction() == MotionEvent.ACTION_UP) {
			try {
				if(isEditorEnabled)
					runHideEditorTimer();
				else
					locationSlider.loadUrl("javascript:startScreenIdleTimeout()");
			} catch(Exception e) {
				e.printStackTrace();
			}
		}
		return super.dispatchTouchEvent(event);
	}

	private void setMode(String newMode) {
		if(newMode.equals("player")) {
			locationSlider.loadUrl("javascript:setMode('player')");
    		Boolean doAutoMode = prefs.getBoolean(getString(R.string.key_doAutoMode), Boolean.parseBoolean(getString(R.string.defaultDoAutoMode)));
    		locationSlider.loadUrl("javascript:setDoAutoMode(" + doAutoMode + ")");
    		stopHideEditorTimer();
    		isEditorEnabled = false;
		} else if (newMode.equals("editor")) {
    		locationSlider.loadUrl("javascript:setMode('editor')");
    		locationSlider.loadUrl("javascript:setDoAutoMode(false)");
    		runHideEditorTimer();
    		isEditorEnabled = true;
		}
	}

	private void runHideEditorTimer() {
		stopHideEditorTimer();
    	hideEditorTimerTask = new TimerTask() {
            @Override
            public void run() {
                runOnUiThread(new Runnable() {
                    public void run() {
                    	setMode("player");
                    }
                });
            }
        };
        hideEditorTimer.schedule(hideEditorTimerTask, hideEditorTime);
	}

	private void stopHideEditorTimer() {
    	if(hideEditorTimerTask != null)
    		hideEditorTimerTask.cancel();
    	hideEditorTimerTask = null;
	}

    private void openSettings() {
    	Intent intent = new Intent();
    	intent.setClass(ControllerActivity.this, SettingsActivity.class);
    	startActivityForResult(intent, 0);
    }

    private void handleIntent(Intent intent) {
    	if (Intent.ACTION_SEARCH.equals(intent.getAction())) {
    		String input = intent.getStringExtra(SearchManager.QUERY);
			String suggestion = (String) intent.getExtras().get("intent_extra_data_key");
			String query;
    		// Use the query to search your data somehow
    		if(suggestion == null)
    			query = input;
    		else
    			query = suggestion;
    		Geocoder geocoder = new Geocoder(ControllerActivity.this);
    		try {
    			List<Address> address = geocoder.getFromLocationName(query, 1);
    			if (address != null && !address.isEmpty()) {
    				Address location = address.get(0);
    				System.out.println(location.getLatitude() + ", " + location.getLongitude());
    				mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(location.getLatitude(),location.getLongitude()), maxZoom), setViewGracefullyTime, null);
    			}
    			else
    				System.out.println("No address found.");
    		} catch (IOException e) {
    			e.printStackTrace();
    		}
       }
    }

    private void createConnectDialog () {
    	// Load saved IP address
    	String serverIP = prefs.getString("serverIP", "");
    	// Instantiate an AlertDialog.Builder with its constructor
    	AlertDialog.Builder connectDialogBuilder = new AlertDialog.Builder(ControllerActivity.this);
    	// Get the layout inflater
        LayoutInflater inflater = ControllerActivity.this.getLayoutInflater();
        // Inflate the custom view
        final View connectDialogLayout = inflater.inflate(R.layout.connect_dialog, null);
        // Get the text box
    	final EditText ipTextbox = (EditText) connectDialogLayout.findViewById(R.id.ipAddress);
    	// Restore previous IP
    	ipTextbox.setText(serverIP);
    	// Set layout and title
    	connectDialogBuilder.setView(connectDialogLayout);
    	connectDialogBuilder.setTitle(connectDialogTitle);
    	// Prevent the dialog from canceling when users click outside the dialog
    	connectDialogBuilder.setCancelable(false);
    	// Add actionButtons
    	connectDialogBuilder.setPositiveButton(R.string.connect, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
            	showProcessDialog("Connecting to server...");
                // Get the text written in IP address section
            	ipText = ipTextbox.getText().toString();
                // Save IP address
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("serverIP", ipText);
                editor.commit();
                // Connect Websocket
                setupSocketConnection(ipText);
            }
        });
    	buildDisconnectDialog();
    	// Create the AlertDialog
    	connectDialog = connectDialogBuilder.create();
    	connectDialog.setOwnerActivity(ControllerActivity.this);
    	connectDialog.show();
    }

    private void buildDisconnectDialog() {
        AlertDialog.Builder disconnectDialogBuilder = new AlertDialog.Builder(ControllerActivity.this);
        disconnectDialogBuilder.setMessage("Are you sure you want to disconnect?");
        disconnectDialogBuilder.setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                   public void onClick(DialogInterface dialog, int id) {
                	   disconnectController();
                   }
               });
        disconnectDialogBuilder.setNegativeButton("No", new DialogInterface.OnClickListener() {
                   public void onClick(DialogInterface dialog, int id) {
                   }
               });
    	disconnectDialog = disconnectDialogBuilder.create();
    }

    private void showConnectDialog(String newTitle) {
    	connectDialogTitle = newTitle;
        runOnUiThread(new Runnable() {
            public void run() {
            	processDialog.dismiss();
            	connectDialog.setTitle(connectDialogTitle);
            	connectDialog.show();
			}
		});
    }

    public void showProcessDialog(String newTitle) {
    	processDialogTitle = newTitle;
        runOnUiThread(new Runnable() {
            public void run() {
            	System.out.println("showProcessDialog");
            	processDialog = ProgressDialog.show(ControllerActivity.this, "", processDialogTitle, true, false);
            }
		});
    }

    private void setupSocketConnection(String text) {
    	socket = null;

		try {
			socket = new SocketIO("http://"+text+":8080/controller");
			// Set the log level
			final Logger logger = Logger.getLogger("io.socket");
			logger.setLevel(Level.WARNING);
			//logger.setLevel(Level.ALL);
		} catch (MalformedURLException e1) {
			e1.printStackTrace();
			System.out.println("SocketConnection not initialized..!!");
			showConnectDialog("Error while setting up sockets. Connect again.");
		}

        socket.connect(new IOCallback() {
            @Override
            public void onMessage(JSONObject json, IOAcknowledge ack) {
                try {
                    System.out.println("Server said:" + json.toString(2));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onMessage(String data, IOAcknowledge ack) {
            	try {
                System.out.println("Server said: " + data);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(SocketIOException socketIOException) {
                System.out.println("an Error occured");
                socketIOException.printStackTrace();
                showConnectDialog("Error connecting to server. Connect again.");
            }
            @Override
            public void onDisconnect() {
                System.out.println("Connection terminated.");
            }
            @Override
            public void onConnect() {
                System.out.println("Connection established");
                isMasterConnected = false;
                runOnUiThread(new Runnable() {
                	public void run() {
                		processDialog.dismiss();
                		if(!isContentViewExist) {
                			isContentViewExist = true;
                			setContentView(R.layout.activity_controller);
                		}
                		setupUI();
        			}
        		});
            }
            @Override
            public void on(String event, IOAcknowledge ack, Object... args) {
               if(event.equals("sync handlePlayPauseController")) {
            	   handlePlayPauseUI((Boolean) args[0]);
               }
            }
        });
    }

    private void setupUI() {
    	// Set layout listener
    	View controllerView = findViewById(R.id.controllerView);
		ViewTreeObserver vto = controllerView.getViewTreeObserver();
		vto.addOnGlobalLayoutListener(new OnGlobalLayoutListener() {
		     @Override
		     public void onGlobalLayout() {
		         runOnUiThread(new Runnable() {
		             public void run() {
		             	locationSliderHeight = locationSlider.getHeight();
		             	originLocationSliderContainerY = locationSliderContainer.getY();
		             	originPlayPauseButtonY = playPause.getY();
		             	minLocationSliderContainerY = originLocationSliderContainerY;
		             	maxLocationSliderContainerY = originLocationSliderContainerY + locationSliderHeight;
		             	midLocationSliderContainerY = (minLocationSliderContainerY + maxLocationSliderContainerY) / 2;
		             }
		         });
		     	System.out.println("locationSliderHeight: " + locationSliderHeight);
		     	System.out.println("locationSliderContainerY: " + originLocationSliderContainerY);
		     	locationSlider.getViewTreeObserver().removeOnGlobalLayoutListener(this);
		     }
		});

        // Connect to controller.html
		controllerURL = "http://" + ipText + ":8080/controller.html";
		locationSlider = (WebView) findViewById(R.id.webview);
		locationSliderContainer = (FrameLayout) findViewById(R.id.sliderContainer);
		locationSlider.setBackgroundColor(Color.TRANSPARENT);
		locationSlider.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
		locationSlider.setWebViewClient(new WebViewClient() {
        	public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        		System.out.println("onReceivedError");
        		showConnectDialog("Error while connecting to controller. Connect again.");
        	}
        	@Override
        	public void onLoadResource(WebView view, String url) {
        		if(url.contains("thumbnail"))
        			isMasterConnected = true;
        	}
        	@Override
        	public void onPageStarted(WebView view, String url, Bitmap favicon) {
            	isMasterConnectedTimerTask = null;
            	isMasterConnectedTimerTask = new TimerTask() {
                    @Override
                    public void run() {
                        if(isMasterConnected == false)
                        	showConnectDialog("Master is not loaded in the browser. Connect again.");
                    }
                };
                isMasterConnectedTimer.schedule(isMasterConnectedTimerTask, 6000);
        	}
            @Override
            public void onPageFinished(WebView view, String url) {
            	if (url.contains(controllerURL)) {
            		drag.setVisibility(View.VISIBLE);
            		playPause.setVisibility(View.VISIBLE);
            		loadPreferences();
            	}
                super.onPageFinished(view, url);
            }
        });
		try {
			locationSlider.loadUrl(controllerURL);
		} catch(Exception e) {
			e.printStackTrace();
		}

		// Set JavaScript Interface
		locationSlider.addJavascriptInterface(this, "androidObject");
		WebSettings webSettings = locationSlider.getSettings();
		webSettings.setJavaScriptEnabled(true);

		// Set the play-pause button
    	playPause = (ImageButton) findViewById(R.id.playPauseButton);
    	playPause.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				socket.emit("handlePlayPauseServer");
			}
		});
    	socket.emit("setControllerPlayButton");

    	// Set the drag button
    	drag = (ImageButton) findViewById(R.id.drag);
    	drag.setOnTouchListener(new View.OnTouchListener() {
			@Override
			public boolean onTouch(View v, MotionEvent event) {
				if(event.getAction() == MotionEvent.ACTION_DOWN) {
					dragYDiffBetweenFingerAndSliderTop = locationSliderContainer.getY() - event.getRawY();
					dragYDiffBetweenFingerAndPlayPauseTop = playPause.getY() - event.getRawY();
				}
				if(event.getAction() == MotionEvent.ACTION_MOVE) {
					// Move the slider based on current finger location
					float newSliderY = event.getRawY() + dragYDiffBetweenFingerAndSliderTop;
					float newPlayPauseY = event.getRawY() + dragYDiffBetweenFingerAndPlayPauseTop;
					if(newSliderY > minLocationSliderContainerY && newSliderY < maxLocationSliderContainerY) {
						locationSliderContainer.setY(newSliderY);
						playPause.setY(newPlayPauseY);
					}
				}
				if(event.getAction() == MotionEvent.ACTION_UP) {
					if(event.getEventTime() - event.getDownTime() <= tapTimeout) {
						// Tap is detected, toggle the slider
						System.out.println("onTap");
			            runOnUiThread(new Runnable() {
			                public void run() {
			                	toggleSlider();
			                }
			            });
					} else {
						// Not a tap gesture, slide up or down based on the slider's current position
						if(locationSliderContainer.getY() > midLocationSliderContainerY)
				    		slideDown();
				    	else
				    		slideUp();
					}
				}
				return true;
			}
		});

    	// Set the Google map
    	setUpMapIfNeeded();
    }

    private void toggleSlider() {
    	if(!isSliderHidden)
    		slideDown();
    	else
    		slideUp();
    }

    private void slideDown() {
		System.out.println("Slide down");
		isSliderHidden = true;
		slideTo(maxLocationSliderContainerY, originPlayPauseButtonY + locationSliderHeight);
    }

    private void slideUp() {
		System.out.println("Slide up");
		isSliderHidden = false;
		slideTo(minLocationSliderContainerY, originPlayPauseButtonY);
    }

    private void slideTo(float newSliderY, float newPlayPauseY) {
    	locationSliderContainer.animate().y(newSliderY).setDuration(250);
    	playPause.animate().y(newPlayPauseY).setDuration(250);
    }

    private void loadPreferences() {
    	Boolean doAutoMode = prefs.getBoolean(getString(R.string.key_doAutoMode), Boolean.parseBoolean(getString(R.string.defaultDoAutoMode)));
    	String screenIdleTime = prefs.getString(getString(R.string.key_screenIdleTime), getString(R.string.defaultScreenIdleTime));
    	String autoModeDelayTime = prefs.getString(getString(R.string.key_autoModeDelayTime), getString(R.string.defaultAutoModeDelayTime));
		try {
			locationSlider.loadUrl("javascript:setDoAutoMode(" + doAutoMode + ")");
			locationSlider.loadUrl("javascript:setScreenIdleTime(" + Integer.parseInt(screenIdleTime) * 1000 + ")");
			locationSlider.loadUrl("javascript:setAutoModeDelayTime(" + Integer.parseInt(autoModeDelayTime) * 1000 + ")");
		} catch(Exception e) {
			e.printStackTrace();
		}
    }

    /**
     * Sets up the map if it is possible to do so (i.e., the Google Play services APK is correctly
     * installed) and the map has not already been instantiated.. This will ensure that we only ever
     * call {@link #setUpMap()} once when {@link #mMap} is not null.
     * <p>
     * If it isn't installed {@link SupportMapFragment} (and
     * {@link com.google.android.gms.maps.MapView MapView}) will show a prompt for the user to
     * install/update the Google Play services APK on their device.
     * <p>
     * A user can return to this FragmentActivity after following the prompt and correctly
     * installing/updating/enabling the Google Play services. Since the FragmentActivity may not have been
     * completely destroyed during this process (it is likely that it would only be stopped or
     * paused), {@link #onCreate(Bundle)} may not be called again so we should call this method in
     * {@link #onResume()} to guarantee that it will be called.
     */
    private void setUpMapIfNeeded() {
        // Do a null check to confirm that we have not already instantiated the map.
        if (mMap == null) {
            // Try to obtain the map from the SupportMapFragment.
            mMap = ((SupportMapFragment) getSupportFragmentManager().findFragmentById(R.id.map)).getMap();
            // Check if we were successful in obtaining the map.
            if (mMap != null) {
                setUpMap();
            }
        }
    }

    /**
     * This should only be called once and when we are sure that {@link #mMap} is not null.
     */
    private void setUpMap() {
    	if(!isMapTimedUpdate) {
    		// Send the new lat lng and zoom to the server when the view is changed
        	GoogleMap.OnCameraChangeListener listener = new GoogleMap.OnCameraChangeListener() {
    			@Override
    			public void onCameraChange(CameraPosition position) {
    				if (socket != null) {
    					socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom - timeMachineAndGoogleMapZoomOffset));
    					// Limit the max zoom
    					if (position.zoom > maxZoom) {
    						mMap.moveCamera(CameraUpdateFactory.zoomTo(maxZoom));
    					}
    				}
    			}
    		};
    		mMap.setOnCameraChangeListener(listener);
        }
    	else {
    		// Setup a timer to update the map location
    		Timer updateMapTimer = new Timer();
    		updateMapTimer.schedule(new TimerTask () {
    			@Override
    			public void run () {
    				mapUpdateHandler.post(new Runnable() {
    					public void run () {
    						if(socket != null && isMapTimedUpdate) {
        						CameraPosition position = mMap.getCameraPosition();
        						double currentLat = Math.round(position.target.latitude * roundTo) / roundTo;
        						double currentLng = Math.round(position.target.longitude * roundTo) / roundTo;
        						float currentZoom = Math.round(position.zoom * (float)roundTo) / (float)roundTo;
        						if(currentLat != lastLat || currentLng != lastLng || currentZoom != lastZoom) {
        							socket.emit("mapViewUpdate", Double.toString(currentLat) +" "+ Double.toString(currentLng) +" "+ Double.toString(currentZoom - timeMachineAndGoogleMapZoomOffset));
        						}
        						// Limit the max zoom
        						if(position.zoom > maxZoom) {
        							mMap.moveCamera(CameraUpdateFactory.zoomTo(maxZoom));
        						}
        						lastLat = currentLat;
        						lastLng = currentLng;
        						lastZoom = currentZoom;
        					}
    					}
    				});
    			}
    		}, mapUpdateTime, mapUpdateTime);
        }
    	mMap.getUiSettings().setRotateGesturesEnabled(false);
    	mMap.getUiSettings().setTiltGesturesEnabled(false);
    	mMap.getUiSettings().setZoomControlsEnabled(false);
    }

    @JavascriptInterface
    public void disconnectController() {
    	// Calling disconnect() without immediately calling setupSocketConnection()
    	// will begin to introduce lag into the App. It seems that CPU usage never decreases.
    	// Therefore the App becomes unusable after many disconnects.
    	// To avoid this problem, we call setupSocketConnection() without calling disconnect().
    	// We *should* call disconnect to free up the sockets, but because of the above issue we can't.
    	// Maybe another socket library will help.
    	//socket.disconnect();
    	showConnectDialog("Disconnected. Connect again.");
    }

    @JavascriptInterface
    public void setIsAutoModeDelayTimeoutRunning(boolean newStatus) {
    	isAutoModeDelayTimeoutRunning = newStatus;
    	if(newStatus == true && isSliderHidden) {
            runOnUiThread(new Runnable() {
                public void run() {
                	toggleSlider();
                }
            });
    	}
    }

    @JavascriptInterface
    public void handlePlayPauseUI (final Boolean isPlayingTimeMachine) {
    	// When you need to modify a UI element, do so on the UI thread.
        runOnUiThread(new Runnable() {
            public void run() {
	    		// Switch the button
	    		if(!isPlayingTimeMachine) {
	    			Drawable playImage = getResources().getDrawable(R.drawable.play);
	    			playPause.setImageDrawable(playImage);
	    		}
	        	else {
	        		Drawable pauseImage = getResources().getDrawable(R.drawable.pause);
	        		playPause.setImageDrawable(pauseImage);
	        	}
            }
       });
    }

    @JavascriptInterface
    public void setMapLocation (String data) {
    	locationDataFromControllerHTML = data;
    	isMapTimedUpdate = false;
    	// Create a timer to set it to true
    	if(cancelPreviousZoomingTimerTask != null)
    		cancelPreviousZoomingTimerTask.cancel();
    	cancelPreviousZoomingTimerTask = null;
    	cancelPreviousZoomingTimerTask = new TimerTask() {
            @Override
            public void run() {
            	isMapTimedUpdate = true;
                runOnUiThread(new Runnable() {
                    public void run() {
                    	// Enable the gesture
                    	mMap.getUiSettings().setZoomGesturesEnabled(true);
                    	mMap.getUiSettings().setScrollGesturesEnabled(true);
                    }
                });
            }
        };
    	cancelPreviousZoomingTimer.schedule(cancelPreviousZoomingTimerTask, setViewGracefullyTime);
		// Set the location of the map to this position
    	mapUpdateHandler.post(new Runnable() {
			public void run () {
		    	// Disable the gesture
		    	mMap.getUiSettings().setZoomGesturesEnabled(false);
		    	mMap.getUiSettings().setScrollGesturesEnabled(false);
		    	// Set camera
				String location[] = locationDataFromControllerHTML.split(",");
				double lat = Double.parseDouble(location[0]);
				double lng = Double.parseDouble(location[1]);
				float zoom = Float.parseFloat(location[2]) + timeMachineAndGoogleMapZoomOffset;
				lastLat = Math.round(lat * roundTo) / roundTo;
				lastLng = Math.round(lng * roundTo) / roundTo;
				lastZoom = Math.round(zoom * (float)roundTo) / (float)roundTo;
				mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(lat,lng), zoom), setViewGracefullyTime - 2000, null);
			}
		});
    }
}
