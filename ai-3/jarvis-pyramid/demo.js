let isHumanInteracted = false;
let autoDemoTimer = null;
let autoCloseTimer = null;

function setHumanInteracted(v) { isHumanInteracted = v; }
function setAutoDemoTimer(v) { autoDemoTimer = v; }
function setAutoCloseTimer(v) { autoCloseTimer = v; }
function clearAutoDemo() { if (autoDemoTimer) { clearTimeout(autoDemoTimer); autoDemoTimer = null; } }
function clearAutoClose() { if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; } }

export { isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose };
