<script>
  import { tick } from 'svelte';
  import { torrentDetails, session, alerts } from '~helpers/stores';
  import { getSize } from '~helpers/sizeHelper';
  import { getAllFiles } from '~helpers/folderStructureHelper';
  import {
    SESSION_COLUMN_UNITS,
    SESSION_COLUMN_UNITS_SIZE,
    TRANSMISSION_COLUMN_FILE_STATS,
  } from '~helpers/constants/columns';
  import Icon from '~components/Icon';
  import IconCheckbox from './IconCheckbox.svelte';
  import PriorityIndicator from '~components/PriorityIndicator';

  export let folderName;
  export let structure;
  export let selectedFiles;
  export let level = 0;
  export let iconName = null;
  export let collapsible = true;
  export let strong = false;
  export let onSingleFilePrioChange;
  // Path of this folder inside the torrent, as Transmission knows it. Null
  // means the folder cannot be renamed: the root of a single file torrent is
  // the download directory itself.
  export let path = null;
  // Renames one entry: (path, newName) => Promise
  export let onRename = null;
  // The root row is the torrent itself: it is renamed from the title, not from
  // here, so that one control owns that name.
  export let renamable = true;

  let open = true;
  // Key of the row being renamed: 'folder' for this folder, the file index for
  // a file. Only one row edits at a time inside one folder.
  let editingKey = null;
  let editValue = '';
  let saving = false;
  let editInput = null;

  $: allChecked = getAllFiles(structure).every((file) =>
    selectedFiles.includes(file.index)
  );

  const getFileSize = (file) => {
    return getSize(file.length, {
      perSize: $session[SESSION_COLUMN_UNITS][SESSION_COLUMN_UNITS_SIZE],
    });
  };

  const getFilePriority = (fileStats) => {
    if (!fileStats.wanted) {
      return -2;
    }
    return fileStats.priority;
  };

  const selectFile = (fileName) =>
    (selectedFiles = [...selectedFiles, fileName]);
  const unselectFile = (fileName) =>
    (selectedFiles = selectedFiles.filter((file) => file !== fileName));

  const handleFileCheckbox = (event) => {
    if (event.target.checked) {
      selectFile(event.target.value);
      return;
    }

    unselectFile(event.target.value);
  };

  const selectFolder = (event) => {
    const folderFileNames = getAllFiles(structure).map((file) => file.index);

    if (event.target.checked) {
      selectedFiles = [...selectedFiles, ...folderFileNames];
      return;
    }

    selectedFiles = selectedFiles.filter(
      (file) => !folderFileNames.includes(file)
    );
  };

  const getNestedPath = (nestedFolder) =>
    path === null ? null : `${path}/${nestedFolder}`;

  const startRename = async (key, currentName) => {
    if (!onRename) return;
    editingKey = key;
    editValue = currentName;
    await tick();
    editInput?.focus();
    editInput?.select();
  };

  const cancelRename = () => {
    editingKey = null;
    editValue = '';
  };

  const submitRename = (entryPath, currentName) => {
    if (saving) return;

    const newName = editValue.trim();

    if (!newName || newName === currentName) {
      cancelRename();
      return;
    }

    // A slash would move the entry elsewhere instead of renaming it.
    if (newName.includes('/')) {
      alerts.add('A name cannot contain a slash', 'negative');
      return;
    }

    saving = true;
    onRename(entryPath, newName)
      .then(() => {
        saving = false;
        cancelRename();
      })
      .catch(() => {
        saving = false;
        alerts.add('Failed to rename, the name may already be taken', 'negative');
      });
  };

  const handleEditKeydown = (event, entryPath, currentName) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRename(entryPath, currentName);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };
</script>

<div
  class="folder"
  style={`margin-left: ${level * 8}px`}
  class:strong={strong}
  title={folderName}
