import javax.swing.*;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.border.MatteBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Line2D;
import java.awt.geom.Point2D;
import java.awt.geom.RoundRectangle2D;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.function.IntConsumer;

/**
 * APPLICATION GRAPHIQUE : HUFFMAN STUDIO (Swing)
 *
 * Compression et décompression de n'importe quel fichier avec l'algorithme de Huffman :
 * - table des fréquences avec codes binaires
 * - arbre binaire de Huffman (zoom, chemin surligné)
 * - flux binaire compacté
 *
 * Uniquement la bibliothèque standard Java (Swing / AWT), aucune dépendance externe.
 *
 * Lancement : java -cp out HuffmanStudio
 */
public class HuffmanStudio extends JFrame {

    // Palette (thème sombre, comme la version web)
    static final Color BG = new Color(0x111215);
    static final Color SURFACE = new Color(0x18191E);
    static final Color SURFACE_2 = new Color(0x202127);
    static final Color BORDER = new Color(0x2E2F36);
    static final Color TEXT = new Color(0xE4E4E7);
    static final Color MUTED = new Color(0x9A9AA3);
    static final Color ACCENT = new Color(0x34D399);    // Feuilles, succès
    static final Color HIGHLIGHT = new Color(0xFBBF24); // Chemin sélectionné
    static final Color DANGER = new Color(0xF87171);

    static final Font FONT = new Font("Segoe UI", Font.PLAIN, 13);
    static final Font FONT_BOLD = FONT.deriveFont(Font.BOLD);
    static final Font FONT_SMALL = FONT.deriveFont(12f);
    static final Font MONO = new Font(Font.MONOSPACED, Font.PLAIN, 13);

    /** Dernier résultat de compression (réutilisable dans l'onglet Décompresser) */
    private Huffman.Result lastCompression;

    public HuffmanStudio() {
        super("Huffman Studio");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(1280, 860);
        setMinimumSize(new Dimension(1000, 600));
        setLocationRelativeTo(null);
        setExtendedState(MAXIMIZED_BOTH);

        CardLayout cards = new CardLayout();
        JPanel content = new JPanel(cards);
        content.setBackground(BG);
        content.setBorder(new EmptyBorder(16, 18, 16, 18));
        content.add(page(new CompressPanel()), "compress");
        content.add(page(new DecompressPanel()), "decompress");

        // Barre de navigation
        Segmented nav = new Segmented();
        nav.addTab("Compresser", () -> cards.show(content, "compress"));
        nav.addTab("Décompresser", () -> cards.show(content, "decompress"));
        nav.select(0);

        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(SURFACE);
        header.setBorder(new CompoundBorder(new MatteBorder(0, 0, 1, 0, BORDER), new EmptyBorder(8, 18, 8, 18)));
        JLabel logo = label("Huffman Studio", FONT_BOLD.deriveFont(15f), TEXT);
        logo.setIcon(new LogoIcon());
        logo.setIconTextGap(10);
        header.add(logo, BorderLayout.WEST);
        JPanel navWrap = new JPanel(new FlowLayout(FlowLayout.CENTER, 0, 0));
        navWrap.setOpaque(false);
        navWrap.add(nav);
        header.add(navWrap, BorderLayout.CENTER);
        header.add(label("Compression sans perte", FONT_SMALL, MUTED), BorderLayout.EAST);

        // Pied de page
        JPanel footer = new JPanel(new BorderLayout());
        footer.setBackground(new Color(0x0E0F12));
        footer.setBorder(new CompoundBorder(new MatteBorder(1, 0, 0, 0, BORDER), new EmptyBorder(8, 18, 8, 18)));
        footer.add(label("Huffman Studio · Compression et décompression sans perte", FONT_SMALL, MUTED), BorderLayout.WEST);
        footer.add(label("Arbre binaire de codage préfixe (1952)", MONO.deriveFont(11f), MUTED), BorderLayout.EAST);

        JPanel root = new JPanel(new BorderLayout());
        root.setBackground(BG);
        root.add(header, BorderLayout.NORTH);
        root.add(content, BorderLayout.CENTER);
        root.add(footer, BorderLayout.SOUTH);
        setContentPane(root);
    }

    public static void main(String[] args) {
        UIManager.put("swing.boldMetal", Boolean.FALSE);
        UIManager.put("ScrollBar.gradient", null);
        UIManager.put("ScrollBar.width", 12);
        UIManager.put("ScrollBar.background", BG);
        UIManager.put("ScrollBar.track", BG);
        UIManager.put("ScrollBar.trackHighlight", BG);
        UIManager.put("ScrollBar.thumb", new Color(0x3F4048));
        UIManager.put("ScrollBar.thumbHighlight", new Color(0x3F4048));
        UIManager.put("ScrollBar.thumbShadow", new Color(0x3F4048));
        UIManager.put("ScrollBar.thumbDarkShadow", BORDER);
        UIManager.put("ScrollBar.shadow", BORDER);
        UIManager.put("ScrollBar.highlight", BORDER);
        UIManager.put("ScrollBar.darkShadow", BORDER);
        UIManager.put("Button.disabledText", new Color(0x6B6B73));
        UIManager.put("Table.focusCellHighlightBorder", new EmptyBorder(0, 10, 0, 10));
        SwingUtilities.invokeLater(() -> new HuffmanStudio().setVisible(true));
    }

    // =====================================================================
    //  ONGLET COMPRESSER
    // =====================================================================

    class CompressPanel extends JPanel {
        private File selectedFile;
        private Huffman.Result result;
        private boolean ignoreTextEvents;

        private final JLabel fileLabel = label("Aucun fichier sélectionné", FONT, MUTED);
        private final JTextArea input = textArea(true);
        private final FlatButton compressBtn = new FlatButton("Compresser", FlatButton.PRIMARY);
        private final FlatButton saveBtn = new FlatButton("Enregistrer le fichier .huff", FlatButton.SECONDARY);
        private final JLabel status = label(" ", FONT, MUTED);
        private final ResultView view = new ResultView(false);
        private final JPanel resultHolder = new JPanel(new BorderLayout());

