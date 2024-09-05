document.getElementById('groupTabs').addEventListener('click', groupTabs);
document.getElementById('closeDuplicates').addEventListener('click', closeDuplicates);
document.getElementById('saveSession').addEventListener('click', saveSession);
document.getElementById('restoreSession').addEventListener('click', restoreSession);
document.getElementById('ungroupAll').addEventListener('click', ungroupAll);
document.getElementById('shrinkGroups').addEventListener('click', toggleGroupCollapse);

function groupTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const groupedTabs = {};

    // Group tabs by URL
    tabs.forEach(tab => {
      const url = new URL(tab.url);
      let domain = url.hostname;

      // Remove "www." if present at the start
      if (domain.startsWith('www.')) {
        domain = domain.slice(4);
      }

      const shortDomain = domain.slice(0, 3); // Extract first 3 letters of the domain

      if (!groupedTabs[shortDomain]) {
        groupedTabs[shortDomain] = [];
      }
      groupedTabs[shortDomain].push(tab.id);
    });

    // Group tabs and set the group title with the number of tabs
    Object.keys(groupedTabs).forEach(shortDomain => {
      chrome.tabs.group({ tabIds: groupedTabs[shortDomain] }, (groupId) => {
        updateGroupTitle(groupId, shortDomain);  // Update group title with the number of tabs
      });
    });

    showMessage('Tabs grouped by domain.');
  });
}

// Function to update the group title with the domain and tab count
function updateGroupTitle(groupId, shortDomain) {
  chrome.tabGroups.query({}, (groups) => {
    groups.forEach(group => {
      if (group.id === groupId) {
        chrome.tabs.query({ groupId: group.id }, (tabsInGroup) => {
          const tabCount = tabsInGroup.length;
          chrome.tabGroups.update(groupId, { title: `${shortDomain} (${tabCount})` });
        });
      }
    });
  });
}
function closeDuplicates() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const uniqueUrls = new Set();
    const duplicateTabs = [];

    tabs.forEach(tab => {
      if (uniqueUrls.has(tab.url)) {
        duplicateTabs.push(tab.id);
      } else {
        uniqueUrls.add(tab.url);
      }
    });

    if (duplicateTabs.length > 0) {
      chrome.tabs.remove(duplicateTabs);
      showMessage('Duplicate tabs closed.');
    } else {
      showMessage('No duplicate tabs found.');
    }
  });
}

function saveSession() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const session = tabs.map(tab => ({
      url: tab.url,
      groupId: tab.groupId,
    }));
    
    chrome.storage.local.set({ savedSession: session }, () => {
      showMessage('Session saved with grouping.');
    });
  });
}

function restoreSession() {
  chrome.storage.local.get('savedSession', (data) => {
    const session = data.savedSession;
    if (session) {
      const restoredTabs = [];
      session.forEach(tabInfo => {
        chrome.tabs.create({ url: tabInfo.url }, (tab) => {
          restoredTabs.push({ ...tabInfo, tabId: tab.id });
        });
      });

      chrome.tabs.onCreated.addListener(function applyGroups(tab) {
        if (restoredTabs.length === 0) return;

        const tabInfo = restoredTabs.find(info => info.url === tab.url);
        if (tabInfo) {
          chrome.tabs.update(tab.tabId, { groupId: tabInfo.groupId }, () => {
            restoredTabs.splice(restoredTabs.indexOf(tabInfo), 1);
            if (restoredTabs.length === 0) {
              chrome.tabs.onCreated.removeListener(applyGroups);
              showMessage('Session restored with grouping.');
            }
          });
        }
      });
    } else {
      showMessage('No saved session found.');
    }
  });
}

function ungroupAll() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const tabIds = tabs.map(tab => tab.id);
    chrome.tabs.ungroup(tabIds, () => {
      showMessage('All tabs have been ungrouped.');
    });
  });
}

// Function to toggle collapsing/expanding all tab groups
function toggleGroupCollapse() {
  chrome.tabGroups.query({}, (groups) => {
    groups.forEach(group => {
      chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
    });
    showMessage('All groups have been toggled.');
  });
}

function showMessage(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  setTimeout(() => statusDiv.textContent = '', 3000);
}
