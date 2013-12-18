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
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
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
    private SharedPreferences prefs = null;
    public ImageButton playPause;
    private double lastLat = 0;
    private double lastLng = 0;
    private double lastZoom = 0;
    double roundTo = 1000000;
    private String ipText;
    private AlertDialog connectDialog;
    private AlertDialog disconnectDialog;
    private String connectDialogTitle = "Connect to server";
    private String processDialogTitle;
    private ProgressDialog processDialog;
    private boolean isContentViewExist = false;
    // Time Machine zoom starts from 0, while google map starts from 1
    float timeMachineAndGoogleMapZoomOffset = 1.44f;
    public static WebView locations;
    private boolean isAutoModeDelayTimeoutRunning = false;
    private int reconnectCounter = 0;
    private int maxReconnectCounter = 5;
    private Timer cancelPreviousZoomingTimer = new Timer();
    // Need to set the value to null and do a null check before killing the task
    // or the thread dies without throwing errors and the code after .cancel() never gets run
    private TimerTask cancelPreviousZoomingTimerTask = null;
    TextView searchTextView;
    
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
            default:
                return super.onOptionsItemSelected(item);
        }
    }
 
    private void openSettings() {
    	Intent intent = new Intent();
    	intent.setClass(ControllerActivity.this, SettingsActivity.class);
    	startActivityForResult(intent, 0);
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
                	   // Calling disconnect() without immediately calling setupSocketConnection()
                	   // will begin to introduce lag into the App. It seems that CPU usage never decreases.
                	   // Therefore the App becomes unusable after many disconnects.
                	   // To avoid this problem, we call setupSocketConnection() without calling disconnect().
                	   // We *should* call disconnect to free up the sockets, but because of the above issue we can't.
                	   // Maybe another socket library will help. 
                	   //socket.disconnect();
                	   showConnectDialog("Disconnected! Connect again.");
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
                if(socket != null)
                	setupSocketConnection(ipText);
                reconnectCounter++;
                if(reconnectCounter == 1) {
	            	Timer t = new Timer();
	            	t.schedule(new TimerTask() {
	            	            @Override
	            	            public void run() {
	            	                if(reconnectCounter >= maxReconnectCounter) {
	            	                	reconnectCounter = 0;
	            	                	socket = null;
	            	                	showConnectDialog("Error! Connect again.");
	            	                }
	               	            }
	            	        }, 30000);
                }
            }
            @Override
            public void onDisconnect() {
                System.out.println("Connection terminated.");
                //showConnectDialog("Disconnected! Connect again.");
            }
            @Override
            public void onConnect() {
                System.out.println("Connection established");
                reconnectCounter = 0;
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
    
    @JavascriptInterface
    public void setIsAutoModeDelayTimeoutRunning(boolean newStatus) {
    	isAutoModeDelayTimeoutRunning = newStatus;
    }   

	@Override 
	public boolean dispatchTouchEvent(MotionEvent event) 
	{
		// Detect the general touch event of the entire screen
		if(event.getAction() == MotionEvent.ACTION_DOWN) {
			System.out.println(event);
			try {
				locations.loadUrl("javascript:stopScreenIdleTimeout()");
			} catch(Exception e) {
				e.printStackTrace();
			}
		}
		if(!isAutoModeDelayTimeoutRunning && event.getAction() == MotionEvent.ACTION_UP) {
			System.out.println(event);
			try {
				locations.loadUrl("javascript:startScreenIdleTimeout()");
			} catch(Exception e) {
				e.printStackTrace();
			}
		}		
		return super.dispatchTouchEvent(event);
	}    
    
    private void setupUI() {   	
        // Call controller.html
		controllerURL = "http://" + ipText + ":8080/controller.html";
		locations = (WebView) findViewById(R.id.webview);
		locations.setBackgroundColor(Color.TRANSPARENT);
		locations.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
		locations.setWebViewClient(new WebViewClient() {
        	public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        		System.out.println("onReceivedError");
        		showConnectDialog("Error while connecting to controller.");
        	}  
            @Override
            public void onPageFinished(WebView view, String url) {
            	if (url.contains(controllerURL))
            		loadPreferences();
                super.onPageFinished(view, url);
            }
        });
		try {
			locations.loadUrl(controllerURL);
		} catch(Exception e) {
			e.printStackTrace();
		}
		
		locations.addJavascriptInterface(this, "androidObject");
		WebSettings webSettings = locations.getSettings();
		webSettings.setJavaScriptEnabled(true);
    		
    	playPause = (ImageButton) findViewById(R.id.playPauseButton);
    	playPause.setOnClickListener(new View.OnClickListener() {			
			@Override
			public void onClick(View v) {
				socket.emit("handlePlayPauseServer");
			}
		});	
    	socket.emit("setControllerPlayButton");
    	setUpMapIfNeeded();
    }
    
    private void loadPreferences() {
    	Boolean doAutoMode = prefs.getBoolean(getString(R.string.key_doAutoMode), Boolean.parseBoolean(getString(R.string.defaultDoAutoMode)));
    	String screenIdleTime = prefs.getString(getString(R.string.key_screenIdleTime), getString(R.string.defaultScreenIdleTime));
    	String autoModeDelayTime = prefs.getString(getString(R.string.key_autoModeDelayTime), getString(R.string.defaultAutoModeDelayTime));
		try {
			locations.loadUrl("javascript:setDoAutoMode(" + doAutoMode + ")");
			locations.loadUrl("javascript:setScreenIdleTime(" + Integer.parseInt(screenIdleTime) * 1000 + ")");
			locations.loadUrl("javascript:setAutoModeDelayTime(" + Integer.parseInt(autoModeDelayTime) * 1000 + ")");
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
