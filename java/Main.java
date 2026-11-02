import java.io.File;
import java.io.IOException;

/**
 * Programme en ligne de commande pour compresser / décompresser avec Huffman.
 *
 * Utilisation :
 *   java Main compresser   <fichier>        [sortie.huff]
 *   java Main decompresser <fichier.huff>   [sortie]
 */
public class Main {

    public static void main(String[] args) {
        if (args.length < 2) {
            printUsage();
            return;
        }

        String action = args[0].toLowerCase();
        File input = new File(args[1]);

        if (!input.isFile()) {
            System.err.println("Erreur : fichier introuvable -> " + input.getPath());
            return;
        }

        try {
            switch (action) {
                case "compresser":
                case "c": {
                    File output = args.length >= 3 ? new File(args[2]) : new File(input.getPath() + ".huff");
                    Huffman.Result stats = Huffman.compressFile(input, output);
                    printStats(stats, output);
                    break;
                }
                case "decompresser":
                case "d": {
                    File output = args.length >= 3 ? new File(args[2]) : null;
                    File restored = Huffman.decompressFile(input, output);
                    System.out.println("Fichier restauré : " + restored.getPath()
                            + " (" + restored.length() + " octets)");
                    break;
                }
                default:
                    printUsage();
            }
        } catch (IOException e) {
            System.err.println("Erreur : " + e.getMessage());
        }
    }

    private static void printStats(Huffman.Result stats, File output) {
        System.out.println("=== COMPRESSION DE HUFFMAN ===");
        System.out.println("Fichier compressé     : " + output.getPath());
        System.out.println("Taille d'origine      : " + stats.originalSize() + " octets");
        System.out.println("Taille compressée     : " + stats.compressedSize() + " octets");
        System.out.printf("Espace économisé      : %.2f %%%n", stats.compressionRatio());
        System.out.printf("Entropie de Shannon   : %.3f bits/octet%n", stats.shannonEntropy());
        System.out.printf("Longueur moyenne code : %.3f bits/octet%n", stats.averageCodeLength());
        System.out.printf("Temps d'exécution     : %.2f ms%n", stats.timeMs);

        System.out.println();
        System.out.println("Octet      | Fréquence  | Code");
        System.out.println("-----------+------------+----------------");
        for (int b = 0; b < 256; b++) {
            if (stats.freqs[b] > 0) {
                System.out.printf("%-10s | %10d | %s%n", display(b), stats.freqs[b], stats.codes[b]);
            }
        }
    }

    /** Représentation lisible d'un octet */
    private static String display(int b) {
        if (b >= 33 && b <= 126) return "'" + (char) b + "'";
        switch (b) {
            case 32: return "Espace";
            case 10: return "\\n";
            case 13: return "\\r";
            case 9:  return "\\t";
            default: return String.format("0x%02X", b);
        }
    }

    private static void printUsage() {
        System.out.println("Utilisation :");
        System.out.println("  java Main compresser   <fichier>      [sortie.huff]");
        System.out.println("  java Main decompresser <fichier.huff> [sortie]");
    }
}
