/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VISUALISEUR DU FLUX BINAIRE (BITSTREAM INSPECTOR)
 * 
 * Permet d'observer directement la séquence de 0 et 1 générée par l'algorithme :
 * - Découpage visuel par octets (8 bits)
 * - Mise en évidence des bits de bourrage finaux (padding)
 * - Vue hexadécimale compacte
 */

import React, { useState } from "react";
import { Binary, Layers, Eye, Copy, Check } from "lucide-react";
import { formatDisplayChar } from "../algorithms/huffman";

interface BitstreamInspectorProps {
  bitString: string;
  paddingBitsCount: number;
  packedBytes: Uint8Array;
  originalText: string;
  codeMap: Record<string, string>;
}

export const BitstreamInspector: React.FC<BitstreamInspectorProps> = ({
  bitString,
  paddingBitsCount,
  packedBytes,
  originalText,
  codeMap,
}) => {
  const [viewMode, setViewMode] = useState<"bytes" | "charChunks" | "hex">("bytes");
  const [copied, setCopied] = useState(false);

  // Copier le flux binaire
  const handleCopyBits = () => {
    navigator.clipboard.writeText(bitString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aperçu des premiers caractères avec leur code
  const sampleChars = originalText.slice(0, 24);

  // Vue découpée en octets (8 bits)
  const byteChunks: { byteIndex: number; bits: string; isPadded: boolean; value: number }[] = [];
  const fullPaddedBits = bitString + "0".repeat(paddingBitsCount);

  for (let i = 0; i < Math.min(fullPaddedBits.length, 256); i += 8) {
    const chunk = fullPaddedBits.slice(i, i + 8);
    const isPadded = i + 8 > bitString.length;
    const byteIndex = i / 8;
    const value = byteIndex < packedBytes.length ? packedBytes[byteIndex] : 0;
    byteChunks.push({ byteIndex, bits: chunk, isPadded, value });
  }

  // Vue Hexadécimale
  const hexPreview = Array.from(packedBytes.slice(0, 32))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/70 text-xs">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Inspection du Flux Binaire</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400 font-mono tabular-nums">
            {bitString.length} bits utiles + {paddingBitsCount} bits de bourrage = {packedBytes.length} octets
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sélecteur de mode */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setViewMode("bytes")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                viewMode === "bytes" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Octets (Bytes)
            </button>
            <button
              onClick={() => setViewMode("charChunks")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                viewMode === "charChunks" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Par Caractère
            </button>
            <button
              onClick={() => setViewMode("hex")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                viewMode === "hex" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Hexadécimal
            </button>
          </div>

          <button
            onClick={handleCopyBits}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700"
            title="Copier les bits"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copié !" : "Copier"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 font-mono text-xs">
        {viewMode === "bytes" && (
          <div>
            <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
              <span>Octets compactés dans la mémoire RAM (groupes de 8 bits) :</span>
              {paddingBitsCount > 0 && (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Dernier octet complété par {paddingBitsCount} bit(s) de padding
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-56 overflow-y-auto pr-1">
              {byteChunks.map((chunk) => (
                <div
                  key={chunk.byteIndex}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    chunk.isPadded
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-[10px] text-slate-500 mb-1">
                    Octet #{chunk.byteIndex}
                  </div>
                  <div className="font-bold tracking-widest text-[11px]">
                    {chunk.bits}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    0x{chunk.value.toString(16).padStart(2, "0").toUpperCase()} ({chunk.value})
                  </div>
                </div>
              ))}
            </div>
            {bitString.length > 256 && (
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                ... et {Math.ceil(bitString.length / 8) - byteChunks.length} autres octets
              </p>
            )}
          </div>
        )}

        {viewMode === "charChunks" && (
          <div>
            <p className="text-[11px] text-slate-400 mb-3">
              Traduction séquentielle des premiers caractères en codes préfixes variables :
            </p>
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {Array.from(sampleChars).map((char, index) => {
                const code = codeMap[char] || "";
                return (
                  <div
                    key={index}
                    className="p-2 rounded-lg border border-slate-800 bg-slate-950/80 hover:border-cyan-500/50 transition-colors flex flex-col items-center min-w-[56px]"
                  >
                    <span className="text-[10px] text-slate-400">{formatDisplayChar(char)}</span>
                    <span className="font-bold text-cyan-300 text-xs mt-1 tracking-wider">{code}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">{code.length}b</span>
                  </div>
                );
              })}
            </div>
            {originalText.length > 24 && (
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Aperçu limité aux 24 premiers caractères ({originalText.length} au total)
              </p>
            )}
          </div>
        )}

        {viewMode === "hex" && (
          <div>
            <div className="text-[11px] text-slate-400 mb-2">
              Dump hexadécimal des octets compressés :
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-xs tracking-wider break-all leading-relaxed">
              {hexPreview}
              {packedBytes.length > 32 && (
                <span className="text-slate-600"> ... (+{packedBytes.length - 32} octets)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
