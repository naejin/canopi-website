/** @jsxImportSource preact */
// Lightweight "Request a Plant" modal (Slice 3.2, v14/v15).
// Allows growers to suggest a missing species with common/botanical name and site notes,
// then copy the formatted request or open a prefilled mailto draft.
import { useEffect, useRef, useState } from 'preact/hooks';
import { requestPlantOpen } from '../../state/studio.ts';
import * as store from '../../store.ts';
import { placeWords } from '../location/shared.ts';
import { zoneName } from '../kit/names.ts';

export function RequestPlantModal() {
  const open = requestPlantOpen.value;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [commonName, setCommonName] = useState('');
  const [botanicalName, setBotanicalName] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open && typeof d.showModal === 'function') d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!open) return null;

  const loc = store.location.value;
  const z = store.climate.value;
  const siteSummary = loc ? placeWords(loc) : z ? zoneName(z) : 'Not set';

  const bodyText = [
    `Common name: ${commonName.trim() || '(not specified)'}`,
    `Botanical name: ${botanicalName.trim() || '(not specified)'}`,
    `Site / climate: ${siteSummary}`,
    notes.trim() ? `Notes: ${notes.trim()}` : '',
  ].filter(Boolean).join('\n');

  const mailtoHref = `mailto:projectcanopi@gmail.com?subject=${encodeURIComponent(`Plant request: ${commonName.trim() || botanicalName.trim() || 'New species'}`)}&body=${encodeURIComponent(bodyText)}`;

  const close = () => {
    setCopied(false);
    requestPlantOpen.value = false;
  };

  const copyText = async () => {
    try {
      await navigator.clipboard?.writeText(bodyText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      class="ct-req-dialog"
      data-request-plant-modal
      aria-labelledby="ct-req-title"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClose={close}
    >
      <h3 id="ct-req-title">Request a plant</h3>
      <p class="ct-muted ct-small-text">
        Missing a species for your site ({siteSummary})? Send the name and growing notes to the Canopi catalog team.
      </p>
      <form
        class="ct-req-form"
        onSubmit={(e) => { e.preventDefault(); void copyText(); }}
      >
        <div class="ct-req-field">
          <label for="ct-req-common">Common name</label>
          <input
            id="ct-req-common"
            type="text"
            value={commonName}
            placeholder="e.g., Pineapple guava"
            onInput={(e) => setCommonName((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
        <div class="ct-req-field">
          <label for="ct-req-botanical">Botanical name (optional)</label>
          <input
            id="ct-req-botanical"
            type="text"
            value={botanicalName}
            placeholder="e.g., Acca sellowiana"
            onInput={(e) => setBotanicalName((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
        <div class="ct-req-field">
          <label for="ct-req-notes">Site &amp; role notes (optional)</label>
          <textarea
            id="ct-req-notes"
            rows={3}
            value={notes}
            placeholder="How you grow it, sun exposure, frost tolerance, or local cultivar..."
            onInput={(e) => setNotes((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </div>
        {copied && <p class="ct-small-text" role="status">Request copied to clipboard.</p>}
        <div class="ct-req-acts">
          <button type="button" class="button button-secondary ct-small" onClick={close}>Close</button>
          <button type="submit" class="button button-secondary ct-small">Copy request</button>
          <a class="button button-primary ct-small" href={mailtoHref}>Email Canopi</a>
        </div>
      </form>
    </dialog>
  );
}
