import {
  STATUS_STOPPED,
  STATUS_CHECK_WAITING,
  STATUS_CHECKING,
  STATUS_DOWNLOAD_WAITING,
  STATUS_DOWNLOADING,
  STATUS_SEED_WAITING,
  STATUS_SEEDING,
  STATUSES,
} from '~helpers/constants/statuses';
import {
  TRANSMISSION_COLUMN_DOWNLOAD_PROGRESS,
  TRANSMISSION_COLUMN_STATUS,
  TRANSMISSION_COLUMN_ERROR,
  TRANSMISSION_COLUMN_ERROR_STRING,
  TRANSMISSION_COLUMN_NAME,
  TRANSMISSION_COLUMN_LABELS,
  TRANSMISSION_COLUMN_PRIVATE,
  TRANSMISSION_COLUMN_TRACKERS,
  TRANSMISSION_COLUMN_TRACKER_STATS,
  TRANSMISSION_COLUMN_DOWNLOAD_RATE,
  TRANSMISSION_COLUMN_UPLOAD_RATE,
  TRANSMISSION_COLUMN_PRIORITY,
} from '~helpers/constants/columns';
import { trackerStripper } from '~helpers/trackerHelper';

// A private tracker that refuses the announce kills the torrent, and
// Transmission reports nothing at torrent level in that case: the tracker
// message is the only signal (issue #572).
export function getTrackerError(torrent) {
  if (!torrent[TRANSMISSION_COLUMN_PRIVATE]) return null;

  const trackerStats = torrent[TRANSMISSION_COLUMN_TRACKER_STATS] ?? [];
  const failedTracker = trackerStats.find(
    (tracker) =>
      tracker.lastAnnounceSucceeded === false &&
      !!tracker.lastAnnounceResult &&
      tracker.lastAnnounceResult !== 'Success'
  );

  return failedTracker?.lastAnnounceResult ?? null;
}

// The message to show for a torrent: its own error first, then the tracker one.
export function getTorrentError(torrent) {
  return torrent[TRANSMISSION_COLUMN_ERROR_STRING] || getTrackerError(torrent);
}

export function statusFilter(status, torrent) {
  const isDownloading = torrent[TRANSMISSION_COLUMN_DOWNLOAD_RATE] > 0;
  const isUploading = torrent[TRANSMISSION_COLUMN_UPLOAD_RATE] > 0;
  const isChecking =
    torrent[TRANSMISSION_COLUMN_STATUS] === STATUSES.indexOf(STATUS_CHECKING);

  switch (status) {
    case 'active':
      return isDownloading || isUploading || isChecking;
    case 'downloading':
      return [
        STATUSES.indexOf(STATUS_DOWNLOADING),
        STATUSES.indexOf(STATUS_DOWNLOAD_WAITING),
      ].includes(torrent[TRANSMISSION_COLUMN_STATUS]);
    case 'complete':
      return torrent[TRANSMISSION_COLUMN_DOWNLOAD_PROGRESS] === 1;
    case 'stopped':
      return (
        torrent[TRANSMISSION_COLUMN_STATUS] === STATUSES.indexOf(STATUS_STOPPED)
      );
    case 'checking':
      return [
        STATUSES.indexOf(STATUS_CHECKING),
        STATUSES.indexOf(STATUS_CHECK_WAITING),
      ].includes(torrent[TRANSMISSION_COLUMN_STATUS]);
    case 'seeding':
      return [
        STATUSES.indexOf(STATUS_SEEDING),
        STATUSES.indexOf(STATUS_SEED_WAITING),
      ].includes(torrent[TRANSMISSION_COLUMN_STATUS]);
    case 'error':
      return !!(
        torrent[TRANSMISSION_COLUMN_ERROR] || getTrackerError(torrent)
      );
    default:
      return true;
  }
}

export function searchFilter(query, torrent) {
  if (!query) return true;

  // eslint-disable-next-line no-useless-escape
  const replaceRegex = /[ \[\]\.·_-]/g;
  const searchValue = query.toLowerCase().replace(replaceRegex, '');
  const value = torrent[TRANSMISSION_COLUMN_NAME].toLowerCase().replace(
    replaceRegex,
    ''
  );
  return value.includes(searchValue);
}

export function labelFilter(label, torrent) {
  if (!label) return true;

  if (label === 'unlabeled') {
    return (
      !torrent[TRANSMISSION_COLUMN_LABELS] ||
      !torrent[TRANSMISSION_COLUMN_LABELS].length
    );
  }

  return torrent[TRANSMISSION_COLUMN_LABELS].includes(label);
}

export function trackerFilter(tracker, torrent) {
  if (!tracker) return true;

  return !!torrent[TRANSMISSION_COLUMN_TRACKERS].find(
    (t) => trackerStripper(t.announce) === tracker
  );
}

export function priorityFilter(priority, torrent) {
  if (priority === null) return true;

  return torrent[TRANSMISSION_COLUMN_PRIORITY] === priority;
}
