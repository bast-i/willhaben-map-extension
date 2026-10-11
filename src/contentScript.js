'use strict';

function getWillhabenSearchData() {
  try {
    const nextDataElement = document.getElementById('__NEXT_DATA__');

    if (!nextDataElement || !nextDataElement.textContent) {
      console.warn('[Willhaben Map] __NEXT_DATA__ not found');
      return null;
    }

    const nextData = JSON.parse(nextDataElement.textContent);
    const searchResult = nextData?.props?.pageProps?.searchResult;

    if (!searchResult) {
      console.warn('[Willhaben Map] searchResult not found');
      return null;
    }

    console.log(
      '[Willhaben Map] Search detected:',
      searchResult.rowsFound,
      'results'
    );

    return searchResult;
  } catch (error) {
    console.error('[Willhaben Map] Error reading search data:', error);
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getJSONDataFromContent') {
    const jsonData = getWillhabenSearchData();

    sendResponse({
      found: !!jsonData,
      jsonData: jsonData,
      url: window.location.href
    });

    return true;
  }
});

console.log('[Willhaben Map] Content script loaded');
