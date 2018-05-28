(function($, contToken, sessionID, showAlertDialog) {
  // -----------
  // Download JS
  function download(data, strFileName, strMimeType) {
    /* eslint-disable */
    var self = window, // this script is only for browsers anyway...
      u = "application/octet-stream", // this default mime also triggers iframe downloads
      m = strMimeType || u,
      x = data,
      D = document,
      a = D.createElement("a"),
      z = function(a) {
        return String(a);
      },
      B = self.Blob || self.MozBlob || self.WebKitBlob || z,
      BB = self.MSBlobBuilder || self.WebKitBlobBuilder || self.BlobBuilder,
      fn = strFileName || "download",
      blob,
      b,
      ua,
      fr;

    //if(typeof B.bind === 'function' ){ B=B.bind(self); }

    if (String(this) === "true") {
      //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
      x = [x, m];
      m = x[0];
      x = x[1];
    }

    //go ahead and download dataURLs right away
    if (String(x).match(/^data\:[\w+\-]+\/[\w+\-]+[,;]/)) {
      return navigator.msSaveBlob // IE10 can't do a[download], only Blobs:
        ? navigator.msSaveBlob(d2b(x), fn)
        : saver(x); // everyone else can save dataURLs un-processed
    } //end if dataURL passed?

    try {
      blob = x instanceof B ? x : new B([x], { type: m });
    } catch (y) {
      if (BB) {
        b = new BB();
        b.append([x]);
        blob = b.getBlob(m); // the blob
      }
    }

    function d2b(u) {
      var p = u.split(/[:;,]/),
        t = p[1],
        dec = p[2] == "base64" ? atob : decodeURIComponent,
        bin = dec(p.pop()),
        mx = bin.length,
        i = 0,
        uia = new Uint8Array(mx);

      for (i; i < mx; ++i) uia[i] = bin.charCodeAt(i);

      return new B([uia], { type: t });
    }

    function saver(url, winMode) {
      if ("download" in a) {
        //html5 A[download]
        a.href = url;
        a.setAttribute("download", fn);
        a.innerHTML = "downloading...";
        D.body.appendChild(a);
        setTimeout(function() {
          a.click();
          D.body.removeChild(a);
          if (winMode === true) {
            setTimeout(function() {
              self.URL.revokeObjectURL(a.href);
            }, 250);
          }
        }, 66);
        return true;
      }

      //do iframe dataURL download (old ch+FF):
      var f = D.createElement("iframe");
      D.body.appendChild(f);
      if (!winMode) {
        // force a mime that will download:
        url = "data:" + url.replace(/^data:([\w\/\-\+]+)/, u);
      }

      f.src = url;
      setTimeout(function() {
        D.body.removeChild(f);
      }, 333);
    } //end saver

    if (navigator.msSaveBlob) {
      // IE10+ : (has Blob, but not a[download] or URL)
      return navigator.msSaveBlob(blob, fn);
    }

    if (self.URL) {
      // simple fast and modern way using Blob and URL:
      saver(self.URL.createObjectURL(blob), true);
    } else {
      // handle non-Blob()+non-URL browsers:
      if (typeof blob === "string" || blob.constructor === z) {
        try {
          return saver("data:" + m + ";base64," + self.btoa(blob));
        } catch (y) {
          return saver("data:" + m + "," + encodeURIComponent(blob));
        }
      }

      // Blob but not URL:
      fr = new FileReader();
      fr.onload = function(e) {
        saver(this.result);
      };
      fr.readAsDataURL(blob);
    }
    return true;
  } /* end download() */
  // -------------
  // HELPER FUNCTIONS
  function _getLink(j) {
    // j should be a jQuery Object
    return j.find("a").prop("href");
  }

  function _getNum(str) {
    let match = String(str).match(/\d/g) || [];
    return Number(match.join(""));
  }

  function _coerceNumber(str) {
    return Number.isNaN(Number(str)) ? str : Number(str);
  }

  function _parseTable(a) {
    return $(a.replace(/src="([^"]+)"/g, ""))
      .children()
      .children()
      .slice(1)
      .map(parseMatch)
      .get();
  }
  // ---------------
  // let endObj = {};
  // let scraped = [];
  const endData = {
    username: "",
    userProfileLink: "",
    matches: []
  };

  const requestData = {
    continueToken: contToken,
    sessionID: sessionID
  };

  function parsePlayer(_, player) {
    function getMVPs(data) {
      if (String(data).includes("★")) {
        return _getNum(data) || 1;
      } else {
        return 0;
      }
    }
    // if possible coerce to Number
    const playerInfo = $(player).find("td");
    const playerStats = playerInfo
      .slice(1)
      .map((_, e) => {
        return _coerceNumber($(e).text());
      })
      .get();

    const [ping, kills, assists, deaths, mvpsRaw, hspRaw, score] = playerStats;

    const playerObj = {
      steamProfileLink: _getLink(playerInfo),
      name: playerInfo.find("a").text(),
      ping,
      kills,
      assists,
      deaths,
      mvps: getMVPs(mvpsRaw),
      hsp: _getNum(hspRaw),
      score
    };
    return playerObj;
  }

  function parseMatch(_, match) {
    // 'match' should be a jQuery Object
    const matchInfoRaw = $(match).children()[0];
    const scoreboardRaw = $(match).children()[1];

    //proccess matchInfo
    const matchData = $(matchInfoRaw).find("td");
    const matchDataString = matchData
      .map((_, b) =>
        $(b)
          .text()
          .trim()
      )
      .get();
    const [map, time, waitTimeRaw, durationRaw, checkFour] = matchDataString;
    // check if they have viewers
    const hasViewers = checkFour ? checkFour.includes("Viewer") : false;

    // process scoreboard
    const scoreBoardRows = $(scoreboardRaw).find("tr");
    const team1Players = scoreBoardRows.slice(1, 6);
    const team2Players = scoreBoardRows.slice(7, 12);
    //score
    const scores = $(scoreBoardRows[6])
      .text()
      .split(" : ")
      .map(Number);

    const matchObject = {
      map,
      time,
      waitTime: waitTimeRaw.split(" ")[2],
      duration: durationRaw.split(" ")[2],
      viewers: hasViewers ? _getNum(checkFour) : 0,
      replayLink: hasViewers
        ? _getLink($(matchData[5]))
        : _getLink($(matchData[4])),
      score: {
        team1: scores[0],
        team2: scores[1]
      },
      players: {
        team1: team1Players.map(parsePlayer).get(),
        team2: team2Players.map(parsePlayer).get()
      }
    };

    return matchObject;
  }

  //Remove the first 1 since its just heading
  function parseInitial() {
    const first8 = $("table.generic_kv_table.csgo_scoreboard_root > tbody > tr")
      .slice(1)
      .map(parseMatch)
      .get();
    endData.username = $(".profile_small_header_name").text();
    endData.userProfileLink = $(
      ".profile_small_header_name > a.whiteLink"
    ).prop("href");
    endData.matches = endData.matches.concat(first8);
  }

  async function getMoreData(token) {
    try {
      const url = `${location.protocol}//${location.host}${
        location.pathname
      }?ajax=1&tab=matchhistorycompetitive&continue_token=${token}&sessionid=${
        requestData.sessionID
      }`;
      const res = await (await fetch(url, { credentials: "include" })).json();
      // console.log(res);
      endData.matches = endData.matches.concat(_parseTable(res.html));
      if (res.continue_token && res.html && res.success) {
        // console.log(res.continue_token);
        getMoreData(res.continue_token);
      } else {
        return terminate();
      }
    } catch (error) {
      console.error(error);
      showAlertDialog("Error", error, "OK");
    }
  }

  function getData() {
    parseInitial();
    getMoreData(requestData.continueToken);
  }

  function terminate() {
    console.log("Data collection done!");
    console.log("||scraped data||");
    console.log(endData.matches);
    download(
      JSON.stringify(endData, null, "\t"),
      `CSGO${location.pathname.split("/")[2]}.json`,
      "application/json"
    );
    showAlertDialog("Data", "Data automatically scraped and downloaded!", "OK");
  }

  getData();
})($J, g_sGcContinueToken, g_sessionID, ShowAlertDialog);
