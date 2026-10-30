/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VISUALISEUR DU FLUX BINAIRE (BITSTREAM INSPECTOR)
 * 
 * Design sobre et mesuré :
 * - Découpage visuel par octets (8 bits)
 * - Bourrage final
 * - Vue hexadécimale
 */

import React, { useState } from "react";
import { Binary, Copy, Check } from "lucide-react";
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

  const handleCopyBits = () => {
    navigator.clipboard.writeText(bitString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleChars = originalText.slice(0, 24);

  const byteChunks: { byteIndex: number; bits: string; isPadded: boolean; value: number }[] = [];
  const fullPaddedBits = bitString + "0".repeat(paddingBitsCount);

  for (let i = 0; i < Math.min(fullPaddedBits.length, 256); i += 8) {
    const chunk = fullPaddedBits.slice(i, i + 8);
    const isPadded = i + 8 > bitString.length;
    const byteIndex = i / 8;
    const value = byteIndex < packedBytes.length ? packedBytes[byteIndex] : 0;
    byteChunks.push({ byteIndex, bits: chunk, isPadded, value });
  }

  const hexPreview = Array.from(packedBytes.slice(0, 32))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  return (
    <div className="border border-zinc-800 rounded-xl bg-[#16181d] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#121316] text-xs">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-zinc-400" />
          <span className="font-medium text-zinc-300">Flux Binaire</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 font-mono tabular-nums">
            {bitString.length} bits utiles + {paddingBitsCount} bits de bourrage = {packedBytes.length} octets
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
            <button
              onClick={() => setViewMode("bytes")}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === "bytes" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Octets
            </button>
            <button
              onClick={() => setViewMode("charChunks")}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === "charChunks" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Par Symbole
            </button>
            <button
              onClick={() => setViewMode("hex")}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === "hex" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hexadécimal
            </button>
          </div>

          <button
            onClick={handleCopyBits}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors border border-zinc-700 cursor-pointer"
            title="Copier les bits"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copié" : "Copier"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 font-mono text-xs">
        {viewMode === "bytes" && (
          <div>
            <div className="text-[11px] text-zinc-400 mb-3 flex items-center justify-between">
              <span>Octets en mémoire RAM (blocs de 8 bits) :</span>
              {paddingBitsCount > 0 && (
                <span className="text-zinc-400">
                  Dernier octet : {paddingBitsCount} bit(s) de bourrage (0)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-56 overflow-y-auto pr-1">
              {byteChunks.map((chunk) => (
                <div
                  key={chunk.byteIndex}
                  className={`p-2 rounded-md border text-center transition-colors ${
                    chunk.isPadded
                      ? "border-zinc-700 bg-zinc-800/80 text-zinc-200"
                      : "border-zinc-800 bg-[#111215] text-zinc-300"
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 mb-1">
                    Octet #{chunk.byteIndex}
                  </div>
                  <div className="font-semibold tracking-wider text-[11px]">
                    {chunk.bits}
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-1">
                    0x{chunk.value.toString(16).padStart(2, "0").toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            {bitString.length > 256 && (
              <p className="text-[11px] text-zinc-500 mt-2 text-center font-sans">
                ... et {Math.ceil(bitString.length / 8) - byteChunks.length} autres octets
              </p>
            )}
          </div>
        )}

        {viewMode === "charChunks" && (
          <div>
            <p className="text-[11px] text-zinc-400 mb-3">
              Traduction séquentielle des premiers symboles en codes préfixes :
            </p>
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {Array.from(sampleChars).map((char, index) => {
                const code = codeMap[char] || "";
                return (
                  <div
                    key={index}
                    className="p-2 rounded-md border border-zinc-800 bg-[#111215] flex flex-col items-center min-w-[52px]"
                  >
                    <span className="text-[10px] text-zinc-400">{formatDisplayChar(char)}</span>
                    <span className="font-semibold text-blue-400 text-xs mt-1 tracking-wider">{code}</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">{code.length}b</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "hex" && (
          <div>
            <div className="text-[11px] text-zinc-400 mb-2">
              Vue hexadécimale brute :
            </div>
            <div className="p-3 rounded-md bg-[#111215] border border-zinc-800 text-zinc-300 text-xs tracking-wider break-all leading-relaxed">
              {hexPreview}
              {packedBytes.length > 32 && (
                <span className="text-zinc-600"> ... (+{packedBytes.length - 32} octets)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