        CompressPanel() {
            super(new BorderLayout(0, 14));
            setOpaque(false);

            // 1. Choix du fichier
            FlatButton choose = new FlatButton("Choisir un fichier...", FlatButton.SECONDARY);
            JPanel fileBody = new JPanel(new GridLayout(0, 1, 0, 6));
            fileBody.setOpaque(false);
            fileBody.add(row(choose));
            fileBody.add(fileLabel);
            fileBody.add(label("Tous types : .txt, .pdf, .docx, .xlsx, images, audio, .zip...", FONT_SMALL, MUTED));

            JPanel fileCard = card(new BorderLayout(0, 10));
            fileCard.add(label("Fichier à compresser", FONT_BOLD, TEXT), BorderLayout.NORTH);
            fileCard.add(fileBody, BorderLayout.CENTER);

            // ... ou saisie de texte
            input.setRows(3);
            JPanel textCard = card(new BorderLayout(0, 10));
            textCard.add(label("… ou saisissez / collez du texte", FONT_BOLD, TEXT), BorderLayout.NORTH);
            textCard.add(scroll(input), BorderLayout.CENTER);

            JPanel inputs = new JPanel(new GridLayout(1, 2, 14, 0));
            inputs.setOpaque(false);
            inputs.add(fileCard);
            inputs.add(textCard);

            FlatButton clear = new FlatButton("Effacer", FlatButton.SECONDARY);
            saveBtn.setEnabled(false);

            JPanel top = new JPanel(new BorderLayout(0, 12));
            top.setOpaque(false);
            top.add(inputs, BorderLayout.CENTER);
            top.add(row(compressBtn, clear, saveBtn, status), BorderLayout.SOUTH);
            add(top, BorderLayout.NORTH);

            resultHolder.setOpaque(false);
            showPlaceholder();
            add(resultHolder, BorderLayout.CENTER);

            choose.addActionListener(e -> chooseFile());
            compressBtn.addActionListener(e -> compress());
            clear.addActionListener(e -> clearAll());
            saveBtn.addActionListener(e -> save());
            input.getDocument().addDocumentListener(new DocumentListener() {
                public void insertUpdate(DocumentEvent e) { textChanged(); }
                public void removeUpdate(DocumentEvent e) { textChanged(); }
                public void changedUpdate(DocumentEvent e) { textChanged(); }
            });
        }

        /** Le texte saisi remplace le fichier choisi */
        private void textChanged() {
            if (!ignoreTextEvents && selectedFile != null && !input.getText().isEmpty()) {
                selectedFile = null;
                fileLabel.setText("Aucun fichier (le texte saisi sera compressé)");
                fileLabel.setForeground(MUTED);
            }
        }

        private void chooseFile() {
            FileDialog dialog = new FileDialog(HuffmanStudio.this, "Choisir un fichier à compresser", FileDialog.LOAD);
            dialog.setVisible(true);
            if (dialog.getFile() == null) return;

            File file = new File(dialog.getDirectory(), dialog.getFile());
            ignoreTextEvents = true;
            input.setText("");
            ignoreTextEvents = false;
            selectedFile = file;
            fileLabel.setText(file.getName() + "   (" + formatExact(file.length()) + ")");
            fileLabel.setForeground(TEXT);
        }

        private void compress() {
            final File file = selectedFile;
            final String text = input.getText();
            if (file == null && text.isEmpty()) {
                showError("Choisissez un fichier ou saisissez du texte à compresser.");
                return;
            }

            compressBtn.setEnabled(false);
            status.setForeground(MUTED);
            status.setText("Compression en cours...");

            new SwingWorker<Huffman.Result, Void>() {
                @Override
                protected Huffman.Result doInBackground() throws Exception {
                    byte[] data = file != null ? Huffman.readAllBytes(file) : text.getBytes(StandardCharsets.UTF_8);
                    return Huffman.compress(data, file != null ? file.getName() : "texte.txt");
                }

                @Override
                protected void done() {
                    compressBtn.setEnabled(true);
                    try {
                        result = get();
                        lastCompression = result;
                        view.show(result);
                        showView();
                        saveBtn.setEnabled(true);
                        status.setForeground(ACCENT);
                        status.setText("Compression terminée : " + result.filename + "  →  " + result.filename + ".huff");
                    } catch (InterruptedException | ExecutionException ex) {
                        status.setText(" ");
                        showError(causeMessage(ex));
                    }
                }
            }.execute();
        }

        private void save() {
            if (result == null) return;
            FileDialog dialog = new FileDialog(HuffmanStudio.this, "Enregistrer le fichier compressé", FileDialog.SAVE);
            dialog.setFile(result.filename + ".huff");
            dialog.setVisible(true);
            if (dialog.getFile() == null) return;

            File out = new File(dialog.getDirectory(), dialog.getFile());
            try {
                Huffman.writeAllBytes(out, result.huffBytes);
                status.setForeground(ACCENT);
                status.setText("Enregistré : " + out.getPath());
            } catch (IOException ex) {
                showError("Impossible d'enregistrer le fichier : " + ex.getMessage());
            }
        }

        private void clearAll() {
            selectedFile = null;
            result = null;
            ignoreTextEvents = true;
            input.setText("");
            ignoreTextEvents = false;
            fileLabel.setText("Aucun fichier sélectionné");
            fileLabel.setForeground(MUTED);
            saveBtn.setEnabled(false);
            status.setText(" ");
            showPlaceholder();
        }

        private void showPlaceholder() {
            setResultContent(placeholder("Choisissez un fichier ou saisissez du texte, puis cliquez sur « Compresser » "
                    + "pour voir la table des fréquences, l'arbre binaire et le flux binaire."));
        }

        private void showView() {
            setResultContent(view);
        }

        private void setResultContent(Component c) {
            resultHolder.removeAll();
            resultHolder.add(c, BorderLayout.CENTER);
            resultHolder.revalidate();
            resultHolder.repaint();
        }
    }

    // =====================================================================
    //  ONGLET DÉCOMPRESSER
    // =====================================================================

    class DecompressPanel extends JPanel {
        private byte[] huffBytes;
        private Huffman.Result result;

