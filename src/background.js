var { extractJSONFromHTML } = require('./common.js');

let jsonDataFound = false;
let jsonData;
let url;
let maxRowRequest = 200;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkJsonData') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {

      // No active tab available
      if (!tabs || tabs.length === 0 || !tabs[0] || !tabs[0].id) {
        clearNotification();
        sendResponse(false);
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "getJSONDataFromContent"
        },
        (msg) => {
          var lastError = chrome.runtime.lastError;

          if (lastError || !msg || !msg.found) {
            clearNotification();
            sendResponse(false);
          } else {
            sendResponse(true);
          }
        }
      );
    });

    return true;
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'sendDataToBack') {
    if (message.url) {
      url = message.url;
      console.log('[Willhaben Map] Starting scrape:', url);
    }

    scrapeDataAndOpenMap();
  }
});

async function scrapeDataAndOpenMap() {
  try {
    if (!url) {
      console.error('No Willhaben search URL available');
      return;
    }

    let initMaxRowFirstPageURL = replacePageParameter(
      replaceRowParameter(url, maxRowRequest),
      1
    );

    let initialHTML = await fetchPage(initMaxRowFirstPageURL);

    if (!initialHTML) {
      console.error('Could not fetch initial Willhaben search page');
      return;
    }

    let initialJSON = extractJSONFromHTML(initialHTML);

    if (!initialJSON) {
      console.error('Could not extract JSON data from Willhaben page');
      return;
    }

    const totalPages = Math.ceil(
      initialJSON.rowsFound / initialJSON.rowsRequested
    );

    const pageUrls = Array.from(
      { length: totalPages },
      (_, i) => replacePageParameter(initMaxRowFirstPageURL, i + 1)
    );

    chrome.runtime.sendMessage({
      type: 'progress',
      text: '1 / ' + totalPages
    });

    let fetchedData = [];
    fetchedData.push(initialJSON);

    for (let i = 1; i < pageUrls.length; i++) {
      const html = await fetchPage(pageUrls[i]);

      if (!html) {
        console.warn('Could not fetch page:', pageUrls[i]);
        continue;
      }

      const extractedData = extractJSONFromHTML(html);

      if (extractedData) {
        fetchedData.push(extractedData);
      }

      chrome.runtime.sendMessage({
        type: 'progress',
        text: (i + 1) + ' / ' + totalPages
      });
    }

    let mergedData = mergeData(fetchedData);

    mergedData = mergedData.filter(
      item =>
        item.attributes &&
        item.attributes.attribute &&
        item.attributes.attribute.some(e => e.name === "COORDINATES")
    );

    mergedData = mergedData.filter(
      item =>
        item.attributes &&
        item.attributes.attribute &&
        item.attributes.attribute.some(e => e.name === "PRICE_FOR_DISPLAY")
    );

    mergedData = mergedData.filter(
      item =>
        item.contextLinkList &&
        item.contextLinkList.contextLink &&
        item.contextLinkList.contextLink.some(e => e.id === "iadShareLink")
    );

    const dataToSend = mergedData.map(item => ({
      coordinates: item.attributes.attribute.find(
        e => e.name === "COORDINATES"
      ).values[0],

      imageUrl:
        item.advertImageList &&
        item.advertImageList.advertImage &&
        item.advertImageList.advertImage.length > 0
          ? item.advertImageList.advertImage[0].mainImageUrl
          : '',

      detailUrl: item.contextLinkList.contextLink.find(
        e => e.id === "iadShareLink"
      ).uri,

      price: item.attributes.attribute.find(
        e => e.name === "PRICE_FOR_DISPLAY"
      ).values[0],

      description: item.description
    }));

    openMap(dataToSend);

  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    chrome.runtime.sendMessage({
      type: 'loadingDone'
    });
  }
}

async function fetchPage(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} while fetching ${url}`
      );
    }

    return await response.text();

  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

function replacePageParameter(url, page) {
  const urlObject = new URL(url);
  urlObject.searchParams.set('page', page);
  return urlObject.toString();
}

function replaceRowParameter(url, rows) {
  const urlObject = new URL(url);
  urlObject.searchParams.set('rows', rows);
  return urlObject.toString();
}

function mergeData(dataArray) {
  return dataArray.flatMap(
    x =>
      x &&
      x.advertSummaryList &&
      x.advertSummaryList.advertSummary
        ? x.advertSummaryList.advertSummary
        : []
  );
}

function showNotification() {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: 'red' });
}

function clearNotification() {
  chrome.action.setBadgeText({ text: '' });
}

let activeTabId;
let lastUrl;
let lastTitle;

async function getTabInfo(tabId) {
  if (!tabId) {
    clearNotification();
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);

    if (!tab) {
      clearNotification();
      return;
    }

    if (lastUrl !== tab.url || lastTitle !== tab.title) {
      lastUrl = tab.url;
      lastTitle = tab.title;

      checkIfContentHasJSON(tabId);
    }

  } catch (error) {
    console.warn('Could not get tab information:', error);
    clearNotification();
  }
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  activeTabId = activeInfo.tabId;
  getTabInfo(activeTabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (activeTabId === tabId) {
    getTabInfo(tabId);
  }
});

function checkIfContentHasJSON(tabId) {

  // If we already know the tab ID, use it directly.
  if (tabId) {
    requestJSONFromTab(tabId);
    return;
  }

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    function(tabs) {

      if (!tabs || tabs.length === 0 || !tabs[0] || !tabs[0].id) {
        clearNotification();
        return;
      }

      requestJSONFromTab(tabs[0].id);
    }
  );
}

function requestJSONFromTab(tabId) {
  chrome.tabs.sendMessage(
    tabId,
    {
      type: "getJSONDataFromContent"
    },
    (msg) => {

      const lastError = chrome.runtime.lastError;

      if (lastError || !msg) {
        clearNotification();
        return;
      }

      if (msg.found) {
        showNotification();

        jsonData = msg.jsonData;

        if (msg.url) {
          url = msg.url;
        }
      } else {
        clearNotification();
      }
    }
  );
}

let latestScrapedData;

async function openMap(data) {
  latestScrapedData = data;

  const mapUrl = chrome.runtime.getURL('map.html');

  chrome.tabs.create({
    url: mapUrl
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'newTabLoaded') {
    sendResponse(latestScrapedData);
  }
});
