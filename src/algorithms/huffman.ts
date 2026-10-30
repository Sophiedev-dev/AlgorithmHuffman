/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MODULE ALGORITHMIQUE UNIVERSEL : COMPRESSION & DÉCOMPRESSION DE HUFFMAN
 * 
 * Supporte TOUS LES TYPES DE FICHIERS (flux binaire brut d'octets 0-255) :
 * - Documents : PDF (.pdf), Word (.docx), Excel (.xlsx), PowerPoint (.pptx), etc.
 * - Médias : Images (.png, .jpg, .webp, .svg, .gif), Audio (.wav, .mp3), etc.
 * - Textes & Code : .txt, .md, .json, .csv, .py, .c, .js, .html, etc.
 * - Tout binaire : .zip, .bin, .exe, etc.
 * 
 * Tout s'exécute côté client (in-browser) avec zéro perte (lossless bit-exact).
 */

/**
 * Nœud de l'arbre binaire de Huffman universel (sur les octets 0..255)
 */
export interface HuffmanNode {
  id: string;                      // Identifiant unique pour le rendu SVG
  byte: number | null;             // Valeur de l'octet (0 à 255) ou null pour nœud interne
  char: string | null;             // Représentation textuelle si imprimable
  frequency: number;               // Fréquence / nombre d'occurrences
  left: HuffmanNode | null;        // Fils gauche (associé au bit '0')
  right: HuffmanNode | null;       // Fils droit (associé au bit '1')
}

/**
 * Entrée détaillée du tableau des fréquences
 */
export interface FrequencyItem {
  byte: number;                    // Valeur brute de l'octet (0 à 255)
  hex: string;                     // Représentation hexadécimale (ex: "0x41", "0x0A")
  char: string;                    // Glyphe
  displayChar: string;             // Nom lisible (ex: "A", "⎵ Espace", "0x00 [NUL]")
  asciiCode: number;               // Équivalent décimal
  count: number;                   // Nombre d'occurrences
  percentage: number;              // Fréquence relative (%)
  code: string;                    // Code binaire de Huffman attribué (ex: "0101")
  codeLength: number;              // Longueur en bits
  savedBitsPerChar: number;        // Économie par rapport aux 8 bits standards
}

/**
 * Résultat complet d'une compression
 */
export interface CompressionResult {
  filename: string;
  mimeType: string;
  isText: boolean;
  originalText?: string;
  originalBytes: Uint8Array;
  originalLengthChars: number;
  originalSizeBytes: number;       // Taille d'origine en octets
  compressedBitsCount: number;     // Nombre de bits utiles
  paddingBitsCount: number;        // Bits de bourrage pour compléter le dernier octet (0 à 7)
  compressedSizeBytes: number;     // Taille en octets du flux compressé
  totalPackageSizeBytes: number;   // Taille du conteneur exporté
  compressionRatio: number;        // Pourcentage d'espace économisé
  shannonEntropy: number;          // Entropie de Shannon H(X) en bits/octet
  averageCodeLength: number;       // Longueur moyenne des codes L en bits/octet
  treeEfficiency: number;          // Efficacité H(X) / L (en %)
  bitString: string;               // Aperçu de la chaîne binaire (tronquée si très grand fichier)
  frequencyTable: FrequencyItem[]; // Tableau trié par fréquence décroissante
  frequenciesMap: Record<number, number>;
  codeMap: Record<number, string>; // Map [octet 0..255] -> code binaire
  treeRoot: HuffmanNode | null;    // Racine de l'arbre binaire
  packedBytes: Uint8Array;         // Flux d'octets compressés
  compressedBase64: string;        // Flux compressé en Base64
  executionTimeMs: number;         // Temps de traitement
}

/**
 * Format du conteneur exporté (.huff / .json)
 */
export interface HuffmanPackage {
  format: "HUFFMAN_CODING_V2" | "HUFFMAN_CODING_V1";
  version: "2.0" | "1.0";
  filename: string;
  mimeType: string;
  createdAt: string;
  originalSizeBytes: number;
  compressedBitsCount: number;
  paddingBitsCount: number;
  frequencies: Record<string, number>; // Table des fréquences (octet -> nombre)
  compressedBase64: string;            // Flux d'octets compacté
  stats: {
    compressionRatioPercent: number;
    shannonEntropyBits: number;
    averageCodeLengthBits: number;
  };
}

/**
 * Formatage lisible d'un octet (0..255)
 */
export function formatByteDisplay(byte: number): { char: string; displayChar: string; hex: string } {
  const hex = "0x" + byte.toString(16).padStart(2, "0").toUpperCase();

  // Caractères imprimables ASCII usuels
  if (byte >= 33 && byte <= 126) {
    const ch = String.fromCharCode(byte);
    return { char: ch, displayChar: ch, hex };
  }

  switch (byte) {
    case 32:
      return { char: " ", displayChar: "⎵ Espace", hex };
    case 10:
      return { char: "\n", displayChar: "↵ Saut de ligne (\\n)", hex };
    case 13:
      return { char: "\r", displayChar: "↩ Retour chariot (\\r)", hex };
    case 9:
      return { char: "\t", displayChar: "⇥ Tabulation (\\t)", hex };
    case 0:
      return { char: "\\0", displayChar: "∅ Null (0x00)", hex };
    default:
      return { char: hex, displayChar: `Octet ${hex}`, hex };
  }
}

/**
 * ÉTAPE 1 : Comptage des fréquences des 256 octets possibles
 * Complexité : O(N) où N est le nombre total d'octets du fichier.
 */
export function countByteFrequencies(bytes: Uint8Array): Uint32Array {
  const freqs = new Uint32Array(256);
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    freqs[bytes[i]]++;
  }
  return freqs;
}

