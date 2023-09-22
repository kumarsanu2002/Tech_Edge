//Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  setOptionValues();

  document.getElementById("options").querySelectorAll("input[type='checkbox']").
    forEach(function(checkbox) {
      checkbox.addEventListener("change", function(e) {
        if(e.target.parentElement.id === "save-data") {
          setSaveDataOption(e.target.checked);
        } else if(e.target.parentElement.id === "delete-previous") {
          chrome.storage.sync.set({saveDataOption:{value: true, deletePrevious: e.target.checked}}, function() {});
        } else if(e.target.parentElement.id === "restart-on-lock") {
          chrome.storage.sync.set({restartTimerOnLock: e.target.checked}, function() {});
        } else {
          setAlertOption(e.target.checked);
          background.setAlert(e.target.checked);
        }
    });

    document.getElementById("alert-settings").addEventListener("change", function() {
      document.getElementById("alert-settings").querySelector("button").style["color"] = "darkblue";
      document.getElementById("alert-settings").querySelector("button").textContent = "Set Alerts";
    });

    document.getElementById("alert-settings").addEventListener("submit", function(e) {
      e.preventDefault();
      setAlertTimingOptions();
      document.getElementById("alert-settings").querySelector("button").style["color"] = "green";
      document.getElementById("alert-settings").querySelector("button").textContent = "Alert set!";

    });

  });
});

/**
* Sets and saves the alert timing settings based on user input.
*/
function setAlertTimingOptions() {
  var form = document.getElementById("alert-settings");
  var inputs = form.getElementsByTagName("input");

  //make the value of empty inputs (if any) equal to "0"
  for(var i = 0; i < inputs.length; i++) {
    if(inputs[i].value.length < 1) inputs[i].value = "0";
  }

  var newSettings = {setAlerts: true, seconds: parseInt(inputs[0].value), minutes: parseInt(inputs[1].value), hours: parseInt(inputs[2].value)};

  background.updateAlertTiming(newSettings.seconds + newSettings.minutes * 60 + newSettings.hours * 60 * 60);

  chrome.storage.sync.set({alertOptions: newSettings}, function(){});
}

/**
* Modifies CSS "display" attribute of the alert settings form based `checked`.
* Saves the current `checked` attribute in chrome.storage.
* @param checked    boolean, whether or not the set alert checkbox is checked
*/
function setAlertOption(checked) {
  if(checked) {
    document.getElementById("alert-settings").style["display"] = "block";
  } else {
    document.getElementById("alert-settings").style["display"] = "none";
  }

  chrome.storage.sync.get("alertOptions", function(result) {
    result["alertOptions"]["setAlerts"] = checked;
    chrome.storage.sync.set(result, function(){});
  });
}


/**
* Modifies CSS attributes of DOM elements based on whether or not the save data option is checked.
* Stores the current `checked` attribute in chrome storage.
* @param checked    boolean, whether or not the save data checkbox is checked
*/
function setSaveDataOption(checked) {
  if(checked) {
    document.getElementById("delete-previous").style["display"] = "block";
    document.getElementById("download-link").style["display"] = "block";
  } else {
    document.getElementById("delete-previous").style["display"] = "none";
    document.getElementById("download-link").style["display"] = "none";
  }

  chrome.storage.sync.get("saveDataOption", function(result) {
    result["saveDataOption"]["value"] = checked;
    chrome.storage.sync.set(result, function(){});
  });
}

/**
* Gets user's settings from chrome storage and sets DOM values.
*/
function setOptionValues() {
  getSaveDataOption();
  getRestartTimerOption();
  getAlertOptions();
}

/**
* Gets the user's save data setting from chrome storage and sets DOM values.
*/
function getSaveDataOption() {
  chrome.storage.sync.get("saveDataOption", function(result) {
    if(!result.hasOwnProperty("saveDataOption")) {
      result["saveDataOption"] = {value: true, deletePrevious: true};
      chrome.storage.sync.set(result, function(){});
    }

    document.getElementById("save-data").querySelector("input").checked = result["saveDataOption"]["value"];

    if(result["saveDataOption"]["value"]) {
      var deletePreviousCheckbox = document.getElementById("delete-previous");
      deletePreviousCheckbox.style["display"] = "block";
      deletePreviousCheckbox.querySelector("input").checked = result["saveDataOption"]["deletePrevious"];

      document.getElementById("download-link").style["display"] = "block";
    }

  });
}

/**
* Gets the user's restart timer setting from chrome storage and sets DOM value. The restart timer setting
* is used to determine whether or not to restart timer after the user's system becomes locked.
*/
function getRestartTimerOption() {
  chrome.storage.sync.get("restartTimerOnLock", function(result) {
    if(!result.hasOwnProperty("restartTimerOnLock")) {
      result["restartTimerOnLock"] = true;
      chrome.storage.sync.set(result, function(){});
    }

    document.getElementById("restart-on-lock").querySelector("input").checked = result["restartTimerOnLock"];

  });
}

/**
* Gets the user's alert settings from chrome storage and sets DOM values.
*/
function getAlertOptions() {
  chrome.storage.sync.get("alertOptions", function(result) {
    if(!result.hasOwnProperty("alertOptions")) {
      result["alertOptions"] = {setAlerts: false, seconds: 0, minutes: 0, hours: 0};
      chrome.storage.sync.set(result, function(){});
    }

    document.getElementById("set-alert").querySelector("input").checked = result["alertOptions"]["setAlerts"];

    if(result["alertOptions"]["setAlerts"]) {
      document.getElementById("alert-settings").style["display"] = "block";
      var inputs = document.getElementById("alert-settings").getElementsByTagName("input");
      inputs[0].value = result["alertOptions"]["seconds"];
      inputs[1].value = result["alertOptions"]["minutes"];
      inputs[2].value = result["alertOptions"]["hours"];
    }

  });
}
