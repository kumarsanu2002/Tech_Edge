let domainsStorageKey = "timely-domains";
let saveDataInterval = 30;

//background data
var data = {
  startTime: new Date(),
  totalTime: 0,
  browserFocus: true,
  activeState: "active",
  domains: {}
};

//user alert settings
var alert = {
  set: false,
  time: 0
};

getDomainsFromStorage();
getAlertSettings();

/**
* Gets the list of domains from chrome.storage and adds them to `data.domains`
* to keep track of the number of seconds spent on each.
*/
function getDomainsFromStorage() {
  chrome.storage.sync.get(domainsStorageKey, function(result) {
      var domainsList = result[domainsStorageKey];
      if(domainsList === undefined) return;
      for(var i = 0; i < domainsList.length; i++) {
        data.domains[domainsList[i]] = 0;
      }
  });

}

/**
* Gets the current alert settings from chrome storage and sets the `alert` object.
*/
function getAlertSettings() {
  chrome.storage.sync.get("alertOptions", function(result) {

    if(!result.hasOwnProperty("alertOptions")) return;

    alert.set = result["alertOptions"]["setAlerts"];

    if(alert.set) {
      alert.time = result["alertOptions"]["seconds"] + result["alertOptions"]["minutes"] * 60 + result["alertOptions"]["hours"] * 60 * 60;
    }

  });

}

/**
* Adds current domain data, start time, and total time to chrome.storage, then
* clears the total timer and timer for all domains.
*/
function restartTimer() {

  saveData();

  data.startTime = new Date().toString();

  data.totalTime = 0;

  for(var domain in data.domains) {
    data.domains[domain] = 0;
  }
}

/**
* Updates the timer if Chrome is in focus and active state is "active".
* Total timer is incremented by 1 and if the current active tab domain
* is in `data.domains`, its timer is incremented by 1 as well.
*/
function updateTime() {
  if(!data.browserFocus) return;
  if(data.activeState !== "active") return;

  //if timer goes past 24 hours
  if(data.totalTime >= 60 * 60 * 24) restartTimer();

  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    if(tabs.length === 0) return;
    data.totalTime++;
    let url = new URL(tabs[0].url);
    let hostname = url.hostname;

    if(data.domains.hasOwnProperty(hostname)) {
      data.domains[hostname]++;
      if(alert.set && alert.time !== 0 && data.domains[hostname] === alert.time) {
        var alertCode = "alert('You have spent " + Math.round((data.domains[hostname]/(data.totalTime)) * 100) + "% of your time on " + hostname + ". Get back to work!')";
        chrome.tabs.executeScript({code: alertCode}, function() {
          if(chrome.runtime.lastError) return;
        });

      }
    }

  });
}

/**
* Adds domain to `data.domains` chrome.storage and `data.domains` and creates a new timer for it.
* @param domain     String, domain to add
*/
function addWebsite(domain) {

  if(!data.domains.hasOwnProperty(domain)) {
    data.domains[domain] = 0;
  }

  chrome.storage.sync.get(domainsStorageKey, function(result) {
      if(result.hasOwnProperty(domainsStorageKey)) {
          result[domainsStorageKey].push(domain);
      } else {
        result[domainsStorageKey] = [domain];
      }

      chrome.storage.sync.set(result, function() {
        console.log("domained saved to local storage");
      });

  });

}

/**
* Deletes domain from `data.domains` and chrome.storage.
* @param domain     String, domain to delete
*/
function deleteWebsite(domain) {
  if(data.domains.hasOwnProperty(domain)) {
    delete data.domains[domain];
  }

  chrome.storage.sync.get(domainsStorageKey, function(result) {
      result[domainsStorageKey].splice(result[domainsStorageKey].indexOf(domain), 1);
      chrome.storage.sync.set(result, function() {
        console.log("domained deleted from local storage");
      });

  });

}

/**
* If save data option is selected, saves current data including startTime, totalTime, and domain data to chrome storage.
* @param callback     optional callback function, called after current data is saved to storage
*/
function saveData(callback) {

  chrome.storage.sync.get("saveDataOption", function(result) {
    if(!result["saveDataOption"]["value"]) return;

    var dataCopy = Object.assign({}, data);
    var startTimeString = dataCopy.startTime.toString().substring(0, dataCopy.startTime.toString().indexOf("GMT"));

    chrome.storage.sync.get("timelyData", function(result) {
        if(!result.hasOwnProperty("timelyData"))
            result["timelyData"] = {};

        result["timelyData"][startTimeString] = {totalTime: dataCopy.totalTime, domains: dataCopy.domains};

        chrome.storage.sync.set(result, function() {
          if(callback) callback();
        });
    });
  });

}


function setAlert(checked) {
  alert.set = checked;
}


function updateAlertTiming(numSeconds) {
  alert.time = numSeconds;
}

chrome.idle.setDetectionInterval(30);

chrome.idle.onStateChanged.addListener(function(newState) {
    chrome.storage.sync.get("restartTimerOnLock", function(result) {
      if(result.hasOwnProperty("restartTimerOnLock") && result["restartTimerOnLock"] && newState === "locked") restartTimer();
      data.activeState = newState;
    });
});


chrome.windows.onFocusChanged.addListener(function(windowId) {
    data.browserFocus = windowId !== chrome.windows.WINDOW_ID_NONE;
});

setInterval(updateTime, 1000);

//saves current data every saveDataInterval seconds just in case chrome closes or crashes before
//user resets timer
setInterval(saveData, 1000 * saveDataInterval);
