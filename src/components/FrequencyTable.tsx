/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TABLE DES FRÉQUENCES & CODES DE HUFFMAN
 * 
 * Design sobre et épuré :
 * - Caractère / Octet avec code hexadécimal
 * - Nombre d'occurrences et fréquence relative
 * - Code binaire attribué et longueur
 * - Sélection pour traçage dans l'arbre
 */

import React, { useState, useMemo } from "react";
import { FrequencyItem } from "../algorithms/huffman";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
          item.hex.toLowerCase().includes(term) ||
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
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400" />
    );
  };

  return (
    <div className="border border-zinc-800 rounded-xl bg-[#16181d] overflow-hidden flex flex-col">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800 bg-[#121316]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">
            Table des Fréquences & Dictionnaire
          </span>
          <span className="text-zinc-600 text-xs">·</span>
          <span className="text-xs text-zinc-400 font-mono">
            {items.length} symboles distincts
          </span>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer par symbole, hex, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-60 pl-8 pr-3 py-1 bg-[#111215] border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="max-h-[380px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#121316]/95 sticky top-0 z-10 border-b border-zinc-800 text-[11px] text-zinc-400 select-none">
            <tr>
              <th
                onClick={() => handleSort("char")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-zinc-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Symbole</span>
                  {renderSortIcon("char")}
                </div>
              </th>
              <th
                onClick={() => handleSort("asciiCode")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-zinc-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Octet (Hex / Déc)</span>
                  {renderSortIcon("asciiCode")}
                </div>
              </th>
              <th
                onClick={() => handleSort("count")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-zinc-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Occurrences</span>
                  {renderSortIcon("count")}
                </div>
              </th>
              <th
                onClick={() => handleSort("percentage")}
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-zinc-200"
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
                className="py-2.5 px-3 font-medium cursor-pointer group hover:text-zinc-200 text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Longueur</span>
                  {renderSortIcon("codeLength")}
                </div>
              </th>
              <th className="py-2.5 px-3 font-medium text-right">
                <span>Gain</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500 font-sans">
                  Aucun élément ne correspond à la recherche.
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
                        ? "bg-blue-950/40 text-blue-200 hover:bg-blue-950/60"
                        : "hover:bg-zinc-800/40 text-zinc-300"
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-zinc-200 text-xs">
                        {item.char === " " ? "␣" : item.char === "\n" ? "↵" : item.char.length === 1 ? item.char : "·"}
                      </span>
                      <span className="text-zinc-300 text-[11px] truncate max-w-[120px]">{item.displayChar}</span>
                    </td>
                    <td className="py-2 px-3 text-zinc-400 tabular-nums">
                      <span className="font-mono text-zinc-300">{hexVal}</span>{" "}
                      <span className="text-zinc-500 text-[10px]">({item.asciiCode})</span>
                    </td>
                    <td className="py-2 px-3 font-medium text-zinc-200 tabular-nums">
                      {item.count.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2 px-3 tabular-nums">
                      <div className="flex items-center gap-2">
                        <span>{item.percentage}%</span>
                        <div className="w-14 h-1 bg-zinc-800 rounded-full overflow-hidden hidden md:block">
                          <div
                            className="h-full bg-zinc-400 rounded-full"
                            style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-semibold text-blue-400 tracking-wider">
                      {item.code}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-zinc-300">
                      {item.codeLength} bit{item.codeLength > 1 ? "s" : ""}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {item.savedBitsPerChar > 0 ? (
                        <span className="text-emerald-500">+{item.savedBitsPerChar}b</span>
                      ) : item.savedBitsPerChar === 0 ? (
                        <span className="text-zinc-500">0b</span>
                      ) : (
                        <span className="text-zinc-400">{item.savedBitsPerChar}b</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-zinc-800 bg-[#121316] text-[11px] text-zinc-500 flex items-center justify-between">
        <span>Cliquez sur une ligne pour tracer son chemin dans l'arbre.</span>
        <span>Standard = 8 bits par octet</span>
      </div>
    </div>
  );
};
