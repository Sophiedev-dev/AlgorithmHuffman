/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VUE DE DÉCOMPRESSION UNIVERSELLE (DECOMPRESS VIEW)
 * 
 * Décompresse N'IMPORTE QUEL FORMAT DE FICHIER :
 * - Documents PDF, Word (.docx), Excel (.xlsx), etc.
 * - Fichiers images (PNG, JPG, SVG, WebP, etc.) avec aperçu graphique direct.
 * - Fichiers texte, code source et données.
 * - Restitution bit-à-bit rigoureusement identique au fichier d'origine.
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
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  GitFork,
  Image as ImageIcon,
  FileSpreadsheet,
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

  // URL d'aperçu d'image si le fichier restauré est une image
  const previewImageUrl = useMemo(() => {
    if (
      decompressedData &&
      decompressedData.mimeType?.startsWith("image/") &&
      decompressedData.restoredBytes &&
      decompressedData.restoredBytes.length > 0
    ) {
      const blob = new Blob([decompressedData.restoredBytes as unknown as BlobPart], { type: decompressedData.mimeType });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [decompressedData]);

  // Nettoyage de l'URL objet en cas de changement
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
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#22d3ee", "#10b981", "#6366f1"],
      });
    } catch {
      // Ignorer si non disponible
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
        err.message || "Erreur : Le fichier fourni n'est pas un conteneur Huffman valide."
      );
      setDecompressedData(null);
    }
  };

  // Lecture du fichier .huff ou .json via FileReader
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

  // Télécharger le fichier restauré dans son format original (PDF, DOCX, XLSX, PNG, TXT, etc.)
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

  // Copier le texte si disponible
  const handleCopyText = () => {
    if (!decompressedData?.restoredText) return;
    navigator.clipboard.writeText(decompressedData.restoredText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Zone de chargement du fichier compressé */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonne Gauche : Drag & Drop */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-emerald-400 bg-emerald-950/30 scale-[1.01]"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".huff,.json"
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              Glissez-déposez le fichier compressé (.huff / .json)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              ou <span className="text-emerald-400 underline underline-offset-2">sélectionnez-le sur votre ordinateur</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-3">
              Restaure n'importe quel fichier original : PDF, Word, Excel, Images, Code, etc.
            </p>
          </div>

          {/* Raccourci : Recharger la dernière compression de la session */}
          {lastCompressedPackage && (
            <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold text-cyan-200 block">
                  Fichier de la session courante prêt à décompresser :
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
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
                className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
              >
                Décompresser ce fichier
              </button>
            </div>
          )}
        </div>

        {/* Colonne Droite : Option de collage manuel JSON */}
        <div className="lg:col-span-6 flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Ou collez directement le contenu JSON compressé
                </span>
              </div>
            </div>

            <textarea
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              placeholder='Collez ici le contenu JSON généré lors de la compression (ex: {"format": "HUFFMAN_CODING_V2", ...})...'
              rows={6}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-3">
            <button
              onClick={handleDecompressManualInput}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Décoder le JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Résultat de la décompression */}
      {decompressedData && (
        <div className="space-y-5 pt-2">
          {/* Bannière de validation d'intégrité */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Décompression Réussie avec l'Algorithme de Huffman</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    100% SANS PERTE (BIT-EXACT)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Fichier restitué : <strong className="text-slate-100 font-mono">{decompressedData.originalFilename}</strong>
                  {" · "}
                  <span>{decompressedData.restoredBytes.length.toLocaleString("fr-FR")} octets</span>
                  {" · "}
                  <span>Décodé en {decompressedData.executionTimeMs} ms</span>
                </div>
              </div>
            </div>

            {/* Boutons d'action pour le fichier restauré */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {decompressedData.isText && decompressedData.restoredText && (
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copié !" : "Copier"}</span>
                </button>
              )}

              <button
                onClick={handleDownloadRestored}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-950/50 cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger ({decompressedData.originalFilename})</span>
              </button>
            </div>
          </div>

          {/* Métadonnées du conteneur */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="text-slate-500 mb-1">Taille Restituée</div>
              <div className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                {decompressedData.restoredBytes.length.toLocaleString("fr-FR")} octets
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="text-slate-500 mb-1">Type de Document</div>
              <div className="text-base font-bold text-white font-mono truncate">
                {decompressedData.originalFilename.split(".").pop()?.toUpperCase() || "BIN"}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="text-slate-500 mb-1">Octets distincts dans l'Arbre</div>
              <div className="text-base font-bold text-cyan-300 font-mono tabular-nums">
                {Object.keys(decompressedData.metadata.frequencies).length} / 256
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="text-slate-500 mb-1">Bourrage de Bits Retiré</div>
              <div className="text-base font-bold text-amber-300 font-mono tabular-nums">
                {decompressedData.metadata.paddingBitsCount} bits
              </div>
            </div>
          </div>

          {/* Prévisualisation adaptée selon le type de fichier */}
          <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/70 text-xs">
              <span className="font-semibold text-slate-200">
                Aperçu du contenu restauré
              </span>
              <button
                onClick={() => setShowTree(!showTree)}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>{showTree ? "Masquer l'arbre reconstitué" : "Visualiser l'arbre de Huffman reconstitué"}</span>
              </button>
            </div>

            {/* Si c'est une image restaurée : Affichage direct de l'image */}
            {previewImageUrl ? (
              <div className="p-6 flex flex-col items-center justify-center bg-slate-950/60">
                <img
                  src={previewImageUrl}
                  alt={decompressedData.originalFilename}
                  className="max-h-80 max-w-full rounded-lg border border-slate-800 object-contain shadow-lg"
                />
                <span className="text-xs text-slate-400 mt-3 font-mono">
                  {decompressedData.originalFilename} · Image restaurée avec 100% de fidélité visuelle
                </span>
              </div>
            ) : decompressedData.isText && decompressedData.restoredText ? (
              /* Si c'est du texte : Affichage du texte */
              <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text bg-slate-950/50">
                {decompressedData.restoredText}
              </div>
            ) : (
              /* Si c'est un document binaire (PDF, DOCX, XLSX, etc.) */
              <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-950/50">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-3">
                  <FileBox className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-100 font-mono">
                  {decompressedData.originalFilename}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Fichier binaire reconstitué avec fidélité absolue (chaque octet a été restitué par le parcours de l'arbre de Huffman).
                </p>
                <button
                  onClick={handleDownloadRestored}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le fichier original ({decompressedData.originalFilename})</span>
                </button>
              </div>
            )}
          </div>

          {/* Arbre binaire de Huffman reconstitué */}
          {showTree && decompressedData.treeRoot && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">
                Arbre de Huffman régénéré à partir de la table des fréquences du fichier compressé :
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
