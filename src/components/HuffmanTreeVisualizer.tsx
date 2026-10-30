/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * COMPOSANT VISUALISEUR D'ARBRE DE HUFFMAN (SVG INTERACTIF)
 * 
 * Permet de visualiser la topologie exacte de l'arbre binaire de Huffman :
 * - Poids des nœuds internes
 * - Feuilles avec les caractères et leurs fréquences
 * - Étiquettes '0' (branche gauche) et '1' (branche droite)
 * - Traçage interactif du chemin Racine -> Feuille lors de la sélection d'un caractère
 */

import React, { useState, useMemo, useRef } from "react";
import { HuffmanNode, formatDisplayChar } from "../algorithms/huffman";
import { ZoomIn, ZoomOut, RotateCcw, Compass, CheckCircle2 } from "lucide-react";

interface LayoutNode {
  node: HuffmanNode;
  x: number;
  y: number;
  depth: number;
  isLeaf: boolean;
  char: string | null;
  displayChar: string;
  frequency: number;
  left: LayoutNode | null;
  right: LayoutNode | null;
  parent: LayoutNode | null;
  branchToParent: "0" | "1" | null;
  pathCode: string;
}

interface HuffmanTreeVisualizerProps {
  root: HuffmanNode | null;
  selectedChar: string | null;
  onSelectChar: (char: string | null) => void;
}