        private final JLabel fileLabel = label("Aucun fichier .huff sélectionné", FONT, MUTED);
        private final FlatButton decodeBtn = new FlatButton("Décoder", FlatButton.PRIMARY);
        private final FlatButton saveBtn = new FlatButton("Enregistrer le fichier restauré", FlatButton.SECONDARY);
        private final JLabel status = label(" ", FONT, MUTED);
        private final JPanel infoRow = new JPanel(new GridLayout(1, 0, 10, 0));
        private final ResultView view = new ResultView(true);
        private final JPanel resultHolder = new JPanel(new BorderLayout());
        private final JPanel resultPanel = new JPanel(new BorderLayout(0, 12));

        DecompressPanel() {
            super(new BorderLayout(0, 14));
            setOpaque(false);

            FlatButton choose = new FlatButton("Choisir un fichier .huff...", FlatButton.SECONDARY);
            FlatButton useLast = new FlatButton("Utiliser le dernier fichier compressé", FlatButton.SECONDARY);

            JPanel body = new JPanel(new GridLayout(0, 1, 0, 6));
            body.setOpaque(false);
            body.add(row(choose, useLast));
            body.add(fileLabel);

            JPanel fileCard = card(new BorderLayout(0, 10));
            fileCard.add(label("Fichier compressé (.huff)", FONT_BOLD, TEXT), BorderLayout.NORTH);
            fileCard.add(body, BorderLayout.CENTER);

            saveBtn.setEnabled(false);
            JPanel top = new JPanel(new BorderLayout(0, 12));
            top.setOpaque(false);
            top.add(fileCard, BorderLayout.CENTER);
            top.add(row(decodeBtn, saveBtn, status), BorderLayout.SOUTH);
            add(top, BorderLayout.NORTH);

            // Résumé de la décompression + vues détaillées
            infoRow.setOpaque(false);
            JPanel infoCard = new JPanel(new BorderLayout(0, 8));
            infoCard.setOpaque(false);
            infoCard.add(label("Décompression terminée avec succès", FONT_BOLD, ACCENT), BorderLayout.NORTH);
            infoCard.add(infoRow, BorderLayout.CENTER);
            resultPanel.setOpaque(false);
            resultPanel.add(infoCard, BorderLayout.NORTH);
            resultPanel.add(view, BorderLayout.CENTER);

            resultHolder.setOpaque(false);
            setResultContent(placeholder("Choisissez un fichier .huff (ou utilisez le dernier fichier compressé), "
                    + "puis cliquez sur « Décoder » pour restaurer le fichier d'origine."));
            add(resultHolder, BorderLayout.CENTER);

            choose.addActionListener(e -> chooseFile());
            useLast.addActionListener(e -> useLastCompression());
            decodeBtn.addActionListener(e -> decode());
            saveBtn.addActionListener(e -> save());
        }

        private void chooseFile() {
            FileDialog dialog = new FileDialog(HuffmanStudio.this, "Choisir un fichier .huff", FileDialog.LOAD);
            dialog.setFile("*.huff");
            dialog.setVisible(true);
            if (dialog.getFile() == null) return;

            File file = new File(dialog.getDirectory(), dialog.getFile());
            try {
                huffBytes = Huffman.readAllBytes(file);
                fileLabel.setText(file.getName() + "   (" + formatExact(file.length()) + ")");
                fileLabel.setForeground(TEXT);
            } catch (IOException ex) {
                showError("Impossible de lire le fichier : " + ex.getMessage());
            }
        }

        private void useLastCompression() {
            if (lastCompression == null) {
                showError("Aucun fichier n'a encore été compressé dans l'onglet « Compresser ».");
                return;
            }
            huffBytes = lastCompression.huffBytes;
            fileLabel.setText(lastCompression.filename + ".huff   (" + formatExact(huffBytes.length)
                    + ", dernier fichier compressé)");
            fileLabel.setForeground(TEXT);
        }

        private void decode() {
            final byte[] data = huffBytes;
            if (data == null) {
                showError("Choisissez d'abord un fichier .huff à décompresser.");
                return;
            }

            decodeBtn.setEnabled(false);
            status.setForeground(MUTED);
            status.setText("Décompression en cours...");

            new SwingWorker<Huffman.Result, Void>() {
                @Override
                protected Huffman.Result doInBackground() throws Exception {
                    return Huffman.decompress(data);
                }

                @Override
                protected void done() {
                    decodeBtn.setEnabled(true);
                    try {
                        result = get();
                        fillInfo(result);
                        view.show(result);
                        setResultContent(resultPanel);
                        saveBtn.setEnabled(true);
                        status.setForeground(ACCENT);
                        status.setText("Fichier restauré : " + result.filename);
                    } catch (InterruptedException | ExecutionException ex) {
                        status.setText(" ");
                        showError(causeMessage(ex));
                    }
                }
            }.execute();
        }

        private void fillInfo(Huffman.Result r) {
            String name = r.filename;
            int dot = name.lastIndexOf('.');
            String ext = dot >= 0 ? name.substring(dot) : "(aucune)";

            // Vérification bit-à-bit avec le dernier fichier compressé (si c'est le même)
            String check = "—";
            String checkSub = "pas de fichier à comparer";
            Color checkColor = MUTED;
            if (lastCompression != null && lastCompression.filename.equals(name)) {
                boolean same = Arrays.equals(lastCompression.original, r.original);
                check = same ? "Identique" : "Différent";
                checkSub = "comparé à l'original";
                checkColor = same ? ACCENT : DANGER;
            }

            infoRow.removeAll();
            infoRow.add(stat("Taille restaurée", formatSize(r.originalSize()), formatExact(r.originalSize()), TEXT));
            infoRow.add(stat("Extension", ext, name, TEXT));
            infoRow.add(stat("Octets dans l'arbre", String.valueOf(r.distinctBytes()), "feuilles distinctes", TEXT));
            infoRow.add(stat("Bits de bourrage retirés", String.valueOf(r.padding), "dans le dernier octet", TEXT));
            infoRow.add(stat("Vérification", check, checkSub, checkColor));
            infoRow.revalidate();
            infoRow.repaint();
        }

