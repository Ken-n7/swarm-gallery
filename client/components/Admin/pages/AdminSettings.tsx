'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  SERVER,
  deleteAdminEventMedia,
  deleteAdminEventRecord,
  getAdminEventSettings,
  markAdminHandoffComplete,
  prepareAdminEventExport,
  saveAdminEventSettings,
} from '@/lib/api';
import { FormRow } from '@/components/Admin/shared/AdminShared';

export function AdminSettings() {
  const [eventName, setEventName] = useState('Demo Event');
  const [organizerName, setOrganizerName] = useState('Swarm Gallery');
  const [eventDate, setEventDate] = useState('2026-05-05');
  const [eventType, setEventType] = useState('Corporate / Conference');
  const [expectedGuests, setExpectedGuests] = useState('300');
  const [retentionPolicy, setRetentionPolicy] = useState('Until handoff');
  const [storageWarning, setStorageWarning] = useState('80');
  const [hasChanges, setHasChanges] = useState(false);
  const [storageUsed, setStorageUsed] = useState(4.5);
  const [storageTotal] = useState(50);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'deleteMedia' | 'deleteEvent' | null>(null);
  const [workflow, setWorkflow] = useState({
    handoffPrepared: false,
    handoffCompleted: false,
    mediaDeleted: false,
    eventClosed: false,
  });
  const [actionState, setActionState] = useState<Record<'exportPackage' | 'markComplete' | 'deleteMedia' | 'deleteEvent', 'idle' | 'running' | 'success'>>({
    exportPackage: 'idle',
    markComplete: 'idle',
    deleteMedia: 'idle',
    deleteEvent: 'idle',
  });
  const [loading, setLoading] = useState(true);
  const storagePercent = (storageUsed / storageTotal) * 100;
  const qrUrl = `${SERVER}/events/demo/qr`;
  const joinUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/event/demo`;

  useEffect(() => {
    getAdminEventSettings('demo')
      .then((data) => {
        setEventName(data.name || 'Demo Event');
        setOrganizerName(data.organizerName || 'Swarm Gallery');
        setEventDate(data.eventDate || '2026-05-05');
        setEventType(data.eventType || 'Corporate / Conference');
        setExpectedGuests(String(data.expectedGuests || 300));
        setRetentionPolicy(data.retentionPolicy || 'Until handoff');
        setStorageWarning(String(data.storageWarning || 80));
        setStorageUsed(data.storageUsed || 0);
        setWorkflow({
          handoffPrepared: !!data.handoffPreparedAt,
          handoffCompleted: !!data.handoffCompletedAt,
          mediaDeleted: !!data.mediaDeletedAt,
          eventClosed: !!data.closedAt,
        });
      })
      .catch(() => {
        setNotice({ tone: 'warning', message: 'Could not load event settings from the server.' });
      })
      .finally(() => setLoading(false));
  }, []);

  const setActionProgress = (
    action: 'exportPackage' | 'markComplete' | 'deleteMedia' | 'deleteEvent',
    next: 'idle' | 'running' | 'success'
  ) => setActionState((current) => ({ ...current, [action]: next }));

  const handleSave = () => {
    setSaveState('saving');
    setNotice(null);
    saveAdminEventSettings({
      eventId: 'demo',
      name: eventName,
      organizerName,
      eventDate,
      eventType,
      expectedGuests,
      retentionPolicy,
      storageWarning,
    })
      .then((data) => {
        setStorageUsed(data.storageUsed || storageUsed);
        setWorkflow({
          handoffPrepared: !!data.handoffPreparedAt,
          handoffCompleted: !!data.handoffCompletedAt,
          mediaDeleted: !!data.mediaDeletedAt,
          eventClosed: !!data.closedAt,
        });
        setHasChanges(false);
        setSaveState('saved');
        setNotice({ tone: 'success', message: 'Event settings saved to the server.' });
      })
      .catch(() => {
        setSaveState('idle');
        setNotice({ tone: 'warning', message: 'Saving failed. Please retry.' });
      });
  };

  const handleDiscard = () => {
    setEventName('Demo Event');
    setOrganizerName('Swarm Gallery');
    setEventDate('2026-05-05');
    setEventType('Corporate / Conference');
    setExpectedGuests('300');
    setRetentionPolicy('Until handoff');
    setStorageWarning('80');
    setHasChanges(false);
    setSaveState('idle');
    setNotice({ tone: 'warning', message: 'Unsaved settings were discarded.' });
  };

  const runAction = (
    action: 'exportPackage' | 'markComplete' | 'deleteMedia' | 'deleteEvent'
  ) => {
    setActionProgress(action, 'running');
    setConfirmAction(null);

    const applyServerState = (data: {
      handoffPreparedAt?: number | null;
      handoffCompletedAt?: number | null;
      mediaDeletedAt?: number | null;
      closedAt?: number | null;
      storageUsed?: number;
    }) => {
      setWorkflow({
        handoffPrepared: !!data.handoffPreparedAt,
        handoffCompleted: !!data.handoffCompletedAt,
        mediaDeleted: !!data.mediaDeletedAt,
        eventClosed: !!data.closedAt,
      });
      if (typeof data.storageUsed === 'number') setStorageUsed(data.storageUsed);
    };

    if (action === 'exportPackage') {
      prepareAdminEventExport('demo')
        .then((data) => {
          applyServerState(data.event);
          setActionProgress(action, 'success');
          setNotice({ tone: 'success', message: 'Client handoff package prepared and download started.' });
          if (data.downloadUrl) {
            window.open(`${SERVER}${data.downloadUrl}`, '_blank', 'noopener,noreferrer');
          }
        })
        .catch(() => {
          setActionProgress(action, 'idle');
          setNotice({ tone: 'warning', message: 'Export preparation failed. Please retry.' });
        });
      return;
    }

    if (action === 'markComplete') {
      markAdminHandoffComplete('demo')
        .then((data) => {
          applyServerState(data.event);
          setActionProgress(action, 'success');
          setNotice({ tone: 'success', message: 'Handoff marked complete on the server.' });
        })
        .catch(() => {
          setActionProgress(action, 'idle');
          setNotice({ tone: 'warning', message: 'Could not mark handoff complete yet.' });
        });
      return;
    }

    if (action === 'deleteMedia') {
      deleteAdminEventMedia('demo')
        .then((data) => {
          applyServerState(data.event);
          setActionProgress(action, 'success');
          setNotice({ tone: 'success', message: 'Event media deleted on the server.' });
        })
        .catch(() => {
          setActionProgress(action, 'idle');
          setNotice({ tone: 'warning', message: 'Media deletion failed. Make sure handoff is complete first.' });
        });
      return;
    }

    deleteAdminEventRecord('demo')
      .then((data) => {
        applyServerState(data.event);
        setActionProgress(action, 'success');
        setNotice({ tone: 'success', message: 'Event record closed out on the server.' });
      })
      .catch(() => {
        setActionProgress(action, 'idle');
        setNotice({ tone: 'warning', message: 'Event closeout failed. Delete media first.' });
      });
  };

  const canMarkComplete = workflow.handoffPrepared;
  const canDeleteMedia = workflow.handoffCompleted;
  const canDeleteEvent = workflow.mediaDeleted;

  return (
    <div className="flex-1 flex flex-col">
      {loading ? (
        <div className="flex-1 grid place-items-center text-sm" style={{ color: 'var(--muted)' }}>
          Loading settings...
        </div>
      ) : (
      <>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {notice && (
            <div
              className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
              style={{
                border: `1px solid ${notice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
                background: notice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
                color: notice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
              }}
            >
              <div className="text-sm font-medium">{notice.message}</div>
              <button className="text-xs font-semibold" onClick={() => setNotice(null)}>Dismiss</button>
            </div>
          )}

          {/* Stacked sections - each one full width */}
          <div className="space-y-6">
            {/* Event Info */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Event Info</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Basic details about your current event session.</p>
              </div>
              <div className="p-6 space-y-6">
                <FormRow label="Event name" sub="Displayed to guests when they join the gallery.">
                  <input type="text" value={eventName} onChange={(e) => { setEventName(e.target.value); setHasChanges(true); }} className="w-full md:w-60 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)' }} />
                </FormRow>
                <FormRow label="Organizer name" sub="Shown on the join screen as the host.">
                  <input type="text" value={organizerName} onChange={(e) => { setOrganizerName(e.target.value); setHasChanges(true); }} className="w-full md:w-60 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)' }} />
                </FormRow>
                <FormRow label="Event date" sub="For display and record-keeping.">
                  <input type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); setHasChanges(true); }} className="w-full md:w-40 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)' }} />
                </FormRow>
                <FormRow label="Event type" sub="Displayed to guests when they join.">
                  <select value={eventType} onChange={(e) => { setEventType(e.target.value); setHasChanges(true); }} className="w-full md:w-60 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}>
                    <option>Corporate / Conference</option>
                    <option>Wedding</option>
                    <option>Birthday</option>
                    <option>Other</option>
                  </select>
                </FormRow>
                <FormRow label="Expected guest count" sub="Used to prepare event staffing and device setup.">
                  <input type="number" value={expectedGuests} onChange={(e) => { setExpectedGuests(e.target.value); setHasChanges(true); }} className="w-full md:w-24 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)' }} />
                </FormRow>
                <FormRow label="Guest privacy tool" sub="Guests may optionally blur faces on their own device before uploading. This is guest-controlled, not an admin moderation setting.">
                  <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}>Optional face blur</span>
                </FormRow>
              </div>
            </div>

            {/* Access & QR */}
            <div className="rounded-xl p-6" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Access & QR</h3>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>Share this QR code with attendees so they can join the gallery on their phones and contribute media for this event only.</p>
              <div className="flex justify-center mb-6">
                <div className="relative p-4 rounded-xl shadow-sm w-56 h-56" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <Image src={qrUrl} alt="Event QR code" fill unoptimized sizes="224px" className="object-contain p-4" />
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-soft)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Join link</p>
                <a href={joinUrl || '#'} target="_blank" rel="noreferrer" className="font-medium break-all" style={{ color: 'var(--ink)' }}>
                  {joinUrl || 'Loading…'}
                </a>
              </div>
              <div className="mt-4 rounded-lg p-4" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Access status</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>QR and join link are live for the current event session.</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--good-tint)', color: 'var(--good)' }}>Accepting guests</span>
                </div>
              </div>
            </div>

            {/* Temporary Storage */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Temporary Storage</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Media is stored only until handoff to the client is complete, then removed for privacy.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Used</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{storageUsed} GB of {storageTotal} GB</span>
                  </div>
                  <div className="w-full rounded-full h-3" style={{ background: 'var(--line)' }}>
                    <div className="bg-violet-600 h-3 rounded-full transition-all duration-300" style={{ width: `${storagePercent}%` }} />
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{storagePercent.toFixed(1)}% used • {(storageTotal - storageUsed).toFixed(1)} GB available</div>
                  <div className="pt-2 space-y-4" style={{ borderTop: '1px solid var(--line)' }}>
                    <FormRow label="Retention before handoff" sub="Event media remains on the laptop only until the client handoff is completed.">
                      <span className="inline-flex px-3 py-2 rounded-full text-xs font-semibold" style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}>
                        {retentionPolicy || 'Until handoff'}
                      </span>
                    </FormRow>
                    <FormRow label="Storage warning" sub="Alert the team when temporary event storage is nearing capacity before export.">
                      <div className="flex items-center gap-2">
                        <input type="number" value={storageWarning} onChange={(e) => { setStorageWarning(e.target.value); setHasChanges(true); }} className="w-16 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink)' }} />
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>%</span>
                      </div>
                    </FormRow>
                    <div className="rounded-lg p-4 space-y-2" style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Storage cleanup happens through event closeout</div>
                      <div className="text-sm" style={{ color: 'var(--muted)' }}>
                        Generated thumbnails and original media are removed together when you complete handoff, delete event media, and close the event.
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        There is no separate cache-clearing step for this workflow.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone & Workflow Actions */}
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: 'var(--danger-tint)', border: '1px solid rgba(224,92,92,.2)' }}>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--danger)' }}>⚠️ Danger Zone</h3>
                <p className="text-sm" style={{ color: 'var(--danger)', opacity: .8 }}>After client handoff, event media should be removed from the system for privacy. These actions are irreversible.</p>
              </div>

              {/* Workflow Status */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Export ready', workflow.handoffPrepared ? 'Ready' : 'Pending'],
                    ['Handoff complete', workflow.handoffCompleted ? 'Done' : 'Pending'],
                    ['Media deleted', workflow.mediaDeleted ? 'Done' : 'Pending'],
                    ['Event closed', workflow.eventClosed ? 'Done' : 'Pending'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg p-3" style={{ border: '1px solid var(--line)' }}>
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>{label}</div>
                      <div className="text-sm font-semibold mt-1" style={{ color: 'var(--ink)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="rounded-xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--ink)' }}>Prepare Client Handoff</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Create the export package of all event media for delivery to the client.</p>
                  </div>
                  <button onClick={() => runAction('exportPackage')} disabled={actionState.exportPackage === 'running' || workflow.eventClosed} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60">
                    {actionState.exportPackage === 'running' ? 'Preparing...' : workflow.handoffPrepared ? 'Export Ready' : 'Export Package'}
                  </button>
                </div>

                <div className={`rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canMarkComplete ? 'opacity-70' : ''}`} style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--ink)' }}>Mark Handoff Complete</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Record that client delivery is finished and the event is ready for media deletion.</p>
                    {!canMarkComplete && <p className="text-xs mt-2" style={{ color: "#b45309" }}>Prepare the client handoff package first so this step follows a clear export trail.</p>}
                  </div>
                  <button onClick={() => runAction('markComplete')} disabled={!canMarkComplete || actionState.markComplete === 'running' || workflow.eventClosed} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                    {actionState.markComplete === 'running' ? 'Marking...' : workflow.handoffCompleted ? 'Handoff Complete' : 'Mark Complete'}
                  </button>
                </div>

                <div className={`rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canDeleteMedia ? 'opacity-70' : ''}`} style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--ink)' }}>Delete Event Media</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Remove all uploaded photos and videos from the system after successful client handoff.</p>
                    {!canDeleteMedia && <p className="text-xs mt-2" style={{ color: "#b45309" }}>Locked until client handoff is marked complete.</p>}
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => setConfirmAction(confirmAction === 'deleteMedia' ? null : 'deleteMedia')} disabled={!canDeleteMedia || actionState.deleteMedia === 'running' || workflow.eventClosed} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                      {actionState.deleteMedia === 'running' ? 'Deleting...' : workflow.mediaDeleted ? 'Media Deleted' : 'Delete Media'}
                    </button>
                    {confirmAction === 'deleteMedia' && canDeleteMedia && (
                      <div className="rounded-lg p-4 space-y-3 max-w-sm" style={{ border: '1px solid rgba(224,92,92,.2)', background: 'var(--danger-tint)' }}>
                        <div className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete all event media?</div>
                        <div className="text-sm" style={{ color: 'var(--danger)', opacity: .8 }}>This is irreversible and should only happen after the client has received the final handoff package.</div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => runAction('deleteMedia')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Delete</button>
                          <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid rgba(224,92,92,.2)', color: 'var(--danger)' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canDeleteEvent ? 'opacity-70' : ''}`} style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--ink)' }}>Delete Event Record</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Remove remaining guest metadata and close out the event once media has been deleted.</p>
                    {!canDeleteEvent && <p className="text-xs mt-2" style={{ color: "#b45309" }}>Locked until event media has been deleted.</p>}
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => setConfirmAction(confirmAction === 'deleteEvent' ? null : 'deleteEvent')} disabled={!canDeleteEvent || actionState.deleteEvent === 'running' || workflow.eventClosed} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
                      {actionState.deleteEvent === 'running' ? 'Closing...' : workflow.eventClosed ? 'Event Closed' : 'Delete Event'}
                    </button>
                    {confirmAction === 'deleteEvent' && canDeleteEvent && (
                      <div className="rounded-lg p-4 space-y-3 max-w-sm" style={{ border: '1px solid rgba(224,92,92,.2)', background: 'var(--danger-tint)' }}>
                        <div className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete the event record?</div>
                        <div className="text-sm" style={{ color: 'var(--danger)', opacity: .8 }}>Use this only after media is deleted and the event is fully handed off. Guest metadata and event record will be closed out.</div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => runAction('deleteEvent')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Closeout</button>
                          <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid rgba(224,92,92,.2)', color: 'var(--danger)' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
          <button onClick={handleDiscard} className="px-4 py-2 rounded-lg" style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--bg-soft)' }}>Discard</button>
          <button onClick={handleSave} disabled={saveState === 'saving'} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}