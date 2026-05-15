# Clasa Viitorului — Multiplayer

## Publicare pe GitHub Pages

1. Creează un repository nou pe GitHub.
2. Încarcă fișierele:
   - index.html
   - style.css
   - script.js
3. Intră în Settings → Pages.
4. La Branch alege `main` și folder `/root`.
5. Deschide linkul generat de GitHub Pages.

## Cum se joacă multiplayer

1. Primul jucător apasă „Creează Cameră Multiplayer”.
2. Primește un cod de 4 caractere.
3. Ceilalți intră pe același site, apasă „Începe jocul”, introduc codul și se conectează.
4. Fiecare jucător nou este adăugat automat pe aceeași tablă.
5. Fiecare își alege școala de bază. Tura trece automat de la un jucător la altul, pe același board sincronizat prin Firebase.


## Notă tehnică multiplayer

Sincronizarea se face după acțiuni importante: alegerea școlii, plasarea tile-ului, finalizarea turei, upgrade, bancă și extragere card. Nu se sincronizează la fiecare randare, pentru a evita bucle Firebase.
