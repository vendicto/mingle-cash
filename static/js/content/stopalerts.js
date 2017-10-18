
/**
 * Disable alert,confirm,prompts for preventing annoing pop-ups
 */

console.log('[STOPALERTS - INIT]');

var disablerFunction = function () {
    console.log('[STOPALERTS - DISABLE]');
    window.alert = function alert(msg) { };
    window.prompt = function prompt(msg) { return false };
    window.confirm = function confirm(msg) { return false };
};

var disablerCode = "(" + disablerFunction.toString() + ")();";

var disablerScriptElement = document.createElement('script');
disablerScriptElement.textContent = disablerCode;

document.documentElement.appendChild(disablerScriptElement);
disablerScriptElement.parentNode.removeChild(disablerScriptElement);

console.log('[STOPALERTS - INITIALIZED]');