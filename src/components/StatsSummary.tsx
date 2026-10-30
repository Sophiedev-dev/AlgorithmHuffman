/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * COMPOSANT DE STATISTIQUES & GAIN D'ESPACE (POUR LE PROFESSEUR)
 * 
 * Présente de manière synthétique et mathématiquement rigoureuse :
 * - Taille d'origine vs Taille compressée
 * - Taux d'économie d'espace en pourcentage
 * - Entropie de Shannon (Claude Shannon, 1948)
 * - Longueur moyenne de code de Huffman
 * - Téléchargement du fichier conteneur compressé (.huff / .json)
 */

import React, { useState } from "react";
import { CompressionResult, generateExportPackage } from "../algorithms/huffman";
import { Download, HardDrive, Zap, Gauge, Sparkles, Check, FileDown, ShieldCheck } from "lucide-react";

interface StatsSummaryProps {
  result: CompressionResult;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ result }) => {
  const [downloadFormat, setDownloadFormat] = useState<"huff" | "json">("huff");
  const [hasDownloaded, setHasDownloaded] = useState(false);

  // Téléchargement du fichier compressé (.huff ou .json)
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
    setTimeout(() => setHasDownloaded(false), 3000);
  };

  const savedBytes = Math.max(0, result.originalSizeBytes - result.compressedSizeBytes);
  const isPositiveGain = result.compressionRatio > 0;

  return (
    <div className="space-y-4">
      {/* Grille des 4 indicateurs clés (KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1 : Taille d'origine */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Taille Initiale</span>
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {result.originalSizeBytes.toLocaleString("fr-FR")}{" "}
              <span className="text-xs text-slate-400 font-normal">octets</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1 tabular-nums">
              {(result.originalSizeBytes * 8).toLocaleString("fr-FR")} bits · {result.originalLengthChars.toLocaleString("fr-FR")} caractères
            </div>
          </div>
        </div>

        {/* KPI 2 : Taille compressée */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Taille Flux Compressé</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-300 font-mono tabular-nums">
              {result.compressedSizeBytes.toLocaleString("fr-FR")}{" "}
              <span className="text-xs text-cyan-400/80 font-normal">octets</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1 tabular-nums">
              {result.compressedBitsCount.toLocaleString("fr-FR")} bits utiles (+{result.paddingBitsCount}b padding)
            </div>
          </div>
        </div>

        {/* KPI 3 : Taux de compression & Espace économisé */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isPositiveGain
            ? "border-emerald-500/30 bg-emerald-950/20"
            : "border-slate-800 bg-slate-900/50"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Espace Économisé</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums flex items-baseline gap-1.5">
              <span>{result.compressionRatio > 0 ? `+${result.compressionRatio}%` : `${result.compressionRatio}%`}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1 tabular-nums">
              {savedBytes.toLocaleString("fr-FR")} octets gagnés ({(savedBytes * 8).toLocaleString("fr-FR")} bits)
            </div>
          </div>
        </div>

        {/* KPI 4 : Entropie & Théorie de Shannon */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Entropie de Shannon H(X)</span>
            <Gauge className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-violet-300 font-mono tabular-nums">
              {result.shannonEntropy}{" "}
              <span className="text-xs text-violet-400/80 font-normal">bits/car</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1 tabular-nums">
              Moy. Huffman : {result.averageCodeLength}b (Efficacité {result.treeEfficiency}%)
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action : Téléchargement du fichier compressé */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Exporter le fichier compressé</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 font-mono">
                Autonome & Décompressible
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Encapsule la table des fréquences et le flux d'octets binaire. Prêt pour l'étape de décompression.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Format selector */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setDownloadFormat("huff")}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                downloadFormat === "huff" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              .huff
            </button>
            <button
              onClick={() => setDownloadFormat("json")}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                downloadFormat === "json" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              .json
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/60 active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            {hasDownloaded ? <Check className="w-4 h-4 text-slate-950" /> : <Download className="w-4 h-4" />}
            <span>{hasDownloaded ? "Fichier Téléchargé !" : `Télécharger (${downloadFormat.toUpperCase()})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
