import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, HardDrive, Keyboard, Smartphone, Trash2, Upload } from 'lucide-react';
import { app, flush, getState, useData } from '../lib/store';
import { exportJson, parseData, type ParseResult } from '../lib/storage';
import { hasSampleData } from '../lib/sample';
import { todayKey } from '../lib/dates';
import type { AppData } from '../lib/types';
import { Field, PageHeader } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/useConfirm';

export default function Settings() {
  const settings = useData((s) => s.settings);
  const sample = useData(hasSampleData);
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [name, setName] = useState(settings.name);
  const [preview, setPreview] = useState<{ data: AppData; dropped: number; fileName: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    app.updateSettings({ name: name.trim().slice(0, 40), onboarded: true });
    toast.show('Namnet sparades');
  };

  const doExport = () => {
    flush();
    const blob = new Blob([exportJson(getState())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show('Export nedladdad');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.show('Filen är för stor (max 20 MB).', { kind: 'error' });
    let result: ParseResult;
    try {
      result = parseData(JSON.parse(await file.text()));
    } catch {
      return toast.show('Filen kunde inte läsas som JSON.', { kind: 'error' });
    }
    if (!result.ok) return toast.show(result.error, { kind: 'error' });
    setPreview({ data: result.data, dropped: result.dropped, fileName: file.name });
  };

  const applyImport = () => {
    if (!preview) return;
    const before = getState();
    app.replaceAll({ ...preview.data, settings: { ...preview.data.settings, onboarded: true } });
    setPreview(null);
    toast.undo('Data importerad', () => app.replaceAll(before));
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader title="Inställningar" />
      <div className="stack">
        <section className="card" aria-labelledby="s-profile">
          <h2 id="s-profile" className="card-title" style={{ marginBottom: 'var(--s4)' }}>Profil</h2>
          <form className="row wrap" onSubmit={saveName} style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <Field label="Ditt namn" htmlFor="s-name" hint="Används i hälsningen på översikten.">
                <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
              </Field>
            </div>
            <button className="btn" type="submit" style={{ marginBottom: 22 }} disabled={name.trim() === settings.name}>Spara</button>
          </form>
        </section>

        <section className="card" aria-labelledby="s-data">
          <h2 id="s-data" className="card-title" style={{ marginBottom: 'var(--s3)' }}><HardDrive /> Din data</h2>
          <div className="notice" style={{ marginBottom: 'var(--s4)' }}>
            <HardDrive aria-hidden />
            <span>All data sparas lokalt i den här webbläsaren på den här enheten. Det finns ingen molnsynkronisering. Rensar du webbläsardata försvinner den – exportera en säkerhetskopia regelbundet, och använd import för att flytta till en annan enhet.</span>
          </div>
          <div className="stack-sm">
            <Row title="Exportera" text="Ladda ner allt som en JSON-fil.">
              <button className="btn" onClick={doExport}><Download /> Exportera</button>
            </Row>
            <Row title="Importera" text="Ersätt nuvarande data med en tidigare export.">
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} id="import-file" tabIndex={-1} />
              <button className="btn" onClick={() => fileRef.current?.click()}><Upload /> Välj fil</button>
            </Row>
            {sample && (
              <Row title="Exempeldata" text="Ta bort exemplen. Saker du själv skapat eller ändrat behålls.">
                <button className="btn" onClick={() => confirm({ title: 'Ta bort exempeldata?', message: 'Alla exempeluppgifter, vanor, mål, ämnen och anteckningar tas bort. Dina egna behålls.', confirmLabel: 'Ta bort', run: () => { const before = getState(); app.removeSampleData(); toast.undo('Exempeldata borttagen', () => app.replaceAll(before)); } })}>
                  <Trash2 /> Ta bort exempel
                </button>
              </Row>
            )}
            <Row title="Radera allt" text="Börja om från noll. Kan inte ångras efter att du lämnat sidan.">
              <button className="btn btn-danger" onClick={() => confirm({ title: 'Radera all data?', message: 'Alla uppgifter, mål, vanor, lärpass och journalanteckningar raderas från den här enheten. Exportera först om du vill spara något.', confirmLabel: 'Radera allt', run: () => { const before = getState(); app.resetAll(); toast.undo('All data raderad', () => app.replaceAll(before)); } })}>
                <Trash2 /> Radera
              </button>
            </Row>
          </div>
        </section>

        <section className="card" aria-labelledby="s-keys">
          <h2 id="s-keys" className="card-title" style={{ marginBottom: 'var(--s4)' }}><Keyboard /> Kortkommandon</h2>
          <dl className="stack-sm small" style={{ margin: 0 }}>
            {[
              ['N', 'Ny uppgift'],
              ['1 – 7', 'Byt sektion (Översikt, Uppgifter, Vanor, Mål, Lärande, Journal, Analys)'],
              ['Esc', 'Stäng dialog'],
              ['Enter', 'Spara i snabbinmatning och formulär'],
            ].map(([k, v]) => (
              <div key={k} className="row" style={{ gap: 'var(--s3)' }}>
                <dt style={{ width: 64, flexShrink: 0 }}><span className="kbd" style={{ display: 'inline-grid' }}>{k}</span></dt>
                <dd className="muted" style={{ margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="small subtle" style={{ marginTop: 'var(--s4)' }}>
            Snabbinmatningen förstår <strong>idag</strong>, <strong>imorgon</strong>, veckodagar (t.ex. <strong>fredag</strong>), <strong>!</strong> för hög prioritet och <strong>#projekt</strong>.
          </p>
        </section>

        <section className="card" aria-labelledby="s-install">
          <h2 id="s-install" className="card-title" style={{ marginBottom: 'var(--s3)' }}><Smartphone /> Använd på mobilen</h2>
          <p className="small muted">
            LIFE OS fungerar som en app. På iPhone: öppna sidan i Safari, tryck på Dela och välj ”Lägg till på hemskärmen”. På Android: välj ”Installera app” i Chrome-menyn. Kom ihåg att datan är knuten till webbläsaren där du använder den.
          </p>
        </section>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Importera data?" size="sm"
        footer={<><button className="btn btn-ghost" onClick={() => setPreview(null)}>Avbryt</button><button className="btn btn-primary" onClick={applyImport}>Ersätt och importera</button></>}>
        {preview && (
          <div className="stack-sm">
            <p className="small muted">Från <strong>{preview.fileName}</strong>. Nuvarande data ersätts.</p>
            <ul className="small" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px' }}>
              <li>Uppgifter</li><li className="num">{preview.data.tasks.length}</li>
              <li>Mål</li><li className="num">{preview.data.goals.length}</li>
              <li>Vanor</li><li className="num">{preview.data.habits.length}</li>
              <li>Ämnen</li><li className="num">{preview.data.subjects.length}</li>
              <li>Lärpass</li><li className="num">{preview.data.sessions.length}</li>
              <li>Journaldagar</li><li className="num">{Object.keys(preview.data.journal).length}</li>
            </ul>
            {preview.dropped > 0 && <p className="small" style={{ color: 'var(--warn)' }}>{preview.dropped} ogiltiga poster hoppas över.</p>}
          </div>
        )}
      </Modal>
      {confirmDialog}
    </div>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="row-between wrap" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ minWidth: 0, flex: '1 1 240px' }}>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div className="small subtle">{text}</div>
      </div>
      {children}
    </div>
  );
}