export const HuffmanTreeVisualizer: React.FC<HuffmanTreeVisualizerProps> = ({
  root,
  selectedChar,
  onSelectChar,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Construction du layout géométrique de l'arbre
  const layout = useMemo(() => {
    if (!root) return null;

    let leafIndex = 0;
    const leafSpacing = 72; // Espacement horizontal entre feuilles consécutives
    const levelHeight = 75; // Espacement vertical par niveau

    // Étape 1 : Affectation récursive de la profondeur et des relations
    function buildLayoutNode(
      node: HuffmanNode,
      depth: number,
      parent: LayoutNode | null = null,
      branch: "0" | "1" | null = null,
      accumulatedCode: string = ""
    ): LayoutNode {
      const code = branch ? accumulatedCode + branch : "";
      const isLeaf = node.char !== null;

      const layoutNode: LayoutNode = {
        node,
        x: 0,
        y: depth * levelHeight + 40,
        depth,
        isLeaf,
        char: node.char,
        displayChar: node.char !== null ? formatDisplayChar(node.char) : "",
        frequency: node.frequency,
        left: null,
        right: null,
        parent,
        branchToParent: branch,
        pathCode: code,
      };

      if (node.left) {
        layoutNode.left = buildLayoutNode(node.left, depth + 1, layoutNode, "0", code);
      }
      if (node.right) {
        layoutNode.right = buildLayoutNode(node.right, depth + 1, layoutNode, "1", code);
      }

      return layoutNode;
    }

    const layoutRoot = buildLayoutNode(root, 0, null, null, "");

    // Étape 2 : Positionnement horizontal (Leaves gauche -> droite, parents centrés)
    function assignXCoordinates(node: LayoutNode) {
      if (node.isLeaf) {
        node.x = leafIndex * leafSpacing + 60;
        leafIndex++;
        return;
      }

      if (node.left) assignXCoordinates(node.left);
      if (node.right) assignXCoordinates(node.right);

      if (node.left && node.right) {
        node.x = (node.left.x + node.right.x) / 2;
      } else if (node.left) {
        node.x = node.left.x;
      } else if (node.right) {
        node.x = node.right.x;
      }
    }

    assignXCoordinates(layoutRoot);

    // Étape 3 : Calcul de la boîte englobante (bounding box)
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;

    function findBounds(node: LayoutNode) {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;

      if (node.left) findBounds(node.left);
      if (node.right) findBounds(node.right);
    }

    findBounds(layoutRoot);

    const width = Math.max(maxX - minX + 160, 600);
    const height = maxY + 120;

    return {
      root: layoutRoot,
      width,
      height,
      minX,
      maxX,
    };
  }, [root]);

  // Ensemble des nœuds et arêtes appartenant au chemin vers le caractère sélectionné
  const highlightedPath = useMemo(() => {
    if (!layout || !selectedChar) return { nodeIds: new Set<string>(), code: "" };

    const nodeIds = new Set<string>();

    function findLeaf(node: LayoutNode): LayoutNode | null {
      if (node.char === selectedChar) {
        return node;
      }
      if (node.left) {
        const found = findLeaf(node.left);
        if (found) return found;
      }
      if (node.right) {
        const found = findLeaf(node.right);
        if (found) return found;
      }
      return null;
    }

    const targetLeaf = findLeaf(layout.root);

    if (targetLeaf) {
      let current: LayoutNode | null = targetLeaf;
      while (current) {
        nodeIds.add(current.node.id);
        current = current.parent;
      }
      return { nodeIds, code: targetLeaf.pathCode || "0" };
    }

    return { nodeIds, code: "" };
  }, [layout, selectedChar]);

  // Gestion du Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!layout) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <Compass className="w-8 h-8 mb-2 text-slate-600" />
        <p className="text-sm">Veuillez compresser un texte pour générer l'arbre binaire de Huffman.</p>
      </div>
    );
  }

  // Rendu récursif des arêtes (liens)
  const renderEdges = (node: LayoutNode): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    const drawEdge = (child: LayoutNode, branchLabel: "0" | "1") => {
      const isPathActive = highlightedPath.nodeIds.has(node.node.id) && highlightedPath.nodeIds.has(child.node.id);
      const edgeKey = `edge_${node.node.id}_to_${child.node.id}`;

      // Courbe de Bézier douce entre parent et enfant
      const deltaY = child.y - node.y;
      const pathD = `M ${node.x} ${node.y} C ${node.x} ${node.y + deltaY * 0.5}, ${child.x} ${child.y - deltaY * 0.5}, ${child.x} ${child.y}`;
      const midX = (node.x + child.x) / 2;
      const midY = (node.y + child.y) / 2;

      elements.push(
        <g key={edgeKey}>
          <path
            d={pathD}
            fill="none"
            stroke={isPathActive ? "#06b6d4" : "#334155"}
            strokeWidth={isPathActive ? 3 : 1.5}
            strokeDasharray={isPathActive ? undefined : undefined}
            className="transition-colors duration-200"
          />
          {/* Badge pour le bit '0' ou '1' */}
          <circle
            cx={midX}
            cy={midY}
            r={10}
            fill={isPathActive ? "#0e7490" : "#1e293b"}
            stroke={isPathActive ? "#22d3ee" : "#475569"}
            strokeWidth={1}
          />
          <text
            cx={midX}
            cy={midY}
            x={midX}
            y={midY + 3.5}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold fill-white pointer-events-none select-none"
          >
            {branchLabel}
          </text>
        </g>
      );
    };

    if (node.left) {
      drawEdge(node.left, "0");
      elements.push(...renderEdges(node.left));
    }
    if (node.right) {
      drawEdge(node.right, "1");
      elements.push(...renderEdges(node.right));
    }

    return elements;
  };

  // Rendu récursif des nœuds
  const renderNodes = (node: LayoutNode): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const isSelected = selectedChar !== null && node.char === selectedChar;
    const isPathNode = highlightedPath.nodeIds.has(node.node.id);

    if (node.isLeaf) {
      // Nœud feuille (Feuille = Caractère)
      elements.push(
        <g
          key={node.node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-pointer group"
          onClick={() => onSelectChar(isSelected ? null : node.char)}
        >
          {/* Halo d'accentuation en cas de sélection */}
          {(isSelected || isPathNode) && (
            <circle
              r={24}
              fill="#06b6d4"
              opacity={0.2}
              className="animate-pulse"
            />
          )}

          {/* Cercle principal de la feuille */}
          <circle
            r={18}
            fill={isSelected ? "#0891b2" : isPathNode ? "#164e63" : "#0f172a"}
            stroke={isSelected ? "#22d3ee" : isPathNode ? "#06b6d4" : "#38bdf8"}
            strokeWidth={isSelected ? 2.5 : 1.5}
            className="transition-all duration-200 group-hover:stroke-cyan-300"
          />

          {/* Glyphe du caractère */}
          <text
            y={-1}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-xs font-mono font-bold pointer-events-none select-none ${
              isSelected ? "fill-white" : "fill-cyan-100"
            }`}
          >
            {node.char === " " ? "⎵" : node.char === "\n" ? "↵" : node.char}
          </text>

          {/* Fréquence sous le nœud */}
          <text
            y={30}
            textAnchor="middle"
            className="text-[10px] font-mono fill-slate-400 pointer-events-none select-none tabular-nums"
          >
            n={node.frequency}
          </text>
        </g>
      );
    } else {
      // Nœud interne (Somme des poids)
      elements.push(
        <g
          key={node.node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-default"
        >
          <circle
            r={14}
            fill={isPathNode ? "#1e293b" : "#090d16"}
            stroke={isPathNode ? "#06b6d4" : "#475569"}
            strokeWidth={isPathNode ? 2 : 1}
            className="transition-colors duration-200"
          />
          <text
            y={3}
            textAnchor="middle"
            className={`text-[10px] font-mono font-semibold pointer-events-none select-none tabular-nums ${
              isPathNode ? "fill-cyan-200 font-bold" : "fill-slate-300"
            }`}
          >
            {node.frequency}
          </text>
        </g>
      );
    }

    if (node.left) elements.push(...renderNodes(node.left));
    if (node.right) elements.push(...renderNodes(node.right));

    return elements;
  };

  return (
    <div className="relative border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col">
      {/* Barre d'outils et commandes de visualisation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Arbre Binaire de Huffman</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">
            {selectedChar ? (
              <span className="text-cyan-400 font-mono">
                Chemin pour "{formatDisplayChar(selectedChar)}" :{" "}
                <span className="font-bold text-white tracking-widest">{highlightedPath.code}</span>
              </span>
            ) : (
              "Cliquez sur un nœud ou une ligne du tableau pour surligner le chemin"
            )}
          </span>
        </div>

        {/* Boutons de zoom et recentrage */}
        <div className="flex items-center gap-1">
          {selectedChar && (
            <button
              onClick={() => onSelectChar(null)}
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors mr-2"
            >
              Effacer la sélection
            </button>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Réinitialiser l'affichage"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone de dessin SVG interactive (avec Pan & Zoom) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-[460px] overflow-hidden cursor-grab active:cursor-grabbing bg-radial from-slate-900 to-slate-950 relative"
      >
        <svg
          width="100%"
          height="100%"
          className="select-none"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          {/* Lignes / Arêtes */}
          <g className="edges-layer">{renderEdges(layout.root)}</g>
          {/* Nœuds */}
          <g className="nodes-layer">{renderNodes(layout.root)}</g>
        </svg>

        {/* Légende discrète en bas de l'arbre */}
        <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600 inline-block" />
            <span>Nœud interne (poids cumulé)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-900 border border-cyan-400 inline-block" />
            <span>Feuille (caractère terminal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 font-mono font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 rounded text-[9px]">0</span>
            <span>Gauche</span>
            <span className="px-1 font-mono font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 rounded text-[9px] ml-1">1</span>
            <span>Droite</span>
          </div>
        </div>
      </div>
    </div>
  );
};