/**
 * ÉTAPE 2 : Construction de l'arbre binaire optimal de Huffman.
 * Les feuilles représentent les octets rencontrés (au maximum 256 feuilles).
 * Complexité : O(K log K) où K <= 256.
 */
export function buildHuffmanTreeFromFrequencies(freqs: Uint32Array): HuffmanNode | null {
  const priorityQueue: HuffmanNode[] = [];
  let nodeCounter = 0;

  for (let byte = 0; byte < 256; byte++) {
    const count = freqs[byte];
    if (count > 0) {
      const { char } = formatByteDisplay(byte);
      priorityQueue.push({
        id: `leaf_${nodeCounter++}_${byte}`,
        byte,
        char,
        frequency: count,
        left: null,
        right: null,
      });
    }
  }

  if (priorityQueue.length === 0) return null;

  // Cas particulier : fichier avec un seul octet unique répété
  if (priorityQueue.length === 1) {
    const singleLeaf = priorityQueue[0];
    return {
      id: `internal_${nodeCounter++}`,
      byte: null,
      char: null,
      frequency: singleLeaf.frequency,
      left: singleLeaf,
      right: null,
    };
  }

  // Fusion itérative des deux fréquences minimales
  while (priorityQueue.length > 1) {
    priorityQueue.sort((a, b) => a.frequency - b.frequency);

    const left = priorityQueue.shift()!;
    const right = priorityQueue.shift()!;

    const parent: HuffmanNode = {
      id: `internal_${nodeCounter++}`,
      byte: null,
      char: null,
      frequency: left.frequency + right.frequency,
      left,
      right,
    };

    priorityQueue.push(parent);
  }

  return priorityQueue[0];
}

/**
 * ÉTAPE 3 : Parcours de l'arbre et génération des codes binaires préfixes.
 * Gauche = '0', Droite = '1'.
 */
export function generateByteHuffmanCodes(root: HuffmanNode | null): string[] {
  const codes = new Array<string>(256).fill("");
  if (!root) return codes;

  // Cas spécial : un seul octet
  if (root.left && !root.right && root.left.byte !== null) {
    codes[root.left.byte] = "0";
    return codes;
  }

  function traverse(node: HuffmanNode | null, currentCode: string) {
    if (!node) return;

    if (node.byte !== null) {
      codes[node.byte] = currentCode || "0";
      return;
    }

    if (node.left) traverse(node.left, currentCode + "0");
    if (node.right) traverse(node.right, currentCode + "1");
  }

  traverse(root, "");
  return codes;
}

/**
 * ÉTAPE 4 : Encodage rapide et compactage bit-à-bit en Uint8Array
 * 
 * Écrit directement les bits dans un buffer Uint8Array pré-alloué sans créer
 * de gigantesque chaîne de caractères en mémoire RAM, permettant de compresser
 * des PDF, DOCX, XLSX et photos de plusieurs mégaoctets de façon fluide.
 */
