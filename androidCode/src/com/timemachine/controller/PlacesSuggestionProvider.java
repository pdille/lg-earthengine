package com.timemachine.controller;

import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.SearchManager;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.provider.BaseColumns;

public class PlacesSuggestionProvider extends ContentProvider {
	// Suggestion variables
    public static final String AUTHORITY = "com.timemachine.controller.PlacesSuggestionProvider.provider";
    public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/search");
    private static final int SEARCH_SUGGEST = 1;    
    private static final UriMatcher uriMatcher;    
    private static final String[] SEARCH_SUGGEST_COLUMNS = {
        BaseColumns._ID,
        SearchManager.SUGGEST_COLUMN_TEXT_1,
        SearchManager.SUGGEST_COLUMN_INTENT_EXTRA_DATA,
    };    
    static {
    	uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);
    	uriMatcher.addURI(AUTHORITY, SearchManager.SUGGEST_URI_PATH_QUERY, SEARCH_SUGGEST);
    	uriMatcher.addURI(AUTHORITY, SearchManager.SUGGEST_URI_PATH_QUERY + "/*", SEARCH_SUGGEST);
    }
   
    // Autocomplete variables
    private static final String PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
    private static final String TYPE_AUTOCOMPLETE = "/autocomplete";
    private static final String OUT_JSON = "/json";
    
	@Override
	public int delete(Uri arg0, String arg1, String[] arg2) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public String getType(Uri arg0) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Uri insert(Uri arg0, ContentValues arg1) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean onCreate() {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
	    // Use the UriMatcher to see what kind of query we have
        switch (uriMatcher.match(uri)) {
            case SEARCH_SUGGEST:
                String query = uri.getLastPathSegment().toLowerCase();
                System.out.println("Cursor: " + query); 
                System.out.println("autocomplete(query)");                
                if(query.isEmpty() || query.equals("search_suggest_query")) return null;
                ArrayList<String> autocompleteList = autocomplete(query);
                System.out.println(autocompleteList.size() + ": " + autocompleteList);              
                MatrixCursor cursor = new MatrixCursor(SEARCH_SUGGEST_COLUMNS, 1);
                for (int i=0; i<5; i++) {
                	String result = autocompleteList.get(i);
                    cursor.addRow(new String[] {
                            "1", result, result
                    });                	
                }               
                return cursor;
            default:
                throw new IllegalArgumentException("Unknown Uri: " + uri);
        }
	}

	@Override
	public int update(Uri arg0, ContentValues arg1, String arg2, String[] arg3) {
		// TODO Auto-generated method stub
		return 0;
	}

	private ArrayList<String> autocomplete(String input) {
		String API_KEY;
		if (BuildConfig.DEBUG)
			API_KEY = getMetadata(getContext(), "com.google.server.API_KEY.development");
		else
			API_KEY = getMetadata(getContext(), "com.google.server.API_KEY.production");
		
		System.out.println("BuildConfig.DEBUG: " + BuildConfig.DEBUG);
		System.out.println("API_KEY: " + API_KEY);

	    ArrayList<String> resultList = null;
	    HttpURLConnection conn = null;
	    StringBuilder jsonResults = new StringBuilder();
	    
	    try {
	        StringBuilder sb = new StringBuilder(PLACES_API_BASE + TYPE_AUTOCOMPLETE + OUT_JSON);
	        sb.append("?sensor=false&key=" + API_KEY);
	        sb.append("&input=" + URLEncoder.encode(input, "utf8"));

	        URL url = new URL(sb.toString());
	        conn = (HttpURLConnection) url.openConnection();
	        InputStreamReader in = new InputStreamReader(conn.getInputStream());

	        // Load the results into a StringBuilder
	        int read;
	        char[] buff = new char[1024];
	        while ((read = in.read(buff)) != -1) {
	            jsonResults.append(buff, 0, read);
	        }
	    } catch (MalformedURLException e) {
	        System.out.println("Error processing Places API URL: " + e);
	        return resultList;
	    } catch (IOException e) {
	    	System.out.println("Error connecting to Places API: " + e);
	        return resultList;
	    } finally {
	        if (conn != null) {
	            conn.disconnect();
	        }
	    }

	    try {
	        // Create a JSON object hierarchy from the results
	        JSONObject jsonObj = new JSONObject(jsonResults.toString());
	        JSONArray predsJsonArray = jsonObj.getJSONArray("predictions");

	        // Extract the Place descriptions from the results
	        resultList = new ArrayList<String>(predsJsonArray.length());
	        for (int i = 0; i < predsJsonArray.length(); i++) {
	            resultList.add(predsJsonArray.getJSONObject(i).getString("description"));
	        }
	    } catch (JSONException e) {
	    	System.out.println("Cannot process JSON results: " + e);
	    }

	    return resultList;
	}	
	
	public static String getMetadata(Context context, String name) {
		try {
			ApplicationInfo appInfo = context.getPackageManager().getApplicationInfo(
					context.getPackageName(), PackageManager.GET_META_DATA);
			if (appInfo.metaData != null) {
				return appInfo.metaData.getString(name);
			}
		} catch (PackageManager.NameNotFoundException e) {
		// if we can¡¦t find it in the manifest, just return null
		}
		return null;
	}	
}
