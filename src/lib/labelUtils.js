// Ported EXACTLY from label-generator-v3.4's app.js — this took several
// failed iterations in the original app to get right (documented in its
// own comments), so this stays a faithful port, not a simplified rewrite.

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------------- QR generation — fully client-side, no network call ----------------
   Synchronous on purpose: the qrcodejs library draws the code immediately inside
   its constructor. Keeping this synchronous means printLabels() can call
   window.print() with the fewest possible ticks between the click and the print
   dialog opening — some browsers (notably mobile Safari) will silently refuse to
   open the print dialog if too much asynchronous work happens first. */
const qrCache = new Map();
export function getQrDataUrl(text) {
  const key = (text && text.trim()) ? text.trim() : " ";
  if (qrCache.has(key)) return qrCache.get(key);
  if (!window.QRCode) return "";
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed; top:-9999px; left:-9999px;";
  document.body.appendChild(holder);
  let dataUrl = "";
  try {
    // eslint-disable-next-line no-new
    new window.QRCode(holder, { text: key, width: 300, height: 300, correctLevel: window.QRCode.CorrectLevel.M });
    const canvas = holder.querySelector("canvas");
    if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    } else {
      const img = holder.querySelector("img");
      if (img && img.src) dataUrl = img.src;
    }
  } catch (err) {
    console.error("QR generation failed:", err);
  }
  document.body.removeChild(holder);
  qrCache.set(key, dataUrl);
  return dataUrl;
}

/* ---------------- label markup — exact original layout ---------------- */
export function labelBlock(emp, qrDataUrl) {
  return `<div class="label">
    <div class="header">
      <span class="id">ID: ${escapeHtml(emp.id)}</span>
      <div class="qr"><img src="${qrDataUrl || ""}"></div>
    </div>
    <div class="body">
      <div class="col-left">
        <div class="name-en">${escapeHtml(emp.nameEn)}</div>
        <div class="title-en">${escapeHtml(emp.titleEn)}</div>
      </div>
      <div class="col-right">
        <div class="name-ar">${escapeHtml(emp.nameAr)}</div>
        <div class="title-ar">${escapeHtml(emp.titleAr)}</div>
      </div>
    </div>
  </div>`;
}

const LABEL_STYLES = `
  @page { size: 50mm 25.4mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin:0; padding:0; font-family: system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
         background:#fff; -webkit-font-smoothing:antialiased; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .label { width:50mm; height:25.4mm; padding:1.3mm 3mm; display:flex; flex-direction:column; overflow:hidden; page-break-after:always; }
  .label:last-child { page-break-after:auto; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:1.1pt solid #000; padding-bottom:0.6mm; margin-bottom:0.8mm; }
  .id { font-weight:800; font-size:9.5pt; color:#000; letter-spacing:0.5pt; line-height:1; }
  .qr { width:7.8mm; height:7.8mm; flex-shrink:0; background:#fff; padding:0.3mm; display:flex; align-items:center; justify-content:center; }
  .qr img { width:100%; height:100%; display:block; }
  .body { display:flex; justify-content:space-between; align-items:flex-start; flex:1; padding-top:0.1mm; }
  .col-left, .col-right { display:flex; flex-direction:column; gap:0.7mm; }
  .name-en { font-weight:700; font-size:9.2pt; color:#000; line-height:1.12; letter-spacing:0.15pt; }
  .name-ar { font-weight:800; font-size:10.8pt; color:#000; font-family:'Segoe UI','Traditional Arabic','Tahoma','Arial',sans-serif; direction:rtl; line-height:1.08; letter-spacing:0.25pt; }
  .title-en { font-weight:400; font-size:7.8pt; color:#2a2a2a; line-height:1.12; margin-top:0.3mm; letter-spacing:0.25pt; }
  .title-ar { font-weight:900; font-size:10.2pt; color:#000; font-family:'Segoe UI','Traditional Arabic','Tahoma','Arial',sans-serif; direction:rtl; line-height:1.08; margin-top:0.3mm; letter-spacing:0.35pt; }
`;

export function labelDocument(emp, qrDataUrl) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${LABEL_STYLES}</style></head>
<body>${labelBlock(emp, qrDataUrl)}</body></html>`;
}

/* ---------------- print — exact original reliability approach ----------------
   The onload-only approach is NOT reliable: after document.write() on an
   iframe, 'load' does not consistently fire again in every browser. This
   uses readyState-complete detection AND a hard timeout fallback, exactly
   as the original app does, so print() always actually gets called. */
export function printLabels(employees, qrDataUrlById) {
  if (!employees.length) return;

  try {
    const blocks = employees.map((emp) => labelBlock(emp, qrDataUrlById[emp.id] || "")).join("\n");
    const doc = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${LABEL_STYLES}</style></head>
<body>${blocks}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    let fired = false;
    const triggerPrint = () => {
      if (fired) return;
      fired = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        alert("Couldn't open the print dialog. Try again, or check your browser's print/popup settings.");
      }
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
    };

    const idoc = iframe.contentWindow.document;
    idoc.open();
    idoc.write(doc);
    idoc.close();

    if (idoc.readyState === "complete") {
      setTimeout(triggerPrint, 50);
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 50);
      setTimeout(triggerPrint, 1000); // fallback in case load never fires
    }
  } catch (e) {
    alert("Couldn't prepare the print job. Try again.");
  }
}
