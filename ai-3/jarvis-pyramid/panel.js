let activePanelData = null;

function openPanelData(d) { activePanelData = d; }
function closePanel() { activePanelData = null; }

export { openPanelData, closePanel, activePanelData };
