import java.io.*;
import java.util.Arrays;
import java.util.PriorityQueue;

/**
 * MODULE ALGORITHMIQUE : COMPRESSION & DÉCOMPRESSION DE HUFFMAN
 *
 * Fonctionne sur TOUS LES TYPES DE FICHIERS (flux d'octets 0..255) :
 * texte, PDF, images, Word, etc. Compression sans perte (lossless).
 *
 * Uniquement la bibliothèque standard Java (aucune dépendance externe).
 *
 * Format du fichier .huff produit :
 *   [4 octets]  signature "HUF1"
 *   [UTF]       nom du fichier d'origine
 *   [8 octets]  taille d'origine en octets
 *   [2 octets]  nombre K de symboles distincts
 *   K x ([1 octet] valeur de l'octet, [4 octets] fréquence)
 *   [1 octet]   nombre de bits de bourrage (0..7)
 *   [...]       flux compressé
 */
public class Huffman {

    private static final int MAGIC = 0x48554631; // "HUF1"

    /**
     * Nœud de l'arbre binaire de Huffman
     */
    static class Node implements Comparable<Node> {
        final int value;       // Octet (0..255) ou -1 pour un nœud interne
        final long frequency;  // Nombre d'occurrences
        final int order;       // Ordre de création (départage les égalités => arbre déterministe)
        final Node left;       // Fils gauche (bit '0')
        final Node right;      // Fils droit (bit '1')

        Node(int value, long frequency, int order, Node left, Node right) {
            this.value = value;
            this.frequency = frequency;
            this.order = order;
            this.left = left;
            this.right = right;
        }

        boolean isLeaf() {
            return value >= 0;
        }

        @Override
        public int compareTo(Node other) {
            if (frequency != other.frequency) {
                return Long.compare(frequency, other.frequency);
            }
            return Integer.compare(order, other.order);
        }
    }

    /**
     * ÉTAPE 1 : Comptage des fréquences des 256 octets possibles. O(N)
     */
    public static long[] countFrequencies(byte[] data) {
        long[] freqs = new long[256];
        for (byte b : data) {
            freqs[b & 0xFF]++;
        }
        return freqs;
    }

    /**
     * ÉTAPE 2 : Construction de l'arbre de Huffman avec une file de priorité. O(K log K)
     */
    public static Node buildTree(long[] freqs) {
        PriorityQueue<Node> queue = new PriorityQueue<>();
        int order = 0;

        for (int b = 0; b < 256; b++) {
            if (freqs[b] > 0) {
                queue.add(new Node(b, freqs[b], order++, null, null));
            }
        }

        if (queue.isEmpty()) return null;

        // Cas particulier : un seul octet distinct répété
        if (queue.size() == 1) {
            Node single = queue.poll();
            return new Node(-1, single.frequency, order, single, null);
        }

        // Fusion itérative des deux fréquences minimales
        while (queue.size() > 1) {
            Node left = queue.poll();
            Node right = queue.poll();
            queue.add(new Node(-1, left.frequency + right.frequency, order++, left, right));
        }

        return queue.poll();
    }

    /**
     * ÉTAPE 3 : Parcours de l'arbre et génération des codes. Gauche = '0', Droite = '1'.
     */
    public static String[] generateCodes(Node root) {
        String[] codes = new String[256];
        if (root != null) {
            traverse(root, "", codes);
        }
        return codes;
    }

    private static void traverse(Node node, String code, String[] codes) {
        if (node == null) return;
        if (node.isLeaf()) {
            codes[node.value] = code.isEmpty() ? "0" : code;
            return;
        }
        traverse(node.left, code + "0", codes);
        traverse(node.right, code + "1", codes);
    }

