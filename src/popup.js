function sendToScrapeData() {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function(tabs) {
      if (!tabs || !tabs.length || !tabs[0]) {
        console.error('[Willhaben Map] No active tab for scraping');
        return;
      }

      chrome.runtime.sendMessage({
        type: 'sendDataToBack',
        url: tabs[0].url
      });

      showProgress();
    }
  );
}

function showProgress() {
  document.getElementById('btncontainer').style.display = 'none';
  document.querySelector('.progress-container').style.display = 'block';
}

function hideProgress() {
  document.getElementById('btncontainer').style.display = '';
  document.querySelector('.progress-container').style.display = 'none';
  document.getElementById('progress-text').innerHTML = '';
}

function createButton(rowsFound) {
  const btnContainer = document.getElementById('btncontainer');

  if (!btnContainer) {
    console.error('[Willhaben Map] Button container not found');
    return;
  }

  // Prevent duplicate buttons
  if (document.getElementById('open-map-button')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'open-map-button';
  button.textContent = rowsFound
    ? `Open Map (${rowsFound} Treffer)`
    : 'Open Map';

  button.className = 'button';
  button.addEventListener('click', sendToScrapeData);

  btnContainer.appendChild(button);

  const description = document.getElementById('description');

  if (description) {
    description.style.display = 'none';
  }
}

function detectWillhabenSearch() {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    function(tabs) {
      if (chrome.runtime.lastError) {
        console.error(
          '[Willhaben Map] tabs.query error:',
          chrome.runtime.lastError
        );
        return;
      }

      if (!tabs || !tabs.length || !tabs[0].id) {
        console.warn('[Willhaben Map] No active tab found');
        return;
      }

      const tab = tabs[0];

      console.log('[Willhaben Map] Checking tab:', tab.url);

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'getJSONDataFromContent'
        },
        function(response) {
          if (chrome.runtime.lastError) {
            console.error(
              '[Willhaben Map] Content script communication error:',
              chrome.runtime.lastError
            );
            return;
          }

          console.log('[Willhaben Map] Content response:', response);

          if (response && response.found && response.jsonData) {
            console.log(
              '[Willhaben Map] Search found:',
              response.jsonData.rowsFound
            );

            createButton(response.jsonData.rowsFound);
          } else {
            console.warn('[Willhaben Map] No Willhaben search detected');
          }
        }
      );
    }
  );
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'loadingDone') {
    hideProgress();
  }

  if (message.type === 'progress') {
    const progressText = document.getElementById('progress-text');

    if (progressText) {
      progressText.innerHTML = message.text;
    }
  }
});

// Detect the current Willhaben search when popup opens
detectWillhabenSearch();
