/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * COMPOSANT DE STATISTIQUES & GAIN D'ESPACE
 * 
 * Design sobre et mesuré, sans couleurs artificielles ni dégradés criards :
 * - Cartes d'indicateurs unifiées
 * - Métriques précises (octets, taux d'économie, entropie de Shannon)
 * - Téléchargement direct du fichier compressé
 */

import React, { useState } from "react";
import { CompressionResult, generateExportPackage } from "../algorithms/huffman";
import { Download, HardDrive, Zap, Gauge, Check, FileDown } from "lucide-react";

interface StatsSummaryProps {
  result: CompressionResult;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ result }) => {
  const [downloadFormat, setDownloadFormat] = useState<"huff" | "json">("huff");
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleDownload = () => {
    const exportData = generateExportPackage(result);
    const jsonString = JSON.stringify(exportData, null, 2);

    const baseName = result.filename.replace(/\.[^/.]+$/, "");
    const downloadFileName = `${baseName}.compressed.${downloadFormat}`;

    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setHasDownloaded(true);
    setTimeout(() => setHasDownloaded(false), 2500);
  };

  const savedBytes = Math.max(0, result.originalSizeBytes - result.compressedSizeBytes);

  return (
    <div className="space-y-4">
      {/* Grille des 4 indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 : Taille d'origine */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-[#16181d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Taille initiale</span>
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
              {result.originalSizeBytes.toLocaleString("fr-FR")}{" "}
              <span className="text-xs text-zinc-400 font-normal">octets</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1 tabular-nums">
              {(result.originalSizeBytes * 8).toLocaleString("fr-FR")} bits
            </div>
          </div>
        </div>

        {/* KPI 2 : Taille compressée */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-[#16181d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Taille compressée</span>
            <Zap className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
              {result.compressedSizeBytes.toLocaleString("fr-FR")}{" "}
              <span className="text-xs text-zinc-400 font-normal">octets</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1 tabular-nums">
              {result.compressedBitsCount.toLocaleString("fr-FR")} bits utiles (+{result.paddingBitsCount}b padding)
            </div>
          </div>
        </div>

        {/* KPI 3 : Taux de compression */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-[#16181d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Espace économisé</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          </div>
          <div>
            <div className="text-xl font-semibold text-emerald-400 font-mono tabular-nums">
              {result.compressionRatio > 0 ? `+${result.compressionRatio}%` : `${result.compressionRatio}%`}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1 tabular-nums">
              {savedBytes.toLocaleString("fr-FR")} octets gagnés
            </div>
          </div>
        </div>

        {/* KPI 4 : Entropie de Shannon */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-[#16181d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Entropie H(X)</span>
            <Gauge className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
              {result.shannonEntropy}{" "}
              <span className="text-xs text-zinc-400 font-normal">bits/octet</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1 tabular-nums">
              Moyenne : {result.averageCodeLength} bits (Efficacité {result.treeEfficiency}%)
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action de téléchargement épurée */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-[#16181d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shrink-0">
            <FileDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              Télécharger le fichier compressé
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Contient la table des fréquences et le flux binaire d'octets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setDownloadFormat("huff")}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                downloadFormat === "huff" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              .huff
            </button>
            <button
              onClick={() => setDownloadFormat("json")}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                downloadFormat === "json" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              .json
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {hasDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{hasDownloaded ? "Téléchargé" : `Exporter (${downloadFormat.toUpperCase()})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