    /**
     * ÉTAPE 4 : Encodage et compactage bit-à-bit dans un tableau d'octets.
     * Les bits de bourrage (0..7) du dernier octet restent à 0.
     */
    public static byte[] encode(byte[] data, String[] codes, long totalBits) {
        int padding = (int) ((8 - (totalBits % 8)) % 8);
        byte[] packed = new byte[(int) ((totalBits + padding) / 8)];

        long bitOffset = 0;
        for (byte b : data) {
            String code = codes[b & 0xFF];
            for (int c = 0; c < code.length(); c++) {
                if (code.charAt(c) == '1') {
                    int byteIndex = (int) (bitOffset >> 3);
                    int bitInByte = 7 - (int) (bitOffset & 7);
                    packed[byteIndex] |= (byte) (1 << bitInByte);
                }
                bitOffset++;
            }
        }
        return packed;
    }

    /**
     * ÉTAPE 5 : Décodage bit-par-bit en parcourant l'arbre.
     */
    public static byte[] decode(byte[] packed, int padding, Node root, long originalSize) {
        byte[] restored = new byte[(int) originalSize];
        if (root == null) return restored;

        // Cas particulier : un seul octet distinct répété
        if (root.right == null && root.left != null && root.left.isLeaf()) {
            Arrays.fill(restored, (byte) root.left.value);
            return restored;
        }

        long totalBits = (long) packed.length * 8 - padding;
        int written = 0;
        Node current = root;

        for (long bitIndex = 0; bitIndex < totalBits && written < originalSize; bitIndex++) {
            int byteIndex = (int) (bitIndex >> 3);
            int bitInByte = 7 - (int) (bitIndex & 7);
            int bit = (packed[byteIndex] >> bitInByte) & 1;

            current = (bit == 0) ? current.left : current.right;

            if (current.isLeaf()) {
                restored[written++] = (byte) current.value;
                current = root;
            }
        }
        return restored;
    }

    /**
     * COMPRESSION en mémoire : renvoie toutes les étapes (arbre, codes, flux, conteneur .huff)
     */
    public static Result compress(byte[] data, String filename) throws IOException {
        long start = System.nanoTime();
        if (data.length == 0) {
            throw new IOException("Le fichier fourni est vide (0 octet).");
        }

        long[] freqs = countFrequencies(data);
        Node root = buildTree(freqs);
        String[] codes = generateCodes(root);

        long totalBits = 0;
        for (int b = 0; b < 256; b++) {
            if (freqs[b] > 0) totalBits += freqs[b] * codes[b].length();
        }
        byte[] packed = encode(data, codes, totalBits);
        int padding = (int) ((8 - (totalBits % 8)) % 8);

        byte[] huffBytes = writeContainer(filename, data.length, freqs, padding, packed);

        return new Result(filename, data, freqs, root, codes, packed, padding, totalBits, huffBytes,
                (System.nanoTime() - start) / 1_000_000.0);
    }

    /**
     * DÉCOMPRESSION en mémoire d'un conteneur .huff
     */
    public static Result decompress(byte[] huffBytes) throws IOException {
        long start = System.nanoTime();
        try (DataInputStream in = new DataInputStream(new ByteArrayInputStream(huffBytes))) {
            if (in.readInt() != MAGIC) {
                throw new IOException("Ce fichier n'est pas un fichier .huff valide.");
            }
            String filename = in.readUTF();
            long originalSize = in.readLong();
            int distinct = in.readUnsignedShort();

            long[] freqs = new long[256];
            for (int i = 0; i < distinct; i++) {
                int b = in.readUnsignedByte();
                freqs[b] = in.readInt() & 0xFFFFFFFFL;
            }
            int padding = in.readUnsignedByte();
            byte[] packed = in.readAllBytes();

            Node root = buildTree(freqs);
            String[] codes = generateCodes(root);
            byte[] restored = decode(packed, padding, root, originalSize);
            long totalBits = (long) packed.length * 8 - padding;

            return new Result(filename, restored, freqs, root, codes, packed, padding, totalBits, huffBytes,
                    (System.nanoTime() - start) / 1_000_000.0);
        } catch (EOFException e) {
            throw new IOException("Le fichier .huff est incomplet ou corrompu.");
        }
    }

