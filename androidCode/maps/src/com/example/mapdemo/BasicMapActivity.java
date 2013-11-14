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

package com.example.mapdemo;

import java.net.MalformedURLException;
import java.util.Timer;
import java.util.TimerTask;

import org.json.JSONException;
import org.json.JSONObject;

import io.socket.IOAcknowledge;
import io.socket.IOCallback;
import io.socket.SocketIO;
import io.socket.SocketIOException;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.CameraPosition;
import com.google.android.gms.maps.model.LatLng;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.app.FragmentActivity;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.ImageButton;

/**
 * This shows how to create a simple activity with a map and a marker on the map.
 * <p>
 * Notice how we deal with the possibility that the Google Play services APK is not
 * installed/enabled/updated on a user's device.
 */
public class BasicMapActivity extends FragmentActivity {
    /**
     * Note that this may be null if the Google Play services APK is not available.
     */
    private GoogleMap mMap;
    private float maxZoom = 10.5f;
    private SocketIO socket = null;
    boolean isGridVisible = false;
    String controllerURL;
    String locationDataFromControllerHTML; 
    private boolean isMapTimedUpdate = true;
    private int mapUpdateTime = 10;
    private int setViewGracefullyTime = 5000;
    private Handler mapUpdateHandler = new Handler();
    private boolean isPlayingTimeMachine = true;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.basic_demo);
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
    	// Instantiate an AlertDialog.Builder with its constructor
    	AlertDialog.Builder builder = new AlertDialog.Builder(BasicMapActivity.this);
    	
    	// Get the layout inflater
        LayoutInflater inflater = BasicMapActivity.this.getLayoutInflater();
    	final View layout = inflater.inflate(R.layout.popup_layout, null); 
        // Inflate the custom view
    	builder.setView(layout)
    	// Add actionButtons
    	.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // Get the text written in ip address section
            	EditText edit= (EditText) layout.findViewById(R.id.ipAddress);
                String text=edit.getText().toString();
                controllerURL = "http://"+text+":8080/controller.html";
                Log.d("webViewURL", controllerURL);
                dialog.dismiss();
                setupSocketConnection(text);
                WebView fixedLocations = (WebView) findViewById(R.id.webview);
            	fixedLocations.loadUrl(controllerURL);
            	fixedLocations.addJavascriptInterface(this, "Android");
            	setUpMapIfNeeded();
            }
        });
    	builder.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User cancelled the dialog
            }
        });
 // Set other dialog properties
 

 // Create the AlertDialog
 AlertDialog dialog = builder.create();
 dialog.show();
 }
    
    private void setupSocketConnection (String text) {
    	socket = null;
		try {
			socket = new SocketIO("http://"+text+":8080/controller");
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
                System.out.println("Server said: " + data);
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
            }

            @Override
            public void on(String event, IOAcknowledge ack, Object... args) {
                System.out.println("Server triggered event '" + event + "'");
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
    		// Send the new latlong and zoom to the server when the view is changed
        	GoogleMap.OnCameraChangeListener listener = new GoogleMap.OnCameraChangeListener() {
    			
    			@Override
    			/**
    		     * Listener for camera change event it should send the new data to the node server somehow 
    		     */
    			public void onCameraChange(CameraPosition position) {
    				if(socket != null) {
    					socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom+1.5f));
    					// Limit the max zoom
    					if(position.zoom > maxZoom) {
    						mMap.animateCamera(CameraUpdateFactory.zoomTo(maxZoom));
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
        						socket.emit("mapViewUpdate", Double.toString(position.target.latitude) +" "+ Double.toString(position.target.longitude) +" "+ Float.toString(position.zoom+1.5f));
        						// Limit the max zoom
        						if(position.zoom > maxZoom) {
        							mMap.animateCamera(CameraUpdateFactory.zoomTo(maxZoom));
        						}
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
    	
    	// Set The grid view Invisible (One can switch between the web view and native view here)
    	final GridLayout oldFixedLocations = (GridLayout) findViewById(R.id.placesView);
    	oldFixedLocations.setVisibility(View.INVISIBLE);
    	
    	final WebView fixedLocations = (WebView) findViewById(R.id.webview);
    	WebSettings webSettings = fixedLocations.getSettings();
    	webSettings.setJavaScriptEnabled(true);
    	fixedLocations.addJavascriptInterface(this, "androidObject");
    	
    	final ImageButton playPause = (ImageButton) findViewById(R.id.playPauseButton);
    	playPause.setOnClickListener(new View.OnClickListener() {
			
			@Override
			public void onClick(View v) {
				// Switch the button and send a play or a pause signal
				if(isPlayingTimeMachine) {
					Drawable playImage = getResources().getDrawable(R.drawable.play);
					playPause.setImageDrawable(playImage);
					isPlayingTimeMachine = false;
					socket.emit("pause");
				}
				else {
					Drawable pauseImage = getResources().getDrawable(R.drawable.pause);
					playPause.setImageDrawable(pauseImage);
					isPlayingTimeMachine = true;
					socket.emit("play");
				}
				 
			}
		});
    	//fixedLocations.setVisibility(View.INVISIBLE);
    	/*
    	// Create an animation for grid view
    	final ScaleAnimation gridViewUpScaleAnimation = new ScaleAnimation(0.0f,1.0f,0.0f,1.0f,Animation.RELATIVE_TO_SELF,0.0f,Animation.RELATIVE_TO_SELF,1.0f);
    	final ScaleAnimation gridViewDownScaleAnimation = new ScaleAnimation(1.0f,0.0f,1.0f,0.0f,Animation.RELATIVE_TO_SELF,0.0f,Animation.RELATIVE_TO_SELF,1.0f);
    	gridViewUpScaleAnimation.setDuration(500);
    	gridViewDownScaleAnimation.setDuration(500);
    	*/
    	// Add on click handler to the grid button
    	ImageButton gridShow = (ImageButton) findViewById(R.id.exploreButton);
    	gridShow.setVisibility(View.INVISIBLE);
    	/*
    	gridShow.setOnClickListener(new View.OnClickListener() {
			
			@Override
			public void onClick(View v) {
				if(!isGridVisible) {
					
					fixedLocations.setVisibility(View.VISIBLE);
					fixedLocations.startAnimation(gridViewUpScaleAnimation);
					isGridVisible = true;
					
					//Disable the map gestures
					mMap.getUiSettings().setZoomGesturesEnabled(false);
			    	mMap.getUiSettings().setScrollGesturesEnabled(false);
			    	
				}
				else {
					fixedLocations.setVisibility(View.INVISIBLE);
					fixedLocations.startAnimation(gridViewDownScaleAnimation);
					isGridVisible = false;
					
					//Enable the map gestures
					mMap.getUiSettings().setZoomGesturesEnabled(true);
			    	mMap.getUiSettings().setScrollGesturesEnabled(true);
				}
				
			}
		});
		*/
    	/*
    	// Add onClickListener to the location buttons
    	View.OnClickListener locationButtonListener = new View.OnClickListener() {
			
			@Override
			public void onClick(View v) {
				String location[] = ((String) v.getContentDescription()).split(",");
				socket.emit("mapZoomTo", (String)v.getContentDescription());
				
				// Also set the location of the map to this position
				mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(Double.parseDouble(location[0]),Double.parseDouble(location[1])), Float.parseFloat(location[2])), 4000, null);   
			}
		};
		*/
		/*
		 *  Attaching OnClickListener
		 *  TODO: There should be a better way of doing this
		 */
		/*
		findViewById(R.id.places1).setOnClickListener(locationButtonListener);
		findViewById(R.id.places2).setOnClickListener(locationButtonListener);
		findViewById(R.id.places3).setOnClickListener(locationButtonListener);
		findViewById(R.id.places4).setOnClickListener(locationButtonListener);
		findViewById(R.id.places5).setOnClickListener(locationButtonListener);
		findViewById(R.id.places6).setOnClickListener(locationButtonListener);
		findViewById(R.id.places7).setOnClickListener(locationButtonListener);
		findViewById(R.id.places8).setOnClickListener(locationButtonListener);
    	*/
    	
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
			}
		});
		
    }
    
}
