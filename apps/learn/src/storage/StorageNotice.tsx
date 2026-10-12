import './StorageNotice.css'

export function StorageNotice({ storageOk }: { storageOk: boolean }) {
  if (storageOk) return null
  return (
    <p className="storage-notice" role="status">
      Progress can’t be saved in this browser. You can still browse and practise; saved progress may be unavailable.
    </p>
  )
}