        private void save() {
            if (result == null) return;
            FileDialog dialog = new FileDialog(HuffmanStudio.this, "Enregistrer le fichier restauré", FileDialog.SAVE);
            dialog.setFile(result.filename);
            dialog.setVisible(true);
            if (dialog.getFile() == null) return;

            File out = new File(dialog.getDirectory(), dialog.getFile());
            try {
                Huffman.writeAllBytes(out, result.original);
                status.setForeground(ACCENT);
                status.setText("Enregistré : " + out.getPath());
            } catch (IOException ex) {
                showError("Impossible d'enregistrer le fichier : " + ex.getMessage());
            }
        }

        private void setResultContent(Component c) {
            resultHolder.removeAll();
            resultHolder.add(c, BorderLayout.CENTER);
            resultHolder.revalidate();
            resultHolder.repaint();
        }
    }

    // =====================================================================
    //  VUE DES RÉSULTATS : statistiques, table, arbre, flux binaire
    // =====================================================================

    static class ResultView extends JPanel {
        private final JPanel statsRow = new JPanel(new GridLayout(1, 0, 10, 0));
        private final FrequencyModel model = new FrequencyModel();
        private final JTable table = new JTable(model);
        private final TreePanel tree = new TreePanel();
        private final JLabel pathLabel = label(" ", MONO, MUTED);
        private final JTextArea bits = textArea(false);
        private final JTextArea preview;
        private final Segmented tabs = new Segmented();
        private boolean syncing;

