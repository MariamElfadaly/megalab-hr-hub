// Ported from label-generator-v3.4's app.js logic, adapted for React.
// QR generation stays synchronous-on-purpose (same reasoning as the
// original): the qrcodejs library draws into a hidden DOM node
// immediately, so there's no async gap between a click and print().

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

let qrHolder = null;
export function getQrDataUrl(text) {
  if (!window.QRCode) return null;
  if (!qrHolder) {
    qrHolder = document.createElement("div");
    qrHolder.style.position = "fixed";
    qrHolder.style.left = "-9999px";
    document.body.appendChild(qrHolder);
  }
  qrHolder.innerHTML = "";
  // eslint-disable-next-line no-new
  new window.QRCode(qrHolder, { text: text || " ", width: 300, height: 300, correctLevel: window.QRCode.CorrectLevel.M });
  const img = qrHolder.querySelector("img") || qrHolder.querySelector("canvas");
  if (!img) return null;
  return img.tagName === "IMG" ? img.src : img.toDataURL("image/png");
}

const LABEL_CSS = `
  @page { size: 50mm 25.4mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif; }
  .label {
    width: 50mm; height: 25.4mm; padding: 1.3mm 3mm;
    display: flex; align-items: center; gap: 2mm;
    overflow: hidden; page-break-after: always;
  }
  .label img { width: 15mm; height: 15mm; flex-shrink: 0; }
  .label .text { flex: 1; overflow: hidden; }
  .label .name-en { font-size: 8.5pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label .name-ar { font-size: 8.5pt; font-weight: 700; direction: rtl; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label .title-en { font-size: 6.5pt; color: #333; }
  .label .title-ar { font-size: 6.5pt; color: #333; direction: rtl; }
  .label .id { font-size: 6pt; color: #666; font-family: monospace; }
`;

export function labelBlock(emp, qrDataUrl) {
  return `
    <div class="label">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="" />` : ""}
      <div class="text">
        <div class="name-en">${escapeHtml(emp.nameEn)}</div>
        <div class="name-ar">${escapeHtml(emp.nameAr)}</div>
        <div class="title-en">${escapeHtml(emp.titleEn)}</div>
        <div class="title-ar">${escapeHtml(emp.titleAr)}</div>
        <div class="id">#${escapeHtml(emp.id)}</div>
      </div>
    </div>
  `;
}

export function labelDocument(employees, qrDataUrlById) {
  const blocks = employees.map((e) => labelBlock(e, qrDataUrlById[e.id])).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${LABEL_CSS}</style></head><body>${blocks}</body></html>`;
}

// Builds a hidden iframe sized to the label and prints it — same
// approach the original app uses, since it's the one that reliably
// avoided the corrupted-PDF issues html2canvas/jsPDF caused.
export function printLabels(employees, qrDataUrlById) {
  const html = labelDocument(employees, qrDataUrlById);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.width = "50mm";
  iframe.style.height = "25.4mm";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
