// src/components/SubdomainsRecordsTable.jsx
import { Edit2, Trash2 } from 'lucide-react';

export default function SubdomainsRecordsTable({
  subdomains,
  onEdit,
  onDelete
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-primary text-s uppercase text-darkgrey">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Subdominio</th>
            <th className="px-4 py-2">Cache Size</th>
            <th className="px-4 py-2">Tipos</th>
            <th className="px-4 py-2">TTL</th>
            <th className="px-4 py-2">Política</th>
            <th className="px-4 py-2">Auth</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {subdomains.map((rec, idx) => (
            <tr key={rec.subdomain} className="border-b hover:bg-lightgrey1">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{rec.subdomain}</td>
              <td className="px-4 py-2">{rec.cacheSize}</td>
              <td className="px-4 py-2">{rec.fileTypes.join(', ')}</td>
              <td className="px-4 py-2">{rec.ttl}</td>
              <td className="px-4 py-2">{rec.replacementPolicy}</td>
              <td className="px-4 py-2">{rec.authMethod}</td>
              <td className="px-4 py-2 flex gap-2">
                {onEdit && (
                  <button onClick={() => onEdit(rec)} className="p-1 text-gray-600 hover:text-black">
                    <Edit2 size={16} />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(rec)} className="p-1 text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
);
}