>
  <IconCheckbox
    checked={allChecked}
    on:change={selectFolder}
    iconName={iconName ?? (open ? 'FolderOpen' : 'FolderClosed')}
  />
  {#if editingKey === 'folder'}
    <input
      class="rename-input"
      bind:this={editInput}
      bind:value={editValue}
      autocomplete="off"
      spellcheck="false"
      on:keydown={(event) => handleEditKeydown(event, path, folderName)}
    />
    <div class="rename-actions">
      <button
        type="button"
        class="confirm"
        disabled={saving}
        on:click={() => submitRename(path, folderName)}>Rename</button
      >
      <button type="button" class="cancel" on:click={cancelRename}>Cancel</button>
    </div>
  {:else}
    <div
      class="path"
      class:no-action={!collapsible}
      on:click={() => collapsible && (open = !open)}
    >
      {folderName}
    </div>
    {#if onRename && path !== null && renamable}
      <button
        type="button"
        class="rename"
        title="Rename"
        aria-label="Rename {folderName}"
        on:click|stopPropagation={() => startRename('folder', folderName)}
      >
        <Icon name="Pencil" />
      </button>
    {/if}
  {/if}
</div>
{#if open}
  {#each Object.keys(structure.folders) as nestedFolder (nestedFolder)}
    <svelte:self
      folderName={nestedFolder}
      structure={structure.folders[nestedFolder]}
      bind:selectedFiles={selectedFiles}
      level={level + 1}
      path={getNestedPath(nestedFolder)}
      {onSingleFilePrioChange}
      {onRename}
    />
  {/each}
  {#each structure.files as file (file.index)}
    <div
      class="file"
      style={`margin-left: ${(level + 1) * 8}px`}
      title={file.fileName}
    >
      <IconCheckbox
        on:change={handleFileCheckbox}
        group={selectedFiles}
        value={file.index}
        iconName="File"
      />
      {#if editingKey === file.index}
        <input
          class="rename-input"
          bind:this={editInput}
          bind:value={editValue}
          autocomplete="off"
          spellcheck="false"
          on:keydown={(event) =>
            handleEditKeydown(event, file.name, file.fileName)}
        />
        <div class="rename-actions">
          <button
            type="button"
            class="confirm"
            disabled={saving}
            on:click={() => submitRename(file.name, file.fileName)}>Rename</button
          >
          <button type="button" class="cancel" on:click={cancelRename}
            >Cancel</button
          >
        </div>
      {:else}
        <div
          class="path"
          on:click={() =>
            selectedFiles.includes(file.index)
              ? unselectFile(file.index)
              : selectFile(file.index)}
        >
          {file.fileName}
        </div>
        <div class="details">
          <span>{getFileSize(file).value}{getFileSize(file).size}</span>
          <span>{Math.round((file.bytesCompleted / file.length) * 100)}%</span>
          <PriorityIndicator
            value={getFilePriority(
              $torrentDetails[TRANSMISSION_COLUMN_FILE_STATS][file.index]
            )}
            allowDisabled={true}
            on:click={onSingleFilePrioChange.bind(this, file.index)}
          />
          {#if onRename}
            <button
              type="button"
              class="rename"
              title="Rename"
              aria-label="Rename {file.fileName}"
              on:click|stopPropagation={() =>
                startRename(file.index, file.fileName)}
            >
              <Icon name="Pencil" />
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
{/if}

<style>
  .folder,
  .file {
    fill: var(--color-modal-files-icon);
    color: var(--color-modal-text);
    font-size: 13px;
    margin-bottom: 3px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }

  .folder.strong {
    color: var(--color-modal-text-light);
    margin-bottom: 4px;
    line-height: 18px;
    font-size: 14px;
  }

  .details {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 11px;
    gap: 6px;
    line-height: 19px;
  }

  .path {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .path.no-action {
    cursor: initial;
  }

  .rename {
    background: none;
    border: 0;
    padding: 0 2px;
    margin-left: 2px;
    cursor: pointer;
    fill: var(--color-modal-files-icon);
    opacity: 0.4;
    display: flex;
    align-items: center;
    align-self: center;
  }

  .rename:hover,
  .rename:focus-visible {
    opacity: 1;
  }

  .rename :global(.icon) {
    height: 12px;
    width: 12px;
  }

  .rename-input {
    background: var(--color-modal-input-background, rgba(0, 0, 0, 0.2));
    border: 1px solid var(--color-modal-input-border, rgba(255, 255, 255, 0.2));
    border-radius: 2px;
    color: var(--color-modal-text-light);
    font-family: inherit;
    font-size: 13px;
    min-width: 0;
    padding: 1px 4px;
  }

  .rename-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
  }

  .rename-actions button {
    background: none;
    border: 1px solid var(--color-modal-input-border, rgba(255, 255, 255, 0.2));
    border-radius: 2px;
    color: var(--color-modal-text);
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    padding: 1px 6px;
  }

  .rename-actions button:hover:not(:disabled) {
    color: var(--color-modal-text-light);
  }

  .rename-actions button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .rename-actions .confirm {
    border-color: var(--color-primary, rgba(255, 255, 255, 0.4));
  }
</style>
