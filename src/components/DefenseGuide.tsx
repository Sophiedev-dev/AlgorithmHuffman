/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GUIDE DE SOUTENANCE & EXPLICATIONS ALGORITHMIQUES
 * 
 * Conçu spécifiquement pour aider l'étudiant à briller lors de sa soutenance devant son professeur :
 * - Décomposition didactique des 6 étapes
 * - Propriétés mathématiques fondamentales (Prefix-free, Entropie de Shannon)
 * - Questions pièges classiques posées par les examinateurs et leurs réponses exemplaires
 */

import React, { useState } from "react";
import {
  BookOpen,
  HelpCircle,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  FileCode,
} from "lucide-react";

export const DefenseGuide: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: "1",
      title: "Comptage des fréquences d'apparition",
      complexity: "O(N)",
      desc: "On parcourt le texte d'origine caractère par caractère pour déterminer le nombre d'occurrences de chaque symbole. On obtient une table de distribution des fréquences.",
      keyPoint: "Les caractères les plus fréquents (ex: 'e', ' ', 'a') se verront attribuer les codes les plus courts.",
    },
    {
      num: "2",
      title: "Construction de l'arbre binaire optimal",
      complexity: "O(K log K)",
      desc: "Chaque caractère unique devient une feuille. On insère toutes les feuilles dans une file de priorité ordonnée par poids croissant. On fusionne itérativement les deux nœuds de poids minimal en un nœud parent jusqu'à obtenir une racine unique.",
      keyPoint: "C'est une stratégie gloutonne (greedy) prouvée mathématiquement optimale par David Huffman en 1952.",
    },
    {
      num: "3",
      title: "Parcours de l'arbre & Attribution des codes",
      complexity: "O(K)",
      desc: "On parcourt l'arbre de la racine vers les feuilles : chaque descente à GAUCHE concatène un '0', chaque descente à DROITE concatène un '1'.",
      keyPoint: "Les codes obtenus sont dits 'sans préfixe' (prefix-free) : aucun code n'est le début d'un autre.",
    },
    {
      num: "4",
      title: "Encodage & Compactage en octets (Bit-Packing)",
      complexity: "O(N)",
      desc: "Chaque caractère du texte est remplacé par son code binaire. Pour une vraie compression physique, ces bits sont regroupés par paquets de 8 dans un tableau d'octets (Uint8Array).",
      keyPoint: "Si le nombre total de bits n'est pas multiple de 8, on ajoute de 0 à 7 bits de bourrage (padding) dont la taille exacte est mémorisée.",
    },
    {
      num: "5",
      title: "Encapsulation dans le conteneur (.huff)",
      complexity: "O(K)",
      desc: "Le fichier de sortie encapsule la table des fréquences (indispensable au récepteur pour reconstruire l'arbre identique) et le flux d'octets binaire compressé.",
      keyPoint: "Le fichier est totalement autonome : aucun dictionnaire externe n'est requis pour décompresser.",
    },
    {
      num: "6",
      title: "Décompression déterministe sans perte",
      complexity: "O(N)",
      desc: "À partir des fréquences, l'arbre est recréé à l'identique. On lit ensuite les bits un à un pour descendre dans l'arbre. Dès qu'une feuille est atteinte, le caractère est émis et on revient à la racine.",
      keyPoint: "Compression dite 'lossless' (sans perte) : le texte restitué est bit-à-bit strictement identique à la source.",
    },
  ];

  const faqs = [
    {
      q: "Pourquoi l'algorithme de Huffman est-il qualifié d'algorithme « glouton » (greedy) ?",
      r: "À chaque étape de la construction de l'arbre, l'algorithme fait le choix localement optimal : il regroupe toujours les deux nœuds ayant les plus petites fréquences disponibles. Cette suite de choix optimaux locaux aboutit de façon démontrée à l'arbre globalement optimal minimisant la longueur pondérée moyenne des codes.",
    },
    {
      q: "Qu'est-ce que la propriété « sans préfixe » (prefix-free code) et pourquoi est-elle cruciale ?",
      r: "Dans un code préfixe, aucun code de symbole n'est le préfixe d'un autre (ex: si 'A' = 01, aucun autre symbole ne peut commencer par 01). Cela garantit qu'on peut décoder le flux binaire de gauche à droite en continu sans insérer le moindre délimiteur ou espace entre les symboles, rendant le décodage déterministe et instantané.",
    },
    {
      q: "Pourquoi doit-on inclure la table des fréquences dans le fichier compressé ?",
      r: "Contrairement aux compresseurs dits adaptatifs ou à dictionnaire universel fixe, Huffman calcule des codes sur-mesure optimisés pour le texte donné. Pour que le destinataire puisse décoder les 0 et les 1, il doit nécessairement reconstituer l'arbre de Huffman exact. L'en-tête du fichier stocke donc cette table (ou la forme de l'arbre).",
    },
    {
      q: "Pourquoi un texte très court peut-il avoir un fichier final plus lourd que l'original ?",
      r: "Sur un texte très court (ex: 20 caractères), le surcoût (overhead) de l'en-tête contenant la table des fréquences dépasse le gain apporté par la réduction des bits du corps de texte. En revanche, dès que le volume augmente, l'en-tête devient négligeable et le gain net est massif (souvent 40% à 70%).",
    },
    {
      q: "Quelle relation relie la longueur moyenne de Huffman à l'Entropie de Claude Shannon ?",
      r: "D'après le Premier Théorème de Shannon (1948), l'entropie H(X) représente la borne inférieure absolue du nombre moyen de bits par symbole pour une compression sans perte. L'algorithme de Huffman vérifie toujours : H(X) ≤ L < H(X) + 1, où L est la longueur moyenne des codes. Huffman est donc quasi-optimal au bit près !",
    },
    {
      q: "Quelle est la complexité temporelle et spatiale totale ?",
      r: "Si N est le nombre total de caractères et K le nombre de caractères distincts (généralement K ≤ 256 en ASCII) : Le comptage est en O(N), la construction de l'arbre en O(K log K) grâce à la file de priorité, et l'encodage/décodage en O(N). La complexité globale est donc O(N + K log K) en temps et O(K) en mémoire pour l'arbre.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Fiche de Soutenance & Principes Théoriques
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Arguments techniques, démonstrations mathématiques et réponses aux questions classiques pour réussir votre présentation de devoir.
            </p>
          </div>
        </div>
      </div>

      {/* Les 6 étapes algorithmiques détaillées */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Déroulement Algorithmique Pas-à-Pas (Les 6 étapes) :</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center">
                    {s.num}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Complexité : <span className="text-cyan-400 font-semibold">{s.complexity}</span>
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1.5">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-cyan-300/90 italic">
                💡 {s.keyPoint}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Encadré Théorème de Shannon */}
      <div className="p-5 rounded-xl border border-violet-500/30 bg-violet-950/20 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-200">
          <Cpu className="w-4 h-4 text-violet-400" />
          <span>Fondement Mathématique : Théorème du Codage de Source (Claude Shannon, 1948)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Pour une source d'information discrète où chaque symbole $s_i$ apparaît avec une probabilité $p_i$, l'entropie de Shannon définit la quantité minimale incompressible d'information :
        </p>
        <div className="p-3 rounded-lg bg-slate-950 border border-violet-900/60 font-mono text-xs text-violet-300 text-center select-all">
          H(X) = - ∑ [ p(x) · log₂(p(x)) ] &nbsp;&nbsp;≤&nbsp;&nbsp; L̄ = ∑ [ p(x) · l(x) ] &nbsp;&nbsp;&lt;&nbsp;&nbsp; H(X) + 1
        </div>
        <p className="text-xs text-slate-400">
          Dans notre application, nous calculons dynamiquement à la fois <strong className="text-slate-200">H(X)</strong> et la longueur moyenne réelle <strong className="text-slate-200">L̄</strong>, prouvant visuellement au professeur la convergence de l'arbre vers cette limite d'efficacité théorique.
        </p>
      </div>

      {/* Foire aux questions pour la soutenance (FAQ) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Questions classiques posées lors d'une soutenance de jury :</span>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/40 transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-3.5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                  {faq.r}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
