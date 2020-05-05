function embeddedCode() {
  // Have to define constants in this function since it needs to be serialized
  // to be embedded

  const MS_IN_SEC = 1000;

  const TIME_BEFORE_RUN = 5.0 * MS_IN_SEC; // Give Ziggo this much time to load

  const SYNC_GMT_TIMESTAMP_PARAM = 'syncGMTTimestampSec';
  const SYNC_GMT_NUM_TIMESTAMP_REGEX = new RegExp("[\\?&]" + SYNC_GMT_TIMESTAMP_PARAM + "=\\d*");

  const SYNC_VIDEO_TIMESTAMP_PARAM = 'syncVideoTimestampSec';
  const SYNC_VIDEO_NUM_TIMESTAMP_REGEX = new RegExp("[\\?&]" + SYNC_VIDEO_TIMESTAMP_PARAM + "=\\d*");

  const USE_NETWORK_TIME = false; // TODO: FIX WITHIN PAGE
  const GMT_URL = 'https://worldtimeapi.org/api/timezone/Europe/London';

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
  
  

  function getPlayer() {
    try {
      return document.getElementsByTagName("video")[0];
    } catch (err) {
      alert('Ziggo link sync unable to access player on page');
      console.error(err);
    }
  }

  const onSyncFunction = (player, syncGMTTs, syncVideoTargetTs) => {
    //only sync if video is playing
    if (!getPlayer().paused) {
      const MAX_DESYNC_DELTA = 3;
      
      // recalculate these
      const currentGMTTs = Date.now() / MS_IN_SEC + currentTimeToActualGMTOffset;
      // time between now and when the video should start
      const timeToVideoStartSec = syncGMTTs - currentGMTTs - syncVideoTargetTs;

      console.log("time to video startSec:",timeToVideoStartSec);

      const timeToVideoStartMs = timeToVideoStartSec * MS_IN_SEC;
      const targetPlayerTime = -1 * timeToVideoStartMs / MS_IN_SEC;
      
      console.log("targetPlayerTime:",targetPlayerTime);

      const currentPlayerTime = player.currentTime;
      const delta = Math.abs(targetPlayerTime - currentPlayerTime);

      console.log("currentPlayerTime:",currentPlayerTime);
      console.log("delta:",delta);
      console.log(" ");

      if (delta && delta > MAX_DESYNC_DELTA) {
        // resync
        player.currentTime = targetPlayerTime;
        player.play();
        // alert the viewer if the video has already ended
        if (player.ended) {
          alert('The scheduled video has ended');
        }
      }
    }
  };

  function onZiggoLoad() {

    const url = window.location.href;
    const syncGMTTs = parseInt(SYNC_GMT_NUM_TIMESTAMP_REGEX.exec(url)[0].split('=')[1]);
    // default to assuming the video should start at 0
    let syncVideoTargetTs = 0;
    try {
      // try to read time from url
      syncVideoTargetTs = parseInt(SYNC_VIDEO_NUM_TIMESTAMP_REGEX.exec(url)[0].split('=')[1]);
    } catch (err) {
      // ignore error - just use 0 as the default
    }

    const player = getPlayer();

    const currentGMTTs = Date.now() / MS_IN_SEC;
    // time between now and when the video should start
    const timeToVideoStartSec = syncGMTTs - currentGMTTs - syncVideoTargetTs;
    const timeToVideoStartMs = timeToVideoStartSec * MS_IN_SEC;

    const TIME_TO_SCHEDULE = 3 * MS_IN_SEC;
    const SYNC_INTERVAL_MS = 3 * MS_IN_SEC;

    if (timeToVideoStartMs > 0) {
      // video should not start yet - reset and schedule the start
      setTimeout(function() {
        const player = getPlayer();
        player.currentTime = 0;
        player.pause();
        setTimeout(function() {
          player.play();
          setInterval(onSyncFunction, SYNC_INTERVAL_MS, player, syncGMTTs, syncVideoTargetTs);
        }, timeToVideoStartMs - TIME_TO_SCHEDULE);
      }, TIME_TO_SCHEDULE);
    } else {
      setInterval(onSyncFunction, SYNC_INTERVAL_MS, player, syncGMTTs, syncVideoTargetTs);
    }
  }

  setTimeout(function() {
    onZiggoLoad();
  }, TIME_BEFORE_RUN);

}


// Required so we can access the Ziggo player and other page elements
function embedInPage(fn) {
  const script = document.createElement("script");
  script.text = `(${fn.toString()})();`;
  document.documentElement.appendChild(script);
}


// Define these ones here as well since we need to use these to check whether
// or not we need to embed code in the first place
const SYNC_GMT_TIMESTAMP_PARAM = 'syncGMTTimestampSec';
const SYNC_GMT_TIMESTAMP_REGEX = new RegExp("[\\?&]" + SYNC_GMT_TIMESTAMP_PARAM + "=([^&#]*)");

const url = window.location.href;

// Only embed the code in the page if at least the GMT timestamp exists
if (SYNC_GMT_TIMESTAMP_REGEX.test(url)) {
  embedInPage(embeddedCode);
}
