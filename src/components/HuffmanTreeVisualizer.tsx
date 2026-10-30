/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * COMPOSANT VISUALISEUR D'ARBRE DE HUFFMAN (SVG INTERACTIF)
 * 
 * Design sobre et naturel (type outil universitaire / ingénieur) :
 * - Poids des nœuds internes
 * - Feuilles avec octets / caractères et fréquences
 * - Branches étiquetées '0' (gauche) et '1' (droite)
 * - Traçage net et lisible du chemin sélectionné (bleu sobre)
 */

import React, { useState, useMemo, useRef } from "react";
import { HuffmanNode, formatDisplayChar } from "../algorithms/huffman";
import { ZoomIn, ZoomOut, RotateCcw, Compass } from "lucide-react";

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
    const leafSpacing = 68;
    const levelHeight = 72;

    function buildLayoutNode(
      node: HuffmanNode,
      depth: number,
      parent: LayoutNode | null = null,
      branch: "0" | "1" | null = null,
      accumulatedCode: string = ""
    ): LayoutNode {
      const code = branch ? accumulatedCode + branch : "";
      const isLeaf = node.char !== null || node.byte !== null;

      const layoutNode: LayoutNode = {
        node,
        x: 0,
        y: depth * levelHeight + 36,
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

    function assignXCoordinates(node: LayoutNode) {
      if (node.isLeaf) {
        node.x = leafIndex * leafSpacing + 50;
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

    const width = Math.max(maxX - minX + 140, 600);
    const height = maxY + 100;

    return {
      root: layoutRoot,
      width,
      height,
      minX,
      maxX,
    };
  }, [root]);

  // Chemin vers le nœud sélectionné
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

  // Pan & Drag
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
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-[#16181d]">
        <Compass className="w-8 h-8 mb-2 text-zinc-600" />
        <p className="text-xs">Veuillez compresser un fichier pour visualiser l'arbre binaire de Huffman.</p>
      </div>
    );
  }

  // Rendu des arêtes
  const renderEdges = (node: LayoutNode): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    const drawEdge = (child: LayoutNode, branchLabel: "0" | "1") => {
      const isPathActive = highlightedPath.nodeIds.has(node.node.id) && highlightedPath.nodeIds.has(child.node.id);
      const edgeKey = `edge_${node.node.id}_to_${child.node.id}`;

      const deltaY = child.y - node.y;
      const pathD = `M ${node.x} ${node.y} C ${node.x} ${node.y + deltaY * 0.5}, ${child.x} ${child.y - deltaY * 0.5}, ${child.x} ${child.y}`;
      const midX = (node.x + child.x) / 2;
      const midY = (node.y + child.y) / 2;

      elements.push(
        <g key={edgeKey}>
          <path
            d={pathD}
            fill="none"
            stroke={isPathActive ? "#3b82f6" : "#27272a"}
            strokeWidth={isPathActive ? 2.5 : 1.2}
          />
          <circle
            cx={midX}
            cy={midY}
            r={8.5}
            fill={isPathActive ? "#1d4ed8" : "#18181b"}
            stroke={isPathActive ? "#60a5fa" : "#3f3f46"}
            strokeWidth={1}
          />
          <text
            cx={midX}
            cy={midY}
            x={midX}
            y={midY + 3}
            textAnchor="middle"
            className="text-[9px] font-mono font-medium fill-zinc-200 pointer-events-none select-none"
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

  // Rendu des nœuds
  const renderNodes = (node: LayoutNode): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const isSelected = selectedChar !== null && node.char === selectedChar;
    const isPathNode = highlightedPath.nodeIds.has(node.node.id);

    if (node.isLeaf) {
      elements.push(
        <g
          key={node.node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-pointer group"
          onClick={() => onSelectChar(isSelected ? null : node.char)}
        >
          {/* Cercle feuille */}
          <circle
            r={16}
            fill={isSelected ? "#2563eb" : isPathNode ? "#1e3a8a" : "#27272a"}
            stroke={isSelected ? "#60a5fa" : isPathNode ? "#3b82f6" : "#3f3f46"}
            strokeWidth={isSelected ? 2 : 1}
            className="transition-colors group-hover:stroke-zinc-400"
          />

          {/* Caractère */}
          <text
            y={-1}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-[11px] font-mono font-semibold pointer-events-none select-none ${
              isSelected ? "fill-white" : "fill-zinc-200"
            }`}
          >
            {node.char === " " ? "␣" : node.char === "\n" ? "↵" : node.char}
          </text>

          {/* Fréquence */}
          <text
            y={26}
            textAnchor="middle"
            className="text-[9px] font-mono fill-zinc-500 pointer-events-none select-none tabular-nums"
          >
            n={node.frequency}
          </text>
        </g>
      );
    } else {
      // Nœud interne
      elements.push(
        <g
          key={node.node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-default"
        >
          <circle
            r={13}
            fill={isPathNode ? "#1e293b" : "#18181b"}
            stroke={isPathNode ? "#3b82f6" : "#3f3f46"}
            strokeWidth={isPathNode ? 1.5 : 1}
          />
          <text
            y={3}
            textAnchor="middle"
            className={`text-[9px] font-mono font-medium pointer-events-none select-none tabular-nums ${
              isPathNode ? "fill-blue-200" : "fill-zinc-400"
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
    <div className="border border-zinc-800 rounded-xl bg-[#16181d] overflow-hidden flex flex-col">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#121316] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-300">Arbre Binaire de Huffman</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">
            {selectedChar ? (
              <span className="text-blue-400 font-mono">
                Chemin pour "{formatDisplayChar(selectedChar)}" :{" "}
                <span className="font-semibold text-white tracking-widest">{highlightedPath.code}</span>
              </span>
            ) : (
              "Sélectionnez un caractère dans la table pour tracer son chemin"
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {selectedChar && (
            <button
              onClick={() => onSelectChar(null)}
              className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors mr-2 cursor-pointer"
            >
              Effacer la sélection
            </button>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Surface SVG */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-[440px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#121316] relative"
      >
        <svg
          width="100%"
          height="100%"
          className="select-none"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          <g className="edges-layer">{renderEdges(layout.root)}</g>
          <g className="nodes-layer">{renderNodes(layout.root)}</g>
        </svg>

        {/* Légende discrète */}
        <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[10px] text-zinc-400 bg-zinc-900/90 px-3 py-1.5 rounded-md border border-zinc-800 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-600 inline-block" />
            <span>Nœud interne (somme des poids)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-700 border border-zinc-400 inline-block" />
            <span>Feuille (caractère / octet)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-zinc-300 font-semibold">0</span>
            <span>= gauche,</span>
            <span className="font-mono text-zinc-300 font-semibold ml-0.5">1</span>
            <span>= droite</span>
          </div>
        </div>
      </div>
    </div>
  );
};
