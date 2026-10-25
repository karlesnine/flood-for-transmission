export default function resizeableTable(handle, onChange) {
  const MIN_COLUMN_WIDTH = 50;

  const column = handle.parentElement;
  const table = handle.closest('table');
  const container = table ? table.parentElement : null;
  let dragging = false;
  let handleStartX = handle.pageX;
  let columnStartWidth = column.getBoundingClientRect().width;
  let tableStartWidth = table.getBoundingClientRect().width;
  let containerStartWidth = 0;

  const handleMousedown = (e) => {
    dragging = true;
    handleStartX = e.pageX ?? e.touches[0].pageX;
    columnStartWidth = column.getBoundingClientRect().width;
    tableStartWidth = table.getBoundingClientRect().width;
    containerStartWidth = container ? container.clientWidth : tableStartWidth;
  };

  const handleMouseup = () => {
    if (!dragging) return;

    const columnWidth = column.getBoundingClientRect().width;
    onChange(columnWidth);

    dragging = false;
  };

  const handleMousemove = (e) => {
    if (!dragging) return;

    const currentX = e.pageX ?? e.touches[0].pageX;
    const diffX = currentX - handleStartX;

    // The other columns keep their width, so this one can only grow into the
    // space that is actually left in the container. Without this limit the
    // table grows past its container and the rightmost columns disappear.
    const otherColumnsWidth = tableStartWidth - columnStartWidth;
    const maxColumnWidth = containerStartWidth
      ? Math.max(MIN_COLUMN_WIDTH, containerStartWidth - otherColumnsWidth)
      : columnStartWidth + diffX;
    const newColumnWidth = Math.min(
      Math.max(MIN_COLUMN_WIDTH, columnStartWidth + diffX),
      maxColumnWidth
    );

    column.style.width = `${newColumnWidth}px`;
    table.style.width = `${tableStartWidth + (newColumnWidth - columnStartWidth)}px`;
  };

  handle.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', handleMousemove);

  handle.addEventListener('touchstart', handleMousedown);
  document.addEventListener('touchend', handleMouseup);
  document.addEventListener('touchmove', handleMousemove);

  return {
    destroy() {
      handle.removeEventListener('mousedown', handleMousedown);
      document.removeEventListener('mouseup', handleMouseup);
      document.removeEventListener('mousemove', handleMousemove);

      handle.removeEventListener('touchstart', handleMousedown);
      document.removeEventListener('touchend', handleMouseup);
      document.removeEventListener('touchmove', handleMousemove);
    },
  };
}
