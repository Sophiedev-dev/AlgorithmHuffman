/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * APPLICATION PRINCIPALE : HUFFMAN STUDIO
 * 
 * Plateforme complète de compression et décompression par l'algorithme de Huffman.
 * Conçue pour une exécution 100% côté client sans backend ni base de données.
 */

import React, { useState } from "react";
import { CompressView } from "./components/CompressView";
import { DecompressView } from "./components/DecompressView";
import { DefenseGuide } from "./components/DefenseGuide";
import { CompressionResult, HuffmanPackage, generateExportPackage } from "./algorithms/huffman";
import { FileArchive, FileText, BookOpen, Layers, ShieldCheck, ArrowRightLeft } from "lucide-react";

type MainTab = "compress" | "decompress" | "defense";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("compress");
  const [lastCompressionResult, setLastCompressionResult] = useState<CompressionResult | null>(null);
  const [lastExportPackage, setLastExportPackage] = useState<HuffmanPackage | null>(null);

  const handleCompressionSuccess = (result: CompressionResult) => {
    setLastCompressionResult(result);
    setLastExportPackage(generateExportPackage(result));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 
        Top Bar Contract (§2) :
        Zone 1 : Single text element wordmark
        Zone 2 : Navigation links (whitespace-nowrap)
        Zone 3 : 1 action principale
      */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1 : Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-mono font-bold text-sm shadow-md shadow-cyan-950">
              H
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("compress");
              }}
              className="text-base font-bold tracking-tight text-white whitespace-nowrap hover:text-cyan-300 transition-colors"
            >
              Huffman Studio
            </a>
          </div>

          {/* Zone 2 : 3 onglets principaux de navigation */}
          <nav className="flex items-center gap-6 sm:gap-8 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab("compress")}
              className={`py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "compress" ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : ""
              }`}
            >
              <FileArchive className="w-4 h-4" />
              <span>Compresser</span>
            </button>

            <button
              onClick={() => setActiveTab("decompress")}
              className={`py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "decompress" ? "text-emerald-400 font-semibold border-b-2 border-emerald-400" : ""
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Décompresser</span>
            </button>

            <button
              onClick={() => setActiveTab("defense")}
              className={`py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "defense" ? "text-violet-400 font-semibold border-b-2 border-violet-400" : ""
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Guide Soutenance & Théorie</span>
            </button>
          </nav>

          {/* Zone 3 : 1 action principale */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab(activeTab === "compress" ? "decompress" : "compress")}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeTab === "compress" ? "Aller à Décompresser" : "Aller à Compresser"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barre de métadonnées du devoir (Zero-Pill Discipline) */}
      <div className="border-b border-slate-900 bg-slate-950/40 text-xs text-slate-500 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">Devoir d'Informatique</span>
            <span aria-hidden="true">·</span>
            <span>Algorithme de Codage de Huffman (1952)</span>
            <span aria-hidden="true">·</span>
            <span>Exécution 100% Client (FileReader HTML5)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Compression Lossless (Sans Perte)</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Précision Bit-à-Bit</span>
          </div>
        </div>
      </div>

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

        {activeTab === "defense" && <DefenseGuide />}
      </main>

      {/* Pied de page épuré */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Huffman Studio</span>
            <span aria-hidden="true">·</span>
            <span>Projet d'algorithmique et structure de données</span>
          </div>
          <div className="text-slate-500 text-[11px] font-mono">
            Arbre Binaire · File de Priorité · Codage Préfixe Optimal · Entropie de Shannon
          </div>
        </div>
      </footer>
    </div>
  );
}