    private static byte[] writeContainer(String filename, long originalSize, long[] freqs,
                                         int padding, byte[] packed) throws IOException {
        int distinct = 0;
        for (long f : freqs) if (f > 0) distinct++;

        ByteArrayOutputStream buffer = new ByteArrayOutputStream(packed.length + 64 + distinct * 5);
        try (DataOutputStream out = new DataOutputStream(buffer)) {
            out.writeInt(MAGIC);
            out.writeUTF(filename);
            out.writeLong(originalSize);
            out.writeShort(distinct);
            for (int b = 0; b < 256; b++) {
                if (freqs[b] > 0) {
                    out.writeByte(b);
                    out.writeInt((int) freqs[b]);
                }
            }
            out.writeByte(padding);
            out.write(packed);
        }
        return buffer.toByteArray();
    }

    /**
     * COMPRESSION d'un fichier quelconque vers un fichier .huff
     */
    public static Result compressFile(File input, File output) throws IOException {
        Result result = compress(readAllBytes(input), input.getName());
        writeAllBytes(output, result.huffBytes);
        return result;
    }

    /**
     * DÉCOMPRESSION d'un fichier .huff. Si output est null, le fichier est restauré
     * sous "restaure_<nom d'origine>" dans le même dossier que le fichier compressé.
     */
    public static File decompressFile(File input, File output) throws IOException {
        Result result = decompress(readAllBytes(input));
        if (output == null) {
            File parent = input.getAbsoluteFile().getParentFile();
            output = new File(parent, "restaure_" + result.filename);
        }
        writeAllBytes(output, result.original);
        return output;
    }

    public static byte[] readAllBytes(File file) throws IOException {
        try (FileInputStream in = new FileInputStream(file)) {
            return in.readAllBytes();
        }
    }

    public static void writeAllBytes(File file, byte[] data) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(data);
        }
    }

    /**
     * Résultat complet d'une compression ou d'une décompression
     */
    public static class Result {
        public final String filename;
        public final byte[] original;     // Octets d'origine (ou restaurés)
        public final long[] freqs;        // Table des fréquences
        public final Node root;           // Racine de l'arbre
        public final String[] codes;      // Code de Huffman de chaque octet
        public final byte[] packed;       // Flux compressé
        public final int padding;         // Bits de bourrage (0..7)
        public final long totalBits;      // Nombre de bits utiles
        public final byte[] huffBytes;    // Conteneur .huff complet
        public final double timeMs;

        Result(String filename, byte[] original, long[] freqs, Node root, String[] codes,
               byte[] packed, int padding, long totalBits, byte[] huffBytes, double timeMs) {
            this.filename = filename;
            this.original = original;
            this.freqs = freqs;
            this.root = root;
            this.codes = codes;
            this.packed = packed;
            this.padding = padding;
            this.totalBits = totalBits;
            this.huffBytes = huffBytes;
            this.timeMs = timeMs;
        }

        public long originalSize() {
            return original.length;
        }

        public long compressedSize() {
            return huffBytes.length;
        }

        public int distinctBytes() {
            int n = 0;
            for (long f : freqs) if (f > 0) n++;
            return n;
        }

        /** Espace économisé = (1 - compressé / initial) * 100 */
        public double compressionRatio() {
            return (1.0 - (double) compressedSize() / originalSize()) * 100.0;
        }

        /** H(X) = - somme(p_i * log2(p_i)) */
        public double shannonEntropy() {
            double h = 0;
            for (long f : freqs) {
                if (f > 0) {
                    double p = (double) f / originalSize();
                    h -= p * (Math.log(p) / Math.log(2));
                }
            }
            return h;
        }

        /** L = somme(p_i * l_i) */
        public double averageCodeLength() {
            double l = 0;
            for (int b = 0; b < 256; b++) {
                if (freqs[b] > 0) {
                    l += (double) freqs[b] / originalSize() * codes[b].length();
                }
            }
            return l;
        }

        /** Efficacité = H(X) / L (en %) */
        public double treeEfficiency() {
            double l = averageCodeLength();
            return l > 0 ? Math.min(100.0, shannonEntropy() / l * 100.0) : 100.0;
        }
    }
}
