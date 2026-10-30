/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TABLEAU DES FRÉQUENCES & CODES DE HUFFMAN
 * 
 * Affiche la table complète des caractères :
 * - Caractère avec glyphe et nom explicite
 * - Code ASCII / Unicode
 * - Fréquence absolue et pourcentage
 * - Code binaire attribué par le parcours de l'arbre
 * - Longueur du code et économie de bits par rapport à l'ASCII standard (8 bits)
 */

import React, { useState, useMemo } from "react";
import { FrequencyItem } from "../algorithms/huffman";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

interface FrequencyTableProps {
  items: FrequencyItem[];
  selectedChar: string | null;
  onSelectChar: (char: string | null) => void;
}

type SortField = "count" | "percentage" | "codeLength" | "char" | "asciiCode";
type SortDirection = "asc" | "desc";

export const FrequencyTable: React.FC<FrequencyTableProps> = ({
  items,
  selectedChar,
  onSelectChar,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "char" ? "asc" : "desc");
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          item.char.toLowerCase().includes(term) ||
          item.displayChar.toLowerCase().includes(term) ||
          item.code.includes(term) ||
          item.asciiCode.toString().includes(term)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "count") cmp = a.count - b.count;
        else if (sortField === "percentage") cmp = a.percentage - b.percentage;
        else if (sortField === "codeLength") cmp = a.codeLength - b.codeLength;
        else if (sortField === "asciiCode") cmp = a.asciiCode - b.asciiCode;
        else if (sortField === "char") cmp = a.char.localeCompare(b.char);

        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [items, searchTerm, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400" />
    );
  };

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col">
      {/* En-tête avec recherche et total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Table des Fréquences & Dictionnaire des Codes
          </span>
          <span className="text-slate-500 text-xs">·</span>
          <span className="text-xs text-slate-400 font-mono">
            {items.length} symboles distincts
          </span>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer par symbole, ASCII, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Tableau avec défilement fluide */}
      <div className="max-h-[380px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-950/90 sticky top-0 z-10 border-b border-slate-800 text-[11px] text-slate-400 select-none">
            <tr>
              <th
                onClick={() => handleSort("char")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Caractère</span>
                  {renderSortIcon("char")}
                </div>
              </th>
              <th
                onClick={() => handleSort("asciiCode")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Code ASCII</span>
                  {renderSortIcon("asciiCode")}
                </div>
              </th>
              <th
                onClick={() => handleSort("count")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Occurrences</span>
                  {renderSortIcon("count")}
                </div>
              </th>
              <th
                onClick={() => handleSort("percentage")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Fréquence (%)</span>
                  {renderSortIcon("percentage")}
                </div>
              </th>
              <th className="py-2.5 px-3 font-medium">
                <span>Code Huffman</span>
              </th>
              <th
                onClick={() => handleSort("codeLength")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Longueur</span>
                  {renderSortIcon("codeLength")}
                </div>
              </th>
              <th className="py-2.5 px-3 font-medium text-right">
                <span>Gain vs ASCII</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Aucun caractère ne correspond à la recherche.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => {
                const isSelected = selectedChar === item.char;
                const hexVal = item.hex || ("0x" + item.asciiCode.toString(16).padStart(2, "0").toUpperCase());
                return (
                  <tr
                    key={`byte_${item.byte ?? item.asciiCode}`}
                    onClick={() => onSelectChar(isSelected ? null : item.char)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-cyan-950/40 text-cyan-200 hover:bg-cyan-950/60"
                        : "hover:bg-slate-800/40 text-slate-300"
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-medium flex items-center gap-2">
                      <span className="w-7 h-6 rounded bg-slate-800/80 border border-slate-700/60 flex items-center justify-center font-mono text-cyan-300 text-xs font-bold">
                        {item.char === " " ? "␣" : item.char === "\n" ? "↵" : item.char.length === 1 ? item.char : hexVal}
                      </span>
                      <span className="text-slate-300 text-[11px] truncate max-w-[120px]">{item.displayChar}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 tabular-nums">
                      <span className="font-mono text-cyan-400/90">{hexVal}</span>{" "}
                      <span className="text-slate-500 text-[10px]">({item.asciiCode})</span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200 tabular-nums">
                      {item.count.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2 px-3 tabular-nums">
                      <div className="flex items-center gap-2">
                        <span>{item.percentage}%</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-bold text-cyan-400 tracking-wider">
                      {item.code}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-300">
                      {item.codeLength} bit{item.codeLength > 1 ? "s" : ""}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {item.savedBitsPerChar > 0 ? (
                        <span className="text-emerald-400">+{item.savedBitsPerChar}b</span>
                      ) : item.savedBitsPerChar === 0 ? (
                        <span className="text-slate-500">0b</span>
                      ) : (
                        <span className="text-amber-400">{item.savedBitsPerChar}b</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>💡 Astuce : Cliquez sur une ligne pour tracer son chemin exact dans l'arbre binaire de Huffman.</span>
        <span>Standard ASCII = 8 bits fixes par symbole</span>
      </div>
    </div>
  );
};
