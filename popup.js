var background = chrome.extension.getBackgroundPage();

//Event Listeners
document.addEventListener("DOMContentLoaded", function() {

  loadDomains();

  document.getElementById("tab-button").addEventListener("click", function(e) {
    switchPage(e.target.innerHTML);
  });

  document.getElementById("restart-button").addEventListener("click", function() {
      background.restartTimer();
  });

  document.getElementById("add-website").addEventListener("click", function() {
      addWebsite();
  });

  document.getElementById("download-link").addEventListener("click", function() {
      createCSVFile();
  });

  chrome.runtime.getBackgroundPage(function(background) {
    setInterval(function() {
      document.getElementById("total-timer").textContent = getTimeString(background.data.totalTime);

      for(var domain in background.data.domains) {
        document.getElementById(domain + "-timer").textContent = getTimeString(background.data.domains[domain]);
        document.getElementById(domain + "-percentage").textContent = getPercentage(background.data.domains[domain], background.data.totalTime);
      }

    }, 1000);
  });
});

/**
* Loads the list of websites and time information when popup is opened.
*/
function loadDomains() {
  var websitesList = document.getElementById("websites");
  var emptyListElement = websitesList.querySelector("li");
  if(Object.keys(background.data.domains).length > 0 && emptyListElement !== null) {
     websitesList.removeChild(emptyListElement);
  }

  for(var domain in background.data.domains) {
    addHTMLForWebsiteEntry(domain);
  }

}

/**
* Switches page based on `buttonValue`. If `buttonValue` is "options",
* switches to options page. If `buttonValue` is "timely", switches to
* main page.
*/
function switchPage(buttonValue) {

  var tabButton = document.getElementById("tab-button");

  if(buttonValue === "options") {
    document.getElementById("timely").style["display"] = "none";
    document.getElementById("options").style["display"] = "block";
    tabButton.textContent = "trackedge";
    tabButton.style["color"] = "red";
  } else {
    document.getElementById("timely").style["display"] = "block";
    document.getElementById("options").style["display"] = "none";
    tabButton.textContent = "options";
    tabButton.style["color"] = "grey";
  }
}

/**
* Adds domain to list of websites to track.
*/
function addWebsite() {

  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    let url = new URL(tabs[0].url);
    let domain = url.hostname;

    if(background.data.domains.hasOwnProperty(domain)) return;

    if(Object.keys(background.data.domains).length === 0) {
      var websitesList = document.getElementById("websites");
      var emptyListElement = websitesList.querySelector("li");
      if(emptyListElement !== null) {
         websitesList.removeChild(emptyListElement);
      }
    }

    background.addWebsite(domain);

    addHTMLForWebsiteEntry(domain);

  });

}

/**
* Deletes the specified domain from the list of websites to track.
* @param domain     String, domain to delete
*/
function deleteWebsite(domain) {

  var timelyDiv = document.getElementById("timely");

  background.deleteWebsite(domain);

  var newList = document.createElement("ul");
  newList.id = "websites";

  timelyDiv.replaceChild(newList, document.getElementById("websites"));

  loadDomains();
}

/**
* Creates a new `li` element with domain name, timer, and percentage of time spent on the website.
* @param domain       String
*/
function addHTMLForWebsiteEntry(domain) {

  var htmlString = "<li class = 'website-entry'>" +
                  "<button class=delete-button id=" + domain + ">x</button>" +
                  "<div class = 'domain'>" + domain + "</div>" +
                  "<div id=" + domain + "-timer>" + getTimeString(background.data.domains[domain]) + "</div>" +
                  "<div id=" + domain + "-percentage>" + getPercentage(background.data.domains[domain], background.data.totalTime) + "</div>"
                  "</li>";

  document.getElementById("websites").insertAdjacentHTML("beforeend", htmlString);

  document.getElementById(domain).addEventListener("click", function(e) {
    deleteWebsite(e.target.id);
  });

}

/**
* Creates and downloads a CSV file of timer data from chrome.storage.
*/
function createCSVFile() {

  background.saveData(function() {
    chrome.storage.sync.get("timelyData", function(result) {
      let timelyData = result["timelyData"];

      let csvString = createCSVString(timelyData);

      let fileName = "timely_data.csv";

      var data = encodeURI(csvString);

      var downloadLink = document.createElement("a");
      downloadLink.setAttribute("href", data);
      downloadLink.setAttribute("download", fileName);
      downloadLink.click();

      //if user has selected to delete downloaded data, clear the data
      chrome.storage.sync.get("saveDataOption", function(result) {
        if(result["saveDataOption"]["deletePrevious"]) {
          chrome.storage.sync.remove("timelyData", function() {
            if(chrome.runtime.lastError)
              console.log("Error deleting previous data.");
            else
              console.log("Previous data deleted.");
          });
        }
      });
    });
  });

}

/**
* Creates a string for the downloadable CSV file using data from
* chrome.storage.
* @param timelyData     Array of objects, each object represents a different timer
* @return String
*/
function createCSVString(timelyData) {

  let columnDelimiter = ",";
  let rowDelimiter = "\n";
  var csvString = "Domains" + columnDelimiter;
  let allDomainData = getAllDomainData(timelyData);

  var i = 0;

  for(var startTime in timelyData) {
    csvString += startTime;
    if(i++ < Object.keys(timelyData).length - 1) csvString += columnDelimiter;
  }

  csvString += rowDelimiter;

  for(var domain in allDomainData)
    csvString += domain + columnDelimiter + allDomainData[domain].join(columnDelimiter) + rowDelimiter;

  csvString = "data:text/csv;charset=utf-8," + csvString;

  return csvString;
}

/**
* Fetches time.ly data from chrome storage and creates an object to store
* all domains and their time spent percentages for each timer.
* @param result     Object, chrome.storage object
* @return Object
*/
function getAllDomainData(timelyData) {
  var allDomainData = {};

  //add all domains seen in every timer to allDomainData
  for(var startTime in timelyData) {
    var domainDataForTimer = timelyData[startTime]["domains"];
    for(var domain in domainDataForTimer) {
      if(!allDomainData.hasOwnProperty(domain))
        allDomainData[domain] = [];
    }
  }

  //add time spent percentages for each domain
  //if any domain is not present in a specific timer, "N.A." is used instead
  for(var startTime in timelyData) {
    var domainDataForTimer = timelyData[startTime]["domains"];
    for(var domain in allDomainData) {
      if(domainDataForTimer.hasOwnProperty(domain))
        allDomainData[domain].push(getPercentage(domainDataForTimer[domain], timelyData[startTime]["totalTime"]));
      else
        allDomainData[domain].push("N.A.");
    }
  }

  return allDomainData;
}

/**
* Creates a new timer string for the input number of seconds. For example, 68 seconds would
* output the timer string "00:01:08".
* @param numSeconds     int
* @return String
*/
function getTimeString(numSeconds) {
  let secondsPerUnit = [3600, 60, 1];

  var timeString = "";

  for(var i = 0; i < secondsPerUnit.length; i++) {
    var numUnits = Math.floor(numSeconds / secondsPerUnit[i]);

    timeString += stringify(numUnits);

    if(i < secondsPerUnit.length - 1) timeString += ":";

    numSeconds %= secondsPerUnit[i];
  }

  return timeString;

}

function getPercentage(numSeconds, totalTime) {
  return Math.round((numSeconds/(totalTime === 0 ? 1 : totalTime)) * 100) + "%";
}

/**
* Returns a String for the input number including one leading zero (if necessary).
* @param num      int
* @return String
*/
function stringify(num) {
  if(num < 10)
    return "0" + num.toString();
  else
    return num.toString();
}
