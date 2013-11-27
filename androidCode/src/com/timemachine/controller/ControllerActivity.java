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

import java.net.MalformedURLException;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.app.FragmentActivity;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ImageButton;

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
    /**
     * Note that this may be null if the Google Play services APK is not available.
     */
    private GoogleMap mMap;
    private float maxZoom = 12.1f;
    private SocketIO socket = null;
    private String controllerURL;
    private String locationDataFromControllerHTML; 
    private boolean isMapTimedUpdate = true;
    private int mapUpdateTime = 10;
    private int setViewGracefullyTime = 7000;
    private Handler mapUpdateHandler = new Handler();
    public static final String hyperwallPref = "hyperwallPref";
    public int counter = 0;
    public ImageButton playPause;
    private double lastLat = 0;
    private double lastLng = 0;
    private double lastZoom = 0;
    double roundTo = 1000000;
    private String ipText;
    private AlertDialog connectDialog;
    private AlertDialog disconnectDialog;
    private String connectDialogTitle = "Connect to server";
    private ProgressDialog processDialog;
    private boolean isContentViewExist = false;
    // time machine zoom starts from 0, while google map starts from 1
    float timeMachineAndGoogleMapZoomOffset = 1.44f;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createConnectDialog();
    }
    
    private void createConnectDialog () {
    	// Load saved IP address
    	final SharedPreferences settings = getSharedPreferences(hyperwallPref, 0);
    	String serverIP = settings.getString("serverIP", "");
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
            	showProcessDialog();
                // Get the text written in IP address section
            	ipText = ipTextbox.getText().toString();
                // Save IP address
                SharedPreferences.Editor editor = settings.edit();
                editor.putString("serverIP", ipText);
                editor.commit();
                // Connect Websocket
                setupSocketConnection(ipText);
            }
        });
    	buildDisconnectDialog();
    	// Create the AlertDialog
    	connectDialog = connectDialogBuilder.create();
    	connectDialog.show();
    }
 
    private void buildDisconnectDialog() {
        AlertDialog.Builder disconnectDialogBuilder = new AlertDialog.Builder(ControllerActivity.this);
        disconnectDialogBuilder.setMessage("Are you sure that you want to disconnect?");
        disconnectDialogBuilder.setPositiveButton("yes", new DialogInterface.OnClickListener() {
                   public void onClick(DialogInterface dialog, int id) {
                	   socket.disconnect();
                   }
               });
        disconnectDialogBuilder.setNegativeButton("no", new DialogInterface.OnClickListener() {
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
    
    private void showProcessDialog() {
        runOnUiThread(new Runnable() {
            public void run() {
            	processDialog = ProgressDialog.show(ControllerActivity.this, "", "Connecting to server...", true, false);
			}
		});	
    }    
    
    private void setupSocketConnection (String text) {
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
			showConnectDialog("Error! Connect again.");
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
                showConnectDialog("Error! Connect again.");
            }
            @Override
            public void onDisconnect() {
                System.out.println("Connection terminated.");
                showConnectDialog("Disconnected! Connect again.");
            }
            @Override
            public void onConnect() {
                System.out.println("Connection established");
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
    
    private void setupUI () {   	   	
        // Call controller.html
		controllerURL = "http://" + ipText + ":8080/controller.html";                            
		WebView locations = (WebView) findViewById(R.id.webview);
		locations.setBackgroundColor(Color.TRANSPARENT);
		locations.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
		locations.setWebViewClient(new WebViewClient() {
        	public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        		System.out.println("onReceivedError");
        		showConnectDialog("Error while connecting to controller.");
        	}
        });
		locations.loadUrl(controllerURL);
		
		locations.addJavascriptInterface(this, "androidObject");   
		WebSettings webSettings = locations.getSettings();
		webSettings.setJavaScriptEnabled(true);
    		
    	playPause = (ImageButton) findViewById(R.id.playPauseButton);
    	playPause.setLongClickable(true);
    	playPause.setOnLongClickListener(new View.OnLongClickListener() {			
			@Override
			public boolean onLongClick(View v) {
				disconnectDialog.show();
				return true;
			}
		});
    	playPause.setOnClickListener(new View.OnClickListener() {			
			@Override
			public void onClick(View v) {
				socket.emit("handlePlayPauseServer");
			}
		});	
    	socket.emit("setControllerPlayButton");
    	setUpMapIfNeeded();
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
            mMap = ((SupportMapFragment) getSupportFragmentManager().findFragmentById(R.id.map))
                    .getMap();
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
    				if(socket != null) {
    					System.out.println("I move! " + counter++);
    					socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom - timeMachineAndGoogleMapZoomOffset));
    					// Limit the max zoom
    					if(position.zoom > maxZoom) {
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
    public void handlePlayPauseUI (final Boolean isPlayingTimeMachine){
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
    	Timer t = new Timer();
    	t.schedule(new TimerTask() {
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
    	        }, setViewGracefullyTime);	
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
