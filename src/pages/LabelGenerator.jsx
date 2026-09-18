import { useEffect, useState } from "react";
import { useRoster } from "../contexts/RosterContext";
import { useLabelsData } from "../lib/useLabelsData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { getQrDataUrl, printLabels } from "../lib/labelUtils";
import "./LabelGenerator.css";

export default function LabelGenerator() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const { recordsById, loaded, syncError, setQrLink } = useLabelsData();
  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState(() => new Set());
  const [draftLink, setDraftLink] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const selected = roster.find((e) => e.id === selectedId) || null;
  const qrLink = selected ? (recordsById[selected.id]?.qrLink ?? "") : "";

  useEffect(() => {
    setDraftLink(qrLink);
  }, [selectedId, qrLink]);

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(getQrDataUrl(draftLink));
  }, [selected, draftLink]);

  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  function toggleChecked(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveLink() {
    if (!selected) return;
    await setQrLink(selected.id, draftLink);
  }

  function printOne(emp) {
    const link = recordsById[emp.id]?.qrLink ?? "";
    printLabels([emp], { [emp.id]: getQrDataUrl(link) });
  }

  function printMany(ids) {
    const emps = roster.filter((e) => ids.includes(e.id));
    const qrMap = {};
    emps.forEach((e) => {
      qrMap[e.id] = getQrDataUrl(recordsById[e.id]?.qrLink ?? "");
    });
    printLabels(emps, qrMap);
  }

  return (
    <div className="lg-layout">
      <div className="lg-registry">
        <div className="lg-toolbar">
          <button onClick={() => printMany(roster.map((e) => e.id))} disabled={roster.length === 0}>
            Print all ({roster.length})
          </button>
          <button onClick={() => printMany([...checked])} disabled={checked.size === 0}>
            Print selected ({checked.size})
          </button>
        </div>

        {roster.length === 0 ? (
          <div className="lg-empty">No employees in the roster yet — add some from the Employees section.</div>
        ) : (
          <div className="lg-list">
            {roster.map((emp) => {
              const hasLink = !!recordsById[emp.id]?.qrLink;
              return (
                <div key={emp.id} className={"lg-row" + (selectedId === emp.id ? " is-active" : "")}>
                  <input type="checkbox" checked={checked.has(emp.id)} onChange={() => toggleChecked(emp.id)} />
                  <button className="lg-rowMain" onClick={() => setSelectedId(emp.id)}>
                    <span className="lg-idChip">#{emp.id}</span>
                    <span className="lg-name">{emp.nameEn}</span>
                    <span className="lg-nameAr">{emp.nameAr}</span>
                    <span className={"lg-linkDot" + (hasLink ? " has-link" : "")} title={hasLink ? "Has Drive link" : "No Drive link yet"} />
                  </button>
                  <button className="lg-printBtn" onClick={() => printOne(emp)}>Print</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg-editor">
        {!selected ? (
          <div className="lg-empty">Select an employee to preview and edit their label.</div>
        ) : (
          <>
            <h3>{selected.nameEn} <span className="lg-nameAr">{selected.nameAr}</span></h3>
            <p className="lg-title">{selected.titleEn} {selected.titleAr && `/ ${selected.titleAr}`}</p>

            <label className="lg-fieldLabel">Drive folder link (becomes the QR code)</label>
            <input
              className="lg-linkInput"
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              onBlur={saveLink}
              placeholder="https://drive.google.com/drive/folders/..."
            />

            <div className="lg-previewWrap">
              <div className="lg-labelPreview">
                <div className="lg-pHeader">
                  <span className="lg-pId">ID: {selected.id}</span>
                  <div className="lg-pQr">{previewUrl && <img src={previewUrl} alt="QR" />}</div>
                </div>
                <div className="lg-pBody">
                  <div className="lg-pCol">
                    <div className="lg-pNameEn">{selected.nameEn}</div>
                    <div className="lg-pTitleEn">{selected.titleEn}</div>
                  </div>
                  <div className="lg-pCol lg-pColRight">
                    <div className="lg-pNameAr">{selected.nameAr}</div>
                    <div className="lg-pTitleAr">{selected.titleAr}</div>
                  </div>
                </div>
              </div>
              <p className="lg-previewHint">Shown enlarged for legibility — actual printed size is 50mm × 25.4mm</p>
            </div>

            <button className="lg-printOne" onClick={() => printOne(selected)}>
              Print this label
            </button>
          </>
        )}
      </div>
    </div>
  );
}
