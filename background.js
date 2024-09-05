chrome.runtime.onInstalled.addListener(() => {
    console.log('Tab Manager and Organizer installed.');
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'groupTabs') {
      const { groupedTabs } = request;
      
      // Group tabs in the background script
      for (const domain in groupedTabs) {
        chrome.tabs.group({ tabIds: groupedTabs[domain] }, (groupId) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ message: 'Error grouping tabs.' });
          } else {
            chrome.tabGroups.update(groupId, { title: domain }, () => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                sendResponse({ message: 'Error updating tab group title.' });
              } else {
                sendResponse({ message: 'Tabs grouped by domain.' });
              }
            });
          }
        });
      }
      // Required for asynchronous response
      return true;
    }
  });
  