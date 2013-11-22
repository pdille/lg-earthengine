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

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.app.FragmentActivity;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.ImageButton;

import com.timemachine.controller.R;
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
public class MapControllerActivity extends FragmentActivity {
    /**
     * Note that this may be null if the Google Play services APK is not available.
     */
    private GoogleMap mMap;
    private float maxZoom = 10.5f;
    private SocketIO socket = null;
    private String controllerURL;
    private String locationDataFromControllerHTML; 
    private boolean isMapTimedUpdate = true;
    private int mapUpdateTime = 10;
    private int setViewGracefullyTime = 5000;
    private Handler mapUpdateHandler = new Handler();
    public static final String hyperwallPref = "hyperwallPref";
    public int counter = 0;
    public ImageButton playPause;
    private double lastLat = 0;
    private double lastLng = 0;
    private float lastZoom = 0;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.controller);
        //setUpMapIfNeeded();
        // Setup the socket connection
        createDialog();
        //setupSocketConnection();
        setupUI();
    }

    @Override
    protected void onResume() {
        super.onResume();
        //setUpMapIfNeeded();
    }
    
    private void createDialog () {
    	// Load saved IP address
    	final SharedPreferences settings = getSharedPreferences(hyperwallPref, 0);
    	String serverIP = settings.getString("serverIP", "");
    	// Instantiate an AlertDialog.Builder with its constructor
    	AlertDialog.Builder builder = new AlertDialog.Builder(MapControllerActivity.this);
    	// Get the layout inflater
        LayoutInflater inflater = MapControllerActivity.this.getLayoutInflater();
        // Inflate the custom view
        final View layout = inflater.inflate(R.layout.connect_dialog, null); 
        // Get the text box
    	final EditText ipTextbox = (EditText) layout.findViewById(R.id.ipAddress);
    	ipTextbox.setText(serverIP);
    	// Set layout and title
    	builder.setView(layout).setTitle("Connect to server:");
    	// Prevent the dialog from canceling when users click outside the dialog
    	builder.setCancelable(false);
    	// Add actionButtons
    	builder.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // Get the text written in IP address section
                String ipText = ipTextbox.getText().toString();
                // Save IP address
                SharedPreferences.Editor editor = settings.edit();
                editor.putString("serverIP", ipText);
                editor.commit();
                // Connect websocket
                setupSocketConnection(ipText);
                // Call controller.html
                controllerURL = "http://" + ipText + ":8080/controller.html";                
                //Log.d("webViewURL", controllerURL);               
                WebView fixedLocations = (WebView) findViewById(R.id.webview);
                fixedLocations.setBackgroundColor(Color.TRANSPARENT);
                fixedLocations.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
            	fixedLocations.loadUrl(controllerURL);
            	fixedLocations.addJavascriptInterface(this, "Android");
            	setUpMapIfNeeded();
            }
        });    	  	
    	// Create the AlertDialog
    	AlertDialog dialog = builder.create();
    	dialog.show();
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
			// TODO Auto-generated catch block
			e1.printStackTrace();
			Log.d("SocketConnection not initialized..!!","");
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
            }
            @Override
            public void onDisconnect() {
                System.out.println("Connection terminated.");
            }
            @Override
            public void onConnect() {
                System.out.println("Connection established");
                socket.emit("setControllerPlayButton");
            }
            @Override
            public void on(String event, IOAcknowledge ack, Object... args) {
               if(event.equals("sync handlePlayPauseController")) {
            	   handlePlayPauseUI((Boolean) args[0]);
               }
            }
        });
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
    					socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom+1.5f));
    					// Limit the max zoom
    					if(position.zoom > maxZoom) {
    						mMap.animateCamera(CameraUpdateFactory.zoomTo(maxZoom));
    						//mMap.moveCamera(CameraUpdateFactory.zoomTo(maxZoom));						
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
        						int roundTo = 1000;
        						double currentLat = Math.round(position.target.latitude * roundTo) / roundTo;
        						double currentLng = Math.round(position.target.longitude * roundTo) / roundTo;
        						float currentZoom = Math.round(position.zoom+1.5f * roundTo) / roundTo;
        						if(currentLat != lastLat || currentLng != lastLng || currentZoom != lastZoom)
        						{
        							//socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom+1.5f));
        							socket.emit("mapViewUpdate", Double.toString(currentLat) +" "+ Double.toString(currentLng) +" "+ Float.toString(position.zoom+1.5f));
        						}
        						// Limit the max zoom
        						if(position.zoom > maxZoom) {
        							mMap.animateCamera(CameraUpdateFactory.zoomTo(maxZoom));
        							//mMap.moveCamera(CameraUpdateFactory.zoomTo(maxZoom));        							
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
    
    private void setupUI () {   	   	
    	final WebView fixedLocations = (WebView) findViewById(R.id.webview);
    	WebSettings webSettings = fixedLocations.getSettings();
    	webSettings.setJavaScriptEnabled(true);
    	fixedLocations.addJavascriptInterface(this, "androidObject");
    	
    	playPause = (ImageButton) findViewById(R.id.playPauseButton);
    	playPause.setOnClickListener(new View.OnClickListener() {			
			@Override
			public void onClick(View v) {
				socket.emit("handlePlayPauseServer");
			}
		});	
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
       	            }
    	        }, setViewGracefullyTime);	
		// Set the location of the map to this position
    	mapUpdateHandler.post(new Runnable() {
			public void run () {
				String location[] = locationDataFromControllerHTML.split(",");
				mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(Double.parseDouble(location[0]),Double.parseDouble(location[1])), Float.parseFloat(location[2]) - 1.5f), setViewGracefullyTime, null);
				//mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(Double.parseDouble(location[0]),Double.parseDouble(location[1])), Float.parseFloat(location[2]) - 1.5f));
			}
		});	
    }   
}