        ResultView(boolean decompression) {
            super(new BorderLayout(0, 12));
            setOpaque(false);
            statsRow.setOpaque(false);
            statsRow.setVisible(!decompression); // La décompression affiche son propre résumé
            add(statsRow, BorderLayout.NORTH);

            CardLayout cards = new CardLayout();
            JPanel cardPanel = new JPanel(cards);
            cardPanel.setOpaque(false);
            cardPanel.setPreferredSize(new Dimension(400, 520)); // Hauteur minimale de la table / de l'arbre

            // Table des fréquences
            styleTable(table);
            JPanel tablePane = new JPanel(new BorderLayout(0, 6));
            tablePane.setOpaque(false);
            tablePane.add(scroll(table), BorderLayout.CENTER);
            tablePane.add(label("Cliquez sur une ligne pour tracer son chemin dans l'arbre (double-clic : ouvrir l'arbre). "
                    + "Standard = 8 bits par octet.", FONT_SMALL, MUTED), BorderLayout.SOUTH);
            cardPanel.add(tablePane, "table");

            // Arbre binaire
            FlatButton zoomIn = new FlatButton("+", FlatButton.SECONDARY);
            FlatButton zoomOut = new FlatButton("−", FlatButton.SECONDARY);
            FlatButton zoomReset = new FlatButton("Réinitialiser", FlatButton.SECONDARY);
            zoomIn.addActionListener(e -> tree.zoom(1.25));
            zoomOut.addActionListener(e -> tree.zoom(0.8));
            zoomReset.addActionListener(e -> tree.resetZoom());

            JPanel treeBar = new JPanel(new BorderLayout());
            treeBar.setOpaque(false);
            treeBar.add(pathLabel, BorderLayout.CENTER);
            treeBar.add(row(zoomIn, zoomOut, zoomReset), BorderLayout.EAST);

            JPanel treePane = new JPanel(new BorderLayout(0, 6));
            treePane.setOpaque(false);
            treePane.add(treeBar, BorderLayout.NORTH);
            treePane.add(scroll(tree), BorderLayout.CENTER);
            treePane.add(label("● Nœud interne (somme des poids)     ■ Feuille (octet + occurrences)     "
                    + "0 = gauche, 1 = droite", FONT_SMALL, MUTED), BorderLayout.SOUTH);
            cardPanel.add(treePane, "tree");

            // Flux binaire
            cardPanel.add(scroll(bits), "bits");

            tabs.addTab("Table des fréquences", () -> cards.show(cardPanel, "table"));
            tabs.addTab("Arbre binaire de Huffman", () -> cards.show(cardPanel, "tree"));
            tabs.addTab("Flux binaire", () -> cards.show(cardPanel, "bits"));

            // Aperçu du contenu restauré (onglet Décompresser)
            if (decompression) {
                preview = textArea(false);
                cardPanel.add(scroll(preview), "preview");
                tabs.addTab("Aperçu du contenu", () -> cards.show(cardPanel, "preview"));
            } else {
                preview = null;
            }

            JPanel tabsRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
            tabsRow.setOpaque(false);
            tabsRow.add(tabs);

            JPanel body = new JPanel(new BorderLayout(0, 8));
            body.setOpaque(false);
            body.add(tabsRow, BorderLayout.NORTH);
            body.add(cardPanel, BorderLayout.CENTER);
            add(body, BorderLayout.CENTER);

            // Synchronisation table <-> arbre
            table.getSelectionModel().addListSelectionListener(e -> {
                if (e.getValueIsAdjusting() || syncing) return;
                int selectedRow = table.getSelectedRow();
                selectByte(selectedRow >= 0 ? model.byteAt(selectedRow) : -1, false);
            });
            table.addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (e.getClickCount() == 2 && table.getSelectedRow() >= 0) tabs.select(1);
                }
            });
            tree.onLeafClicked = b -> selectByte(b, true);
        }

        void show(Huffman.Result r) {
            statsRow.removeAll();
            statsRow.add(stat("Taille initiale", formatSize(r.originalSize()), formatExact(r.originalSize()), TEXT));
            statsRow.add(stat("Données compressées", formatSize(r.packed.length), "flux binaire seul", TEXT));
            statsRow.add(stat("Fichier .huff", formatSize(r.compressedSize()), "avec en-tête (table)", TEXT));
            statsRow.add(stat("Espace économisé", String.format(Locale.FRANCE, "%.2f %%", r.compressionRatio()),
                    "fichier .huff / original", r.compressionRatio() >= 0 ? ACCENT : DANGER));
            statsRow.add(stat("Entropie H(X)", String.format(Locale.FRANCE, "%.3f", r.shannonEntropy()), "bits/octet", TEXT));
            statsRow.add(stat("Longueur moyenne L", String.format(Locale.FRANCE, "%.3f", r.averageCodeLength()), "bits/octet", TEXT));
            statsRow.add(stat("Efficacité", String.format(Locale.FRANCE, "%.2f %%", r.treeEfficiency()), "H(X) / L", TEXT));
            statsRow.add(stat("Temps", String.format(Locale.FRANCE, "%.2f ms", r.timeMs),
                    r.distinctBytes() + " octets distincts", TEXT));
            statsRow.revalidate();
            statsRow.repaint();

            model.setData(r);
            tree.setTree(r.root, r.codes);
            table.clearSelection();
            selectByte(-1, false);

            bits.setText(bitstreamText(r));
            bits.setCaretPosition(0);

            if (preview != null) {
                String text = decodeText(r.original);
                preview.setText(text != null ? text
                        : "Fichier binaire (" + formatExact(r.originalSize()) + ") : aperçu texte non disponible.\n"
                        + "Utilisez « Enregistrer le fichier restauré » pour l'ouvrir avec son application.");
                preview.setCaretPosition(0);
            }
            tabs.select(0);
        }

        private void selectByte(int b, boolean updateTable) {
            tree.setSelected(b);
            if (b < 0) {
                pathLabel.setText("Sélectionnez un octet dans la table ou cliquez sur une feuille de l'arbre.");
                pathLabel.setForeground(MUTED);
            } else {
                pathLabel.setText("Chemin pour " + longSymbol(b) + " : " + tree.codes[b]);
                pathLabel.setForeground(HIGHLIGHT);
            }
            if (updateTable && b >= 0) {
                int r = model.rowOf(b);
                syncing = true;
                table.setRowSelectionInterval(r, r);
                table.scrollRectToVisible(table.getCellRect(r, 0, true));
                syncing = false;
            }
        }
    }

    /**
     * Modèle de la table des fréquences (triée par occurrences décroissantes)
     */
    static class FrequencyModel extends AbstractTableModel {
        private static final String[] COLUMNS = {
                "Symbole", "Octet (Hex / Déc)", "Occurrences", "Fréquence (%)", "Code Huffman", "Longueur", "Gain"
        };
        private final List<Integer> rows = new ArrayList<>();
        private Huffman.Result r;

        void setData(Huffman.Result result) {
            r = result;
            rows.clear();
            for (int b = 0; b < 256; b++) {
                if (r.freqs[b] > 0) rows.add(b);
            }
            rows.sort((a, c) -> Long.compare(r.freqs[c], r.freqs[a]));
            fireTableDataChanged();
        }

        int byteAt(int row) {
            return rows.get(row);
        }

        int rowOf(int b) {
            return rows.indexOf(b);
        }

        @Override public int getRowCount() { return rows.size(); }
        @Override public int getColumnCount() { return COLUMNS.length; }
        @Override public String getColumnName(int col) { return COLUMNS[col]; }

        @Override
        public Object getValueAt(int row, int col) {
            int b = rows.get(row);
            long count = r.freqs[b];
            String code = r.codes[b];
            switch (col) {
                case 0: return longSymbol(b);
                case 1: return String.format("0x%02X / %d", b, b);
                case 2: return String.format(Locale.FRANCE, "%,d", count);
                case 3: return String.format(Locale.FRANCE, "%.2f %%", 100.0 * count / r.originalSize());
                case 4: return code;
                case 5: return code.length() + " bits";
                default:
                    int gain = 8 - code.length();
                    return (gain > 0 ? "+" : "") + gain + " bits";
            }
        }
    }

    // =====================================================================
    //  DESSIN DE L'ARBRE BINAIRE
    // =====================================================================

    static class TreePanel extends JPanel {
        private static final int H_GAP = 56, V_GAP = 86, MARGIN = 48, R = 21, LEAF_W = 46, LEAF_H = 40;

        private Huffman.Node root;
        String[] codes;
        private final Map<Huffman.Node, Point2D.Double> pos = new IdentityHashMap<>();
        private final Set<Huffman.Node> path = Collections.newSetFromMap(new IdentityHashMap<>());
        private int leafCount, maxDepth;
        private double scale = 1.0, fitScale = 1.0;
        IntConsumer onLeafClicked;

        TreePanel() {
            setBackground(SURFACE);
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (onLeafClicked == null) return;
                    double x = (e.getX() - offsetX()) / scale;
                    double y = e.getY() / scale;
                    for (Map.Entry<Huffman.Node, Point2D.Double> entry : pos.entrySet()) {
                        Point2D.Double p = entry.getValue();
                        if (entry.getKey().isLeaf()
                                && Math.abs(x - p.x) <= LEAF_W / 2.0 && Math.abs(y - p.y) <= LEAF_H / 2.0) {
                            onLeafClicked.accept(entry.getKey().value);
                            return;
                        }
                    }
                }
            });
        }

        void setTree(Huffman.Node root, String[] codes) {
            this.root = root;
            this.codes = codes;
            pos.clear();
            path.clear();
            leafCount = 0;
            maxDepth = 0;
            if (root != null) place(root, 0);

            // Zoom initial : tout l'arbre visible en largeur (dans la limite du lisible)
            double width = 2 * MARGIN + Math.max(0, leafCount - 1) * H_GAP;
            fitScale = Math.max(0.35, Math.min(1.0, 1150.0 / width));
            scale = fitScale;
            revalidate();
            repaint();
        }

        /** Placement : les feuilles sont alignées de gauche à droite, un parent est centré sur ses fils */
        private double place(Huffman.Node n, int depth) {
            maxDepth = Math.max(maxDepth, depth);
            double x;
            if (n.isLeaf()) {
                x = MARGIN + (leafCount++) * H_GAP;
            } else {
                double lx = place(n.left, depth + 1);
                x = n.right != null ? (lx + place(n.right, depth + 1)) / 2 : lx;
            }
            pos.put(n, new Point2D.Double(x, MARGIN + depth * V_GAP));
            return x;
        }

        /** Surligne le chemin racine -> feuille de l'octet b (-1 pour aucun) */
        void setSelected(int b) {
            path.clear();
            if (root != null && b >= 0 && codes[b] != null) {
                Huffman.Node n = root;
                path.add(n);
                for (char c : codes[b].toCharArray()) {
                    n = c == '0' ? n.left : n.right;
                    if (n == null) break;
                    path.add(n);
                }
                if (n != null) {
                    Point2D.Double p = pos.get(n);
                    scrollRectToVisible(new Rectangle((int) (p.x * scale + offsetX()) - 150,
                            (int) (p.y * scale) - 150, 300, 300));
                }
            }
            repaint();
        }

        void zoom(double factor) {
            scale = Math.max(0.2, Math.min(3.0, scale * factor));
            revalidate();
            repaint();
        }

        void resetZoom() {
            scale = fitScale;
            revalidate();
            repaint();
        }

        @Override
        public Dimension getPreferredSize() {
            if (root == null) return new Dimension(400, 300);
            int w = (int) ((2 * MARGIN + Math.max(0, leafCount - 1) * H_GAP) * scale);
            int h = (int) ((2 * MARGIN + maxDepth * V_GAP + LEAF_H) * scale);
            return new Dimension(w, h);
        }

        /** Centre l'arbre horizontalement s'il est plus petit que la zone visible */
        private int offsetX() {
            return Math.max(0, (getWidth() - getPreferredSize().width) / 2);
        }

        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            if (root == null) return;

            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2.translate(offsetX(), 0);
            g2.scale(scale, scale);

            // Arêtes d'abord, puis les nœuds par-dessus
            for (Huffman.Node n : pos.keySet()) {
                if (n.isLeaf()) continue;
                drawEdge(g2, n, n.left, "0");
                drawEdge(g2, n, n.right, "1");
            }
            for (Map.Entry<Huffman.Node, Point2D.Double> entry : pos.entrySet()) {
                drawNode(g2, entry.getKey(), entry.getValue());
            }
            g2.dispose();
        }

        private void drawEdge(Graphics2D g2, Huffman.Node parent, Huffman.Node child, String bit) {
            if (child == null) return;
            Point2D.Double a = pos.get(parent);
            Point2D.Double b = pos.get(child);
            boolean on = path.contains(parent) && path.contains(child);

            g2.setColor(on ? HIGHLIGHT : new Color(0x4A4B53));
            g2.setStroke(new BasicStroke(on ? 3f : 1.5f));
            g2.draw(new Line2D.Double(a.x, a.y, b.x, b.y));

            double mx = (a.x + b.x) / 2;
            double my = (a.y + b.y) / 2;
            g2.setFont(MONO.deriveFont(Font.BOLD, 12f));
            g2.setColor(on ? HIGHLIGHT : MUTED);
            g2.drawString(bit, (float) (mx + (bit.equals("0") ? -14 : 6)), (float) (my - 2));
        }

        private void drawNode(Graphics2D g2, Huffman.Node n, Point2D.Double p) {
            boolean on = path.contains(n);
            if (n.isLeaf()) {
                RoundRectangle2D rect = new RoundRectangle2D.Double(
                        p.x - LEAF_W / 2.0, p.y - LEAF_H / 2.0, LEAF_W, LEAF_H, 10, 10);
                g2.setColor(on ? new Color(0x3A3220) : new Color(0x15302A));
                g2.fill(rect);
                g2.setColor(on ? HIGHLIGHT : ACCENT);
                g2.setStroke(new BasicStroke(on ? 2.5f : 1.5f));
                g2.draw(rect);
                drawCentered(g2, shortSymbol(n.value), MONO.deriveFont(Font.BOLD, 13f), on ? HIGHLIGHT : TEXT, p.x, p.y - 1);
                drawCentered(g2, compact(n.frequency), FONT.deriveFont(10.5f), MUTED, p.x, p.y + 14);
            } else {
                Ellipse2D circle = new Ellipse2D.Double(p.x - R, p.y - R, 2 * R, 2 * R);
                g2.setColor(SURFACE_2);
                g2.fill(circle);
                g2.setColor(on ? HIGHLIGHT : new Color(0x5A5B63));
                g2.setStroke(new BasicStroke(on ? 2.5f : 1.5f));
                g2.draw(circle);
                drawCentered(g2, compact(n.frequency), FONT_BOLD.deriveFont(11.5f), on ? HIGHLIGHT : TEXT, p.x, p.y + 4);
            }
        }

        private static void drawCentered(Graphics2D g2, String s, Font f, Color c, double cx, double baseline) {
            g2.setFont(f);
            g2.setColor(c);
            int w = g2.getFontMetrics().stringWidth(s);
            g2.drawString(s, (float) (cx - w / 2.0), (float) baseline);
        }
    }

    // =====================================================================
    //  COMPOSANTS GRAPHIQUES
    // =====================================================================

    /** Bouton plat aux coins arrondis */
    static class FlatButton extends JButton {
        static final int PRIMARY = 0, SECONDARY = 1, TAB = 2;
        private final int kind;
        private boolean active, hover;

        FlatButton(String text, int kind) {
            super(text);
            this.kind = kind;
            setFont(kind == PRIMARY ? FONT_BOLD : FONT);
            setForeground(kind == PRIMARY ? BG : kind == TAB ? MUTED : TEXT);
            setContentAreaFilled(false);
            setBorderPainted(false);
            setFocusPainted(false);
            setOpaque(false);
            setBorder(new EmptyBorder(7, 14, 7, 14));
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            addMouseListener(new MouseAdapter() {
                @Override public void mouseEntered(MouseEvent e) { hover = true; repaint(); }
                @Override public void mouseExited(MouseEvent e) { hover = false; repaint(); }
            });
        }

        void setActive(boolean active) {
            this.active = active;
            setForeground(active ? TEXT : MUTED);
            repaint();
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            int w = getWidth(), h = getHeight();
            boolean on = hover && isEnabled();

            if (kind == PRIMARY) {
                g2.setColor(isEnabled() ? (on ? new Color(0x6EE7B7) : ACCENT) : SURFACE_2);
                g2.fillRoundRect(0, 0, w, h, 10, 10);
            } else if (kind == SECONDARY) {
                g2.setColor(on ? SURFACE_2 : SURFACE);
                g2.fillRoundRect(0, 0, w - 1, h - 1, 10, 10);
                g2.setColor(BORDER);
                g2.drawRoundRect(0, 0, w - 1, h - 1, 10, 10);
            } else if (active || on) {
                g2.setColor(active ? BORDER : SURFACE);
                g2.fillRoundRect(0, 0, w, h, 8, 8);
            }
            g2.dispose();
            super.paintComponent(g);
        }
    }

    /** Groupe d'onglets (un seul actif à la fois) */
    static class Segmented extends JPanel {
        private final List<FlatButton> buttons = new ArrayList<>();
        private final List<Runnable> actions = new ArrayList<>();

        Segmented() {
            super(new FlowLayout(FlowLayout.LEFT, 3, 3));
            setBackground(SURFACE_2);
            setBorder(new LineBorder(BORDER, 1, true));
        }

        void addTab(String text, Runnable action) {
            int index = buttons.size();
            FlatButton b = new FlatButton(text, FlatButton.TAB);
            b.setBorder(new EmptyBorder(5, 14, 5, 14));
            b.addActionListener(e -> select(index));
            buttons.add(b);
            actions.add(action);
            add(b);
        }

        void select(int index) {
            for (int i = 0; i < buttons.size(); i++) {
                buttons.get(i).setActive(i == index);
            }
            actions.get(index).run();
        }
    }

    /** Petit logo "H" de la barre de titre */
    static class LogoIcon implements Icon {
        @Override
        public void paintIcon(Component c, Graphics g, int x, int y) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(SURFACE_2);
            g2.fillRoundRect(x, y, 26, 26, 8, 8);
            g2.setColor(BORDER);
            g2.drawRoundRect(x, y, 25, 25, 8, 8);
            g2.setFont(MONO.deriveFont(Font.BOLD, 13f));
            g2.setColor(ACCENT);
            FontMetrics fm = g2.getFontMetrics();
            g2.drawString("H", x + (26 - fm.stringWidth("H")) / 2, y + 18);
            g2.dispose();
        }

        @Override public int getIconWidth() { return 26; }
        @Override public int getIconHeight() { return 26; }
    }

    static JLabel label(String text, Font font, Color color) {
        JLabel l = new JLabel(text);
        l.setFont(font);
        l.setForeground(color);
        return l;
    }

    /**
     * Page défilable verticalement : occupe toute la fenêtre sur un grand écran,
     * défile sur un petit écran pour garder l'arbre et la table lisibles.
     */
    static class Page extends JPanel implements Scrollable {
        Page(Component c) {
            super(new BorderLayout());
            setOpaque(false);
            add(c, BorderLayout.CENTER);
        }

        @Override public Dimension getPreferredScrollableViewportSize() { return getPreferredSize(); }
        @Override public int getScrollableUnitIncrement(Rectangle r, int orientation, int direction) { return 24; }
        @Override public int getScrollableBlockIncrement(Rectangle r, int orientation, int direction) { return r.height - 40; }
        @Override public boolean getScrollableTracksViewportWidth() { return true; }

        @Override
        public boolean getScrollableTracksViewportHeight() {
            return getParent() instanceof JViewport && getParent().getHeight() > getPreferredSize().height;
        }
    }

    static JScrollPane page(Component c) {
        JScrollPane s = new JScrollPane(new Page(c));
        s.setBorder(null);
        s.setOpaque(false);
        s.getViewport().setBackground(BG);
        s.getVerticalScrollBar().setUnitIncrement(24);
        s.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
        return s;
    }

    static JPanel card(LayoutManager layout) {
        JPanel p = new JPanel(layout);
        p.setBackground(SURFACE);
        p.setBorder(new CompoundBorder(new LineBorder(BORDER, 1, true), new EmptyBorder(12, 14, 12, 14)));
        return p;
    }

    /** Carte de statistique : titre, valeur, précision */
    static JPanel stat(String title, String value, String sub, Color color) {
        JPanel p = new JPanel(new GridLayout(0, 1, 0, 2));
        p.setBackground(SURFACE);
        p.setBorder(new CompoundBorder(new LineBorder(BORDER, 1, true), new EmptyBorder(9, 12, 9, 12)));
        p.add(label(title, FONT_SMALL, MUTED));
        p.add(label(value, FONT_BOLD.deriveFont(17f), color));
        p.add(label(sub, FONT_SMALL, MUTED));
        return p;
    }

    static JPanel placeholder(String text) {
        JPanel p = card(new GridBagLayout());
        JLabel l = label("<html><div style='text-align:center;width:520px'>" + text + "</div></html>", FONT, MUTED);
        p.add(l);
        return p;
    }

    /** Ligne horizontale de composants alignés à gauche */
    static JPanel row(Component... components) {
        JPanel p = new JPanel();
        p.setOpaque(false);
        p.setLayout(new BoxLayout(p, BoxLayout.X_AXIS));
        for (int i = 0; i < components.length; i++) {
            if (i > 0) p.add(Box.createHorizontalStrut(10));
            p.add(components[i]);
        }
        p.add(Box.createHorizontalGlue());
        return p;
    }

    static JScrollPane scroll(Component c) {
        JScrollPane s = new JScrollPane(c);
        s.setBorder(new LineBorder(BORDER));
        s.getViewport().setBackground(SURFACE);
        s.getVerticalScrollBar().setUnitIncrement(16);
        s.getHorizontalScrollBar().setUnitIncrement(16);
        JPanel corner = new JPanel();
        corner.setBackground(BG);
        s.setCorner(ScrollPaneConstants.LOWER_RIGHT_CORNER, corner);
        return s;
    }

    static JTextArea textArea(boolean editable) {
        JTextArea t = new JTextArea();
        t.setEditable(editable);
        t.setFont(MONO);
        t.setBackground(editable ? BG : SURFACE);
        t.setForeground(TEXT);
        t.setCaretColor(TEXT);
        t.setSelectionColor(new Color(0x3A3220));
        t.setSelectedTextColor(HIGHLIGHT);
        t.setMargin(new Insets(10, 12, 10, 12));
        return t;
    }

    static void styleTable(JTable table) {
        table.setBackground(SURFACE);
        table.setForeground(TEXT);
        table.setFont(FONT);
        table.setRowHeight(28);
        table.setGridColor(BORDER);
        table.setShowVerticalLines(false);
        table.setFillsViewportHeight(true);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setSelectionBackground(new Color(0x3A3220));
        table.setSelectionForeground(HIGHLIGHT);
        table.getTableHeader().setReorderingAllowed(false);

        table.setDefaultRenderer(Object.class, new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable t, Object value, boolean selected,
                                                           boolean focus, int row, int col) {
                super.getTableCellRendererComponent(t, value, selected, focus, row, col);
                setBorder(new EmptyBorder(0, 10, 0, 10));
                setFont(col == 1 || col == 4 ? MONO : FONT);
                setHorizontalAlignment(col == 2 || col == 3 || col == 5 || col == 6 ? RIGHT : LEFT);
                if (!selected) {
                    setBackground(row % 2 == 0 ? SURFACE : SURFACE_2);
                    String s = String.valueOf(value);
                    if (col == 4) setForeground(ACCENT);
                    else if (col == 6) setForeground(s.startsWith("+") ? ACCENT : s.startsWith("-") ? DANGER : MUTED);
                    else setForeground(TEXT);
                }
                return this;
            }
        });

        DefaultTableCellRenderer header = new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable t, Object value, boolean selected,
                                                           boolean focus, int row, int col) {
                super.getTableCellRendererComponent(t, value, selected, focus, row, col);
                setBackground(SURFACE_2);
                setForeground(MUTED);
                setFont(FONT_BOLD.deriveFont(12f));
                setHorizontalAlignment(col == 2 || col == 3 || col == 5 || col == 6 ? RIGHT : LEFT);
                setBorder(new CompoundBorder(new MatteBorder(0, 0, 1, 0, BORDER), new EmptyBorder(7, 10, 7, 10)));
                return this;
            }
        };
        table.getTableHeader().setDefaultRenderer(header);
        table.getTableHeader().setBackground(SURFACE_2);
    }

    // =====================================================================
    //  FORMATAGE
    // =====================================================================

    /** Libellé complet d'un octet (table) */
    static String longSymbol(int b) {
        if (b >= 33 && b <= 126) return "'" + (char) b + "'";
        switch (b) {
            case 32: return "Espace";
            case 10: return "Saut de ligne (\\n)";
            case 13: return "Retour chariot (\\r)";
            case 9:  return "Tabulation (\\t)";
            case 0:  return "Null (0x00)";
            default: return String.format("Octet 0x%02X", b);
        }
    }

    /** Libellé court d'un octet (feuilles de l'arbre) */
    static String shortSymbol(int b) {
        if (b >= 33 && b <= 126) return String.valueOf((char) b);
        switch (b) {
            case 32: return "esp";
            case 10: return "\\n";
            case 13: return "\\r";
            case 9:  return "\\t";
            default: return String.format("%02X", b);
        }
    }

    static String compact(long n) {
        if (n < 10_000) return String.valueOf(n);
        if (n < 1_000_000) return String.format(Locale.FRANCE, "%.1fk", n / 1000.0);
        return String.format(Locale.FRANCE, "%.1fM", n / 1_000_000.0);
    }

    static String formatSize(long n) {
        if (n < 1024) return n + " o";
        if (n < 1024 * 1024) return String.format(Locale.FRANCE, "%.1f Ko", n / 1024.0);
        return String.format(Locale.FRANCE, "%.2f Mo", n / (1024.0 * 1024.0));
    }

    static String formatExact(long n) {
        return String.format(Locale.FRANCE, "%,d octets", n);
    }

    static String toBits(byte b) {
        String s = Integer.toBinaryString(b & 0xFF);
        return "00000000".substring(s.length()) + s;
    }

    /** Texte de l'onglet « Flux binaire » */
    static String bitstreamText(Huffman.Result r) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.FRANCE, "Bits utiles : %,d   |   Bits de bourrage : %d   |   Octets compressés : %,d%n%n",
                r.totalBits, r.padding, r.packed.length));

        sb.append("1) ENCODAGE DES PREMIERS OCTETS (symbole -> code de Huffman)\n\n");
        int n = Math.min(32, r.original.length);
        StringBuilder stream = new StringBuilder();
        for (int i = 0; i < n; i++) {
            int b = r.original[i] & 0xFF;
            sb.append(String.format("   %-6s -> %s%n", shortSymbol(b), r.codes[b]));
            stream.append(r.codes[b]).append(' ');
        }
        sb.append("\n   Concaténation : ").append(stream.toString().trim())
                .append(r.original.length > n ? " ..." : "").append("\n\n");

        sb.append("2) FLUX COMPACTÉ EN MÉMOIRE (blocs de 8 bits)\n\n");
        int count = Math.min(128, r.packed.length);
        for (int i = 0; i < count; i += 4) {
            sb.append(String.format("   %06d   ", i));
            StringBuilder hex = new StringBuilder();
            for (int j = i; j < i + 4; j++) {
                if (j < count) {
                    sb.append(toBits(r.packed[j])).append(' ');
                    hex.append(String.format("%02X ", r.packed[j] & 0xFF));
                } else {
                    sb.append("         ");
                }
            }
            sb.append("  |  ").append(hex.toString().trim()).append('\n');
        }
        if (r.packed.length > count) {
            sb.append(String.format(Locale.FRANCE, "   ... (%,d octets au total)%n", r.packed.length));
        }
        if (r.padding > 0) {
            sb.append("\n   Les ").append(r.padding)
                    .append(" dernier(s) bit(s) du dernier octet sont du bourrage (mis à 0).\n");
        }
        return sb.toString();
    }

    /** Décode en UTF-8 si le contenu est du texte lisible, sinon null */
    static String decodeText(byte[] data) {
        try {
            String s = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(data)).toString();
            int control = 0;
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c < 32 && c != '\n' && c != '\r' && c != '\t') control++;
            }
            if (control > s.length() / 100) return null;
            return s.length() > 200_000 ? s.substring(0, 200_000) + "\n\n[... aperçu tronqué ...]" : s;
        } catch (CharacterCodingException e) {
            return null;
        }
    }

    static String causeMessage(Exception ex) {
        Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
        if (cause instanceof OutOfMemoryError) return "Fichier trop volumineux pour la mémoire disponible.";
        return cause.getMessage() != null ? cause.getMessage() : cause.toString();
    }

    void showError(String message) {
        JOptionPane.showMessageDialog(this, message, "Huffman Studio", JOptionPane.ERROR_MESSAGE);
    }
}
