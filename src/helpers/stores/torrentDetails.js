import { TRANSMISSION_COLUMN } from '~helpers/constants/columns';
import { writable } from 'svelte/store';
import Transmission from '~helpers/Transmission';

const TORRENT_REQUEST_INTERVAL = 1000;
const transmission = new Transmission();
let updateTorrentTimeout = null;
// The torrent currently shown by the details panel. Responses that come back
// after the user switched to another torrent are dropped, and so is the polling
// loop of the previous torrent: without this, the previous torrent can be
// written over the current one (issue #522).
let currentTorrentId = 0;

function getTorrent(torrentId, setTorrent) {
  if (updateTorrentTimeout) {
    clearTimeout(updateTorrentTimeout);
    updateTorrentTimeout = null;
  }

  transmission
    .getTorrents(torrentId, Object.values(TRANSMISSION_COLUMN))
    .then((torrents) => {
      if (!torrents.length) {
        return;
      }
      if (torrentId !== currentTorrentId) {
        return;
      }
      setTorrent({
        ...torrents[0],
        [TRANSMISSION_COLUMN.FILES]: torrents[0][TRANSMISSION_COLUMN.FILES].map(
          (file, index) => ({
            ...file,
            index: index.toString(),
          })
        ),
        loaded: true,
      });
    })
    // TODO: Error handling
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      if (torrentId !== currentTorrentId) {
        return;
      }
      updateTorrentTimeout = setTimeout(
        getTorrent,
        TORRENT_REQUEST_INTERVAL,
        torrentId,
        setTorrent
      );
    });
}

function createTorrentDetailsStore() {
  const torrentId = writable(0);
  const { set, update, subscribe } = writable({}, (set) => {
    const unsubscribe = torrentId.subscribe(($torrentId) => {
      currentTorrentId = $torrentId;
      if (updateTorrentTimeout) {
        clearTimeout(updateTorrentTimeout);
        updateTorrentTimeout = null;
      }

      // Drop the previous torrent right away: showing its values while the new
      // one loads is what made the panel flicker between two torrents.
      set({});

      if (!$torrentId) return;

      getTorrent($torrentId, set);
    });

    return () => {
      clearTimeout(updateTorrentTimeout);
      unsubscribe();
    };
  });

  return {
    set,
    update,
    subscribe,
    setTorrentId: torrentId.set,
    clearTorrentId: () => {
      currentTorrentId = 0;
      if (updateTorrentTimeout) {
        clearTimeout(updateTorrentTimeout);
        updateTorrentTimeout = null;
      }
      torrentId.set(0);
    },
    setPriority: (torrent, fileIndices, priority) => {
      let params;
      const fileIndicesInt = fileIndices.map((fileIndex) =>
        parseInt(fileIndex)
      );
      switch (priority) {
        case -2:
          params = { 'files-unwanted': fileIndicesInt };
          break;
        case -1:
          params = {
            'priority-low': fileIndicesInt,
            'files-wanted': fileIndicesInt,
          };
          break;
        case 0:
          params = {
            'priority-normal': fileIndicesInt,
            'files-wanted': fileIndicesInt,
          };
          break;
        case 1:
          params = {
            'priority-high': fileIndicesInt,
            'files-wanted': fileIndicesInt,
          };
          break;
      }
      transmission
        .setTorrents([torrent[TRANSMISSION_COLUMN.ID]], params)
        .catch(() => {
          set({ ...torrent, loaded: true });
        });

      const newTorrent = structuredClone(torrent);
      fileIndices.forEach((fileIndex) => {
        newTorrent[TRANSMISSION_COLUMN.FILE_STATS][fileIndex].priority =
          priority;
        newTorrent[TRANSMISSION_COLUMN.FILE_STATS][fileIndex].wanted =
          !!params['files-wanted'];
      });
      set({ ...newTorrent, loaded: true });
    },
    setTrackers: (torrent, trackerList) => {
      transmission
        .setTorrents([torrent[TRANSMISSION_COLUMN.ID]], {
          [TRANSMISSION_COLUMN.TRACKER_LIST]: trackerList,
        })
        .catch(() => set({ ...torrent, loaded: true }));
    },
    setDetails: (torrent, data) => {
      const promise = transmission
        .setTorrents([torrent[TRANSMISSION_COLUMN.ID]], data)
        .catch(() => set({ ...torrent, loaded: true }));

      let newTorrent = structuredClone(torrent);
      newTorrent = { ...newTorrent, ...data };
      set({ ...newTorrent, loaded: true });

      return promise;
    },
    // Renames one file or one folder of the torrent. Transmission wants the
    // full path of the entry as it appears in the file list, and the new name
    // of that entry alone. Nothing is updated here: the next poll brings the
    // new paths back from the server.
    renamePath: (torrentId, path, name) =>
      transmission.renamePath([torrentId], path, name),
  };
}

export const torrentDetails = createTorrentDetailsStore();
