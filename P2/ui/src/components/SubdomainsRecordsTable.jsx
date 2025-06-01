// src/components/SubdomainsRecordsTable.jsx
import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { deleteSubdomain } from "../services/subdomain";
import ms from "ms";

export default function SubdomainsRecordsTable({ subdomains, onDelete }) {
  const [deletionTarget, setDeletionTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const confirmDelete = async () => {
    if (!deletionTarget) return;

    setIsDeleting(true);

    const { domain, subdomain } = deletionTarget;
    const result = await deleteSubdomain(domain, subdomain);

    if (result.success) {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message);
    }

    setIsDeleting(false);
    setDeletionTarget(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-primary text-s uppercase text-light">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Subdominio</th>
              <th className="px-4 py-2">Cache Size</th>
              <th className="px-4 py-2">Tipos</th>
              <th className="px-4 py-2">TTL</th>
              <th className="px-4 py-2">Política</th>
              <th className="px-4 py-2">Destino</th>
              <th className="px-4 py-2">Autenticación</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subdomains.map((rec, idx) => (
              <tr
                key={rec.subdomain}
                className="border-b hover:bg-lightgrey2 transition-colors"
              >
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2 text-secondary">{rec.subdomain}</td>
                <td className="px-4 py-2 text-secondary">
                  {(rec.cacheSize / 1000000).toFixed(2)} MB
                </td>
                <td className="px-4 py-2 text-secondary">
                  {rec.fileTypes?.join(", ")}
                </td>
                <td className="px-4 py-2 text-secondary">{ms(rec.ttl)}</td>
                <td className="px-4 py-2 text-secondary">
                  {rec.replacementPolicy}
                </td>
                <td className="px-4 py-2 text-secondary">{rec.destination}</td>
                <td className="px-4 py-2 text-secondary">
                  {rec.authMethod || "N/A"}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/domains/${rec.domain}/subdomains/${rec.subdomain}`
                      )
                    }
                    className="p-1 text-accentBlue hover:text-secondary hover:cursor-pointer transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeletionTarget(rec)}
                    className="p-1 text-warning hover:text-secondary hover:cursor-pointer transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirmationModal
        isOpen={!!deletionTarget}
        name={
          deletionTarget
            ? `${deletionTarget.subdomain}.${deletionTarget.domain}`
            : ""
        }
        type="subdomain"
        onClose={() => setDeletionTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
