package com.timemachine.controller;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.preference.EditTextPreference;
import android.preference.PreferenceFragment;

public class SettingsFragment extends PreferenceFragment implements SharedPreferences.OnSharedPreferenceChangeListener {
    @Override
    public void onCreate(Bundle savedInstanceState) {
    	super.onCreate(savedInstanceState);

    	// Load the preferences from an XML resource
    	addPreferencesFromResource(R.xml.preferences);
    	
        // Set listener for shared preference
    	getPreferenceManager().getSharedPreferences().registerOnSharedPreferenceChangeListener(this);
    	
        // Set version
        String version = "";
        try {
        	version = getActivity().getPackageManager().getPackageInfo(getActivity().getPackageName(), 0).versionName;
        	findPreference(getString(R.string.key_version)).setSummary(version);
        } catch (Exception e) {
        	e.printStackTrace();
        }  
    }
    
    @Override
    public void onSharedPreferenceChanged(SharedPreferences sharedPreferences, String key) {
    	if(key.equals(getString(R.string.key_doAutoMode))) {
    		boolean doAutoMode = sharedPreferences.getBoolean(key, true);
    		System.out.println(key + ": " + doAutoMode);
    		try {
    			ControllerActivity.locations.loadUrl("javascript:setDoAutoMode(" + doAutoMode + ")");
    		} catch(Exception e) {
    			e.printStackTrace();
    		}
    	} else if (key.equals(getString(R.string.key_screenIdleTime))) {
    		String screenIdleTime_str = validateInput(sharedPreferences, getString(R.string.defaultScreenIdleTime), key);
    		int screenIdleTime = Integer.parseInt(screenIdleTime_str);
    		System.out.println(key + ": " + screenIdleTime);
    		try {
    			ControllerActivity.locations.loadUrl("javascript:setScreenIdleTime(" + screenIdleTime * 1000 + ")");
    		} catch(Exception e) {
    			e.printStackTrace();
    		}    		
    	} else if (key.equals(getString(R.string.key_autoModeDelayTime))) {
    		String autoModeDelayTime_str = validateInput(sharedPreferences, getString(R.string.defaultAutoModeDelayTime), key);
    		int autoModeDelayTime = Integer.parseInt(autoModeDelayTime_str);
    		System.out.println(key + ": " + autoModeDelayTime);
    		try {
    			ControllerActivity.locations.loadUrl("javascript:setAutoModeDelayTime(" + autoModeDelayTime * 1000 + ")");
    		} catch(Exception e) {
    			e.printStackTrace();
    		}      		
    	}
    }
    
    private String validateInput(SharedPreferences sharedPreferences, String defaultValue, String key) {
		String input = sharedPreferences.getString(key, defaultValue);
		if(input.isEmpty()) {
			input = defaultValue;
			EditTextPreference edp = (EditTextPreference) findPreference(key);
			edp.setText(input);
		}
		return input;
    }
    
}