export function encodeBytesToPackedBuffer(
  bytes: Uint8Array,
  codes: string[]
): { packedBytes: Uint8Array; totalBits: number; paddingBitsCount: number; bitStringSample: string } {
  // Calcul exact du nombre total de bits
  let totalBits = 0;
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    totalBits += codes[bytes[i]].length;
  }

  const paddingBitsCount = (8 - (totalBits % 8)) % 8;
  const totalPaddedBits = totalBits + paddingBitsCount;
  const packedByteLength = totalPaddedBits / 8;
  const packedBytes = new Uint8Array(packedByteLength);

  let bitOffset = 0;
  let bitSample = "";
  const maxSampleBits = 400; // Aperçu des premiers bits pour l'interface

  for (let i = 0; i < len; i++) {
    const code = codes[bytes[i]];
    const codeLen = code.length;

    if (bitSample.length < maxSampleBits) {
      bitSample += code;
    }

    for (let c = 0; c < codeLen; c++) {
      if (code[c] === "1") {
        const byteIndex = (bitOffset >> 3);
        const bitInByte = 7 - (bitOffset & 7);
        packedBytes[byteIndex] |= (1 << bitInByte);
      }
      bitOffset++;
    }
  }

  return {
    packedBytes,
    totalBits,
    paddingBitsCount,
    bitStringSample: bitSample,
  };
}

/**
 * Conversion sécurisée Uint8Array -> Base64 par morceaux (évite stack overflow)
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const CHUNK_SIZE = 0x8000; // 32 Ko par paquet
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Conversion Base64 -> Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * COMPRESSION UNIVERSELLE : Accepte Uint8Array brut (tout fichier) ou string
 */
export function compressUniversal(
  input: Uint8Array | string,
  filename: string = "document.bin",
  mimeType: string = "application/octet-stream"
): CompressionResult {
  const startTime = performance.now();

  let bytes: Uint8Array;
  let isText = false;
  let originalText: string | undefined;

  if (typeof input === "string") {
    isText = true;
    originalText = input;
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
    // Détection heuristique si le contenu est du texte lisible
    if (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("csv")) {
      isText = true;
      try {
        originalText = new TextDecoder("utf-8").decode(bytes);
      } catch {
        isText = false;
      }
    }
  }

  if (bytes.length === 0) {
    throw new Error("Le fichier fourni est vide (0 octet).");
  }

  const originalSizeBytes = bytes.length;

  // 1. Fréquences des octets 0..255
  const freqs = countByteFrequencies(bytes);

  // 2. Arbre binaire de Huffman
  const treeRoot = buildHuffmanTreeFromFrequencies(freqs);

  // 3. Codes de Huffman
  const codes = generateByteHuffmanCodes(treeRoot);

  // 4. Encodage et compactage binaire
  const { packedBytes, totalBits, paddingBitsCount, bitStringSample } = encodeBytesToPackedBuffer(bytes, codes);
  const compressedSizeBytes = packedBytes.length;

  // 5. Statistiques et Table des fréquences
  const frequencyTable: FrequencyItem[] = [];
  const frequenciesMap: Record<number, number> = {};
  const codeMap: Record<number, string> = {};

  let shannonEntropy = 0;
  let averageCodeLength = 0;

  for (let b = 0; b < 256; b++) {
    const count = freqs[b];
    if (count > 0) {
      frequenciesMap[b] = count;
      const code = codes[b];
      codeMap[b] = code;

      const probability = count / originalSizeBytes;
      const codeLength = code.length;

      // Entropie de Shannon : H(X) = - sum(p_i * log2(p_i))
      shannonEntropy += - (probability * Math.log2(probability));

      // Longueur moyenne des codes de Huffman : L = sum(p_i * l_i)
      averageCodeLength += probability * codeLength;

      const { char, displayChar, hex } = formatByteDisplay(b);

      frequencyTable.push({
        byte: b,
        hex,
        char,
        displayChar,
        asciiCode: b,
        count,
        percentage: Number((probability * 100).toFixed(2)),
        code,
        codeLength,
        savedBitsPerChar: 8 - codeLength,
      });
    }
  }

  // Tri décroissant par fréquence
  frequencyTable.sort((a, b) => b.count - a.count);

  // Taux de compression : Espace économisé = (1 - (compressé / initial)) * 100
  const compressionRatio = originalSizeBytes > 0
    ? Number(((1 - (compressedSizeBytes / originalSizeBytes)) * 100).toFixed(2))
    : 0;

  const treeEfficiency = averageCodeLength > 0
    ? Number(Math.min(100, (shannonEntropy / averageCodeLength) * 100).toFixed(2))
    : 100;

  const compressedBase64 = uint8ArrayToBase64(packedBytes);

  // Export JSON estimé
  const frequenciesRecord: Record<string, number> = {};
  for (const [k, v] of Object.entries(frequenciesMap)) {
    frequenciesRecord[k] = v;
  }

  const exportPkg: HuffmanPackage = {
    format: "HUFFMAN_CODING_V2",
    version: "2.0",
    filename,
    mimeType,
    createdAt: new Date().toISOString(),
    originalSizeBytes,
    compressedBitsCount: totalBits,
    paddingBitsCount,
    frequencies: frequenciesRecord,
    compressedBase64,
    stats: {
      compressionRatioPercent: compressionRatio,
      shannonEntropyBits: Number(shannonEntropy.toFixed(3)),
      averageCodeLengthBits: Number(averageCodeLength.toFixed(3)),
    },
  };
  const totalPackageSizeBytes = new TextEncoder().encode(JSON.stringify(exportPkg)).length;

  const endTime = performance.now();

  return {
    filename,
    mimeType,
    isText,
    originalText,
    originalBytes: bytes,
    originalLengthChars: isText && originalText ? originalText.length : originalSizeBytes,
    originalSizeBytes,
    compressedBitsCount: totalBits,
    paddingBitsCount,
    compressedSizeBytes,
    totalPackageSizeBytes,
    compressionRatio,
    shannonEntropy: Number(shannonEntropy.toFixed(3)),
    averageCodeLength: Number(averageCodeLength.toFixed(3)),
    treeEfficiency,
    bitString: bitStringSample,
    frequencyTable,
    frequenciesMap,
    codeMap,
    treeRoot,
    packedBytes,
    compressedBase64,
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
  };
}

