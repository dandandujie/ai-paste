(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function i(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(e){if(e.ep)return;e.ep=!0;const o=i(e);fetch(e.href,o)}})();function a(t,n){const r=t.trim().startsWith("<!DOCTYPE")||t.trim().startsWith("<html")?t:s(t);return new ClipboardItem({"text/html":new Blob([r],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})}function s(t){return`<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
      xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="AI-Paste">
</head>
<body>
<!--StartFragment-->
${t}
<!--EndFragment-->
</body>
</html>`}chrome.runtime.onMessage.addListener(t=>{t.target==="offscreen"&&t.type==="CLIPBOARD_WRITE"&&l(t.data.html,t.data.plainText)});async function l(t,n){try{const i=a(t,n);await navigator.clipboard.write([i])}catch(i){console.error("Failed to write to clipboard:",i);const r=document.getElementById("clipboard-container");r.innerHTML=t;const e=window.getSelection();e.removeAllRanges();const o=document.createRange();o.selectNodeContents(r),e.addRange(o),document.execCommand("copy"),e.removeAllRanges(),r.innerHTML=""}}
