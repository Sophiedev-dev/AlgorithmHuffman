@echo off
rem Compile et lance Huffman Studio (Java standard uniquement)
cd /d "%~dp0"
javac -encoding UTF-8 -d out Huffman.java Main.java HuffmanStudio.java
if errorlevel 1 (
    pause
    exit /b 1
)
start "" javaw -cp out HuffmanStudio
