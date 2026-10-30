/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VUE DE COMPRESSION UNIVERSELLE (COMPRESS VIEW)
 * 
 * Design sobre, épuré et naturel (style outil logiciel de bureau) :
 * - Aucune surcharge de néon ou dégradés artificiels
 * - Drag & Drop fluide pour tout type de fichier
 * - Saisie directe de texte
 * - Analyse complète et instantanée
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
  Table as TableIcon,
  GitFork,
  Binary,
  AlertCircle,
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

  // Helper pour afficher le type de fichier sans fioritures
  const getFileBadge = (name: string) => {
    const ext = name.split(".").pop()?.toUpperCase() || "BIN";
    return ext;
  };

  // Traitement d'un fichier (via FileReader ArrayBuffer)
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

        // Détection si c'est du texte lisible
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
            }]`
          );
        }

        // Compression du flux binaire
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

  // Déclencher la compression
  const handleRunCompression = () => {
    setErrorMessage(null);
    if (!inputText.trim() && !loadedFileBytes) {
      setErrorMessage("Veuillez saisir un texte ou glisser-déposer un fichier (.pdf, .docx, .xlsx, image, .txt, etc.).");
      return;
    }

    try {
      setIsProcessing(true);
      if (loadedFileBytes && inputText.startsWith("[Fichier binaire importé :")) {
        const result = compressUniversal(loadedFileBytes, filename || "document.bin", fileMime);
        setCompressionResult(result);
        setSelectedChar(null);
        if (onCompressionSuccess) onCompressionSuccess(result);
      } else {
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
      {/* Zone Supérieure : Import & Saisie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonne Gauche : Drag & Drop */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`h-full min-h-[220px] border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
              isDragging
                ? "border-blue-500 bg-blue-950/20"
                : "border-zinc-800 bg-[#16181d] hover:border-zinc-700"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="*/*"
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-zinc-200">
              Glissez-déposez votre fichier ici
            </h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              PDF, Word (.docx), Excel (.xlsx), Images (PNG/JPG), ou texte
            </p>

            <div className="text-[11px] text-zinc-400 mt-4 font-mono">
              {filename ? (
                <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{filename}</span>
                  <span className="text-zinc-500">({currentSizeBytes.toLocaleString("fr-FR")} octets)</span>
                </div>
              ) : (
                <span className="text-zinc-500">Cliquez pour parcourir vos fichiers</span>
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Textarea de saisie ou aperçu */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-[#16181d]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-200">
                  {filename ? `Fichier : ${filename}` : "Saisie de texte"}
                </span>
                {filename && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {getFileBadge(filename)}
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 font-mono tabular-nums">
                {currentSizeBytes.toLocaleString("fr-FR")} octets
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setLoadedFileBytes(null);
              }}
              placeholder="Collez ou saisissez votre texte ici, ou déposez un fichier (PDF, Word, Excel, image, code) dans la zone de gauche..."
              rows={8}
              className="w-full p-3 bg-[#111215] border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors leading-relaxed resize-y"
            />
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Boutons d'action sobres */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-800/80">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>

            <button
              onClick={handleRunCompression}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isProcessing ? "Compression en cours..." : "Compresser"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zone Inférieure : Résultats */}
      {compressionResult && (
        <div className="space-y-5 pt-2">
          {/* Statistiques épurées */}
          <StatsSummary result={compressionResult} />

          {/* Onglets d'inspection */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === "table"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table des Fréquences</span>
              </button>
              <button
                onClick={() => setActiveTab("tree")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === "tree"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Arbre Binaire de Huffman</span>
              </button>
              <button
                onClick={() => setActiveTab("bitstream")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === "bitstream"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Flux Binaire</span>
              </button>
            </div>

            <div className="text-xs text-zinc-500 hidden sm:block font-mono">
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
