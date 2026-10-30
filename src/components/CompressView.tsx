/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VUE DE COMPRESSION UNIVERSELLE (COMPRESS VIEW)
 * 
 * Supporte TOUS LES FORMATS DE FICHIERS :
 * - Documents : PDF (.pdf), Word (.docx), Excel (.xlsx), etc.
 * - Médias : Images (.png, .jpg, .webp, .svg), etc.
 * - Textes & Code : .txt, .md, .json, .csv, code source, etc.
 * - Saisie libre de texte dans le champ d'édition.
 */

import React, { useState, useRef } from "react";
import {
  compressUniversal,
  CompressionResult,
  getUtf8ByteSize,
} from "../algorithms/huffman";
import { StatsSummary } from "./StatsSummary";
import { FrequencyTable } from "./FrequencyTable";
import { HuffmanTreeVisualizer } from "./HuffmanTreeVisualizer";
import { BitstreamInspector } from "./BitstreamInspector";
import {
  UploadCloud,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Table as TableIcon,
  GitFork,
  Binary,
  AlertCircle,
  FileSpreadsheet,
  FileBox,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface CompressViewProps {
  onCompressionSuccess?: (result: CompressionResult) => void;
}

export const CompressView: React.FC<CompressViewProps> = ({ onCompressionSuccess }) => {
  const [inputText, setInputText] = useState("");
  const [filename, setFilename] = useState("");
  const [fileMime, setFileMime] = useState("text/plain");
  const [loadedFileBytes, setLoadedFileBytes] = useState<Uint8Array | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"table" | "tree" | "bitstream">("table");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper pour afficher une icône adaptée selon l'extension
  const getFileBadge = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      return { label: "Document PDF", color: "text-red-400 bg-red-950/60 border-red-800" };
    }
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return { label: "Tableur Excel / CSV", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    }
    if (ext === "docx" || ext === "doc") {
      return { label: "Document Word", color: "text-blue-400 bg-blue-950/60 border-blue-800" };
    }
    if (["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"].includes(ext || "")) {
      return { label: "Image Bitmap / Vectoriel", color: "text-amber-400 bg-amber-950/60 border-amber-800" };
    }
    return { label: "Fichier Données / Texte", color: "text-cyan-400 bg-cyan-950/60 border-cyan-800" };
  };

  // Traitement d'un fichier binaire ou texte (via FileReader ArrayBuffer)
  const processFile = (file: File) => {
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setFilename(file.name);
    setFileMime(file.type || "application/octet-stream");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);

        setLoadedFileBytes(bytes);

        // Détection si c'est du texte lisible pour l'afficher dans le textarea
        const isTextFile =
          file.type.startsWith("text/") ||
          file.name.match(/\.(txt|md|json|csv|py|c|cpp|js|ts|html|css|xml|log)$/i);

        if (isTextFile) {
          try {
            const decoded = new TextDecoder("utf-8").decode(bytes);
            setInputText(decoded);
          } catch {
            setInputText(`[Fichier binaire : ${file.name} (${bytes.length.toLocaleString("fr-FR")} octets)]`);
          }
        } else {
          setInputText(
            `[Fichier binaire importé : ${file.name}\nTaille : ${bytes.length.toLocaleString("fr-FR")} octets\nType MIME : ${
              file.type || "application/octet-stream"
            }\nL'algorithme de Huffman va traiter l'intégralité du flux d'octets 0-255]`
          );
        }

        // Compression instantanée du flux binaire universel
        const result = compressUniversal(bytes, file.name, file.type || "application/octet-stream");
        setCompressionResult(result);
        setSelectedChar(null);
        if (onCompressionSuccess) onCompressionSuccess(result);
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur lors de la lecture du fichier.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Impossible de lire le fichier sélectionné.");
      setIsProcessing(false);
    };

    // Lecture universelle sous forme d'ArrayBuffer brut (fonctionne pour PDF, DOCX, XLSX, Images, etc.)
    reader.readAsArrayBuffer(file);
  };

  // Drag & Drop
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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Compression manuelle (si saisie dans le textarea)
  const handleRunCompression = () => {
    setErrorMessage(null);
    if (!inputText.trim() && !loadedFileBytes) {
      setErrorMessage("Veuillez saisir un texte ou glisser-déposer un fichier (.pdf, .docx, .xlsx, image, .txt, etc.).");
      return;
    }

    try {
      setIsProcessing(true);
      // Si un fichier binaire est déjà chargé et que le texte n'a pas été modifié
      if (loadedFileBytes && inputText.startsWith("[Fichier binaire importé :")) {
        const result = compressUniversal(loadedFileBytes, filename || "document.bin", fileMime);
        setCompressionResult(result);
        setSelectedChar(null);
        if (onCompressionSuccess) onCompressionSuccess(result);
      } else {
        // Traiter le texte saisi
        const result = compressUniversal(inputText, filename || "document.txt", "text/plain");
        setCompressionResult(result);
        setSelectedChar(null);
        if (onCompressionSuccess) onCompressionSuccess(result);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la compression.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setFilename("");
    setFileMime("text/plain");
    setLoadedFileBytes(null);
    setCompressionResult(null);
    setSelectedChar(null);
    setErrorMessage(null);
  };

  const currentSizeBytes = loadedFileBytes ? loadedFileBytes.length : getUtf8ByteSize(inputText);

  return (
    <div className="space-y-6">
      {/* Zone Supérieure : Import Universel & Saisie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonne Gauche : Drag & Drop Universel (PDF, DOCX, XLSX, Images, Texte) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`h-full min-h-[240px] border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragging
                ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="*/*"
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              Glissez-déposez n'importe quel fichier
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Prend en charge les <strong className="text-slate-300">PDF, Word (.docx), Excel (.xlsx), Images (PNG/JPG), et fichiers texte</strong>
            </p>

            {/* Badges de types de formats pris en charge */}
            <div className="flex flex-wrap gap-1.5 justify-center mt-3 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-900/60">.PDF</span>
              <span className="px-2 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-900/60">.DOCX</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-900/60">.XLSX</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-900/60">IMAGES</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-900/60">.TXT / CODE</span>
            </div>

            <div className="text-[11px] text-slate-500 mt-4 font-mono">
              {filename ? (
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{filename}</span>
                  <span className="text-slate-500">({currentSizeBytes.toLocaleString("fr-FR")} octets)</span>
                </div>
              ) : (
                <span>Cliquez pour parcourir vos dossiers</span>
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Textarea de saisie ou aperçu du fichier */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  {filename ? `Fichier : ${filename}` : "Saisie de texte direct"}
                </span>
                {filename && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getFileBadge(filename).color}`}>
                    {getFileBadge(filename).label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
                <span>{currentSizeBytes.toLocaleString("fr-FR")} octets</span>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setLoadedFileBytes(null); // réinitialiser le binaire si le texte est modifié
              }}
              placeholder="Collez ou saisissez votre texte ici, ou déposez un fichier (PDF, Word, Excel, image, code) dans la zone de gauche..."
              rows={8}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed resize-y"
            />
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>

            <button
              onClick={handleRunCompression}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-lg shadow-cyan-950/40 flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isProcessing ? "Traitement..." : "Compresser avec Huffman"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zone Inférieure : Résultats & Visualisations dynamiques */}
      {compressionResult && (
        <div className="space-y-5 pt-2">
          {/* Section Statistiques de gain d'espace */}
          <StatsSummary result={compressionResult} />

          {/* Barre d'onglets pour naviguer entre les vues pédagogiques */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "table"
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table des Fréquences & Octets</span>
              </button>
              <button
                onClick={() => setActiveTab("tree")}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "tree"
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Arbre Binaire de Huffman</span>
              </button>
              <button
                onClick={() => setActiveTab("bitstream")}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "bitstream"
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Flux Binaire Compacté</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden sm:block font-mono">
              Calculé en {compressionResult.executionTimeMs} ms
            </div>
          </div>

          {/* Contenu de l'onglet actif */}
          {activeTab === "table" && (
            <FrequencyTable
              items={compressionResult.frequencyTable}
              selectedChar={selectedChar}
              onSelectChar={(char) => {
                setSelectedChar(char);
                if (char) setActiveTab("tree");
              }}
            />
          )}

          {activeTab === "tree" && (
            <HuffmanTreeVisualizer
              root={compressionResult.treeRoot}
              selectedChar={selectedChar}
              onSelectChar={setSelectedChar}
            />
          )}

          {activeTab === "bitstream" && (
            <BitstreamInspector
              bitString={compressionResult.bitString}
              paddingBitsCount={compressionResult.paddingBitsCount}
              packedBytes={compressionResult.packedBytes}
              originalText={compressionResult.isText && compressionResult.originalText ? compressionResult.originalText : `${compressionResult.filename} (${compressionResult.originalSizeBytes} octets)`}
              codeMap={
                Object.fromEntries(
                  Object.entries(compressionResult.codeMap).map(([k, v]) => [
                    String.fromCharCode(Number(k)),
                    v,
                  ])
                )
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
