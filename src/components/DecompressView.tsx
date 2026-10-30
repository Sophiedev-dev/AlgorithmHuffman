/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VUE DE DÉCOMPRESSION UNIVERSELLE (DECOMPRESS VIEW)
 * 
 * Style logiciel sobre et naturel :
 * - Décompression sans perte bit-à-bit de tout format
 * - Validation d'intégrité
 * - Téléchargement du fichier restauré
 * - Aperçu direct pour les images et le texte
 */

import React, { useState, useRef, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  decompressUniversalPackage,
  HuffmanPackage,
  formatDisplayChar,
  getUtf8ByteSize,
} from "../algorithms/huffman";
import {
  UploadCloud,
  FileCheck2,
  Download,
  Copy,
  Check,
  AlertCircle,
  FileText,
  GitFork,
  FileBox,
} from "lucide-react";
import { HuffmanTreeVisualizer } from "./HuffmanTreeVisualizer";

interface DecompressViewProps {
  lastCompressedPackage?: HuffmanPackage | null;
  lastOriginalText?: string | null;
}

export const DecompressView: React.FC<DecompressViewProps> = ({
  lastCompressedPackage,
  lastOriginalText,
}) => {
  const [decompressedData, setDecompressedData] = useState<{
    restoredBytes: Uint8Array;
    restoredText?: string;
    isText: boolean;
    originalFilename: string;
    mimeType: string;
    metadata: HuffmanPackage;
    treeRoot: any;
    frequencyTable: any[];
    executionTimeMs: number;
  } | null>(null);

  const [rawJsonInput, setRawJsonInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewImageUrl = useMemo(() => {
    if (
      decompressedData &&
      decompressedData.mimeType?.startsWith("image/") &&
      decompressedData.restoredBytes &&
      decompressedData.restoredBytes.length > 0
    ) {
      const blob = new Blob([decompressedData.restoredBytes as unknown as BlobPart], {
        type: decompressedData.mimeType,
      });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [decompressedData]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#3b82f6", "#10b981", "#64748b"],
      });
    } catch {
      // Ignorer si indisponible
    }
  };

  const processFileContent = (content: string) => {
    setErrorMessage(null);
    try {
      const result = decompressUniversalPackage(content);
      setDecompressedData(result);
      triggerCelebration();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Erreur : Le fichier fourni n'est pas un fichier compressé valide."
      );
      setDecompressedData(null);
    }
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processFileContent(content);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Impossible de lire le fichier sélectionné.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDecompressManualInput = () => {
    if (!rawJsonInput.trim()) {
      setErrorMessage("Veuillez coller le contenu JSON d'un fichier .huff.");
      return;
    }
    processFileContent(rawJsonInput);
  };

  // Télécharger le fichier restauré
  const handleDownloadRestored = () => {
    if (!decompressedData) return;

    let targetFilename = decompressedData.originalFilename || "fichier_restaure.bin";
    if (targetFilename.endsWith(".compressed.huff") || targetFilename.endsWith(".compressed.json")) {
      targetFilename = targetFilename.replace(/\.compressed\.(huff|json)$/, "");
    }

    const blob = new Blob([decompressedData.restoredBytes as unknown as BlobPart], {
      type: decompressedData.mimeType || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = targetFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    if (!decompressedData?.restoredText) return;
    navigator.clipboard.writeText(decompressedData.restoredText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Zone de chargement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonne Gauche : Drag & Drop */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-950/20"
                : "border-zinc-800 bg-[#16181d] hover:border-zinc-700"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".huff,.json"
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-zinc-200">
              Glissez-déposez le fichier compressé (.huff / .json)
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              ou cliquez pour parcourir vos dossiers
            </p>
            <p className="text-[11px] text-zinc-500 mt-3">
              Restaure le fichier d'origine : PDF, Word, Excel, images ou texte
            </p>
          </div>

          {/* Raccourci de session */}
          {lastCompressedPackage && (
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#16181d] flex items-center justify-between">
              <div className="text-xs">
                <span className="font-medium text-zinc-200 block">
                  Fichier compressé récemment :
                </span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {lastCompressedPackage.filename} ({lastCompressedPackage.originalSizeBytes?.toLocaleString("fr-FR")} octets)
                </span>
              </div>
              <button
                onClick={() => {
                  try {
                    const res = decompressUniversalPackage(lastCompressedPackage);
                    setDecompressedData(res);
                    triggerCelebration();
                  } catch (e: any) {
                    setErrorMessage(e.message);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors cursor-pointer border border-zinc-700"
              >
                Décompresser
              </button>
            </div>
          )}
        </div>

        {/* Colonne Droite : Collage JSON manuel */}
        <div className="lg:col-span-6 flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-[#16181d]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-200">
                  Ou collez le contenu JSON compressé
                </span>
              </div>
            </div>

            <textarea
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              placeholder='Collez ici le JSON d&apos;un fichier .huff (ex: {"format": "HUFFMAN_CODING_V2", ...})...'
              rows={6}
              className="w-full p-3 bg-[#111215] border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-3">
            <button
              onClick={handleDecompressManualInput}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-md transition-colors border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Décoder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Résultat décompressé */}
      {decompressedData && (
        <div className="space-y-5 pt-2">
          {/* Bandeau de validation sobre */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#16181d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Décompression terminée avec succès</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  100% SANS PERTE
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Fichier restauré : <strong className="text-zinc-200 font-mono">{decompressedData.originalFilename}</strong>
                {" · "}
                <span>{decompressedData.restoredBytes.length.toLocaleString("fr-FR")} octets</span>
                {" · "}
                <span>Traité en {decompressedData.executionTimeMs} ms</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {decompressedData.isText && decompressedData.restoredText && (
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copié" : "Copier le texte"}</span>
                </button>
              )}

              <button
                onClick={handleDownloadRestored}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger ({decompressedData.originalFilename})</span>
              </button>
            </div>
          </div>

          {/* Grille de métadonnées */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-zinc-800 bg-[#16181d]">
              <div className="text-zinc-500 mb-1">Taille restaurée</div>
              <div className="text-base font-semibold text-zinc-100 font-mono tabular-nums">
                {decompressedData.restoredBytes.length.toLocaleString("fr-FR")} octets
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-[#16181d]">
              <div className="text-zinc-500 mb-1">Extension</div>
              <div className="text-base font-semibold text-zinc-200 font-mono truncate">
                {decompressedData.originalFilename.split(".").pop()?.toUpperCase() || "BIN"}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-[#16181d]">
              <div className="text-zinc-500 mb-1">Octets dans l'arbre</div>
              <div className="text-base font-semibold text-zinc-200 font-mono tabular-nums">
                {Object.keys(decompressedData.metadata.frequencies).length} / 256
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-[#16181d]">
              <div className="text-zinc-500 mb-1">Bits de bourrage retirés</div>
              <div className="text-base font-semibold text-zinc-200 font-mono tabular-nums">
                {decompressedData.metadata.paddingBitsCount} bits
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="border border-zinc-800 rounded-xl bg-[#16181d] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#121316] text-xs">
              <span className="font-medium text-zinc-300">
                Aperçu du contenu restauré
              </span>
              <button
                onClick={() => setShowTree(!showTree)}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>{showTree ? "Masquer l'arbre" : "Afficher l'arbre reconstitué"}</span>
              </button>
            </div>

            {previewImageUrl ? (
              <div className="p-6 flex flex-col items-center justify-center bg-[#111215]">
                <img
                  src={previewImageUrl}
                  alt={decompressedData.originalFilename}
                  className="max-h-80 max-w-full rounded-md border border-zinc-800 object-contain"
                />
                <span className="text-xs text-zinc-500 mt-3 font-mono">
                  {decompressedData.originalFilename} (Image restituée avec exactitude)
                </span>
              </div>
            ) : decompressedData.isText && decompressedData.restoredText ? (
              <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed select-text bg-[#111215]">
                {decompressedData.restoredText}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center bg-[#111215]">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-3">
                  <FileBox className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-zinc-200 font-mono">
                  {decompressedData.originalFilename}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Document binaire restitué avec fidélité bit-à-bit par l'algorithme de Huffman.
                </p>
                <button
                  onClick={handleDownloadRestored}
                  className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger le fichier</span>
                </button>
              </div>
            )}
          </div>

          {/* Arbre reconstitué */}
          {showTree && decompressedData.treeRoot && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">
                Arbre de Huffman reconstruit à partir de la table des fréquences :
              </div>
              <HuffmanTreeVisualizer
                root={decompressedData.treeRoot}
                selectedChar={selectedChar}
                onSelectChar={setSelectedChar}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
