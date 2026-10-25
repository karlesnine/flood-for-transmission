<script>
  import { paths, diskUsage, session } from '~helpers/stores';
  import Transmission from '~helpers/Transmission';
  import ProgressBar from '../ProgressBar/ProgressBar.svelte';
  import { getSize } from '~helpers/sizeHelper';
  import {
    SESSION_COLUMN_DOWNLOAD_DIR,
    SESSION_COLUMN_RPC_VERSION,
    SESSION_COLUMN_UNITS,
    SESSION_COLUMN_UNITS_SIZE,
  } from '~helpers/constants/columns';

  const transmission = new Transmission();

  let downloadDir = $state(null);
  session.addColumns([SESSION_COLUMN_DOWNLOAD_DIR]).then(($session) => {
    downloadDir = $session[SESSION_COLUMN_DOWNLOAD_DIR];
  });

  // The configured common paths when there are some, otherwise the download
  // directory of the session: showing nothing is worse than showing the obvious
  // one.
  let diskPaths = $derived(
    $paths?.filter(Boolean).length
      ? $paths.filter(Boolean)
      : [downloadDir].filter(Boolean)
  );

  let data = $derived(
    Promise.all(
      diskPaths.map((path) => {
        return transmission.getFreeSpace(path).then((result) => {
          return result.arguments;
        });
      })
    ).then((results) => {
      return results.reduce((acc, curr) => {
        acc[curr.path] = getUsage(curr);
        return acc;
      }, {});
    })
  );

  const formatSize = (bytes) =>
    getSize(bytes, {
      perSize: $session?.[SESSION_COLUMN_UNITS]?.[SESSION_COLUMN_UNITS_SIZE],
    });

  const getUsage = (pathSpace) => {
    const freeSpace = pathSpace?.['size-bytes'];
    const totalSpace = pathSpace?.total_size;
    const usedSpace = totalSpace - freeSpace;
    return {
      progress: Math.round((usedSpace / totalSpace) * 100),
      // The percentage alone does not say whether there is room for another
      // torrent; the plain figures do.
      free: formatSize(freeSpace),
      total: formatSize(totalSpace),
    };
  };
</script>

{#if $diskUsage && $session[SESSION_COLUMN_RPC_VERSION] >= 15 && diskPaths.length}
  {#await data then pathSpaces}
    <div class="wrapper">
      <h2>Disk usage</h2>
      <ul>
        {#each Object.entries(pathSpaces) as [path, usage] (path)}
          <li class="path-item">
            <div class="path-details">
              <span class="path" title={path}>
                {path}
              </span>
              <span>
                {usage.progress}%
              </span>
            </div>
            <ProgressBar progress={usage.progress} />
            <div class="free-space">
              {usage.free.value}{usage.free.size} free of {usage.total.value}{usage.total
                .size}
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/await}
{/if}

<style>
  .wrapper {
    margin: 30px 20px 0;
    color: var(--color-panel-text);
    fill: currentColor;
  }

  h2 {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    color: var(--color-panel-header);
  }

  ul {
    list-style: none;
    margin-bottom: 30px;
  }

  .path-item {
    --progess-color: var(--color-progress-bar-stopped);
    --background-color: var(--color-progress-bar-stopped-background);

    font-weight: 400;
    padding: 3px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition:
      fill 0.25s,
      color 0.25s;
    font-size: 13px;
  }

  .path-details {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .free-space {
    font-size: 11px;
    opacity: 0.7;
    white-space: nowrap;
  }
</style>
