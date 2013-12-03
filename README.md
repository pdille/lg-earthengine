#lg-earthengine

1. [Setting up the master machine](#setup)
2. [Running the node.js server on the master](#run)
3. [Syncing up other machines](#sync)
4. [Installing the Android app](#installApp)

#### [Screenshots for the tablet controller](https://sites.google.com/a/gigapan.org/timelapse/creating-time-machines/time-machine-controller-for-hyperwall)

<a name="setup"></a>
## Setting up the master machine:
Download node.js and install it from http://nodejs.org/download/.

<a name="run"></a>
## Running the node.js server on the master:
- **Download the lg-earthengine code from github.**
  ```
  git clone https://github.com/pdille/lg-earthengine.git
  ```
  OR [download a zip from GitHub](https://github.com/pdille/lg-earthengine/archive/master.zip)

- **In a terminal, go to the lg-earthengine code folder on the master machine and start the server by typing:**
  
  ```
  node server.js
  ```

- **Go to a browser (Chrome recommended) on the master machine and type in the following address:**
  ```
  http://localhost:8080/hyperwall.html?master=true&showControls=true&fullControls=true&showMap=true&mapPosition=topRight
  ```

- **Settings after [http://localhost:8080/hyperwall.html?]()**
  - master = (true|false; is a master machine or not)
  - showControls = (true|false; show the control bar or not)
  - fullControls = (true|false; show the play/help button or not)
  - showMap = (true|false; show the google map or not)
  - mapPosition = (topRight|topLeft|bottomRight|bottomLeft; set the map position)

<a name="sync"></a>
## Syncing up other machines:
- **Connect each browser to the master**

  Go to the machine with a display to the right of the master and in your browser point to the following address:
  ```
  http://192.168.1.2:8080/hyperwall.html?yawOffset=1
  ```
  This assumes the IP address of the master machine is 192.168.1.2.
  
- **Setting up a 3x3 hyperwall:**

  After [http://192.168.1.2:8080/hyperwall.html?](), enter the following:
  - yawOffset=1 (right of the master)
  - yawOffset=-1 (left of the master)
  - pitchOffset=-1 (above the master)
  - pitchOffset=1 (below the master)
  - yawOffset=1&pitchOffset=-1 (top right corner)
  - yawOffset=-1&pitchOffset=-1 (top left corner)
  - yawOffset=1&pitchOffset=1 (bottom right corner)
  - yawOffset=-1&pitchOffset=1 (bottom left corner)

  pitchOffset is for above/below the master. Negative is above and positive is below. yawOffset is for left/right of the master. Negative is to the left and positive is to the right.

<a name="installApp"></a>
## Installing the Android app
- **[Download Android App](https://github.com/pdille/lg-earthengine/blob/master/androidCode/bin/TimemachineController.apk?raw=true)**

  Download the apk file from the tablet and install it. You have to enable the following on your tablet to install the app.
  ```
  settings -> security -> device administration -> unknown sources
  ```

- **Set up the node server first** 

  The node server on the master machine needs to be running before you start the app. In addition, the Android tablet and the master machine need to be on the same network. Once you start the app, it will ask you the IP address of the master machine, e.g. 192.168.1.2. Once you enter the IP address, the tablet will be connected. The address will be saved for future runs of the app.
