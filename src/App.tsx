/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * APPLICATION PRINCIPALE : HUFFMAN STUDIO
 * 
 * Outil autonome de compression et décompression par l'algorithme de Huffman.
 * Exécution 100% côté client sans backend.
 */

import React, { useState } from "react";
import { CompressView } from "./components/CompressView";
import { DecompressView } from "./components/DecompressView";
import { CompressionResult, HuffmanPackage, generateExportPackage } from "./algorithms/huffman";
import { Archive, FileText, ArrowRightLeft } from "lucide-react";

type MainTab = "compress" | "decompress";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("compress");
  const [lastCompressionResult, setLastCompressionResult] = useState<CompressionResult | null>(null);
  const [lastExportPackage, setLastExportPackage] = useState<HuffmanPackage | null>(null);

  const handleCompressionSuccess = (result: CompressionResult) => {
    setLastCompressionResult(result);
    setLastExportPackage(generateExportPackage(result));
  };

  return (
    <div className="min-h-screen bg-[#111215] text-zinc-100 flex flex-col font-sans">
      {/* Barre de navigation sobre et professionnelle */}
      <header className="sticky top-0 z-50 bg-[#15171c]/95 backdrop-blur border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
          {/* Logo & Titre de l'outil */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 font-mono font-semibold text-xs">
              H
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Huffman Studio
            </span>
          </div>

          {/* Sélecteur d'onglets épuré (Compresser / Décompresser) */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setActiveTab("compress")}
              className={`flex items-center gap-2 px-3.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === "compress"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Compresser</span>
            </button>

            <button
              onClick={() => setActiveTab("decompress")}
              className={`flex items-center gap-2 px-3.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === "decompress"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Décompresser</span>
            </button>
          </div>

          {/* Action rapide */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab(activeTab === "compress" ? "decompress" : "compress")}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3 h-3 text-zinc-500" />
              <span className="hidden sm:inline">
                {activeTab === "compress" ? "Passer à Décompresser" : "Passer à Compresser"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "compress" && (
          <CompressView onCompressionSuccess={handleCompressionSuccess} />
        )}

        {activeTab === "decompress" && (
          <DecompressView
            lastCompressedPackage={lastExportPackage}
            lastOriginalText={lastCompressionResult?.originalText}
          />
        )}
      </main>

      {/* Pied de page sobre */}
      <footer className="border-t border-zinc-900 bg-[#0e0f12] py-4 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Huffman Studio · Compression et décompression sans perte</span>
          <span className="font-mono text-[11px] text-zinc-600">Arbre binaire de codage préfixe (1952)</span>
        </div>
      </footer>
    </div>
  );
}
