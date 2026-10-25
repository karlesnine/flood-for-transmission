<script>
  import { sessionStats, session } from '~helpers/stores';
  import { getSize } from '~helpers/sizeHelper';
  import {
    SESSION_COLUMN_UNITS,
    SESSION_COLUMN_UNITS_SIZE,
    SESSION_STATS_CUMULATIVE_STATS,
    SESSION_STATS_CURRENT_STATS,
    SESSION_STATS_TOTAL_UPLOAD,
    SESSION_STATS_TOTAL_DOWNLOAD,
  } from '~helpers/constants/columns';

  export let direction;
  export let hidden = false;

  if (!['upload', 'download'].includes(direction)) {
    throw new Error(
      `[Graph/Bytes] unrecognized direction. ${direction} not one of ['upload', 'download']`
    );
  }

  $: valueColumn =
    direction === 'upload'
      ? SESSION_STATS_TOTAL_UPLOAD
      : SESSION_STATS_TOTAL_DOWNLOAD;

  const format = (bytes) =>
    getSize(bytes, {
      perSize: $session?.[SESSION_COLUMN_UNITS]?.[SESSION_COLUMN_UNITS_SIZE],
    });

  // Both figures are shown: everything transferred since Transmission was
  // installed (cumulative) and what this session transferred (current).
  $: total = format(
    $sessionStats[SESSION_STATS_CUMULATIVE_STATS]?.[valueColumn]
  );
  $: current = format(
    $sessionStats[SESSION_STATS_CURRENT_STATS]?.[valueColumn]
  );
</script>

<div
  class="bytes"
  class:upload={direction === 'upload'}
  class:download={direction === 'download'}
  class:hidden={hidden}
>
  <span class="bytes__total"
    >{total.value}<span class="bytes__size">{total.size}</span></span
  >
  <span class="bytes__session" title="Transferred since Transmission started"
    >session {current.value}<span class="bytes__size">{current.size}</span></span
  >
</div>

<style>
  .bytes {
    grid-area: bytes;
    font-size: 12px;
    transition: opacity 0.25s;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bytes.upload {
    color: var(--color-upload);
  }

  .bytes.download {
    color: var(--color-download);
  }

  .bytes__size {
    font-size: 10px;
  }

  .bytes__session {
    font-size: 11px;
    opacity: 0.85;
  }

  .hidden {
    opacity: 0;
  }
</style>
