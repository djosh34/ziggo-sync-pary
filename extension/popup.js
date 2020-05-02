function runOnZiggoTab(tab) {

  //https://www.ziggogo.tv/nl/movies-series-xl/vod-asset.html/crid%3A~~2F~~2Fupc.com~~2Fd87a213c-1d1b-409b-93b6-fa6649c9e3db/afl-01-the-original/crid%3A~~2F~~2Fupc.com~~2F38400~~2FAZIA0000000000659591/the-original.html#action=watch&offset=563


  const ZIGGO_WATCH_REGEX = /ziggogo\.tv\/.*#action=watch*/gi;
  const WATCH_TRACK_REGEX = /nl\/.*#action=watch*/gi;
  const STANDARD_URL = "https://www.ziggogo.tv/";
  const GMT_TIMESTAMP_REGEX = /\d.*/gi;
  const SYNC_GMT_TIMESTAMP_PARAM = 'syncGMTTimestampSec';
  const SYNC_GMT_TIMESTAMP_REGEX = new RegExp('[\\?&]' + SYNC_GMT_TIMESTAMP_PARAM + '=([^&#]*)');

  const USE_NETWORK_TIME = false; // TODO: FIX WITHIN POPUP
  const GMT_URL = 'https://worldtimeapi.org/api/timezone/Europe/London';
  const EXTENSION_LINK = '';

  const MS_IN_SEC = 1000;
  const WAIT_TILL_RELOAD = 500;

  const url = tab.url;

  

  // hide all possible views, then show the one we want to view
  document.getElementById('synced-video-view').hidden = true
  document.getElementById('unsynced-video-view').hidden = true;
  document.getElementById('non-video-view').hidden = true;

  let trackID = null;

  if (ZIGGO_WATCH_REGEX.test(url)) {

    // how far ahead actual time is relative to system time
    let currentTimeToActualGMTOffset = 0;

    // try to update currentTimeToActualGMTOffset
    fetch(GMT_URL)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.unixtime) {
          currentTimeToActualGMTOffset = data.unixtime - Date.now() / MS_IN_SEC;
        }
      });

    


    if (SYNC_GMT_TIMESTAMP_REGEX.test(url)) {
      document.getElementById('synced-video-view').hidden = false;

      // document.getElementById('resync').addEventListener('click', () => {
      //   chrome.tabs.reload(tab.id);
      // });


      document.getElementById('watch-party-link-synced').innerHTML = url.replace('https://', '');
      document.getElementById('watch-party-link-synced').href = url;
      document.getElementById('watch-party-link-synced').addEventListener('click', () => {
        chrome.tabs.update({
          url: url
        }, () => {
          chrome.tabs.reload();
        });
        
      });

      document.getElementById('copy-on-synced-url').addEventListener('click', () => {
        navigator.clipboard.writeText(url);
      });

      document.getElementById('create-new-url').addEventListener('click', () => {


      

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {action: "getPlayer"}, (response) => {
            console.log(response.player);
            player = response.player;
          });
        });
        

        console.log(player);

        document.getElementById('start-time-select-prompt').hidden = true;
    
        const startTimeOffset = player.currentTime;
        const targetGMTTs = Date.now() / MS_IN_SEC + parseInt(startTimeOffset) + currentTimeToActualGMTOffset;
      
        document.getElementById('time-selector-dropdown').hidden = true;
        document.getElementById('selected-start-time-gmt').hidden = false;
        document.getElementById('selected-start-time-gmt').innerHTML = new Date(targetGMTTs * MS_IN_SEC).toLocaleString() + ' (Your Time Zone)';
      
        const watchPartyLink = STANDARD_URL + trackID + '&offset=0' + '&syncGMTTimestampSec=' + targetGMTTs;
        console.log(watchPartyLink);
        document.getElementById('copy-not-on-synced-url').hidden = false;
        document.getElementById('copy-not-on-synced-url').addEventListener('click', () => {
          navigator.clipboard.writeText(watchPartyLink);
        });
        chrome.tabs.update({
          url: watchPartyLink,
        }, () => {
          chrome.tabs.reload();
        });
      });


      // get track ID
      const trackID = WATCH_TRACK_REGEX.exec(url)[0];

      console.log("trackid ", trackID);

      document.getElementById('leave-party-url').addEventListener('click', () => {
        chrome.tabs.update({
          url: STANDARD_URL + trackID
        }, () => {
          chrome.tabs.reload();
        });
        
        window.close();
      });

      const timestampGMTMatch = SYNC_GMT_TIMESTAMP_REGEX.exec(url)[0];
      const timestampGMT = parseInt(GMT_TIMESTAMP_REGEX.exec(timestampGMTMatch)[0]) * MS_IN_SEC;

      document.getElementById('scheduled-start-time-gmt').innerHTML = new Date(timestampGMT).toLocaleString() + ' (Your Time Zone)';

    } else {
      document.getElementById('unsynced-video-view').hidden = false;

      // get track ID
      const trackID = WATCH_TRACK_REGEX.exec(url)[0];

      document.getElementById('copy-extension-link').addEventListener('click', () => {
        navigator.clipboard.writeText(EXTENSION_LINK);
      });

      let targetGMTTs = null;

      document.getElementById('time-selector-dropdown').addEventListener('change', () => {
        document.getElementById('start-time-select-prompt').hidden = true;
    
        const startTimeOffset = document.getElementById('time-selector-dropdown').value;
        const targetGMTTs = Date.now() / MS_IN_SEC + parseInt(startTimeOffset) + currentTimeToActualGMTOffset;
      
        document.getElementById('time-selector-dropdown').hidden = true;
        document.getElementById('selected-start-time-gmt').hidden = false;
        document.getElementById('selected-start-time-gmt').innerHTML = new Date(targetGMTTs * MS_IN_SEC).toLocaleString() + ' (Your Time Zone)';
      
        const watchPartyLink = STANDARD_URL + trackID + '&offset=0' + '&syncGMTTimestampSec=' + targetGMTTs;
        console.log(watchPartyLink);
        document.getElementById('copy-not-on-synced-url').hidden = false;
        document.getElementById('copy-not-on-synced-url').addEventListener('click', () => {
          navigator.clipboard.writeText(watchPartyLink);
        });
        chrome.tabs.update({
          url: watchPartyLink,
        }, () => {
          chrome.tabs.reload();
        });
      });
    }
  } else {
    document.getElementById('non-video-view').hidden = false;
  }
}





chrome.tabs.query({
  active: true,
  currentWindow: true
}, (tabs) => {
  // attach the extension logic to currently opened tab
  const targetTab = tabs[0];
  const targetTabID = targetTab.id;
  runOnZiggoTab(targetTab);

  // whenever the url of this tab changes, rerun this
  chrome.tabs.onUpdated.addListener((tabID, changeInfo, tab) => {
    if (tabID === targetTabID && changeInfo.status === 'complete') {
      runOnZiggoTab(tab);
    }
  });
});