/**
 * Fonction de compatibilité ascendante pour le texte brut
 */
export function compressHuffman(text: string, filename: string = "document.txt"): CompressionResult {
  return compressUniversal(text, filename, "text/plain");
}

/**
 * ÉTAPE 5 : Génération du paquet exportable (.huff / JSON)
 */
export function generateExportPackage(result: CompressionResult): HuffmanPackage {
  const frequenciesRecord: Record<string, number> = {};
  for (const [k, v] of Object.entries(result.frequenciesMap)) {
    frequenciesRecord[k] = v;
  }

  return {
    format: "HUFFMAN_CODING_V2",
    version: "2.0",
    filename: result.filename,
    mimeType: result.mimeType,
    createdAt: new Date().toISOString(),
    originalSizeBytes: result.originalSizeBytes,
    compressedBitsCount: result.compressedBitsCount,
    paddingBitsCount: result.paddingBitsCount,
    frequencies: frequenciesRecord,
    compressedBase64: result.compressedBase64,
    stats: {
      compressionRatioPercent: result.compressionRatio,
      shannonEntropyBits: result.shannonEntropy,
      averageCodeLengthBits: result.averageCodeLength,
    },
  };
}

/**
 * ÉTAPE 6 : Décompression Universelle sans perte (Lossless)
 * Reconstruit fidèlement les octets d'origine pour n'importe quel fichier (.pdf, .docx, image, etc.)
 */
