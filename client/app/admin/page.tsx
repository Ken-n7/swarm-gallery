'use client';

import { useEffect, useState } from 'react';
import { SERVER, checkAdmin, getAdminStats, getRecentPhotos, getRecentGuests, getAllPhotos, getAllGuests } from '@/lib/api';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AdminLoginForm } from '@/components/Admin/AdminLoginForm';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    checkAdmin()
      .then((res) => setIsAuthenticated(res.admin))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Dashboard';
      case 'galleries': return 'Galleries';
      case 'guests': return 'Guests';
      case 'access-qr': return 'Access & QR';
      case 'event-info': return 'Event Info';
      case 'upload-controls': return 'Upload Controls';
      case 'privacy': return 'Privacy';
      case 'storage': return 'Storage';
      case 'danger': return 'Danger Zone';
      default: return 'Settings';
    }
  };

  const getPageSubtitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Overview of your event';
      case 'galleries': return 'Manage event photos';
      case 'guests': return 'View and manage guests';
      case 'access-qr': return 'Share access with attendees';
      case 'event-info': return 'Basic event details';
      case 'upload-controls': return 'Configure upload settings';
      case 'privacy': return 'Privacy and data controls';
      case 'storage': return 'Storage usage and limits';
      case 'danger': return 'Destructive actions';
      default: return 'Configure event settings';
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent />;
      case 'galleries':
        return <GalleriesContent />;
      case 'guests':
        return <GuestsContent />;
      case 'access-qr':
        return <AccessQRContent />;
      case 'event-info':
        return <EventInfoContent />;
      case 'upload-controls':
        return <UploadControlsContent />;
      case 'privacy':
        return <PrivacyContent />;
      case 'storage':
        return <StorageContent />;
      case 'danger':
        return <DangerZoneContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      title={getPageTitle(currentPage)}
      subtitle={getPageSubtitle(currentPage)}
      activeGuests={stats?.activeGuests || 0}
    >
      {renderContent()}
    </AdminLayout>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getRecentPhotos('demo', 6),
      getRecentGuests('demo', 5)
    ]).then(([statsData, photosData, guestsData]) => {
      setStats(statsData);
      setRecentPhotos(photosData);
      setRecentGuests(guestsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Photos" value={stats?.photoCount || 0} />
        <StatCard title="Total Guests" value={stats?.guestCount || 0} />
        <StatCard title="Active Guests" value={stats?.activeGuests || 0} />
        <StatCard title="Storage Used" value={`${stats?.storageUsed || 0} MB`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Timeline Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Photo uploads over time</h3>
              <div className="text-sm text-slate-500">Today · May 5, 2026</div>
            </div>
            <div className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
              Peak: 2–3 PM
            </div>
          </div>
          <UploadTimelineChart />
        </div>

        {/* Device Types Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Device types</h3>
          <DeviceDonutChart />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Photos */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Photos</h3>
            <button className="text-sm text-violet-600 hover:text-violet-700">View all →</button>
          </div>
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {recentPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">
              No photos uploaded yet
            </div>
          )}
        </div>

        {/* Recent Guests */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Guests</h3>
            <button className="text-sm text-violet-600 hover:text-violet-700">View all →</button>
          </div>
          {recentGuests.length > 0 ? (
            <div className="space-y-3">
              {recentGuests.map((guest) => (
                <div key={guest.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                    {guest.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{guest.username}</div>
                    <div className="text-xs text-slate-500">
                      {guest.photoCount} photos • Joined {new Date(guest.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">
              No guests have joined yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleriesContent() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAllPhotos().then((data) => {
      setPhotos(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading photos...</div>;
  }

  return (
    <div className="p-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            ☰
          </button>
        </div>

        {selectedPhotos.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{selectedPhotos.size} selected</span>
            <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
              Export ZIP
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Photos */}
      {photos.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 cursor-pointer ${
                  selectedPhotos.has(photo.id) ? 'border-violet-500' : 'border-transparent hover:border-slate-300'
                }`}
                onClick={() => toggleSelection(photo.id)}
              >
                <img
                  src={photo.thumbUrl || photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                checked={selectedPhotos.size === photos.length}
                onChange={selectAll}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">Select All</span>
            </div>
            {photos.map((photo) => (
              <div key={photo.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={() => toggleSelection(photo.id)}
                  className="rounded border-slate-300"
                />
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={photo.thumbUrl || photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{photo.filename}</div>
                  <div className="text-sm text-slate-500">
                    {photo.uploader} • {new Date(photo.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 text-6xl mb-4">📷</div>
          <div className="text-slate-500">No photos uploaded yet</div>
        </div>
      )}
    </div>
  );
}

function GuestsContent() {
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllGuests().then((data) => {
      setGuests(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading guests...</div>;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Guest List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Guests ({guests.length})</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedGuest?.id === guest.id ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedGuest(guest)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold">
                  {guest.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{guest.username}</div>
                  <div className="text-xs text-slate-500">
                    {guest.photoCount} photos
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {selectedGuest ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                {selectedGuest.username.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{selectedGuest.username}</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div>Joined: {new Date(selectedGuest.joinedAt).toLocaleString()}</div>
                <div>Last seen: {new Date(selectedGuest.lastSeen).toLocaleString()}</div>
                <div>Photos uploaded: {selectedGuest.photoCount}</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-12">
              Select a guest to view details
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Stats</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-600">{guests.length}</div>
              <div className="text-sm text-slate-500">Total Guests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-600">
                {guests.reduce((sum, g) => sum + g.photoCount, 0)}
              </div>
              <div className="text-sm text-slate-500">Total Photos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">
                {Math.round(guests.reduce((sum, g) => sum + g.photoCount, 0) / Math.max(guests.length, 1) * 10) / 10}
              </div>
              <div className="text-sm text-slate-500">Avg Photos/Guest</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessQRContent() {
  const [joinUrl, setJoinUrl] = useState('');
  const qrUrl = `${SERVER}/events/demo/qr`;

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/event/demo`);
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Guest Access</h3>
          <p className="text-slate-600 mb-6">
            Share this QR code with attendees so they can join the gallery on their phones.
          </p>

          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <img
                src={qrUrl}
                alt="Event QR code"
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-2">Join link</p>
            <a
              href={joinUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="text-slate-900 font-medium break-all"
            >
              {joinUrl || 'Loading…'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventInfoContent() {
  const [eventName, setEventName] = useState('Demo Event');
  const [organizerName, setOrganizerName] = useState('Swarm Gallery');
  const [eventDate, setEventDate] = useState('2026-05-05');
  const [eventType, setEventType] = useState('Corporate / Conference');
  const [expectedGuests, setExpectedGuests] = useState('300');
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving event info:', { eventName, organizerName, eventDate, eventType, expectedGuests });
    setHasChanges(false);
  };

  const handleDiscard = () => {
    // Reset to original values
    setEventName('Demo Event');
    setOrganizerName('Swarm Gallery');
    setEventDate('2026-05-05');
    setEventType('Corporate / Conference');
    setExpectedGuests('300');
    setHasChanges(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Event Info</h3>
              <p className="text-sm text-slate-600 mt-1">Basic details about your current event session.</p>
            </div>

            <div className="p-6 space-y-6">
              <FormRow label="Event name" sub="Displayed to guests when they join the gallery.">
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => { setEventName(e.target.value); setHasChanges(true); }}
                  className="w-60 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Organizer name" sub="Shown on the join screen as the host.">
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => { setOrganizerName(e.target.value); setHasChanges(true); }}
                  className="w-50 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Event date" sub="For display and record-keeping.">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setHasChanges(true); }}
                  className="w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Event type" sub="Displayed to guests when they join.">
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value); setHasChanges(true); }}
                  className="w-60 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option>Corporate / Conference</option>
                  <option>Wedding</option>
                  <option>Birthday</option>
                  <option>Other</option>
                </select>
              </FormRow>

              <FormRow label="Expected guest count" sub="Used to pre-allocate resources.">
                <input
                  type="number"
                  value={expectedGuests}
                  onChange={(e) => { setExpectedGuests(e.target.value); setHasChanges(true); }}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

function UploadControlsContent() {
  const [allowUploads, setAllowUploads] = useState(true);
  const [fileTypes, setFileTypes] = useState('Photos only (JPG, PNG)');
  const [maxUploadPerGuest, setMaxUploadPerGuest] = useState('50');
  const [maxCapacity, setMaxCapacity] = useState('Unlimited');
  const [adminApproval, setAdminApproval] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [guestDelete, setGuestDelete] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    console.log('Saving upload controls:', {
      allowUploads, fileTypes, maxUploadPerGuest, maxCapacity,
      adminApproval, autoPublish, guestDelete
    });
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setAllowUploads(true);
    setFileTypes('Photos only (JPG, PNG)');
    setMaxUploadPerGuest('50');
    setMaxCapacity('Unlimited');
    setAdminApproval(false);
    setAutoPublish(true);
    setGuestDelete(true);
    setHasChanges(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Upload Controls</h3>
              <p className="text-sm text-slate-600 mt-1">Configure what guests can upload and how uploads are handled.</p>
            </div>

            <div className="p-6 space-y-6">
              <FormRow label="Allow guest uploads" sub="Turn off to make the gallery view-only for guests.">
                <Toggle value={allowUploads} onChange={(v) => { setAllowUploads(v); setHasChanges(true); }} />
              </FormRow>

              <FormRow label="Accepted file types" sub="File formats guests are allowed to upload.">
                <select
                  value={fileTypes}
                  onChange={(e) => { setFileTypes(e.target.value); setHasChanges(true); }}
                  className="w-56 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option>Photos only (JPG, PNG)</option>
                  <option>Photos + Videos</option>
                  <option>All files</option>
                </select>
              </FormRow>

              <FormRow label="Max upload per guest" sub="Set to 0 for unlimited uploads.">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={maxUploadPerGuest}
                    onChange={(e) => { setMaxUploadPerGuest(e.target.value); setHasChanges(true); }}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <span className="text-sm text-slate-600">MB</span>
                </div>
              </FormRow>

              <FormRow label="Max guest capacity" sub="Block new joiners once this limit is reached.">
                <input
                  type="text"
                  value={maxCapacity}
                  onChange={(e) => { setMaxCapacity(e.target.value); setHasChanges(true); }}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Moderation</h4>
              <div className="space-y-6">
                <FormRow label="Admin approval before publish" sub="Photos are held in a queue until an admin approves them.">
                  <Toggle value={adminApproval} onChange={(v) => { setAdminApproval(v); setHasChanges(true); }} />
                </FormRow>

                <FormRow label="Auto-publish uploads" sub="Photos appear in the gallery instantly after uploading.">
                  <Toggle value={autoPublish} onChange={(v) => { setAutoPublish(v); setHasChanges(true); }} />
                </FormRow>

                <FormRow label="Allow guest to delete own uploads" sub="Guests can remove photos they uploaded themselves.">
                  <Toggle value={guestDelete} onChange={(v) => { setGuestDelete(v); setHasChanges(true); }} />
                </FormRow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

function PrivacyContent() {
  const [faceBlurring, setFaceBlurring] = useState(true);
  const [forceFaceBlurring, setForceFaceBlurring] = useState(false);
  const [selectiveSharing, setSelectiveSharing] = useState(true);
  const [photoVisibility, setPhotoVisibility] = useState('All guests');
  const [autoDelete, setAutoDelete] = useState(true);
  const [albumDownloads, setAlbumDownloads] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState('Immediately on close');
  const [activityLogging, setActivityLogging] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    console.log('Saving privacy settings:', {
      faceBlurring, forceFaceBlurring, selectiveSharing, photoVisibility,
      autoDelete, albumDownloads, retentionPeriod, activityLogging
    });
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setFaceBlurring(true);
    setForceFaceBlurring(false);
    setSelectiveSharing(true);
    setPhotoVisibility('All guests');
    setAutoDelete(true);
    setAlbumDownloads(true);
    setRetentionPeriod('Immediately on close');
    setActivityLogging(true);
    setHasChanges(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Privacy</h3>
              <p className="text-sm text-slate-600 mt-1">Control how guest data is handled and what privacy tools are available.</p>
            </div>

            <div className="p-6 space-y-6">
              <FormRow label="Enable face blurring" sub="Guests can optionally blur faces before sharing a photo.">
                <Toggle value={faceBlurring} onChange={(v) => { setFaceBlurring(v); setHasChanges(true); }} />
              </FormRow>

              <FormRow label="Force face blurring for all uploads" sub="Automatically blurs all detected faces on every uploaded photo.">
                <Toggle value={forceFaceBlurring} onChange={(v) => { setForceFaceBlurring(v); setHasChanges(true); }} />
              </FormRow>

              <FormRow label="Selective sharing" sub="Guests can choose which of their photos are visible to others.">
                <Toggle value={selectiveSharing} onChange={(v) => { setSelectiveSharing(v); setHasChanges(true); }} />
              </FormRow>

              <FormRow label="Guest photo visibility" sub="Who can see photos uploaded by a guest.">
                <select
                  value={photoVisibility}
                  onChange={(e) => { setPhotoVisibility(e.target.value); setHasChanges(true); }}
                  className="w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option>All guests</option>
                  <option>Admin only</option>
                  <option>Nobody</option>
                </select>
              </FormRow>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Data Retention</h4>
              <div className="space-y-6">
                <FormRow label="Auto-delete all data on event end" sub="Wipes all photos and guest data when the session is closed.">
                  <Toggle value={autoDelete} onChange={(v) => { setAutoDelete(v); setHasChanges(true); }} />
                </FormRow>

                <FormRow label="Allow personal album downloads" sub="Guests can download their own uploaded photos before data is deleted.">
                  <Toggle value={albumDownloads} onChange={(v) => { setAlbumDownloads(v); setHasChanges(true); }} />
                </FormRow>

                <FormRow label="Data retention period" sub="How long after the event data is stored before auto-deletion.">
                  <select
                    value={retentionPeriod}
                    onChange={(e) => { setRetentionPeriod(e.target.value); setHasChanges(true); }}
                    className="w-52 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                  >
                    <option>Immediately on close</option>
                    <option>24 hours</option>
                    <option>7 days</option>
                    <option>30 days</option>
                  </select>
                </FormRow>

                <FormRow label="Log guest activity" sub="Record join times, uploads, and downloads for event reporting.">
                  <Toggle value={activityLogging} onChange={(v) => { setActivityLogging(v); setHasChanges(true); }} />
                </FormRow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

function StorageContent() {
  const [storageUsed, setStorageUsed] = useState(4.5);
  const [storageTotal, setStorageTotal] = useState(50);
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Storage Usage</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Used</span>
              <span className="text-sm font-medium text-slate-900">{storageUsed} GB of {storageTotal} GB</span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-violet-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${storagePercent}%` }}
              ></div>
            </div>

            <div className="text-xs text-slate-500">
              {storagePercent.toFixed(1)}% used • {(storageTotal - storageUsed).toFixed(1)} GB available
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Storage Management</h3>

          <div className="space-y-4">
            <FormRow label="Auto-cleanup old photos" sub="Automatically delete photos older than the specified period.">
              <select className="w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white">
                <option>Never</option>
                <option>24 hours</option>
                <option>7 days</option>
                <option>30 days</option>
              </select>
            </FormRow>

            <FormRow label="Storage limit warning" sub="Send alerts when usage exceeds this percentage.">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue="80"
                  className="w-16 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <span className="text-sm text-slate-600">%</span>
              </div>
            </FormRow>

            <div className="pt-4 border-t border-slate-200">
              <button className="w-full px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">
                Clear unused storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZoneContent() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Danger Zone</h3>
          <p className="text-sm text-red-700">These actions are irreversible. Please be certain before proceeding.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">End Event & Export Data</h4>
              <p className="text-sm text-slate-600 mt-1">Create a ZIP file of all photos and close the event session.</p>
            </div>
            <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
              Export & Close
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Delete All Photos</h4>
              <p className="text-sm text-slate-600 mt-1">Remove all uploaded photos from the gallery.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Delete Photos
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Reset Guest Data</h4>
              <p className="text-sm text-slate-600 mt-1">Clear all guest information and avatars.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Reset Guests
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Full System Reset</h4>
              <p className="text-sm text-slate-600 mt-1">Delete everything and restart with a clean slate.</p>
            </div>
            <button className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800">
              Full Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
        value ? 'bg-violet-600' : 'bg-slate-300'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </div>
  );
}

function UploadTimelineChart() {
  // Sample data - in real app this would come from API
  const data = [
    { hour: '7AM', uploads: 22 },
    { hour: '8AM', uploads: 312 },
    { hour: '9AM', uploads: 180 },
    { hour: '10AM', uploads: 95 },
    { hour: '11AM', uploads: 140 },
    { hour: '12PM', uploads: 75 },
    { hour: '1PM', uploads: 48 },
    { hour: '2PM', uploads: 285 },
    { hour: '3PM', uploads: 198 },
    { hour: '4PM', uploads: 67 },
  ];

  const maxUploads = Math.max(...data.map(d => d.uploads));
  const peakIndex = data.findIndex(d => d.uploads === maxUploads);

  return (
    <div className="relative">
      <svg viewBox="0 0 400 120" className="w-full h-24">
        {data.map((d, i) => {
          const barHeight = (d.uploads / maxUploads) * 80;
          const x = i * 40;
          const y = 100 - barHeight;
          const isPeak = i === peakIndex;

          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y}
                width={36}
                height={barHeight}
                rx={4}
                fill={isPeak ? '#8b5cff' : '#e2e8f0'}
                className={isPeak ? '' : 'opacity-60'}
              />
              {isPeak && (
                <rect
                  x={x + 2}
                  y={y}
                  width={36}
                  height={barHeight}
                  rx={4}
                  fill="url(#peakGradient)"
                />
              )}
              <text
                x={x + 20}
                y={115}
                textAnchor="middle"
                className="text-xs fill-slate-500"
                fontSize="10"
              >
                {d.hour}
              </text>
              {isPeak && (
                <text
                  x={x + 20}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-violet-600 font-semibold"
                  fontSize="10"
                >
                  {d.uploads}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3da3" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b5cff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function DeviceDonutChart() {
  // Sample data - in real app this would come from API
  const devices = [
    { type: 'iOS', count: 41, color: '#8b5cff' },
    { type: 'Android', count: 44, color: '#2de0ff' },
    { type: 'Other', count: 15, color: '#e2e8f0' },
  ];

  const total = devices.reduce((sum, d) => sum + d.count, 0);
  let currentAngle = -90; // Start from top

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="w-24 h-24">
          {devices.map((device, i) => {
            const angle = (device.count / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Convert to radians
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            // Calculate path
            const x1 = 60 + 50 * Math.cos(startRad);
            const y1 = 60 + 50 * Math.sin(startRad);
            const x2 = 60 + 50 * Math.cos(endRad);
            const y2 = 60 + 50 * Math.sin(endRad);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = `M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            return (
              <path
                key={i}
                d={pathData}
                fill={device.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex-1 space-y-3">
        {devices.map((device) => (
          <div key={device.type} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: device.color }}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">{device.type}</div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{device.count}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