export function decompressUniversalPackage(packageData: HuffmanPackage | string): {
  restoredBytes: Uint8Array;
  restoredText?: string;
  isText: boolean;
  originalFilename: string;
  mimeType: string;
  metadata: HuffmanPackage;
  treeRoot: HuffmanNode | null;
  frequencyTable: FrequencyItem[];
  executionTimeMs: number;
} {
  const startTime = performance.now();

  let parsed: any;
  if (typeof packageData === "string") {
    try {
      parsed = JSON.parse(packageData);
    } catch {
      throw new Error("Le fichier fourni n'est pas un fichier compressé valide (format JSON corrompu).");
    }
  } else {
    parsed = packageData;
  }

  if (!parsed || !parsed.frequencies || !parsed.compressedBase64) {
    throw new Error("Format de fichier non reconnu. Veuillez fournir un fichier .huff ou .json généré par cette application.");
  }

  const filename = parsed.filename || "fichier_restaure.bin";
  const mimeType = parsed.mimeType || "application/octet-stream";
  const originalSizeBytes = parsed.originalSizeBytes || parsed.originalCharCount || 0;
  const paddingBitsCount = parsed.paddingBitsCount || 0;

  // 1. Reconstruction des fréquences (support format V1 avec caractères ou V2 avec codes d'octets)
  const freqs = new Uint32Array(256);
  for (const [key, count] of Object.entries(parsed.frequencies)) {
    let byteVal: number;
    if (!isNaN(Number(key))) {
      byteVal = Number(key);
    } else {
      // Format V1 caractère
      byteVal = (key as string).charCodeAt(0);
    }
    if (byteVal >= 0 && byteVal < 256) {
      freqs[byteVal] = count as number;
    }
  }

  // 2. Reconstruction de l'arbre binaire
  const treeRoot = buildHuffmanTreeFromFrequencies(freqs);
  if (!treeRoot) {
    return {
      restoredBytes: new Uint8Array(0),
      isText: false,
      originalFilename: filename,
      mimeType,
      metadata: parsed,
      treeRoot: null,
      frequencyTable: [],
      executionTimeMs: 0,
    };
  }

  // 3. Décompactage du flux d'octets
  const packedBytes = base64ToUint8Array(parsed.compressedBase64);

  // 4. Décodage bit-par-bit rapide
  const restoredBytes = new Uint8Array(originalSizeBytes);
  let bytesWritten = 0;

  // Cas spécial : un seul octet répété
  if (treeRoot.left && !treeRoot.right && treeRoot.left.byte !== null) {
    restoredBytes.fill(treeRoot.left.byte);
    bytesWritten = originalSizeBytes;
  } else {
    let currentNode: HuffmanNode = treeRoot;
    const totalPackedBytes = packedBytes.length;
    const totalBits = (totalPackedBytes * 8) - paddingBitsCount;

    for (let bitIndex = 0; bitIndex < totalBits; bitIndex++) {
      const byteIdx = bitIndex >> 3;
      const bitInByte = 7 - (bitIndex & 7);
      const bit = (packedBytes[byteIdx] >> bitInByte) & 1;

      currentNode = bit === 0 ? currentNode.left! : currentNode.right!;

      if (currentNode.byte !== null) {
        restoredBytes[bytesWritten++] = currentNode.byte;
        currentNode = treeRoot;

        if (bytesWritten === originalSizeBytes) {
          break;
        }
      }
    }
  }

  // 5. Détection texte et table des fréquences
  let isText = false;
  let restoredText: string | undefined;

  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("csv") ||
    filename.match(/\.(txt|md|json|csv|c|cpp|py|js|ts|html|css|xml|log)$/i)
  ) {
    try {
      restoredText = new TextDecoder("utf-8").decode(restoredBytes);
      isText = true;
    } catch {
      isText = false;
    }
  }

  // Génération de la table des fréquences reconstituée
  const codes = generateByteHuffmanCodes(treeRoot);
  const frequencyTable: FrequencyItem[] = [];

  for (let b = 0; b < 256; b++) {
    const count = freqs[b];
    if (count > 0) {
      const { char, displayChar, hex } = formatByteDisplay(b);
      const code = codes[b];
      frequencyTable.push({
        byte: b,
        hex,
        char,
        displayChar,
        asciiCode: b,
        count,
        percentage: Number(((count / originalSizeBytes) * 100).toFixed(2)),
        code,
        codeLength: code.length,
        savedBitsPerChar: 8 - code.length,
      });
    }
  }
  frequencyTable.sort((a, b) => b.count - a.count);

  const endTime = performance.now();

  return {
    restoredBytes,
    restoredText,
    isText,
    originalFilename: filename,
    mimeType,
    metadata: parsed,
    treeRoot,
    frequencyTable,
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
  };
}

/**
 * Fonction de compatibilité ascendante pour decompressHuffmanPackage
 */
export function decompressHuffmanPackage(packageData: any) {
  const result = decompressUniversalPackage(packageData);
  return {
    restoredText: result.restoredText || `[Fichier binaire : ${result.originalFilename} (${result.restoredBytes.length} octets)]`,
    restoredBytes: result.restoredBytes,
    isText: result.isText,
    mimeType: result.mimeType,
    originalFilename: result.originalFilename,
    metadata: result.metadata,
    treeRoot: result.treeRoot,
    frequencyTable: result.frequencyTable,
    executionTimeMs: result.executionTimeMs,
  };
}

export function formatDisplayChar(char: string): string {
  if (char.length === 1) {
    return formatByteDisplay(char.charCodeAt(0)).displayChar;
  }
  return char;
}

export function getUtf8ByteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}
